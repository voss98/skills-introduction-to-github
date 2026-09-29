import { BALANCE } from './balance';
import type { MinigameKind, TaskDef } from './jobs';
import type { Rng } from './rng';
import type { GBInput } from '../input/keymap';
import type { InputReader } from '../input/InputManager';

/**
 * Pure minigame logic (no rendering). Each game advances with update(dt, input)
 * and ends with a 0..100 quality score. Difficulty reads the station skill level.
 */
export interface Minigame {
  readonly kind: MinigameKind;
  readonly done: boolean;
  /** 0..100, valid once done. */
  readonly quality: number;
  update(dtMs: number, input: InputReader): void;
}

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));
const avg = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0);

// ---------------- Timing bar ----------------

export interface TimingParams {
  zoneWidth: number; // fraction of the bar
  speed: number; // bar widths per second
  hits: number;
  hitTimeoutMs: number;
}

export class TimingBarGame implements Minigame {
  readonly kind = 'timing';
  pos = 0;
  dir = 1;
  zoneCenter = 0.5;
  scores: number[] = [];
  lastHit: number | null = null;
  private sinceHit = 0;

  constructor(
    readonly params: TimingParams,
    private rng: Rng,
  ) {
    this.newZone();
  }

  get done() {
    return this.scores.length >= this.params.hits;
  }

  get quality() {
    return Math.round(avg(this.scores));
  }

  /** In the zone: 60..100 (100 dead centre). Outside: falls off quickly to 0. */
  static scoreHit(pos: number, center: number, width: number): number {
    const half = width / 2;
    const dist = Math.abs(pos - center);
    if (dist <= half) return Math.round(100 - 40 * (dist / half));
    return Math.round(Math.max(0, 50 - 250 * (dist - half)));
  }

  private newZone() {
    const half = this.params.zoneWidth / 2;
    this.zoneCenter = half + this.rng() * (1 - 2 * half);
  }

  private record(score: number) {
    this.scores.push(score);
    this.lastHit = score;
    this.sinceHit = 0;
    if (!this.done) this.newZone();
  }

  update(dtMs: number, input: InputReader): void {
    if (this.done) return;
    this.sinceHit += dtMs;
    this.pos += (this.dir * this.params.speed * dtMs) / 1000;
    if (this.pos > 1) {
      this.pos = 2 - this.pos;
      this.dir = -1;
    } else if (this.pos < 0) {
      this.pos = -this.pos;
      this.dir = 1;
    }
    if (input.justPressed('A')) this.record(TimingBarGame.scoreHit(this.pos, this.zoneCenter, this.params.zoneWidth));
    else if (this.sinceHit > this.params.hitTimeoutMs) this.record(0);
  }
}

// ---------------- Button sequence ----------------

export const SEQUENCE_INPUTS: GBInput[] = ['UP', 'DOWN', 'LEFT', 'RIGHT', 'A', 'B'];

export interface SequenceParams {
  length: number;
  stepTimeMs: number;
  mistakePenalty: number;
  slownessPenalty: number;
}

export class ButtonSequenceGame implements Minigame {
  readonly kind = 'sequence';
  readonly sequence: GBInput[];
  index = 0;
  mistakes = 0;
  stepElapsed = 0;
  /** Set for one frame after a wrong press, for feedback. */
  lastWrong = false;
  private stepFractions: number[] = [];

  constructor(
    readonly params: SequenceParams,
    rng: Rng,
  ) {
    this.sequence = Array.from({ length: params.length }, () => SEQUENCE_INPUTS[Math.floor(rng() * SEQUENCE_INPUTS.length)]);
  }

  get done() {
    return this.index >= this.sequence.length;
  }

  get quality() {
    const slow = avg(this.stepFractions) * this.params.slownessPenalty;
    return Math.round(clamp(100 - this.mistakes * this.params.mistakePenalty - slow, 0, 100));
  }

  private advance(fraction: number) {
    this.stepFractions.push(fraction);
    this.index++;
    this.stepElapsed = 0;
  }

  update(dtMs: number, input: InputReader): void {
    this.lastWrong = false;
    if (this.done) return;
    this.stepElapsed += dtMs;
    const want = this.sequence[this.index];
    const pressed = SEQUENCE_INPUTS.filter((i) => input.justPressed(i));
    if (pressed.includes(want)) {
      this.advance(clamp(this.stepElapsed / this.params.stepTimeMs, 0, 1));
    } else if (pressed.length) {
      this.mistakes++;
      this.lastWrong = true;
    } else if (this.stepElapsed >= this.params.stepTimeMs) {
      this.mistakes++;
      this.advance(1);
    }
  }
}

// ---------------- Torque meter ----------------

export interface TorqueParams {
  targetNm: number;
  maxNm: number;
  tolerance: number; // fraction of target
  fillMs: number; // time to go from 0 to maxNm while holding A
  bolts: number;
}

export type BoltResult = 'good' | 'under' | 'over' | 'stripped';

export class TorqueMeterGame implements Minigame {
  readonly kind = 'torque';
  value = 0;
  scores: number[] = [];
  results: BoltResult[] = [];
  private armed = false;

  constructor(readonly params: TorqueParams) {}

  get done() {
    return this.scores.length >= this.params.bolts;
  }

  get quality() {
    return Math.round(avg(this.scores));
  }

  /** Inside tolerance: 70..100. Under-torque loses points gently; over-torque is worse. */
  static scoreBolt(value: number, target: number, tolerance: number): { score: number; result: BoltResult } {
    const dev = (value - target) / target;
    if (Math.abs(dev) <= tolerance) return { score: Math.round(100 - 30 * (Math.abs(dev) / tolerance)), result: 'good' };
    if (dev < 0) return { score: Math.round(Math.max(0, 60 - 150 * (-dev - tolerance))), result: 'under' };
    return { score: Math.round(Math.max(0, 40 - 200 * (dev - tolerance))), result: 'over' };
  }

  private lock(stripped = false) {
    const { score, result } = stripped
      ? { score: 0, result: 'stripped' as const }
      : TorqueMeterGame.scoreBolt(this.value, this.params.targetNm, this.params.tolerance);
    this.scores.push(score);
    this.results.push(result);
    this.value = 0;
    this.armed = false;
  }

  update(dtMs: number, input: InputReader): void {
    if (this.done) return;
    // Require a fresh press so the A that started the job doesn't count.
    if (input.justPressed('A')) this.armed = true;
    if (!this.armed) return;
    if (input.isDown('A')) {
      this.value = Math.min(this.params.maxNm, this.value + (this.params.maxNm * dtMs) / this.params.fillMs);
      if (this.value >= this.params.maxNm) this.lock(true);
    } else if (this.value > 0) {
      this.lock();
    }
  }
}

// ---------------- Difficulty from skill ----------------

/** Build a minigame for a task. Higher station skill = wider zones, slower meters, fewer steps. */
export function createMinigame(task: TaskDef, skill: number, rng: Rng): Minigame {
  const m = BALANCE.minigames;
  const lvl = skill - 1;
  const d = task.difficulty;
  switch (task.minigame) {
    case 'timing':
      return new TimingBarGame(
        {
          zoneWidth: clamp(m.timing.zoneWidth + m.timing.zoneWidthPerSkill * lvl, 0.05, 0.9),
          speed: Math.max(0.2, m.timing.speed + m.timing.speedPerDifficulty * d + m.timing.speedPerSkill * lvl),
          hits: m.timing.hits,
          hitTimeoutMs: m.timing.hitTimeoutMs,
        },
        rng,
      );
    case 'sequence':
      return new ButtonSequenceGame(
        {
          length: Math.max(2, Math.round(m.sequence.length + m.sequence.lengthPerDifficulty * d + m.sequence.lengthPerSkill * lvl)),
          stepTimeMs: m.sequence.stepTimeMs + m.sequence.stepTimePerSkill * lvl,
          mistakePenalty: m.sequence.mistakePenalty,
          slownessPenalty: m.sequence.slownessPenalty,
        },
        rng,
      );
    case 'torque': {
      const target = task.targetNm ?? 10;
      return new TorqueMeterGame({
        targetNm: target,
        maxNm: target * m.torque.overTorqueMultiple,
        tolerance: clamp(m.torque.tolerance + m.torque.tolerancePerSkill * lvl, 0.02, 0.5),
        fillMs: Math.max(600, m.torque.fillMs + m.torque.fillMsPerDifficulty * d + m.torque.fillMsPerSkill * lvl),
        bolts: m.torque.bolts,
      });
    }
  }
}

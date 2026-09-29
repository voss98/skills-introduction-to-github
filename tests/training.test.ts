import { describe, expect, it } from 'vitest';
import { BALANCE } from '../src/core/balance';
import { GameState } from '../src/core/gameState';
import { TASKS } from '../src/core/jobs';
import { reachableCells, TRAINING_LAYOUT } from '../src/core/layout';
import { createMinigame, TimingBarGame, TorqueMeterGame } from '../src/core/minigames';
import { createRng } from '../src/core/rng';
import { ShopController } from '../src/core/shop';
import {
  CERT_FLAG,
  completeTraining,
  drawExam,
  EXAM_FAILED_FLAG,
  gradeExam,
  program,
  PROGRAMS,
  QUESTION_BANK,
  trainingBlocker,
  trainingCost,
} from '../src/core/training';

describe('training programs', () => {
  it('has the four required stations', () => {
    expect(PROGRAMS.map((p) => p.id).sort()).toEqual(['cert_exam', 'cs_workshop', 'suspension_lab', 'wheel_academy']);
  });

  it('Wheel Building Academy costs cash and permanently raises wheel skill', () => {
    const s = new GameState();
    const p = program('wheel_academy');
    const cost = trainingCost(p, s);
    completeTraining(p, s);
    expect(s.skill('wheel_stand')).toBe(2);
    expect(s.cash).toBe(1500 - cost);
    expect(trainingCost(p, s)).toBeGreaterThan(cost); // next level costs more
    expect(s.snapshot.trainingDone).toEqual(['wheel_academy']);
  });

  it('Suspension Lab raises suspension skill; skills cap at 5', () => {
    const s = new GameState();
    s.applyEffect({ var: 'cash', set: 100000 });
    const p = program('suspension_lab');
    for (let i = 0; i < 4; i++) completeTraining(p, s);
    expect(s.skill('suspension_bench')).toBe(5);
    expect(trainingBlocker(p, s)).toMatch(/mastered/);
  });

  it('Customer Service Workshop raises reputation gain and sets a dialogue flag', () => {
    const s = new GameState();
    completeTraining(program('cs_workshop'), s);
    expect(s.hasFlag('cs_trained')).toBe(true);
    expect(s.modifier('reputationGainMultiplier')).toBeCloseTo(1.25);
    expect(trainingBlocker(program('cs_workshop'), s)).toMatch(/already/);
  });

  it('you cannot enroll without the cash', () => {
    const s = new GameState();
    s.applyEffect({ var: 'cash', set: 10 });
    expect(trainingBlocker(program('wheel_academy'), s)).toMatch(/need \$/);
  });

  it('the Training Center map lets you reach every station', () => {
    const { jumpVelocity, gravity } = BALANCE.movement;
    const reach = reachableCells(TRAINING_LAYOUT, Math.floor((jumpVelocity * jumpVelocity) / (2 * gravity) / 8), 2);
    for (const st of TRAINING_LAYOUT.stations) {
      expect(Array.from({ length: st.w }, (_, i) => `${st.tx + i},${st.ty}`).some((c) => reach.has(c)), st.id).toBe(true);
    }
  });
});

describe('certification exam', () => {
  const exam = program('cert_exam');

  it('draws 10 distinct questions with shuffled answers', () => {
    const qs = drawExam(createRng(5), 10);
    expect(qs.length).toBe(10);
    expect(new Set(qs.map((q) => q.id)).size).toBe(10);
    for (const q of qs) {
      const orig = QUESTION_BANK.find((b) => b.id === q.id)!;
      expect(q.choices[q.answer]).toBe(orig.choices[orig.answer]);
    }
  });

  it('bank is large enough, well formed, and fits the choice box', () => {
    expect(QUESTION_BANK.length).toBeGreaterThanOrEqual(20);
    for (const q of QUESTION_BANK) {
      expect(q.choices.length).toBe(4);
      expect(q.answer).toBeGreaterThanOrEqual(0);
      expect(q.answer).toBeLessThan(4);
      for (const c of q.choices) expect(c.length).toBeLessThanOrEqual(21);
    }
  });

  it('passing (7+/10) grants certification', () => {
    const s = new GameState();
    const qs = drawExam(createRng(1), 10);
    const answers = qs.map((q, i) => (i < 7 ? q.answer : (q.answer + 1) % 4));
    const r = gradeExam(exam, s, qs, answers);
    expect(r).toEqual({ score: 7, total: 10, passed: true });
    expect(s.hasFlag(CERT_FLAG)).toBe(true);
    expect(s.hasFlag(EXAM_FAILED_FLAG)).toBe(false);
    expect(s.cash).toBe(1500 - trainingCost(exam, new GameState()));
  });

  it('failing (6/10) sets exam_failed and no certification; a later pass clears it', () => {
    const s = new GameState();
    const qs = drawExam(createRng(2), 10);
    const fail = gradeExam(exam, s, qs, qs.map((q, i) => (i < 6 ? q.answer : (q.answer + 1) % 4)));
    expect(fail.passed).toBe(false);
    expect(s.hasFlag(CERT_FLAG)).toBe(false);
    expect(s.hasFlag(EXAM_FAILED_FLAG)).toBe(true);
    gradeExam(exam, s, qs, qs.map((q) => q.answer));
    expect(s.hasFlag(CERT_FLAG)).toBe(true);
    expect(s.hasFlag(EXAM_FAILED_FLAG)).toBe(false);
    expect(trainingBlocker(exam, s)).toMatch(/already certified/);
  });
});

describe('skill is wired into gameplay', () => {
  it('higher skill makes minigames more forgiving', () => {
    const lo = createMinigame(TASKS.true_wheels, 1, createRng(1)) as TimingBarGame;
    const hi = createMinigame(TASKS.true_wheels, 2, createRng(1)) as TimingBarGame;
    expect(hi.params.zoneWidth).toBeGreaterThan(lo.params.zoneWidth);
    const tlo = createMinigame(TASKS.service_shock, 1, createRng(1)) as TorqueMeterGame;
    const thi = createMinigame(TASKS.service_shock, 2, createRng(1)) as TorqueMeterGame;
    expect(thi.params.tolerance).toBeGreaterThan(tlo.params.tolerance);
  });

  const runTask = (skill: number) => {
    const s = new GameState();
    s.applyEffect({ var: 'skill', station: 'wheel_stand', set: skill });
    const shop = new ShopController(s, 1);
    shop.startDay();
    shop.accept(shop.walkIn('flat_tire'));
    return shop.finishTask(shop.taskAt('wheel_stand')!, 80);
  };

  it('training raises recorded quality for the same minigame score', () => {
    expect(runTask(3).quality).toBeGreaterThan(runTask(1).quality);
    expect(runTask(1).quality).toBe(80);
  });

  it('training shortens job time', () => {
    expect(runTask(3).minutes).toBeLessThan(runTask(1).minutes);
  });

  it('customer service training boosts reputation from happy customers', () => {
    const gain = (trained: boolean) => {
      const s = new GameState();
      if (trained) completeTraining(program('cs_workshop'), s);
      const shop = new ShopController(s, 1);
      shop.startDay();
      shop.accept(shop.walkIn('suspension_service'));
      for (const st of ['suspension_bench'] as const) for (let t = shop.taskAt(st); t; t = shop.taskAt(st)) shop.finishTask(t, 100);
      return shop.handOver().reputationDelta;
    };
    expect(gain(true)).toBeGreaterThan(gain(false));
  });

  it('a training day away closes the shop without upsetting waiting customers', () => {
    const s = new GameState();
    const shop = new ShopController(s, 3);
    shop.startDay();
    const rep = s.reputation;
    const sum = shop.endDay({ away: true });
    expect(sum.unserved).toBe(0);
    expect(s.reputation).toBe(rep);
  });
});

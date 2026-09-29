import { END, DecisionEngine, type NodeView } from './decisions';
import { calendar } from './calendar';
import { chooseEnding, runEndReason, type Ending, type RunEndReason } from './endings';
import { GameState, WORK_STATIONS } from './gameState';
import type { TaskDef } from './jobs';
import { reportForMonth } from './reports';
import { createRng, type Rng } from './rng';
import { ShopController, type Customer, type Trigger } from './shop';
import { completeTraining, drawExam, gradeExam, program, trainingBlocker } from './training';

/**
 * Headless full-run simulator. Mirrors the shop scene's day loop so tests can
 * play whole 12-month runs with scripted or random choices.
 */
export interface Strategy {
  /** Pick a choice index (must be unlocked). */
  choose(view: NodeView, state: GameState, rng: Rng): number;
  /** Minigame score 0..100 for a task. */
  quality(task: TaskDef, state: GameState, rng: Rng): number;
  /** Program id to spend today training, or null to work. */
  train?(state: GameState, rng: Rng): string | null;
  /** Exam answers correct out of 10. */
  examScore?(state: GameState, rng: Rng): number;
  takeJob?(c: Customer, state: GameState, rng: Rng): boolean;
  /** Restock when inventory falls below this. */
  restockBelow?: number;
}

export interface RunResult {
  ending: Ending;
  reason: RunEndReason;
  state: GameState;
  decisions: string[];
  jobs: number;
  days: number;
}

/** Minutes spent walking between the counter and a station, per task. */
const WALK_MINUTES = 10;

export function firstUnlocked(view: NodeView): number {
  return view.choices.findIndex((c) => !c.locked);
}

export function simulateRun(seed: number, strategy: Strategy, totalDays = calendar.totalDays): RunResult {
  const rng = createRng(seed);
  const state = new GameState();
  const shop = new ShopController(state, seed);
  const engine = new DecisionEngine(state);
  const decisions: string[] = [];
  let jobs = 0;

  const play = (entry: string) => {
    decisions.push(entry);
    for (let id = entry; id !== END; ) {
      const view = engine.enter(id);
      if (!view.choices.length) {
        id = engine.advance(id);
        continue;
      }
      let pick = strategy.choose(view, state, rng);
      if (pick < 0 || view.choices[pick]?.locked) pick = firstUnlocked(view);
      id = engine.choose(id, pick).next;
    }
  };
  const decide = (t: Trigger) => {
    if (t === 'industry_report') {
      const report = reportForMonth(Math.floor((state.day - 1) / calendar.daysPerMonth) + 1);
      const ev = report.event ? engine.beginEvent(report.event) : null;
      if (ev) play(ev.entry);
      return;
    }
    const ev = engine.begin(t);
    if (ev) play(ev.entry);
  };
  const closeDay = (away: boolean): RunEndReason | null => {
    shop.endDay({ away });
    decide('end_of_day');
    return runEndReason(state, totalDays);
  };

  let triggers = shop.startDay();
  for (;;) {
    triggers.forEach(decide);

    const trainingId = strategy.train?.(state, rng) ?? null;
    const p = trainingId ? program(trainingId) : null;
    if (p && !trainingBlocker(p, state)) {
      if (p.kind === 'exam') {
        const qs = drawExam(rng, p.questions ?? 10);
        const right = strategy.examScore?.(state, rng) ?? 10;
        gradeExam(p, state, qs, qs.map((q, i) => (i < right ? q.answer : (q.answer + 1) % 4)));
      } else {
        completeTraining(p, state);
      }
      let reason: RunEndReason | null = null;
      for (let d = 0; d < p.days && !reason; d++) {
        reason = closeDay(true);
        if (!reason) triggers = shop.nextDay();
        if (!reason && d < p.days - 1) triggers.forEach(decide);
      }
      if (reason) return { ending: chooseEnding(state), reason, state, decisions, jobs, days: state.day };
      continue;
    }

    for (let guard = 0; guard < 20 && !shop.closed; guard++) {
      const action = shop.counter();
      if (action.kind === 'empty') {
        const next = shop.customers.find((c) => c.arrivesAt > shop.minute);
        if (!next) break;
        shop.advance(next.arrivesAt - shop.minute);
        continue;
      }
      if (action.kind !== 'offer') break;
      const c = action.customer;
      let rush = false;
      let overtime = false;
      if (c.big) {
        decide('big_customer');
        const take = (f: string) => {
          const had = state.hasFlag(f);
          state.clearFlag(f);
          return had;
        };
        rush = take('rush_current_job');
        overtime = take('overtime_current_job');
        if (take('decline_current_job')) {
          shop.decline(c);
          continue;
        }
      }
      if (strategy.takeJob && !strategy.takeJob(c, state, rng)) {
        shop.decline(c);
        continue;
      }
      shop.accept(c, rush, overtime);
      for (const st of WORK_STATIONS) {
        for (let task = shop.taskAt(st); task; task = shop.taskAt(st)) {
          shop.advance(WALK_MINUTES);
          shop.finishTask(task, strategy.quality(task.def, state, rng));
        }
      }
      shop.handOver();
      jobs++;
      if (state.inventoryHealth < (strategy.restockBelow ?? 20)) shop.restock();
    }

    const reason = closeDay(false);
    if (reason) return { ending: chooseEnding(state), reason, state, decisions, jobs, days: state.day };
    triggers = shop.nextDay();
  }
}

/** A plausible random player, parameterised by how good they are at minigames. */
export function randomStrategy(rng: Rng): Strategy {
  const skill = 0.25 + rng() * 0.75;
  const trainRate = rng() * 0.25;
  const pickiness = rng() * 0.3;
  return {
    choose: (view, _s, r) => {
      const open = view.choices.map((c, i) => (c.locked ? -1 : i)).filter((i) => i >= 0);
      return open[Math.floor(r() * open.length)];
    },
    quality: (_t, _s, r) => Math.max(0, Math.min(100, Math.round(100 * skill + (r() - 0.5) * 40))),
    train: (_s, r) => (r() < trainRate ? ['wheel_academy', 'suspension_lab', 'cert_exam', 'cs_workshop'][Math.floor(r() * 4)] : null),
    examScore: (_s, r) => Math.min(10, Math.round(skill * 10 + (r() - 0.5) * 4)),
    takeJob: (_c, _s, r) => r() > pickiness,
    restockBelow: 10 + Math.floor(rng() * 20),
  };
}

import { describe, expect, it } from 'vitest';
import { DecisionEngine, END } from '../src/core/decisions';
import { GameState, WORK_STATIONS } from '../src/core/gameState';
import { ShopController, type Trigger } from '../src/core/shop';
import { playBot } from './helpers';

/** Headless version of what the shop scene does over several in-game days. */
function playDays(days: number, seed: number) {
  const state = new GameState();
  const shop = new ShopController(state, seed);
  const engine = new DecisionEngine(state);
  const decisions: string[] = [];
  let jobs = 0;

  const decide = (t: Trigger) => {
    const ev = engine.begin(t);
    if (!ev) return;
    decisions.push(ev.entry);
    for (let id = ev.entry; id !== END; ) {
      const view = engine.enter(id);
      const open = view.choices.findIndex((c) => !c.locked);
      id = view.choices.length ? engine.choose(id, open).next : engine.advance(id);
    }
  };

  let triggers = shop.startDay();
  for (let d = 1; d <= days; d++) {
    triggers.forEach(decide);
    for (let guard = 0; guard < 10 && !shop.closed; guard++) {
      const action = shop.counter();
      if (action.kind !== 'offer') break;
      let rush = false;
      if (action.customer.big) {
        decide('big_customer');
        rush = state.hasFlag('rush_current_job');
        for (const f of ['rush_current_job', 'overtime_current_job']) state.clearFlag(f);
        if (state.hasFlag('decline_current_job')) {
          state.clearFlag('decline_current_job');
          shop.decline(action.customer);
          continue;
        }
      }
      shop.accept(action.customer, rush);
      for (const st of WORK_STATIONS) {
        for (let task = shop.taskAt(st); task; task = shop.taskAt(st)) shop.finishTask(task, playBot(shop.startTask(task)));
      }
      shop.handOver();
      jobs++;
    }
    shop.endDay();
    decide('end_of_day');
    triggers = shop.nextDay();
  }
  return { state, decisions, jobs };
}

describe('a few in-game days', () => {
  it.each([1, 2, 3, 4, 5])('seed %i: jobs get done, 5+ different decisions come up, stats move', (seed) => {
    const { state, decisions, jobs } = playDays(3, seed);
    expect(state.day).toBe(4);
    expect(jobs).toBeGreaterThanOrEqual(3);
    expect(new Set(decisions).size).toBeGreaterThanOrEqual(5);
    expect(state.cash).not.toBe(1500);
    expect(state.reputation).not.toBe(50);
    expect(state.snapshot.flags.length).toBeGreaterThan(0);
  });
});

import { describe, expect, it } from 'vitest';
import { ENDINGS } from '../src/core/endings';
import { createRng } from '../src/core/rng';
import { randomStrategy, simulateRun } from '../src/core/simulate';

const RUNS = 1000;
const MAX_SHARE = 0.6;

/**
 * 1,000 seeded random playthroughs. If this fails, tune balance in the JSON
 * data (not the code) and log the change in docs/balance.md.
 */
describe(`${RUNS} randomized playthroughs`, () => {
  const counts: Record<string, number> = Object.fromEntries(ENDINGS.map((e) => [e.id, 0]));
  let totalDays = 0;
  for (let seed = 1; seed <= RUNS; seed++) {
    const r = simulateRun(seed, randomStrategy(createRng(seed * 7919)));
    counts[r.ending.id]++;
    totalDays += r.days;
  }
  const table = Object.entries(counts)
    .map(([id, n]) => `${id} ${((n / RUNS) * 100).toFixed(1)}%`)
    .join(', ');

  it(`no ending takes more than ${MAX_SHARE * 100}% of runs (${table})`, () => {
    for (const [id, n] of Object.entries(counts)) expect(n / RUNS, `${id}: ${table}`).toBeLessThanOrEqual(MAX_SHARE);
  });

  it('every non-secret ending happens at least once', () => {
    for (const e of ENDINGS.filter((x) => !x.secret)) expect(counts[e.id], `${e.id} never happened: ${table}`).toBeGreaterThan(0);
  });

  it('runs are deterministic for a seed', () => {
    const a = simulateRun(42, randomStrategy(createRng(42)));
    const b = simulateRun(42, randomStrategy(createRng(42)));
    expect([a.ending.id, a.state.cash, a.days]).toEqual([b.ending.id, b.state.cash, b.days]);
  });

  it('runs last the full year unless they end early', () => {
    expect(totalDays / RUNS).toBeGreaterThan(12);
  });
});

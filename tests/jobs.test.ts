import { describe, expect, it } from 'vitest';
import jobsRaw from '../src/data/jobs.json';
import { COMPONENT_SLOTS, isComplete } from '../src/core/bike';
import { findUnlabelledNumbers } from '../src/core/balance';
import { GameState, WORK_STATIONS } from '../src/core/gameState';
import { JOB_TEMPLATES, TASKS } from '../src/core/jobs';
import { ShopController } from '../src/core/shop';
import { playBot } from './helpers';

function runJob(shop: ShopController, accuracy = 1) {
  const job = shop.activeJob!;
  for (const station of WORK_STATIONS) {
    for (let task = shop.taskAt(station); task; task = shop.taskAt(station)) {
      const quality = playBot(shop.startTask(task), accuracy);
      shop.finishTask(task, quality);
    }
  }
  return job;
}

describe('job data', () => {
  it('labels every number with a source', () => {
    expect(findUnlabelledNumbers(jobsRaw)).toEqual([]);
  });

  it('references only real tasks, stations and slots', () => {
    for (const j of JOB_TEMPLATES) for (const t of j.tasks) expect(TASKS[t], `${j.id}:${t}`).toBeDefined();
    for (const t of Object.values(TASKS)) {
      expect(WORK_STATIONS).toContain(t.station);
      expect(COMPONENT_SLOTS).toContain(t.slot);
      if (t.minigame === 'torque') expect(t.targetNm).toBeGreaterThan(0);
    }
  });

  it('covers every repair ticket in the brief and a build that installs every component', () => {
    const ids = JOB_TEMPLATES.map((j) => j.id);
    for (const id of ['flat_tire', 'bent_hanger', 'worn_pads', 'suspension_service']) expect(ids).toContain(id);
    const build = JOB_TEMPLATES.find((j) => j.id === 'trail_build')!;
    const slots = new Set(build.tasks.map((t) => TASKS[t].slot));
    for (const s of COMPONENT_SLOTS) expect(slots.has(s), s).toBe(true);
  });
});

describe('full build, start to finish', () => {
  it('takes the order, runs every station minigame, hands over and gets paid', () => {
    const state = new GameState();
    const shop = new ShopController(state, 42);
    shop.startDay();
    const customer = shop.walkIn('trail_build');
    expect(shop.counter()).toMatchObject({ kind: 'offer', customer });
    shop.accept(customer);
    expect(shop.counter().kind).toBe('busy');

    const job = runJob(shop);
    expect(isComplete(job.bike)).toBe(true);
    for (const s of COMPONENT_SLOTS) expect(job.bike.components[s].condition).toBeGreaterThanOrEqual(80);
    expect(new Set(job.tasks.map((t) => t.def.station)).size).toBe(4);

    expect(shop.counter().kind).toBe('handover');
    const cashBefore = state.cash;
    const repBefore = state.reputation;
    const result = shop.handOver();
    expect(result.quality).toBeGreaterThanOrEqual(85);
    expect(result.timeScore).toBe(100);
    expect(result.payment).toBeGreaterThan(0);
    expect(state.cash).toBe(cashBefore + result.payment);
    expect(state.reputation).toBe(repBefore + result.reputationDelta);
    expect(result.reputationDelta).toBeGreaterThan(0);
    expect(shop.activeJob).toBeNull();
    expect(state.inventoryHealth).toBeLessThan(70); // parts were used
  });
});

describe('repairs, start to finish', () => {
  it.each(['flat_tire', 'bent_hanger', 'worn_pads', 'suspension_service'])('%s', (id) => {
    const state = new GameState();
    const shop = new ShopController(state, 7);
    shop.startDay();
    shop.accept(shop.walkIn(id));
    const job = runJob(shop);
    for (const issue of job.template.issues ?? []) {
      expect(job.bike.components[issue.slot].condition).toBeGreaterThan(issue.condition);
    }
    const r = shop.handOver();
    expect(r.payment).toBeGreaterThan(0);
    expect(r.rating).toBe('great');
  });

  it('sloppy work pays less and costs reputation', () => {
    const good = new ShopController(new GameState(), 1);
    good.startDay();
    good.accept(good.walkIn('bent_hanger'));
    runJob(good, 1);
    const g = good.handOver();

    const badState = new GameState();
    const bad = new ShopController(badState, 1);
    bad.startDay();
    bad.accept(bad.walkIn('bent_hanger'));
    runJob(bad, 0);
    const b = bad.handOver();
    expect(b.payment).toBeLessThan(g.payment);
    expect(b.reputationDelta).toBeLessThan(0);
    expect(b.rating).toBe('bad');
  });

  it('slow work lowers the time score', () => {
    const shop = new ShopController(new GameState(), 1);
    shop.startDay();
    shop.accept(shop.walkIn('flat_tire'));
    shop.advance(300);
    runJob(shop);
    const r = shop.handOver();
    expect(r.timeScore).toBeLessThan(50);
  });

  it('higher station skill pays more for the same work', () => {
    const pay = (skill: number) => {
      const state = new GameState();
      state.applyEffect({ var: 'skill', station: 'all', set: skill });
      const shop = new ShopController(state, 3);
      shop.startDay();
      shop.accept(shop.walkIn('worn_pads'));
      runJob(shop);
      return shop.handOver().payment;
    };
    expect(pay(3)).toBeGreaterThan(pay(1));
  });
});

describe('shop day', () => {
  it('rush-orders parts when the parts wall is empty', () => {
    const state = new GameState();
    state.applyEffect({ var: 'inventoryHealth', set: 0 });
    const shop = new ShopController(state, 1);
    shop.startDay();
    shop.accept(shop.walkIn('worn_pads'));
    const task = shop.taskAt('drivetrain_bench')!;
    const cash = state.cash;
    expect(shop.finishTask(task, 90).rushOrdered).toBe(true);
    expect(state.cash).toBeLessThan(cash);
  });

  it('restocking costs cash and fills the parts wall', () => {
    const state = new GameState();
    const shop = new ShopController(state, 1);
    const inv = state.inventoryHealth;
    expect(shop.restock()).toBe(true);
    expect(state.inventoryHealth).toBeGreaterThan(inv);
    expect(state.cash).toBe(1500 - shop.restockCost());
  });

  it('declining a customer costs a little reputation', () => {
    const state = new GameState();
    const shop = new ShopController(state, 1);
    shop.startDay();
    shop.decline(shop.walkIn('flat_tire'));
    expect(state.reputation).toBeLessThan(50);
  });

  it('customers arrive over the day and the clock closes the shop', () => {
    const shop = new ShopController(new GameState(), 5);
    shop.startDay();
    expect(shop.waiting.length).toBeGreaterThanOrEqual(1);
    const total = shop.customers.length;
    shop.advance(10000);
    expect(shop.closed).toBe(true);
    expect(shop.waiting.length).toBe(total);
  });

  it('end of day pays rent, penalises unserved customers, then a new day starts', () => {
    const state = new GameState();
    const shop = new ShopController(state, 5);
    shop.startDay();
    shop.advance(10000);
    const summary = shop.endDay();
    expect(summary.overhead).toBeGreaterThan(0);
    expect(summary.unserved).toBeGreaterThan(0);
    expect(summary.reputationChange).toBeLessThan(0);
    shop.nextDay();
    expect(state.day).toBe(2);
    expect(shop.clockText).toBe('09:00');
  });

  it('a big customer shows up on day 2 and the supplier visits', () => {
    const state = new GameState();
    const shop = new ShopController(state, 5);
    shop.startDay();
    shop.endDay();
    const triggers = shop.nextDay();
    expect(triggers).toContain('supplier_offer');
    expect(shop.customers.some((c) => c.big)).toBe(true);
  });
});

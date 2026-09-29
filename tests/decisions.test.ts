import { describe, expect, it } from 'vitest';
import decisionsRaw from '../src/data/decisions.json';
import { isSourced } from '../src/core/balance';
import { DECISIONS, DecisionEngine, describeDiff, END, meets, type DecisionNode } from '../src/core/decisions';
import { GameState, MODIFIER_KEYS, STAT_KEYS, WORK_STATIONS } from '../src/core/gameState';
import { createRng } from '../src/core/rng';
import type { Trigger } from '../src/core/shop';

const nodes = DECISIONS.nodes;
const ids = Object.keys(nodes);
const nextsOf = (n: DecisionNode) => (n.choices ? n.choices.map((c) => c.next) : [n.next ?? END]);
const VALID_VARS = new Set<string>(['cash', 'skill', ...STAT_KEYS, ...MODIFIER_KEYS]);

describe('decision data shape', () => {
  it('every node has the required fields and a matching id', () => {
    for (const [key, n] of Object.entries(nodes)) {
      expect(n.id).toBe(key);
      expect(n.text.length).toBeGreaterThan(0);
      if (!n.choices) expect(n.next, `${key} needs choices or next`).toBeDefined();
      if (n.choices) {
        expect(n.choices.length).toBeGreaterThanOrEqual(2);
        expect(n.choices.length).toBeLessThanOrEqual(4);
      }
    }
  });

  it('choice labels fit the Game Boy choice box (22 chars incl. lock icon)', () => {
    for (const n of Object.values(nodes)) for (const c of n.choices ?? []) expect(c.text.length, c.text).toBeLessThanOrEqual(22);
  });

  it('every "next" points at a real node or END', () => {
    for (const n of Object.values(nodes)) for (const next of nextsOf(n)) expect(next === END || next in nodes, `${n.id} -> ${next}`).toBe(true);
    for (const e of DECISIONS.events) expect(e.entry in nodes, e.id).toBe(true);
  });

  it('effects target real variables and every number is labelled placeholder', () => {
    for (const n of Object.values(nodes)) {
      const effects = [...(n.effects ?? []), ...(n.choices ?? []).flatMap((c) => c.effects ?? [])];
      for (const e of effects) {
        expect(VALID_VARS.has(e.var), `${n.id}: ${e.var}`).toBe(true);
        expect(e.source, `${n.id}: ${e.var}`).toBe('placeholder');
        if (e.var === 'skill') expect([...WORK_STATIONS, 'all']).toContain(e.station);
      }
      for (const c of n.choices ?? []) {
        for (const bound of [c.requires?.min, c.requires?.max]) {
          for (const v of Object.values(bound ?? {})) expect(isSourced(v) && v.source === 'placeholder').toBe(true);
        }
      }
    }
    // Numbers outside effects/requirements are scheduling only.
    const stray: string[] = [];
    const walk = (x: unknown, path: string) => {
      if (typeof x === 'number' && !/\.(minDay|priority)$/.test(path) && !/\.effects\[\d+\]\.(delta|set)$/.test(path)) stray.push(path);
      else if (isSourced(x)) return;
      else if (Array.isArray(x)) x.forEach((v, i) => walk(v, `${path}[${i}]`));
      else if (x && typeof x === 'object') Object.entries(x).forEach(([k, v]) => walk(v, `${path}.${k}`));
    };
    walk(decisionsRaw, '$');
    expect(stray).toEqual([]);
  });

  it('covers every decision topic in the brief', () => {
    for (const id of ['pricing_start', 'hiring_start', 'supplier_intro', 'warranty_start', 'marketing_start', 'sponsor_start', 'big_rush']) {
      expect(nodes[id], id).toBeDefined();
    }
    const triggers = new Set(DECISIONS.events.map((e) => e.trigger));
    expect([...triggers].sort()).toEqual(['big_customer', 'end_of_day', 'supplier_offer']);
  });
});

describe('no dead ends', () => {
  it('every choice list has at least one option that can never be locked', () => {
    for (const n of Object.values(nodes)) {
      if (!n.choices) continue;
      expect(n.choices.some((c) => !c.requires), `${n.id} could lock every choice`).toBe(true);
    }
  });

  it('the graph has no cycles, so every path ends at END', () => {
    const state = new Map<string, 'visiting' | 'done'>();
    const visit = (id: string, path: string[]) => {
      if (id === END) return;
      expect(state.get(id), `cycle: ${[...path, id].join(' > ')}`).not.toBe('visiting');
      if (state.get(id) === 'done') return;
      state.set(id, 'visiting');
      for (const next of nextsOf(nodes[id])) visit(next, [...path, id]);
      state.set(id, 'done');
    };
    for (const id of ids) visit(id, []);
  });

  it('every trigger always has an event available (repeatable fallbacks)', () => {
    for (const t of ['end_of_day', 'supplier_offer', 'big_customer'] as Trigger[]) {
      expect(DECISIONS.events.some((e) => e.trigger === t && !e.once && !e.requires && e.minDay <= 1), t).toBe(true);
    }
  });
});

describe('reachability', () => {
  /**
   * Over-approximate every flag the player could ever hold (not_flags and stat
   * thresholds are assumed satisfiable), then walk the graph from every event
   * those flags allow. The random playthrough test below confirms it for real.
   */
  it('every node is reachable from some event', () => {
    const flags = new Set<string>();
    const possible = (req?: { flags?: string[]; any_flags?: string[] }) =>
      !req || ((req.flags ?? []).every((f) => flags.has(f)) && (!req.any_flags || req.any_flags.some((f) => flags.has(f))));

    // Walk from every currently-possible event; repeat while new flags keep unlocking more.
    let reached = new Set<string>();
    for (let flagCount = -1; flagCount !== flags.size; ) {
      flagCount = flags.size;
      reached = new Set();
      const stack = DECISIONS.events.filter((e) => possible(e.requires)).map((e) => e.entry);
      while (stack.length) {
        const id = stack.pop()!;
        if (id === END || reached.has(id)) continue;
        reached.add(id);
        const n = nodes[id];
        n.sets_flags?.forEach((f) => flags.add(f));
        if (!n.choices) stack.push(n.next ?? END);
        for (const c of n.choices ?? []) {
          if (!possible(c.requires)) continue;
          c.sets_flags?.forEach((f) => flags.add(f));
          stack.push(c.next);
        }
      }
    }
    expect(ids.filter((id) => !reached.has(id))).toEqual([]);
  });

  it('random playthroughs actually visit every node and every event', () => {
    const seenNodes = new Set<string>();
    const seenEvents = new Set<string>();
    for (let seed = 1; seed <= 300; seed++) {
      const rng = createRng(seed);
      const state = new GameState();
      state.applyEffect({ var: 'cash', set: Math.floor(rng() * 2000) });
      const engine = new DecisionEngine(state);
      for (let day = 1; day <= 8; day++) {
        const triggers: Trigger[] = ['end_of_day'];
        if (day >= 2 && day % 2 === 0) triggers.unshift('supplier_offer');
        if (day >= 2 && rng() < 0.5) triggers.unshift('big_customer');
        for (const t of triggers) {
          const ev = engine.begin(t);
          expect(ev, `no event for ${t} on day ${day}`).not.toBeNull();
          seenEvents.add(ev!.id);
          let id = ev!.entry;
          for (let steps = 0; id !== END; steps++) {
            expect(steps).toBeLessThan(50);
            const view = engine.enter(id);
            seenNodes.add(id);
            const open = view.choices.map((c, i) => (c.locked ? -1 : i)).filter((i) => i >= 0);
            if (view.choices.length) {
              expect(open.length, `dead end at ${id}`).toBeGreaterThan(0);
              id = engine.choose(id, open[Math.floor(rng() * open.length)]).next;
            } else {
              id = engine.advance(id);
            }
          }
          for (const f of ['rush_current_job', 'overtime_current_job', 'decline_current_job']) state.clearFlag(f);
        }
        state.nextDay();
      }
    }
    expect(ids.filter((id) => !seenNodes.has(id))).toEqual([]);
    expect(DECISIONS.events.map((e) => e.id).filter((id) => !seenEvents.has(id))).toEqual([]);
  });
});

const play = (engine: DecisionEngine, nodeId: string, choice: number) => {
  engine.enter(nodeId);
  return engine.choose(nodeId, choice);
};

describe('effects change the game state', () => {
  it('raising prices changes the price modifier, reputation and sets a flag', () => {
    const s = new GameState();
    const e = new DecisionEngine(s);
    const { next, diff } = play(e, 'pricing_start', 0);
    expect(s.modifier('priceMultiplier')).toBeCloseTo(1.2);
    expect(s.reputation).toBe(48);
    expect(s.hasFlag('premium_pricing')).toBe(true);
    expect(next).toBe('pricing_raise');
    expect(describeDiff(diff)).toEqual(['REP -2', 'PRICES X1.20']);
  });

  it('sponsoring trails costs cash and raises goodwill and reputation', () => {
    const s = new GameState();
    const e = new DecisionEngine(s);
    play(e, 'sponsor_start', 0);
    expect(s.cash).toBe(1200);
    expect(s.communityGoodwill).toBe(55);
    expect(s.reputation).toBe(53);
    expect(s.hasFlag('trail_sponsor')).toBe(true);
  });

  it('hiring adds staff and morale; paid training raises a station skill level', () => {
    const s = new GameState();
    const e = new DecisionEngine(s);
    play(e, 'hiring_start', 0);
    expect(s.modifier('staffCount')).toBe(1);
    expect(s.staffMorale).toBe(65);
    expect(s.cash).toBe(1300);
    play(e, 'staff_training', 0);
    expect(s.skill('suspension_bench')).toBe(2);
    expect(s.skill('frame_jig')).toBe(1);
    expect(s.staffMorale).toBe(75);
  });

  it('buying inventory raises inventory health; budget parts lower quality', () => {
    const s = new GameState();
    const e = new DecisionEngine(s);
    play(e, 'supplier_intro', 1);
    expect(s.inventoryHealth).toBe(100);
    expect(s.modifier('partsQualityBonus')).toBe(-5);
    expect(s.cash).toBe(1350);
  });

  it('clears flags when a choice says so', () => {
    const s = new GameState();
    const e = new DecisionEngine(s);
    play(e, 'pricing_start', 0);
    play(e, 'price_complaints', 1);
    expect(s.hasFlag('premium_pricing')).toBe(false);
    expect(s.modifier('priceMultiplier')).toBeCloseTo(1.0);
  });
});

describe('branching flags lock and unlock options', () => {
  it('the group ride unlocks only after helping the trail crew', () => {
    const s = new GameState();
    const e = new DecisionEngine(s);
    expect(e.enter('marketing_start').choices[2].locked).toBe(true);
    expect(() => e.choose('marketing_start', 2)).toThrow(/locked/);
    play(e, 'sponsor_start', 1);
    expect(e.enter('marketing_start').choices[2].locked).toBe(false);
  });

  it('staff overtime is only offered once you have staff', () => {
    const s = new GameState();
    const e = new DecisionEngine(s);
    expect(e.enter('big_rush').choices[2].locked).toBe(true);
    play(e, 'hiring_start', 1);
    expect(e.enter('big_rush').choices[2].locked).toBe(false);
  });

  it('a generous warranty locks "charge for it" on warranty claims', () => {
    const s = new GameState();
    const e = new DecisionEngine(s);
    play(e, 'warranty_start', 0);
    expect(e.enter('warranty_claim').choices[1].locked).toBe(true);
  });

  it('cash thresholds lock expensive options', () => {
    const s = new GameState();
    s.applyEffect({ var: 'cash', set: 100 });
    const e = new DecisionEngine(s);
    expect(e.enter('supplier_intro').choices[0].locked).toBe(true);
    expect(meets({ min: { cash: 50 } }, s)).toBe(true);
  });

  it('early choices unlock later events', () => {
    const s = new GameState();
    const e = new DecisionEngine(s);
    for (let d = 1; d < 4; d++) s.nextDay();
    expect(e.eligibleEvents('end_of_day').map((ev) => ev.id)).not.toContain('ev_staff_training');
    play(e, 'hiring_start', 1);
    expect(e.eligibleEvents('end_of_day').map((ev) => ev.id)).toContain('ev_staff_training');
  });

  it('cheap parts lead to a follow-up supplier event; premium parts lead to a loyalty offer', () => {
    const cheap = new GameState();
    const e1 = new DecisionEngine(cheap);
    e1.begin('supplier_offer');
    play(e1, 'supplier_intro', 1);
    expect(e1.begin('supplier_offer')?.id).toBe('ev_supplier_cheap');

    const premium = new GameState();
    const e2 = new DecisionEngine(premium);
    e2.begin('supplier_offer');
    play(e2, 'supplier_intro', 0);
    expect(e2.begin('supplier_offer')?.id).toBe('ev_supplier_loyalty');
  });
});

describe('event scheduling', () => {
  it('fires one-off events once, in priority order, then falls back', () => {
    const s = new GameState();
    const e = new DecisionEngine(s);
    expect(e.begin('end_of_day')?.id).toBe('ev_pricing');
    expect(e.begin('end_of_day')?.id).toBe('ev_quiet_evening');
    s.nextDay();
    expect(e.begin('end_of_day')?.id).toBe('ev_hiring');
  });

  it('a normal game hits at least five different decisions in three days', () => {
    const s = new GameState();
    const e = new DecisionEngine(s);
    const seen = new Set<string>();
    const run = (t: Trigger) => {
      const ev = e.begin(t)!;
      seen.add(ev.entry);
      e.enter(ev.entry);
      e.choose(ev.entry, e.view(ev.entry).choices.findIndex((c) => !c.locked));
    };
    run('end_of_day'); // day 1
    s.nextDay();
    run('supplier_offer'); // day 2 morning
    run('big_customer');
    run('end_of_day');
    s.nextDay();
    run('end_of_day'); // day 3
    expect(seen.size).toBeGreaterThanOrEqual(5);
  });
});

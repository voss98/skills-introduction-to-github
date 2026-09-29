import raw from '../data/decisions.json';
import { isSourced, type Sourced } from './balance';
import type { Effect, EffectVar, GameState } from './gameState';
import type { Trigger } from './shop';

/**
 * Data-driven decision tree. Events map a gameplay trigger to an entry node;
 * nodes show text and choices, apply effects, and set/clear flags that lock or
 * unlock later choices and events.
 */

export const END = 'END';

export interface Requirement {
  /** All of these flags must be set. */
  flags?: string[];
  /** At least one of these flags must be set. */
  any_flags?: string[];
  /** None of these flags may be set. */
  not_flags?: string[];
  /** Variable must be >= value. */
  min?: Partial<Record<EffectVar, Sourced | number>>;
  /** Variable must be <= value. */
  max?: Partial<Record<EffectVar, Sourced | number>>;
}

export interface DecisionChoice {
  text: string;
  requires?: Requirement;
  effects?: Effect[];
  sets_flags?: string[];
  clears_flags?: string[];
  next: string;
}

export interface DecisionNode {
  id: string;
  speaker?: string;
  text: string;
  requires?: Requirement;
  effects?: Effect[];
  sets_flags?: string[];
  choices?: DecisionChoice[];
  next?: string;
}

export interface DecisionEvent {
  id: string;
  trigger: Trigger;
  entry: string;
  minDay: number;
  priority: number;
  once: boolean;
  requires?: Requirement;
}

export interface DecisionData {
  events: DecisionEvent[];
  nodes: Record<string, DecisionNode>;
}

export const DECISIONS = raw as unknown as DecisionData;

const num = (v: Sourced | number | undefined) => (v === undefined ? undefined : isSourced(v) ? (v.value as number) : v);

export function meets(req: Requirement | undefined, state: GameState): boolean {
  if (!req) return true;
  if (req.flags && !req.flags.every((f) => state.hasFlag(f))) return false;
  if (req.any_flags && !req.any_flags.some((f) => state.hasFlag(f))) return false;
  if (req.not_flags && req.not_flags.some((f) => state.hasFlag(f))) return false;
  for (const [k, v] of Object.entries(req.min ?? {})) {
    if (state.get(k as EffectVar) < num(v)!) return false;
  }
  for (const [k, v] of Object.entries(req.max ?? {})) {
    if (state.get(k as EffectVar) > num(v)!) return false;
  }
  return true;
}

/** What the UI shows for a node. */
export interface NodeView {
  id: string;
  speaker?: string;
  text: string;
  choices: { text: string; locked: boolean }[];
}

/** The before/after of every variable a choice changed, for feedback text. */
export type StateDiff = { var: EffectVar | `skill:${string}`; before: number; after: number }[];

export class DecisionEngine {
  constructor(
    readonly state: GameState,
    readonly data: DecisionData = DECISIONS,
  ) {}

  node(id: string): DecisionNode {
    const n = this.data.nodes[id];
    if (!n) throw new Error(`Unknown decision node: ${id}`);
    return n;
  }

  /** Events that could fire for this trigger right now, best first. */
  eligibleEvents(trigger: Trigger): DecisionEvent[] {
    const fired = this.state.snapshot.eventsFired;
    return this.data.events
      .filter(
        (e) =>
          e.trigger === trigger &&
          this.state.day >= e.minDay &&
          !(e.once && fired.includes(e.id)) &&
          meets(e.requires, this.state),
      )
      .sort((a, b) => b.priority - a.priority);
  }

  /** Pick the event for a trigger and mark it fired. Returns null if nothing is eligible. */
  begin(trigger: Trigger): DecisionEvent | null {
    const ev = this.eligibleEvents(trigger)[0] ?? null;
    if (ev) this.state.markEventFired(ev.id);
    return ev;
  }

  /** Enter a node: apply its own effects and flags, return what to display. */
  enter(id: string): NodeView {
    const n = this.node(id);
    this.state.markDecisionSeen(id);
    this.state.applyEffects(n.effects);
    for (const f of n.sets_flags ?? []) this.state.setFlag(f);
    return this.view(id);
  }

  view(id: string): NodeView {
    const n = this.node(id);
    return {
      id,
      speaker: n.speaker,
      text: n.text,
      choices: (n.choices ?? []).map((c) => ({ text: c.text, locked: !meets(c.requires, this.state) })),
    };
  }

  /** Pick a choice: apply effects and flags, return the next node id (or END) plus what changed. */
  choose(nodeId: string, index: number): { next: string; diff: StateDiff } {
    const n = this.node(nodeId);
    const c = n.choices?.[index];
    if (!c) throw new Error(`Node ${nodeId} has no choice ${index}`);
    if (!meets(c.requires, this.state)) throw new Error(`Choice "${c.text}" is locked`);
    const before = this.snapshotVars();
    this.state.applyEffects(c.effects);
    for (const f of c.sets_flags ?? []) this.state.setFlag(f);
    for (const f of c.clears_flags ?? []) this.state.clearFlag(f);
    return { next: c.next, diff: this.diff(before, this.snapshotVars()) };
  }

  /** For nodes without choices: where A leads. */
  advance(nodeId: string): string {
    return this.node(nodeId).next ?? END;
  }

  private snapshotVars(): Record<string, number> {
    const s = this.state.snapshot;
    return {
      cash: s.cash,
      reputation: s.reputation,
      staffMorale: s.staffMorale,
      inventoryHealth: s.inventoryHealth,
      communityGoodwill: s.communityGoodwill,
      ...Object.fromEntries(Object.entries(s.skills).map(([k, v]) => [`skill:${k}`, v])),
      ...s.modifiers,
    };
  }

  private diff(a: Record<string, number>, b: Record<string, number>): StateDiff {
    return Object.keys(b)
      .filter((k) => a[k] !== b[k])
      .map((k) => ({ var: k as StateDiff[number]['var'], before: a[k], after: b[k] }));
  }
}

const LABELS: Record<string, string> = {
  cash: 'CASH',
  reputation: 'REP',
  staffMorale: 'MORALE',
  inventoryHealth: 'PARTS',
  communityGoodwill: 'GOODWILL',
  priceMultiplier: 'PRICES',
  partsCostMultiplier: 'PARTS COST',
  partsQualityBonus: 'PARTS QUALITY',
  extraCustomersPerDay: 'CUSTOMERS/DAY',
  staffCount: 'STAFF',
  'skill:frame_jig': 'FRAME SKILL',
  'skill:wheel_stand': 'WHEEL SKILL',
  'skill:drivetrain_bench': 'DRIVETRAIN SKILL',
  'skill:suspension_bench': 'SUSPENSION SKILL',
};

/** One line per changed variable, e.g. "CASH -$300", "GOODWILL +15", "PRICES X1.2". */
export function describeDiff(diff: StateDiff): string[] {
  return diff.map(({ var: v, before, after }) => {
    const d = Math.round((after - before) * 100) / 100;
    const label = LABELS[v] ?? v.toUpperCase();
    if (v === 'cash') return `${label} ${d < 0 ? '-' : '+'}$${Math.abs(d)}`;
    if (v === 'priceMultiplier' || v === 'partsCostMultiplier') return `${label} X${after.toFixed(2)}`;
    return `${label} ${d > 0 ? '+' : ''}${d}`;
  });
}

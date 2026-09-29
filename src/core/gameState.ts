import { BALANCE } from './balance';

/**
 * The single source of truth for shop progress. Every system (HUD, jobs,
 * decisions, and later stats/training/endings) reads and writes through here.
 */

/** 0..100 stats. */
export const STAT_KEYS = ['reputation', 'staffMorale', 'inventoryHealth', 'communityGoodwill'] as const;
export type StatKey = (typeof STAT_KEYS)[number];

/** Stations that run minigames and have a skill level. */
export const WORK_STATIONS = ['frame_jig', 'wheel_stand', 'drivetrain_bench', 'suspension_bench'] as const;
export type WorkStationId = (typeof WORK_STATIONS)[number];

/** Numeric knobs that decisions can turn and gameplay reads. */
export const MODIFIER_DEFAULTS = {
  priceMultiplier: 1,
  partsCostMultiplier: 1,
  partsQualityBonus: 0,
  extraCustomersPerDay: 0,
  staffCount: 0,
  /** Multiplies reputation gained from happy customers (Customer Service Workshop). */
  reputationGainMultiplier: 1,
};
export type ModifierKey = keyof typeof MODIFIER_DEFAULTS;
export const MODIFIER_KEYS = Object.keys(MODIFIER_DEFAULTS) as ModifierKey[];

/** Every variable an effect can target. */
export type EffectVar = 'cash' | StatKey | 'skill' | ModifierKey;

export interface Effect {
  var: EffectVar;
  /** Added to the current value. */
  delta?: number;
  /** Replaces the current value (applied before delta if both given). */
  set?: number;
  /** For var "skill": which station, or "all". */
  station?: WorkStationId | 'all';
  /** Where the number came from: "placeholder" until backed by a real source. */
  source?: string;
}

export interface GameStateData {
  day: number;
  cash: number;
  reputation: number;
  staffMorale: number;
  inventoryHealth: number;
  communityGoodwill: number;
  skills: Record<WorkStationId, number>;
  modifiers: Record<ModifierKey, number>;
  flags: string[];
  /** Ids of decision nodes the player has seen, in order. */
  decisionsSeen: string[];
  /** Ids of one-off decision events already fired. */
  eventsFired: string[];
  /** Training programs completed (one entry per enrollment). */
  trainingDone: string[];
}

export type StateListener = (state: Readonly<GameStateData>) => void;

const { statMin, statMax, skillMin, skillMax, modifierMin } = BALANCE.limits;
const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

export function initialState(): GameStateData {
  const s = BALANCE.startingState;
  return {
    day: s.day,
    cash: s.cash,
    reputation: s.reputation,
    staffMorale: s.staffMorale,
    inventoryHealth: s.inventoryHealth,
    communityGoodwill: s.communityGoodwill,
    skills: Object.fromEntries(WORK_STATIONS.map((id) => [id, s.stationSkill])) as Record<WorkStationId, number>,
    modifiers: { ...MODIFIER_DEFAULTS },
    flags: [],
    decisionsSeen: [],
    eventsFired: [],
    trainingDone: [],
  };
}

export class GameState {
  private data: GameStateData;
  private listeners = new Set<StateListener>();

  constructor(data: GameStateData = initialState()) {
    this.data = structuredClone(data);
  }

  get snapshot(): Readonly<GameStateData> {
    return this.data;
  }

  get day() { return this.data.day; }
  get cash() { return this.data.cash; }
  get reputation() { return this.data.reputation; }
  get staffMorale() { return this.data.staffMorale; }
  get inventoryHealth() { return this.data.inventoryHealth; }
  get communityGoodwill() { return this.data.communityGoodwill; }

  /** Overall skill level: the average of all station skills. */
  get skillLevel(): number {
    const vals = WORK_STATIONS.map((id) => this.data.skills[id]);
    return vals.reduce((a, b) => a + b, 0) / vals.length;
  }

  skill(station: WorkStationId): number {
    return this.data.skills[station];
  }

  modifier(key: ModifierKey): number {
    return this.data.modifiers[key];
  }

  /** Read any effect variable by name (skill = overall average). */
  get(v: EffectVar | `skill:${WorkStationId}`): number {
    if (v.startsWith('skill:')) return this.data.skills[v.slice(6) as WorkStationId];
    if (v === 'cash') return this.data.cash;
    if (v === 'skill') return this.skillLevel;
    if ((STAT_KEYS as readonly string[]).includes(v)) return this.data[v as StatKey];
    return this.data.modifiers[v as ModifierKey];
  }

  hasFlag(flag: string): boolean {
    return this.data.flags.includes(flag);
  }

  setFlag(flag: string): void {
    if (!this.hasFlag(flag)) {
      this.data.flags.push(flag);
      this.emit();
    }
  }

  clearFlag(flag: string): void {
    const before = this.data.flags.length;
    this.data.flags = this.data.flags.filter((f) => f !== flag);
    if (this.data.flags.length !== before) this.emit();
  }

  applyEffect(e: Effect): void {
    const next = (cur: number) => (e.set ?? cur) + (e.delta ?? 0);
    if (e.var === 'cash') {
      this.data.cash = Math.round(next(this.data.cash));
    } else if (e.var === 'skill') {
      const targets = !e.station || e.station === 'all' ? WORK_STATIONS : [e.station];
      for (const id of targets) this.data.skills[id] = clamp(next(this.data.skills[id]), skillMin, skillMax);
    } else if ((STAT_KEYS as readonly string[]).includes(e.var)) {
      const k = e.var as StatKey;
      this.data[k] = clamp(Math.round(next(this.data[k])), statMin, statMax);
    } else if ((MODIFIER_KEYS as string[]).includes(e.var)) {
      const k = e.var as ModifierKey;
      this.data.modifiers[k] = Math.max(modifierMin[k], Math.round(next(this.data.modifiers[k]) * 100) / 100);
    } else {
      throw new Error(`Unknown effect variable: ${String(e.var)}`);
    }
    this.emit();
  }

  applyEffects(effects: readonly Effect[] = []): void {
    for (const e of effects) this.applyEffect(e);
  }

  addCash(amount: number): void {
    this.applyEffect({ var: 'cash', delta: amount });
  }

  adjust(stat: StatKey, delta: number): void {
    this.applyEffect({ var: stat, delta });
  }

  nextDay(): void {
    this.data.day += 1;
    this.emit();
  }

  markDecisionSeen(nodeId: string): void {
    this.data.decisionsSeen.push(nodeId);
  }

  markTraining(programId: string): void {
    this.data.trainingDone.push(programId);
    this.emit();
  }

  markEventFired(eventId: string): void {
    if (!this.data.eventsFired.includes(eventId)) this.data.eventsFired.push(eventId);
  }

  reset(data: GameStateData = initialState()): void {
    this.data = structuredClone(data);
    this.emit();
  }

  subscribe(fn: StateListener): () => void {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }

  private emit(): void {
    for (const fn of this.listeners) fn(this.data);
  }
}

/** The shared game state for the running game. */
export const gameState = new GameState();

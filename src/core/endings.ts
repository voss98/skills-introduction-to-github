import raw from '../data/endings.json';
import { BALANCE, unwrap } from './balance';
import { calendar } from './calendar';
import { meets, type Requirement } from './decisions';
import type { GameState } from './gameState';

export interface EndingDriver {
  flag?: string;
  stat?: 'cash' | 'reputation' | 'staffMorale' | 'communityGoodwill';
  above?: number;
  below?: number;
  text: string;
}

export interface Ending {
  id: string;
  title: string;
  secret?: boolean;
  priority: number;
  vignette: string;
  conditions: Requirement;
  text: string;
  drivers: EndingDriver[];
}

// Conditions keep their { value, source } wrappers for `meets`; everything else is plain.
export const ENDINGS: Ending[] = (raw.endings as unknown as Ending[])
  .map((e) => ({ ...e, drivers: unwrap(e.drivers) as EndingDriver[] }))
  .sort((a, b) => b.priority - a.priority);

export const ending = (id: string) => {
  const e = ENDINGS.find((x) => x.id === id);
  if (!e) throw new Error(`Unknown ending ${id}`);
  return e;
};

/** Highest-priority ending whose conditions all hold. There is always a fallback. */
export function chooseEnding(state: GameState): Ending {
  return ENDINGS.find((e) => meets(e.conditions, state)) ?? ENDINGS[ENDINGS.length - 1];
}

export type RunEndReason = 'bankrupt' | 'sold' | 'complete';

/** Checked at closing time, after the end-of-day decision. */
export function runEndReason(state: GameState, totalDays = calendar.totalDays): RunEndReason | null {
  if (state.cash < BALANCE.calendar.bankruptcyCash) return 'bankrupt';
  if (state.hasFlag('sold_to_chain')) return 'sold';
  if (state.day >= totalDays) return 'complete';
  return null;
}

/** The flags and stats that pushed the player toward this ending (max 4 lines). */
export function choicesThatMattered(e: Ending, state: GameState): string[] {
  const hits = e.drivers.filter((d) => {
    if (d.flag) return state.hasFlag(d.flag);
    if (d.stat) {
      const v = state.get(d.stat);
      return (d.above === undefined || v > d.above) && (d.below === undefined || v < d.below);
    }
    return false;
  });
  const lines = hits.map((d) => d.text);
  return lines.length ? lines.slice(0, 4) : ['Steady, everyday choices got you here.'];
}

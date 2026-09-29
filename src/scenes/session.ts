import { calendar } from '../core/calendar';
import { DecisionEngine } from '../core/decisions';
import type { RunEndReason } from '../core/endings';
import { gameState } from '../core/gameState';
import { makeSave, readSave, restore, writeSave } from '../core/save';
import { ShopController, type Trigger } from '../core/shop';

const params = new URLSearchParams(typeof window !== 'undefined' ? window.location.search : '');
const seedParam = Number(params.get('seed'));
const runDaysParam = Number(params.get('runDays'));
const newSeed = () => (Number.isFinite(seedParam) && seedParam > 0 ? seedParam : Math.floor(Math.random() * 1e6));

/** The running game's shared objects, kept across scene restarts. */
export const session = {
  shop: new ShopController(gameState, newSeed()),
  decisions: new DecisionEngine(gameState),
  started: false,
  /** Station to spawn next to when the shop scene next starts (e.g. back from training). */
  spawnAt: undefined as string | undefined,
  /** End-of-day and morning events still to play after days spent away at training. */
  pendingTriggers: null as Trigger[] | null,
  /** Dev/testing: ?job=trail_build puts that customer first in line on day 1. */
  debugJob: params.get('job'),
  /** Run length in days. ?runDays=N shortens it for testing. */
  totalDays: Number.isFinite(runDaysParam) && runDaysParam > 0 ? runDaysParam : calendar.totalDays,
  lastEnd: null as RunEndReason | null,
};

/** Autosave the current run (end of each day, and on Save & Quit). */
export function saveGame(): boolean {
  return writeSave(makeSave(gameState, session.shop));
}

/** Load the saved run, if any. Returns false when there is no valid save. */
export function continueGame(): boolean {
  const data = readSave();
  if (!data) return false;
  session.shop = restore(data, gameState);
  session.decisions = new DecisionEngine(gameState);
  session.started = true;
  session.spawnAt = undefined;
  session.pendingTriggers = null;
  session.lastEnd = null;
  return true;
}

/** Throw away the current run and start fresh. */
export function newGame(seed = newSeed()): void {
  gameState.reset();
  session.shop = new ShopController(gameState, seed);
  session.decisions = new DecisionEngine(gameState);
  session.started = false;
  session.spawnAt = undefined;
  session.pendingTriggers = null;
  session.lastEnd = null;
}

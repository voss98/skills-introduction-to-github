import type { GameState, GameStateData } from './gameState';
import { ShopController, type ShopSnapshot } from './shop';

/** Save games live in this browser's localStorage. One slot, autosaved each day. */
export const SAVE_KEY = 'trail-shop-tycoon.save.v1';
export const SAVE_VERSION = 1;

export interface SaveData {
  version: number;
  savedAt: string;
  state: GameStateData;
  shop: ShopSnapshot;
}

/** Minimal storage interface so tests can pass an in-memory store. */
export interface KeyValueStore {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

const defaultStore = (): KeyValueStore | undefined => {
  try {
    return globalThis.localStorage ?? undefined;
  } catch {
    return undefined;
  }
};

export function makeSave(state: GameState, shop: ShopController): SaveData {
  return { version: SAVE_VERSION, savedAt: new Date().toISOString(), state: structuredClone(state.snapshot) as GameStateData, shop: shop.toJSON() };
}

export function writeSave(data: SaveData, store = defaultStore()): boolean {
  try {
    store?.setItem(SAVE_KEY, JSON.stringify(data));
    return !!store;
  } catch {
    return false;
  }
}

export function readSave(store = defaultStore()): SaveData | null {
  try {
    const raw = store?.getItem(SAVE_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw) as SaveData;
    return data.version === SAVE_VERSION && data.state && data.shop ? data : null;
  } catch {
    return null;
  }
}

export function clearSave(store = defaultStore()): void {
  try {
    store?.removeItem(SAVE_KEY);
  } catch {
    /* ignore */
  }
}

/** Restore a save into the given game state; returns the rebuilt shop. */
export function restore(data: SaveData, state: GameState): ShopController {
  state.reset(data.state);
  return ShopController.fromJSON(state, data.shop);
}

import { describe, expect, it } from 'vitest';
import { GameState } from '../src/core/gameState';
import { clearSave, makeSave, readSave, restore, SAVE_KEY, writeSave, type KeyValueStore } from '../src/core/save';
import { ShopController } from '../src/core/shop';

class MemoryStore implements KeyValueStore {
  data = new Map<string, string>();
  getItem = (k: string) => this.data.get(k) ?? null;
  setItem = (k: string, v: string) => void this.data.set(k, v);
  removeItem = (k: string) => void this.data.delete(k);
}

describe('save and load', () => {
  it('round-trips game state and a half-finished job', () => {
    const state = new GameState();
    const shop = new ShopController(state, 11);
    shop.startDay();
    state.setFlag('hired_staff');
    state.applyEffect({ var: 'skill', station: 'wheel_stand', set: 3 });
    state.markDecisionSeen('pricing_start');
    const c = shop.walkIn('bent_hanger');
    shop.accept(c, true);
    shop.finishTask(shop.taskAt('drivetrain_bench')!, 88);
    shop.advance(30);

    const store = new MemoryStore();
    expect(writeSave(makeSave(state, shop), store)).toBe(true);

    const loadedState = new GameState();
    const data = readSave(store)!;
    const loaded = restore(data, loadedState);
    expect(loadedState.snapshot).toEqual(state.snapshot);
    expect(loaded.minute).toBe(shop.minute);
    expect(loaded.worked).toBe(shop.worked);
    expect(loaded.customers.map((x) => x.id)).toEqual(shop.customers.map((x) => x.id));
    expect(loaded.activeJob!.rush).toBe(true);
    expect(loaded.activeJob!.tasks.map((t) => [t.def.id, t.done, t.quality])).toEqual(shop.activeJob!.tasks.map((t) => [t.def.id, t.done, t.quality]));

    // The loaded job can be finished and paid like the original.
    const rest = loaded.taskAt('drivetrain_bench')!;
    loaded.finishTask(rest, 90);
    expect(loaded.handOver().payment).toBeGreaterThan(0);
  });

  it('ignores missing, corrupt or old-version saves', () => {
    const store = new MemoryStore();
    expect(readSave(store)).toBeNull();
    store.setItem(SAVE_KEY, '{not json');
    expect(readSave(store)).toBeNull();
    store.setItem(SAVE_KEY, JSON.stringify({ version: 0, state: {}, shop: {} }));
    expect(readSave(store)).toBeNull();
  });

  it('clearSave removes the slot (used when a run ends)', () => {
    const store = new MemoryStore();
    writeSave(makeSave(new GameState(), new ShopController(new GameState(), 1)), store);
    clearSave(store);
    expect(readSave(store)).toBeNull();
  });

  it('writeSave reports failure when storage throws (private mode)', () => {
    const broken: KeyValueStore = {
      getItem: () => null,
      setItem: () => {
        throw new Error('QuotaExceeded');
      },
      removeItem: () => {},
    };
    expect(writeSave(makeSave(new GameState(), new ShopController(new GameState(), 1)), broken)).toBe(false);
  });
});

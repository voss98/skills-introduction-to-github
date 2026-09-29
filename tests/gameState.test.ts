import { describe, expect, it } from 'vitest';
import { GameState, WORK_STATIONS } from '../src/core/gameState';
import { BALANCE } from '../src/core/balance';

describe('GameState', () => {
  it('starts from the balance file', () => {
    const s = new GameState();
    expect(s.cash).toBe(BALANCE.startingState.cash);
    expect(s.reputation).toBe(BALANCE.startingState.reputation);
    expect(s.day).toBe(1);
    for (const id of WORK_STATIONS) expect(s.skill(id)).toBe(1);
    expect(s.skillLevel).toBe(1);
  });

  it('applies deltas and sets, clamping 0..100 stats and 1..5 skills', () => {
    const s = new GameState();
    s.applyEffect({ var: 'reputation', delta: 500 });
    expect(s.reputation).toBe(100);
    s.applyEffect({ var: 'staffMorale', set: 10, delta: -50 });
    expect(s.staffMorale).toBe(0);
    s.applyEffect({ var: 'skill', station: 'wheel_stand', delta: 10 });
    expect(s.skill('wheel_stand')).toBe(5);
    s.applyEffect({ var: 'skill', station: 'all', delta: 1 });
    expect(s.skill('frame_jig')).toBe(2);
    s.applyEffect({ var: 'cash', delta: -5000 });
    expect(s.cash).toBe(BALANCE.startingState.cash - 5000); // cash can go negative
  });

  it('tracks flags and notifies subscribers', () => {
    const s = new GameState();
    let calls = 0;
    const off = s.subscribe(() => calls++);
    s.setFlag('hired_mechanic');
    s.setFlag('hired_mechanic');
    expect(s.hasFlag('hired_mechanic')).toBe(true);
    expect(calls).toBe(1);
    off();
    s.clearFlag('hired_mechanic');
    expect(calls).toBe(1);
  });

  it('rejects unknown variables', () => {
    const s = new GameState();
    expect(() => s.applyEffect({ var: 'nope' as never, delta: 1 })).toThrow();
  });
});

import { describe, expect, it } from 'vitest';
import { DEFAULT_KEYMAP, GB_INPUTS, mapKey } from '../src/input/keymap';
import { InputManager } from '../src/input/InputManager';

describe('key-to-input mapping', () => {
  it.each([
    ['ArrowUp', 'UP'],
    ['ArrowDown', 'DOWN'],
    ['ArrowLeft', 'LEFT'],
    ['ArrowRight', 'RIGHT'],
    ['KeyX', 'A'],
    ['KeyZ', 'B'],
    ['Enter', 'START'],
    ['ShiftLeft', 'SELECT'],
    ['ShiftRight', 'SELECT'],
  ])('%s -> %s', (code, input) => {
    expect(mapKey(code)).toBe(input);
  });

  it('every Game Boy input has at least one key', () => {
    const mapped = new Set(Object.values(DEFAULT_KEYMAP));
    for (const input of GB_INPUTS) expect(mapped.has(input)).toBe(true);
  });

  it('ignores unmapped keys, including prototype names', () => {
    expect(mapKey('KeyQ')).toBeUndefined();
    expect(mapKey('Space')).toBeUndefined();
    expect(mapKey('toString')).toBeUndefined();
  });
});

describe('InputManager', () => {
  it('reports presses as abstract inputs with one-frame edges', () => {
    const m = new InputManager();
    expect(m.handleKeyDown('KeyX')).toBe(true);
    m.update();
    expect(m.isDown('A')).toBe(true);
    expect(m.justPressed('A')).toBe(true);
    m.update();
    expect(m.isDown('A')).toBe(true);
    expect(m.justPressed('A')).toBe(false);
    m.handleKeyUp('KeyX');
    m.update();
    expect(m.isDown('A')).toBe(false);
    expect(m.justReleased('A')).toBe(true);
  });

  it('does not lose a tap that starts and ends between frames', () => {
    const m = new InputManager();
    m.press('START', 'touch');
    m.release('START', 'touch');
    m.update();
    expect(m.justPressed('START')).toBe(true);
    expect(m.isDown('START')).toBe(false);
  });

  it('keeps an input held while any source holds it', () => {
    const m = new InputManager();
    m.handleKeyDown('ShiftLeft');
    m.press('SELECT', 'touch');
    m.handleKeyUp('ShiftLeft');
    m.update();
    expect(m.isDown('SELECT')).toBe(true);
    m.release('SELECT', 'touch');
    expect(m.isDown('SELECT')).toBe(false);
  });

  it('consume() hides a press from later readers in the same frame', () => {
    const m = new InputManager();
    m.press('A');
    m.update();
    m.consume('A');
    expect(m.justPressed('A')).toBe(false);
  });

  it('releaseAll() clears held inputs (e.g. on window blur)', () => {
    const m = new InputManager();
    m.handleKeyDown('ArrowLeft');
    m.releaseAll();
    m.update();
    expect(m.isDown('LEFT')).toBe(false);
  });
});

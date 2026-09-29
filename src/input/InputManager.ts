import { DEFAULT_KEYMAP, GB_INPUTS, mapKey, type GBInput } from './keymap';

/** Read-only view of the pad that scenes and minigames consume. */
export interface InputReader {
  isDown(input: GBInput): boolean;
  justPressed(input: GBInput): boolean;
  justReleased(input: GBInput): boolean;
}

/**
 * Collects presses from any number of sources (keyboard, touch buttons, tests)
 * and exposes them as abstract Game Boy inputs.
 *
 * Edge detection is frame-based: call `update()` exactly once per game step.
 * A press that starts and ends between two updates still registers as
 * `justPressed` for one frame, so quick taps on touch screens are never lost.
 */
export class InputManager implements InputReader {
  private held = new Map<GBInput, Set<string>>();
  private latchedPresses = new Set<GBInput>();
  private latchedReleases = new Set<GBInput>();
  private pressedNow = new Set<GBInput>();
  private releasedNow = new Set<GBInput>();
  private consumed = new Set<GBInput>();
  private listeners: Array<(input: GBInput) => void> = [];

  constructor(private keymap: Readonly<Record<string, GBInput>> = DEFAULT_KEYMAP) {
    for (const input of GB_INPUTS) this.held.set(input, new Set());
  }

  press(input: GBInput, source = 'default'): void {
    const sources = this.held.get(input)!;
    if (sources.size === 0) {
      this.latchedPresses.add(input);
      for (const fn of this.listeners) fn(input);
    }
    sources.add(source);
  }

  release(input: GBInput, source = 'default'): void {
    const sources = this.held.get(input)!;
    if (!sources.delete(source)) return;
    if (sources.size === 0) this.latchedReleases.add(input);
  }

  releaseAll(): void {
    for (const input of GB_INPUTS) {
      if (this.held.get(input)!.size > 0) this.latchedReleases.add(input);
      this.held.get(input)!.clear();
    }
  }

  /** Returns true when the key is mapped (so callers can preventDefault). */
  handleKeyDown(code: string): boolean {
    const input = mapKey(code, this.keymap);
    if (input) this.press(input, `key:${code}`);
    return input !== undefined;
  }

  handleKeyUp(code: string): boolean {
    const input = mapKey(code, this.keymap);
    if (input) this.release(input, `key:${code}`);
    return input !== undefined;
  }

  /** Advance one frame: latched edges become visible, old ones clear. */
  update(): void {
    this.pressedNow = this.latchedPresses;
    this.releasedNow = this.latchedReleases;
    this.latchedPresses = new Set();
    this.latchedReleases = new Set();
    this.consumed.clear();
  }

  isDown(input: GBInput): boolean {
    return this.held.get(input)!.size > 0;
  }

  justPressed(input: GBInput): boolean {
    return this.pressedNow.has(input) && !this.consumed.has(input);
  }

  justReleased(input: GBInput): boolean {
    return this.releasedNow.has(input);
  }

  /** Swallow this frame's press so no other reader acts on it. */
  consume(input: GBInput): void {
    this.consumed.add(input);
  }

  /** Raw press notifications (used by the input test log). Returns an unsubscribe fn. */
  onPress(fn: (input: GBInput) => void): () => void {
    this.listeners.push(fn);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== fn);
    };
  }
}

/** The single shared pad for the whole game. */
export const gamepad = new InputManager();

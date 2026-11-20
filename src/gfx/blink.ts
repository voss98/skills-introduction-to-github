import { sound } from '../audio/sound';

/**
 * Whether a blinking element is visible at `time` (ms): on for `onSteps` of every
 * `steps` periods. With "reduce flashing" on, it is always visible.
 */
export function blinkOn(time: number, period = 400, onSteps = 3, steps = 4): boolean {
  if (sound.current.reduceFlash) return true;
  return Math.floor(time / period) % steps < onSteps;
}

/** A small up/down bob (0 or 1 px), or 0 with "reduce flashing" on. */
export function bob(time: number, period = 300): number {
  return sound.current.reduceFlash ? 0 : Math.floor(time / period) % 2;
}

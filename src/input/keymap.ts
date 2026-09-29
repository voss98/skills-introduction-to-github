/** The abstract Game Boy inputs every scene reads. Scenes never see raw keys. */
export const GB_INPUTS = ['UP', 'DOWN', 'LEFT', 'RIGHT', 'A', 'B', 'START', 'SELECT'] as const;
export type GBInput = (typeof GB_INPUTS)[number];

/**
 * Keyboard mapping, keyed by KeyboardEvent.code (layout-independent physical key).
 * D-pad = arrows, A = X, B = Z, Start = Enter, Select = Shift.
 */
export const DEFAULT_KEYMAP: Readonly<Record<string, GBInput>> = {
  ArrowUp: 'UP',
  ArrowDown: 'DOWN',
  ArrowLeft: 'LEFT',
  ArrowRight: 'RIGHT',
  KeyX: 'A',
  KeyZ: 'B',
  Enter: 'START',
  NumpadEnter: 'START',
  ShiftLeft: 'SELECT',
  ShiftRight: 'SELECT',
};

export function mapKey(code: string, keymap: Readonly<Record<string, GBInput>> = DEFAULT_KEYMAP): GBInput | undefined {
  return Object.prototype.hasOwnProperty.call(keymap, code) ? keymap[code] : undefined;
}

/** Player settings, kept in this browser's localStorage (falls back to defaults). */
export interface Settings {
  musicVolume: number; // 0..10
  sfxVolume: number; // 0..10
  muted: boolean;
  /** Id of the color palette (see src/data/palettes.json). */
  paletteId: string;
  /** How fast text boxes type out. */
  textSpeed: TextSpeed;
  /** Stop cursors, markers and prompts from blinking or bobbing. */
  reduceFlash: boolean;
  /** Show first-day tutorial tips in new runs. */
  tutorial: boolean;
}

export const TEXT_SPEEDS = ['slow', 'normal', 'fast', 'instant'] as const;
export type TextSpeed = (typeof TEXT_SPEEDS)[number];

/** Characters typed per second for each text speed (instant shows the whole page at once). */
export const CHARS_PER_SECOND: Record<TextSpeed, number> = { slow: 35, normal: 90, fast: 200, instant: Infinity };

const KEY = 'trail-shop-tycoon.settings.v1';
export const DEFAULT_SETTINGS: Settings = { musicVolume: 6, sfxVolume: 8, muted: false, paletteId: 'dmg_green', textSpeed: 'normal', reduceFlash: false, tutorial: true };

export function loadSettings(): Settings {
  try {
    const raw = globalThis.localStorage?.getItem(KEY);
    if (raw) return { ...DEFAULT_SETTINGS, ...(JSON.parse(raw) as Partial<Settings>) };
  } catch {
    /* storage unavailable */
  }
  return { ...DEFAULT_SETTINGS };
}

export function saveSettings(s: Settings): void {
  try {
    globalThis.localStorage?.setItem(KEY, JSON.stringify(s));
  } catch {
    /* ignore */
  }
}

/** Player settings, kept in this browser's localStorage (falls back to defaults). */
export interface Settings {
  musicVolume: number; // 0..10
  sfxVolume: number; // 0..10
  muted: boolean;
}

const KEY = 'trail-shop-tycoon.settings.v1';
export const DEFAULT_SETTINGS: Settings = { musicVolume: 6, sfxVolume: 8, muted: false };

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

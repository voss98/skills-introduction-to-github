/** Which endings this browser has unlocked. Stored in localStorage; works without it. */
const KEY = 'trail-shop-tycoon.gallery.v1';
let memory: string[] = [];

export function unlockedEndings(): string[] {
  try {
    const raw = globalThis.localStorage?.getItem(KEY);
    if (raw) return JSON.parse(raw) as string[];
  } catch {
    /* storage blocked: fall back to memory */
  }
  return [...memory];
}

export function unlockEnding(id: string): void {
  const all = new Set(unlockedEndings());
  all.add(id);
  memory = [...all];
  try {
    globalThis.localStorage?.setItem(KEY, JSON.stringify(memory));
  } catch {
    /* ignore */
  }
}

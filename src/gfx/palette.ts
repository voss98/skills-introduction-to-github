import palettesData from '../data/palettes.json';

/** A 4-shade palette, darkest (0) to lightest (3). */
export interface Palette {
  id: string;
  name: string;
  colors: [string, string, string, string];
}

/** Every selectable palette, from src/data/palettes.json. The first is the default. */
export const PALETTES: Palette[] = palettesData.palettes as Palette[];

const toHex = (css: string) => parseInt(css.slice(1), 16);

/**
 * The active palette. These arrays are mutated in place by `applyPalette`, so
 * code that reads PALETTE[i] / PALETTE_HEX[i] at draw time always gets the
 * current colors. Index 0 = darkest, 3 = lightest.
 */
export const PALETTE: string[] = [...PALETTES[0].colors];
export const PALETTE_HEX: number[] = PALETTES[0].colors.map(toHex);
export type Shade = 0 | 1 | 2 | 3;

let activeId = PALETTES[0].id;
export const activePaletteId = () => activeId;

export function paletteById(id: string): Palette {
  return PALETTES.find((p) => p.id === id) ?? PALETTES[0];
}

/** Switch the active palette (unknown ids fall back to the default). Returns the palette used. */
export function applyPalette(id: string): Palette {
  const p = paletteById(id);
  activeId = p.id;
  p.colors.forEach((c, i) => {
    PALETTE[i] = c;
    PALETTE_HEX[i] = toHex(c);
  });
  // Keep the page around the screen (border, touch buttons) in the same colors.
  if (typeof document !== 'undefined') {
    p.colors.forEach((c, i) => document.documentElement.style.setProperty(`--gb-${i}`, c));
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', p.colors[0]);
  }
  return p;
}

/** The next/previous palette in the list, wrapping around. */
export function cyclePalette(id: string, dir: 1 | -1): Palette {
  const i = PALETTES.findIndex((p) => p.id === id);
  return PALETTES[(Math.max(0, i) + dir + PALETTES.length) % PALETTES.length];
}

/** Native Game Boy screen size. */
export const SCREEN_W = 160;
export const SCREEN_H = 144;

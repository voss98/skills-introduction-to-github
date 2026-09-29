/** The classic 4-shade DMG green palette. Index 0 = darkest, 3 = lightest. */
export const PALETTE = ['#0f380f', '#306230', '#8bac0f', '#9bbc0f'] as const;
export const PALETTE_HEX = [0x0f380f, 0x306230, 0x8bac0f, 0x9bbc0f] as const;
export type Shade = 0 | 1 | 2 | 3;

export const DARKEST = PALETTE_HEX[0];
export const DARK = PALETTE_HEX[1];
export const LIGHT = PALETTE_HEX[2];
export const LIGHTEST = PALETTE_HEX[3];

/** Native Game Boy screen size. */
export const SCREEN_W = 160;
export const SCREEN_H = 144;

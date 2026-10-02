import { describe, expect, it } from 'vitest';
import { applyPalette, cyclePalette, PALETTE, PALETTE_HEX, PALETTES } from '../src/gfx/palette';

/** Relative luminance (sRGB) so we can check shade order. */
function luminance(hex: string): number {
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255).map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}
const contrast = (a: string, b: string) => {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
};

describe('color palettes', () => {
  it('has several palettes with unique ids and short names', () => {
    expect(PALETTES.length).toBeGreaterThanOrEqual(5);
    expect(new Set(PALETTES.map((p) => p.id)).size).toBe(PALETTES.length);
    for (const p of PALETTES) expect(p.name.length, p.id).toBeLessThanOrEqual(10);
  });

  it('every palette is exactly 4 colors, darkest to lightest', () => {
    for (const p of PALETTES) {
      expect(p.colors.length, p.id).toBe(4);
      for (const c of p.colors) expect(c, p.id).toMatch(/^#[0-9a-f]{6}$/);
      const lum = p.colors.map(luminance);
      for (let i = 1; i < 4; i++) expect(lum[i], `${p.id} shade ${i}`).toBeGreaterThan(lum[i - 1]);
    }
  });

  it('text stays readable: darkest on lightest has at least 4.5:1 contrast', () => {
    for (const p of PALETTES) expect(contrast(p.colors[0], p.colors[3]), p.id).toBeGreaterThanOrEqual(4.5);
  });

  it('applyPalette swaps the active colors in place; unknown ids fall back to the default', () => {
    const before = PALETTE;
    const p = applyPalette('alpine_ice');
    expect(PALETTE).toBe(before); // same array object, new contents
    expect(PALETTE).toEqual(p.colors);
    expect(PALETTE_HEX[0]).toBe(parseInt(p.colors[0].slice(1), 16));
    expect(applyPalette('nope').id).toBe(PALETTES[0].id);
    expect(PALETTE).toEqual(PALETTES[0].colors);
  });

  it('cycling wraps around both ways', () => {
    const first = PALETTES[0].id;
    const last = PALETTES[PALETTES.length - 1].id;
    expect(cyclePalette(first, -1).id).toBe(last);
    expect(cyclePalette(last, 1).id).toBe(first);
  });
});

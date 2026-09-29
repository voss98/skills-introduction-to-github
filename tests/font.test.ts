import { describe, expect, it } from 'vitest';
import { FONT_CHARS, GLYPH_H, GLYPH_W, glyphRows, toFontText, wrapText } from '../src/gfx/font';

describe('pixel font', () => {
  it('every glyph is exactly 5x7', () => {
    for (const ch of FONT_CHARS) {
      const rows = glyphRows(ch);
      expect(rows.length, `glyph ${ch}`).toBe(GLYPH_H);
      for (const row of rows) expect(row.length, `glyph ${ch}`).toBe(GLYPH_W);
    }
  });

  it('upper-cases and replaces unknown characters', () => {
    expect(toFontText('hi é')).toBe('HI ?');
  });

  it('wraps words to the line width', () => {
    const lines = wrapText('the quick brown fox jumps over the lazy dog', 12);
    for (const l of lines) expect(l.length).toBeLessThanOrEqual(12);
    expect(lines.join(' ')).toBe('THE QUICK BROWN FOX JUMPS OVER THE LAZY DOG');
  });

  it('splits words longer than a line', () => {
    expect(wrapText('abcdefghij', 4)).toEqual(['ABCD', 'EFGH', 'IJ']);
  });
});

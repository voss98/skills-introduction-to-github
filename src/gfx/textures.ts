import Phaser from 'phaser';
import { CELL_H, CELL_W, FONT_CHARS, GLYPH_H, GLYPH_W, glyphRows } from './font';
import { PALETTE, type Shade } from './palette';

export const fontKey = (shade: Shade) => `font${shade}`;

/** Pixel-art sources of every generated texture, so they can be repainted in a new palette. */
const pixelSources = new Map<string, string[][]>();

function paintFont(tex: Phaser.Textures.CanvasTexture, shade: Shade): void {
  const ctx = tex.getContext();
  ctx.clearRect(0, 0, tex.width, tex.height);
  ctx.fillStyle = PALETTE[shade];
  [...FONT_CHARS].forEach((ch, i) => {
    const rows = glyphRows(ch);
    for (let y = 0; y < GLYPH_H; y++) {
      for (let x = 0; x < GLYPH_W; x++) {
        if (rows[y][x]) ctx.fillRect(i * CELL_W + x, y, 1, 1);
      }
    }
  });
  tex.refresh();
}

function paintPixels(tex: Phaser.Textures.CanvasTexture, frames: string[][]): void {
  const fw = frames[0][0].length;
  const ctx = tex.getContext();
  ctx.clearRect(0, 0, tex.width, tex.height);
  frames.forEach((rows, f) => {
    rows.forEach((row, y) => {
      [...row].forEach((c, x) => {
        const shade = '0123'.indexOf(c);
        if (shade < 0) return;
        ctx.fillStyle = PALETTE[shade];
        ctx.fillRect(f * fw + x, y, 1, 1);
      });
    });
  });
  tex.refresh();
}

/** Build one bitmap font per palette shade (tinting is not reliable in Canvas mode). */
export function createFontTextures(scene: Phaser.Scene): void {
  const chars = [...FONT_CHARS];
  for (const shade of [0, 1, 2, 3] as Shade[]) {
    const key = fontKey(shade);
    if (scene.textures.exists(key)) continue;
    const tex = scene.textures.createCanvas(key, chars.length * CELL_W, CELL_H)!;
    paintFont(tex, shade);
    // Parse returns a complete cache entry ({ data, frame, texture }).
    const entry = Phaser.GameObjects.RetroFont.Parse(scene, {
      image: key,
      width: CELL_W,
      height: CELL_H,
      chars: FONT_CHARS,
      charsPerRow: chars.length,
      'spacing.x': 0,
      'spacing.y': 0,
      'offset.x': 0,
      'offset.y': 0,
      lineSpacing: 0,
    });
    scene.cache.bitmapFont.add(key, entry);
  }
}

/**
 * Create a (multi-frame) texture from pixel-art strings.
 * Each frame is an array of equal-length rows; '0'-'3' are palette shades, anything else is transparent.
 * Frames are laid out horizontally and registered as frames 0..n-1.
 */
export function createPixelTexture(scene: Phaser.Scene, key: string, frames: string[][]): void {
  if (scene.textures.exists(key)) return;
  pixelSources.set(key, frames);
  const fh = frames[0].length;
  const fw = frames[0][0].length;
  const tex = scene.textures.createCanvas(key, fw * frames.length, fh)!;
  frames.forEach((_, f) => tex.add(f, 0, f * fw, 0, fw, fh));
  paintPixels(tex, frames);
}

/**
 * Redraw every generated texture in the current palette. The textures keep
 * their keys and frames, so sprites and text already on screen recolor at once.
 */
export function repaintAllTextures(textures: Phaser.Textures.TextureManager): void {
  for (const shade of [0, 1, 2, 3] as Shade[]) {
    const tex = textures.get(fontKey(shade));
    if (tex instanceof Phaser.Textures.CanvasTexture) paintFont(tex, shade);
  }
  for (const [key, frames] of pixelSources) {
    const tex = textures.get(key);
    if (tex instanceof Phaser.Textures.CanvasTexture) paintPixels(tex, frames);
  }
}

import Phaser from 'phaser';
import { toFontText } from './font';
import { PALETTE_HEX, type Shade } from './palette';
import { fontKey } from './textures';

/** Pixel-font text in one palette shade. Text is upper-cased to fit the font. */
export function addText(
  scene: Phaser.Scene,
  x: number,
  y: number,
  text: string,
  shade: Shade = 0,
): Phaser.GameObjects.BitmapText {
  return scene.add.bitmapText(Math.round(x), Math.round(y), fontKey(shade), toFontText(text));
}

export function setText(obj: Phaser.GameObjects.BitmapText, text: string): void {
  obj.setText(toFontText(text));
}

/** Classic Game Boy window: light fill with a double dark border. */
export function drawWindow(g: Phaser.GameObjects.Graphics, x: number, y: number, w: number, h: number): void {
  g.fillStyle(PALETTE_HEX[0]);
  g.fillRect(x, y, w, h);
  g.fillStyle(PALETTE_HEX[3]);
  g.fillRect(x + 1, y + 1, w - 2, h - 2);
  g.fillStyle(PALETTE_HEX[1]);
  g.fillRect(x + 2, y + 2, w - 4, h - 4);
  g.fillStyle(PALETTE_HEX[3]);
  g.fillRect(x + 3, y + 3, w - 6, h - 6);
}

/** A horizontal meter, `value` in 0..1. */
export function drawMeter(
  g: Phaser.GameObjects.Graphics,
  x: number,
  y: number,
  w: number,
  h: number,
  value: number,
  fill: Shade = 0,
): void {
  g.fillStyle(PALETTE_HEX[0]);
  g.fillRect(x, y, w, h);
  g.fillStyle(PALETTE_HEX[3]);
  g.fillRect(x + 1, y + 1, w - 2, h - 2);
  const inner = Math.round((w - 2) * Phaser.Math.Clamp(value, 0, 1));
  g.fillStyle(PALETTE_HEX[fill]);
  g.fillRect(x + 1, y + 1, inner, h - 2);
}

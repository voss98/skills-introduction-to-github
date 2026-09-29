import Phaser from 'phaser';
import dialogue from '../data/dialogue.json';
import { PALETTE_HEX, SCREEN_W } from '../gfx/palette';
import { addText, drawWindow } from '../gfx/ui';
import { gamepad } from '../input/InputManager';

export class TitleScene extends Phaser.Scene {
  private blink!: Phaser.GameObjects.BitmapText;

  constructor() {
    super('Title');
  }

  create(): void {
    this.cameras.main.setBackgroundColor(PALETTE_HEX[3]);
    const g = this.add.graphics();
    drawWindow(g, 8, 14, SCREEN_W - 16, 30);
    const t = dialogue.title;
    const center = (s: string) => Math.floor((SCREEN_W - s.length * 6) / 2);
    addText(this, center('TRAIL SHOP'), 20, 'TRAIL SHOP', 0);
    addText(this, center('TYCOON'), 30, 'TYCOON', 1);
    this.add.image(SCREEN_W / 2, 92, 'bike_rack').setOrigin(0.5, 1);
    g.fillStyle(PALETTE_HEX[1]).fillRect(0, 92, SCREEN_W, 2);
    this.blink = addText(this, center(t.pressStart), 106, t.pressStart, 0);
    addText(this, center(t.selectHint), 128, t.selectHint, 1);
  }

  update(time: number): void {
    this.blink.setVisible(Math.floor(time / 500) % 2 === 0);
    if (gamepad.justPressed('START') || gamepad.justPressed('A')) this.scene.start('Shop');
    else if (gamepad.justPressed('SELECT')) this.scene.start('InputTest');
  }
}

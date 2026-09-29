import Phaser from 'phaser';
import { gamepad } from '../input/InputManager';
import { GB_INPUTS, type GBInput } from '../input/keymap';
import { PALETTE_HEX, SCREEN_W } from '../gfx/palette';
import { addText, setText } from '../gfx/ui';

type Rect = { x: number; y: number; w: number; h: number; label: string };

/** Diagnostic scene: shows every Game Boy button and lights it up while held. */
export class InputTestScene extends Phaser.Scene {
  private g!: Phaser.GameObjects.Graphics;
  private lastText!: Phaser.GameObjects.BitmapText;
  private logText!: Phaser.GameObjects.BitmapText;
  private log: GBInput[] = [];
  private exitHeldMs = 0;

  private readonly layout: Record<GBInput, Rect> = {
    UP: { x: 22, y: 34, w: 10, h: 10, label: '^' },
    DOWN: { x: 22, y: 54, w: 10, h: 10, label: '~' },
    LEFT: { x: 12, y: 44, w: 10, h: 10, label: '{' },
    RIGHT: { x: 32, y: 44, w: 10, h: 10, label: '}' },
    B: { x: 106, y: 46, w: 16, h: 14, label: 'B' },
    A: { x: 128, y: 36, w: 16, h: 14, label: 'A' },
    SELECT: { x: 50, y: 74, w: 28, h: 9, label: 'SEL' },
    START: { x: 82, y: 74, w: 28, h: 9, label: 'STA' },
  };

  constructor() {
    super('InputTest');
  }

  create(): void {
    this.cameras.main.setBackgroundColor(PALETTE_HEX[3]);
    this.log = [];
    addText(this, 0, 4, 'INPUT TEST', 0).setX((SCREEN_W - 10 * 6) / 2);
    addText(this, 4, 14, 'ARROWS X=A Z=B', 1);
    addText(this, 4, 22, 'ENTER=STA SHIFT=SEL', 1);
    this.g = this.add.graphics();
    for (const input of GB_INPUTS) {
      const r = this.layout[input];
      const labelW = r.label.length * 6 - 1;
      this.add
        .bitmapText(r.x + Math.floor((r.w - labelW) / 2), r.y + Math.floor((r.h - 7) / 2), 'font0', r.label)
        .setName(`label-${input}`);
    }
    this.lastText = addText(this, 4, 90, 'LAST: -', 0);
    this.logText = addText(this, 4, 100, '', 1);
    addText(this, 4, 128, 'HOLD STA+SEL: BACK', 1);

    const off = gamepad.onPress((input) => {
      this.log.unshift(input);
      this.log = this.log.slice(0, 3);
    });
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, off);
  }

  update(_time: number, delta: number): void {
    this.g.clear();
    for (const input of GB_INPUTS) {
      const r = this.layout[input];
      const down = gamepad.isDown(input);
      this.g.fillStyle(PALETTE_HEX[0]);
      this.g.fillRect(r.x, r.y, r.w, r.h);
      this.g.fillStyle(PALETTE_HEX[down ? 1 : 2]);
      this.g.fillRect(r.x + 1, r.y + 1, r.w - 2, r.h - 2);
      const label = this.children.getByName(`label-${input}`) as Phaser.GameObjects.BitmapText;
      label.setFont(down ? 'font3' : 'font0');
    }

    const held = GB_INPUTS.filter((i) => gamepad.isDown(i));
    setText(this.lastText, `HELD: ${held.length ? held.join(' ') : '-'}`);
    setText(this.logText, this.log.map((i, n) => `${n === 0 ? '>' : ' '} ${i}`).join('\n'));

    if (gamepad.isDown('START') && gamepad.isDown('SELECT')) {
      this.exitHeldMs += delta;
      if (this.exitHeldMs > 800 && this.scene.manager.keys['Title']) this.scene.start('Title');
    } else {
      this.exitHeldMs = 0;
    }
  }
}

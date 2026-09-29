import Phaser from 'phaser';
import { ENDINGS } from '../core/endings';
import { unlockedEndings } from '../core/gallery';
import { PALETTE_HEX, SCREEN_H, SCREEN_W } from '../gfx/palette';
import { addText, drawWindow } from '../gfx/ui';
import { gamepad } from '../input/InputManager';
import { showDialog } from './DialogScene';

/** Every ending; locked ones show as "???". */
export class GalleryScene extends Phaser.Scene {
  private cursor = 0;
  private back = 'Title';
  private busy = false;
  private cursorText!: Phaser.GameObjects.BitmapText;
  private vignette!: Phaser.GameObjects.Image;

  constructor() {
    super('Gallery');
  }

  init(data: { back?: string }): void {
    this.back = data.back ?? 'Title';
    this.cursor = 0;
    this.busy = false;
  }

  create(): void {
    const unlocked = new Set(unlockedEndings());
    this.cameras.main.setBackgroundColor(PALETTE_HEX[3]);
    const g = this.add.graphics();
    drawWindow(g, 0, 0, SCREEN_W, 16);
    addText(this, 6, 5, `ENDING GALLERY  ${unlocked.size}/${ENDINGS.length}`, 0);
    ENDINGS.forEach((e, i) => {
      const open = unlocked.has(e.id);
      addText(this, 12, 20 + i * 9, open ? e.title.slice(0, 23) : e.secret ? '??? (SECRET)' : '???', open ? 0 : 1);
    });
    this.cursorText = addText(this, 4, 20, ']', 0);
    this.vignette = this.add.image(SCREEN_W / 2, SCREEN_H - 12, 'v_steady').setOrigin(0.5, 1).setVisible(false);
    g.fillStyle(PALETTE_HEX[0]).fillRect(0, SCREEN_H - 10, SCREEN_W, 10);
    addText(this, 2, SCREEN_H - 9, 'A:READ  B:BACK', 2);
  }

  update(time: number): void {
    if (this.busy) return;
    const unlocked = new Set(unlockedEndings());
    const n = ENDINGS.length;
    if (gamepad.justPressed('DOWN')) this.cursor = (this.cursor + 1) % n;
    if (gamepad.justPressed('UP')) this.cursor = (this.cursor - 1 + n) % n;
    this.cursorText.setY(20 + this.cursor * 9).setVisible(Math.floor(time / 400) % 4 !== 0);
    const e = ENDINGS[this.cursor];
    const open = unlocked.has(e.id);
    this.vignette.setVisible(open);
    if (open) this.vignette.setTexture(`v_${e.vignette}`);
    if (gamepad.justPressed('A')) {
      this.busy = true;
      void showDialog(this, { speaker: open ? e.title.slice(0, 22) : '???', pages: [open ? e.text : 'Keep playing to discover this ending.'] }).then(() => {
        this.busy = false;
      });
    } else if (gamepad.justPressed('B') || gamepad.justPressed('START')) {
      gamepad.consume('START');
      this.scene.start(this.back);
    }
  }
}

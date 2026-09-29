import Phaser from 'phaser';
import dialogue from '../data/dialogue.json';
import { PALETTE_HEX, SCREEN_W } from '../gfx/palette';
import { addText, drawWindow } from '../gfx/ui';
import { gamepad } from '../input/InputManager';
import { newGame, session } from './session';

interface MenuItem {
  label: string;
  run: () => void;
}

/** Title screen with a Game Boy-style menu. */
export class TitleScene extends Phaser.Scene {
  private items: MenuItem[] = [];
  private cursor = 0;
  private cursorText!: Phaser.GameObjects.BitmapText;
  private menuY = 84;

  constructor() {
    super('Title');
  }

  /** Menu entries; later phases add Continue and Settings. */
  protected menu(): MenuItem[] {
    return [
      ...(session.started ? [{ label: 'RESUME RUN', run: () => this.scene.start('Shop') }] : []),
      {
        label: 'NEW GAME',
        run: () => {
          newGame();
          this.scene.start('Shop');
        },
      },
      { label: 'ENDING GALLERY', run: () => this.scene.start('Gallery', { back: 'Title' }) },
      { label: 'INPUT TEST', run: () => this.scene.start('InputTest') },
    ];
  }

  create(): void {
    this.cameras.main.setBackgroundColor(PALETTE_HEX[3]);
    const g = this.add.graphics();
    drawWindow(g, 8, 8, SCREEN_W - 16, 30);
    const center = (s: string) => Math.floor((SCREEN_W - s.length * 6) / 2);
    addText(this, center('TRAIL SHOP'), 14, 'TRAIL SHOP', 0);
    addText(this, center('TYCOON'), 24, 'TYCOON', 1);
    this.add.image(SCREEN_W / 2, 74, 'bike_rack').setOrigin(0.5, 1);
    g.fillStyle(PALETTE_HEX[1]).fillRect(0, 74, SCREEN_W, 2);
    this.items = this.menu();
    this.cursor = 0;
    this.items.forEach((item, i) => addText(this, 44, this.menuY + i * 10, item.label, 0));
    this.cursorText = addText(this, 34, this.menuY, ']', 0);
    addText(this, center(dialogue.title.hint), 134, dialogue.title.hint, 1);
  }

  update(time: number): void {
    const n = this.items.length;
    if (gamepad.justPressed('DOWN') || gamepad.justPressed('SELECT')) this.cursor = (this.cursor + 1) % n;
    if (gamepad.justPressed('UP')) this.cursor = (this.cursor - 1 + n) % n;
    this.cursorText.setY(this.menuY + this.cursor * 10).setVisible(Math.floor(time / 400) % 4 !== 0);
    if (gamepad.justPressed('START') || gamepad.justPressed('A')) {
      gamepad.consume('A');
      gamepad.consume('START');
      this.items[this.cursor].run();
    }
  }
}

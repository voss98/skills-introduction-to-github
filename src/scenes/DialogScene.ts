import Phaser from 'phaser';
import { wrapText } from '../gfx/font';
import { SCREEN_H, SCREEN_W } from '../gfx/palette';
import { addText, drawWindow, setText } from '../gfx/ui';
import { gamepad } from '../input/InputManager';
import { sound } from '../audio/sound';

export interface DialogChoice {
  label: string;
  /** Shown greyed out with a padlock and cannot be picked. */
  locked?: boolean;
}

export interface DialogOptions {
  pages: string[];
  speaker?: string;
  choices?: DialogChoice[];
  /** Allow B to close a choice list (returns -1). */
  cancellable?: boolean;
}

const BOX_H = 56;
const BOX_Y = SCREEN_H - BOX_H;
const PAD = 6;
const LINES = 5;
const CHARS = Math.floor((SCREEN_W - PAD * 2) / 6);
const CHARS_PER_SEC = 90;

/**
 * RPG-style text box. Always running on top of the other scenes; hidden when idle.
 * Open it with `showDialog()` which pauses the calling scene until the box closes.
 */
export class DialogScene extends Phaser.Scene {
  private g!: Phaser.GameObjects.Graphics;
  private body!: Phaser.GameObjects.BitmapText;
  private speaker!: Phaser.GameObjects.BitmapText;
  private more!: Phaser.GameObjects.BitmapText;
  private choiceTexts: Phaser.GameObjects.BitmapText[] = [];
  private cursor!: Phaser.GameObjects.BitmapText;

  private opts: DialogOptions | null = null;
  private pages: string[][] = [];
  private page = 0;
  private shown = 0;
  private cursorIdx = 0;
  private choicesDrawn = false;
  private onClose: ((choice: number) => void) | null = null;

  constructor() {
    super('Dialog');
  }

  get isOpen(): boolean {
    return this.opts !== null;
  }

  create(): void {
    this.g = this.add.graphics();
    this.speaker = addText(this, 0, 0, '', 0);
    this.body = addText(this, PAD, BOX_Y + PAD, '', 0);
    this.more = addText(this, SCREEN_W - 12, SCREEN_H - 10, '~', 1);
    this.cursor = addText(this, 0, 0, ']', 0);
    this.hide();
  }

  open(opts: DialogOptions, onClose: (choice: number) => void): void {
    this.opts = opts;
    this.onClose = onClose;
    // Split every page into LINES-sized chunks so long text never overflows.
    this.pages = opts.pages.flatMap((p) => {
      const lines = wrapText(p, CHARS);
      const chunks: string[][] = [];
      for (let i = 0; i < lines.length; i += LINES) chunks.push(lines.slice(i, i + LINES));
      return chunks.length ? chunks : [['']];
    });
    this.page = 0;
    this.shown = 0;
    this.cursorIdx = this.firstUnlocked(0, 1);
    this.choicesDrawn = false;
    this.scene.bringToTop();
    this.setVisibleAll(true);
    this.drawFrame();
  }

  update(_t: number, delta: number): void {
    if (!this.opts) return;
    const pageText = this.pages[this.page].join('\n');
    const typing = this.shown < pageText.length;
    const lastPage = this.page === this.pages.length - 1;
    const choices = this.opts.choices ?? [];

    if (typing) {
      this.shown = Math.min(pageText.length, this.shown + (CHARS_PER_SEC * delta) / 1000);
      if (gamepad.justPressed('A') || gamepad.justPressed('B')) this.shown = pageText.length;
    } else if (lastPage && choices.length) {
      if (gamepad.justPressed('UP')) this.moveCursor(this.firstUnlocked(this.cursorIdx - 1, -1));
      if (gamepad.justPressed('DOWN')) this.moveCursor(this.firstUnlocked(this.cursorIdx + 1, 1));
      if (gamepad.justPressed('A') && !choices[this.cursorIdx]?.locked) {
        sound.play('select');
        return this.close(this.cursorIdx);
      }
      if (gamepad.justPressed('B') && this.opts.cancellable) return this.close(-1);
    } else if (gamepad.justPressed('A') || (gamepad.justPressed('B') && !lastPage)) {
      sound.play('blip');
      if (lastPage) return this.close(-1);
      this.page++;
      this.shown = 0;
    }

    setText(this.body, pageText.slice(0, Math.floor(this.shown)));
    const done = this.shown >= pageText.length;
    this.more.setVisible(done && (!lastPage || !choices.length) && Math.floor(this.time.now / 300) % 2 === 0);
    this.drawChoices(done && lastPage ? choices : []);
  }

  private moveCursor(i: number): void {
    if (i !== this.cursorIdx) sound.play('blip');
    this.cursorIdx = i;
  }

  private firstUnlocked(start: number, dir: 1 | -1): number {
    const choices = this.opts?.choices ?? [];
    const n = choices.length;
    for (let i = 0; i < n; i++) {
      const idx = (((start + dir * i) % n) + n) % n;
      if (!choices[idx].locked) return idx;
    }
    return 0;
  }

  private drawFrame(): void {
    this.g.clear();
    drawWindow(this.g, 0, BOX_Y, SCREEN_W, BOX_H);
    const name = this.opts?.speaker;
    this.speaker.setVisible(!!name);
    if (name) {
      const w = name.length * 6 + 9;
      drawWindow(this.g, 0, BOX_Y - 12, w, 14);
      this.g.fillStyle(0x9bbc0f).fillRect(3, BOX_Y - 1, w - 6, 3);
      setText(this.speaker, name);
      this.speaker.setPosition(5, BOX_Y - 8);
    }
  }

  private drawChoices(choices: DialogChoice[]): void {
    const show = choices.length > 0;
    this.cursor.setVisible(show);
    if (!show) {
      this.choiceTexts.forEach((t) => t.setVisible(false));
      return;
    }
    const h = choices.length * 9 + 8;
    const y0 = BOX_Y - h - (this.opts?.speaker ? 12 : 0);
    if (!this.choicesDrawn) {
      this.choicesDrawn = true;
      drawWindow(this.g, 0, y0, SCREEN_W, h);
      this.choiceTexts.forEach((t) => t.destroy());
      this.choiceTexts = choices.map((c, i) =>
        addText(this, 14, y0 + 5 + i * 9, `${c.locked ? '[' : ''}${c.label}`.slice(0, CHARS - 1), c.locked ? 1 : 0),
      );
    }
    this.cursor.setPosition(6, y0 + 5 + this.cursorIdx * 9);
    this.cursor.setVisible(Math.floor(this.time.now / 400) % 4 !== 0);
    this.children.bringToTop(this.cursor);
  }

  private close(choice: number): void {
    const cb = this.onClose;
    this.opts = null;
    this.onClose = null;
    this.hide();
    gamepad.consume('A');
    gamepad.consume('B');
    cb?.(choice);
  }

  private hide(): void {
    this.g.clear();
    this.choiceTexts.forEach((t) => t.destroy());
    this.choiceTexts = [];
    this.setVisibleAll(false);
  }

  private setVisibleAll(v: boolean): void {
    for (const o of [this.body, this.speaker, this.more, this.cursor]) o.setVisible(v);
    if (v) setText(this.body, '');
  }
}

/**
 * Show a dialog over `caller`, pausing it until the player closes the box.
 * Resolves with the chosen index, or -1 when there were no choices / it was cancelled.
 */
export function showDialog(caller: Phaser.Scene, opts: DialogOptions): Promise<number> {
  const dialog = caller.scene.get('Dialog') as DialogScene;
  return new Promise((resolve) => {
    // The press that opened the box must not also advance it.
    gamepad.consume('A');
    gamepad.consume('B');
    gamepad.consume('START');
    caller.scene.pause();
    dialog.open(opts, (choice) => {
      caller.scene.resume();
      resolve(choice);
    });
  });
}

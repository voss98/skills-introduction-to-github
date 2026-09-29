import Phaser from 'phaser';
import { sound } from '../audio/sound';
import { PALETTE_HEX, SCREEN_H, SCREEN_W } from '../gfx/palette';
import { addText, drawWindow, setText } from '../gfx/ui';
import { gamepad } from '../input/InputManager';
import { showDialog } from './DialogScene';

type Row = { label: () => string; left?: () => void; right?: () => void; press?: () => void | Promise<void> };

const CONTROLS = [
  'D-PAD  ARROWS: WALK/CLIMB\nA      X: TALK, CONFIRM\nB      Z: JUMP, BACK\nSTART  ENTER: MENU\nSELECT SHIFT: MUTE',
  'PHONES: USE THE ON-SCREEN\nBUTTONS UNDER THE SCREEN.\nMINIGAMES: A IN THE ZONE,\nPRESS THE LIT BUTTON, OR\nHOLD A AND LET GO.',
];

/** Volume, mute, a controls reference and the input test. */
export class SettingsScene extends Phaser.Scene {
  private back = 'Title';
  private cursor = 0;
  private busy = false;
  private rows: Row[] = [];
  private texts: Phaser.GameObjects.BitmapText[] = [];
  private cursorText!: Phaser.GameObjects.BitmapText;

  constructor() {
    super('Settings');
  }

  init(data: { back?: string }): void {
    this.back = data.back ?? 'Title';
    this.cursor = 0;
    this.busy = false;
  }

  create(): void {
    const bar = (v: number) => '|'.repeat(v) + '-'.repeat(10 - v);
    const s = () => sound.current;
    const clamp = (v: number) => Math.max(0, Math.min(10, v));
    this.rows = [
      {
        label: () => `MUSIC ${bar(s().musicVolume)}`,
        left: () => sound.update({ musicVolume: clamp(s().musicVolume - 1) }),
        right: () => sound.update({ musicVolume: clamp(s().musicVolume + 1) }),
      },
      {
        label: () => `SFX   ${bar(s().sfxVolume)}`,
        left: () => sound.update({ sfxVolume: clamp(s().sfxVolume - 1) }),
        right: () => sound.update({ sfxVolume: clamp(s().sfxVolume + 1) }),
      },
      { label: () => `SOUND ${s().muted ? 'MUTED' : 'ON'}`, press: () => void sound.toggleMute(), left: () => void sound.toggleMute(), right: () => void sound.toggleMute() },
      { label: () => 'CONTROLS', press: () => showDialog(this, { speaker: 'CONTROLS', pages: CONTROLS }).then(() => undefined) },
      { label: () => 'INPUT TEST', press: () => void this.scene.start('InputTest') },
      { label: () => 'BACK', press: () => void this.scene.start(this.back) },
    ];
    this.cameras.main.setBackgroundColor(PALETTE_HEX[3]);
    const g = this.add.graphics();
    drawWindow(g, 0, 0, SCREEN_W, 16);
    addText(this, 6, 5, 'SETTINGS', 0);
    this.texts = this.rows.map((_, i) => addText(this, 14, 24 + i * 14, '', 0));
    this.cursorText = addText(this, 4, 24, ']', 0);
    g.fillStyle(PALETTE_HEX[0]).fillRect(0, SCREEN_H - 10, SCREEN_W, 10);
    addText(this, 2, SCREEN_H - 9, '{}:CHANGE A:OK B:BACK', 2);
    this.render();
  }

  private render(): void {
    this.rows.forEach((r, i) => setText(this.texts[i], r.label()));
    this.cursorText.setY(24 + this.cursor * 14);
  }

  update(time: number): void {
    if (this.busy) return;
    const n = this.rows.length;
    const row = this.rows[this.cursor];
    if (gamepad.justPressed('DOWN')) {
      this.cursor = (this.cursor + 1) % n;
      sound.play('blip');
    }
    if (gamepad.justPressed('UP')) {
      this.cursor = (this.cursor - 1 + n) % n;
      sound.play('blip');
    }
    if (gamepad.justPressed('LEFT') && row.left) {
      row.left();
      sound.play('blip');
    }
    if (gamepad.justPressed('RIGHT') && row.right) {
      row.right();
      sound.play('blip');
    }
    if (gamepad.justPressed('A') && row.press) {
      sound.play('select');
      const r = row.press();
      if (r instanceof Promise) {
        this.busy = true;
        void r.then(() => {
          this.busy = false;
        });
      }
    }
    if (gamepad.justPressed('B')) this.scene.start(this.back);
    this.cursorText.setVisible(Math.floor(time / 400) % 4 !== 0);
    this.render();
  }
}

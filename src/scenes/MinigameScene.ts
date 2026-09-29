import Phaser from 'phaser';
import type { TaskDef } from '../core/jobs';
import { ButtonSequenceGame, TimingBarGame, TorqueMeterGame, type Minigame } from '../core/minigames';
import { wrapText } from '../gfx/font';
import { PALETTE_HEX, SCREEN_H, SCREEN_W } from '../gfx/palette';
import { addText, drawMeter, drawWindow, setText } from '../gfx/ui';
import { gamepad } from '../input/InputManager';
import { sound } from '../audio/sound';
import type { GBInput } from '../input/keymap';

export interface MinigameData {
  task: TaskDef;
  stationName: string;
  skill: number;
  game: Minigame;
  onDone: (quality: number) => void;
}

const GLYPH: Record<GBInput, string> = { UP: '^', DOWN: '~', LEFT: '{', RIGHT: '}', A: 'A', B: 'B', START: 'S', SELECT: 'E' };
const BAR_X = 16;
const BAR_W = SCREEN_W - 32;

/** Renders whichever minigame a station task needs. All rules live in core/minigames.ts. */
export class MinigameScene extends Phaser.Scene {
  private d!: MinigameData;
  private g!: Phaser.GameObjects.Graphics;
  private status!: Phaser.GameObjects.BitmapText;
  private seqTexts: Phaser.GameObjects.BitmapText[] = [];
  private finished = false;
  private flashMs = 0;

  constructor() {
    super('Minigame');
  }

  init(data: MinigameData): void {
    this.d = data;
    this.finished = false;
    this.flashMs = 0;
    this.seqTexts = [];
  }

  create(): void {
    const { task, stationName, skill } = this.d;
    const frame = this.add.graphics();
    frame.fillStyle(PALETTE_HEX[3]).fillRect(0, 0, SCREEN_W, SCREEN_H);
    drawWindow(frame, 0, 0, SCREEN_W, 26);
    addText(this, 6, 5, task.name, 0);
    addText(this, 6, 14, `${stationName.slice(0, 18)} LV${skill}`, 1);
    wrapText(task.hint, 25).slice(0, 3).forEach((line, i) => addText(this, 4, 30 + i * 8, line, 1));
    this.g = this.add.graphics();
    this.status = addText(this, 4, 112, '', 0);
    addText(this, 4, SCREEN_H - 10, task.minigame === 'torque' ? 'HOLD A, RELEASE ON TARGET' : '', 1);

    if (this.d.game instanceof ButtonSequenceGame) {
      const seq = this.d.game.sequence;
      const w = Math.min(14, Math.floor(BAR_W / seq.length));
      const x0 = Math.floor((SCREEN_W - w * seq.length) / 2);
      this.seqTexts = seq.map((inp, i) => addText(this, x0 + i * w + Math.floor((w - 5) / 2), 76, GLYPH[inp], 0));
    }
  }

  update(_t: number, delta: number): void {
    const game = this.d.game;
    if (this.finished) {
      if (gamepad.justPressed('A')) {
        gamepad.consume('A');
        this.scene.stop();
        this.d.onDone(game.quality);
      }
      return;
    }
    const before = this.progress(game);
    game.update(delta, gamepad);
    if (this.progress(game) !== before) sound.play('blip');
    this.g.clear();
    if (game instanceof TimingBarGame) this.drawTiming(game);
    else if (game instanceof ButtonSequenceGame) this.drawSequence(game, delta);
    else if (game instanceof TorqueMeterGame) this.drawTorque(game);

    if (game.done) {
      this.finished = true;
      const q = game.quality;
      const word = q >= 85 ? 'GREAT!' : q >= 60 ? 'GOOD' : q >= 30 ? 'SLOPPY' : 'BOTCHED';
      sound.play(q >= 60 ? 'good' : 'bad');
      setText(this.status, `QUALITY ${q} ${word}\nPRESS A`);
    }
  }

  private progress(game: Minigame): number {
    if (game instanceof TimingBarGame) return game.scores.length;
    if (game instanceof ButtonSequenceGame) return game.index * 100 + game.mistakes;
    if (game instanceof TorqueMeterGame) return game.scores.length;
    return 0;
  }

  private drawTiming(game: TimingBarGame): void {
    const y = 70;
    const { zoneWidth, hits } = game.params;
    this.g.fillStyle(PALETTE_HEX[0]).fillRect(BAR_X - 1, y - 1, BAR_W + 2, 12);
    this.g.fillStyle(PALETTE_HEX[3]).fillRect(BAR_X, y, BAR_W, 10);
    const zx = BAR_X + Math.round((game.zoneCenter - zoneWidth / 2) * BAR_W);
    this.g.fillStyle(PALETTE_HEX[1]).fillRect(zx, y, Math.round(zoneWidth * BAR_W), 10);
    this.g.fillStyle(PALETTE_HEX[3]).fillRect(BAR_X + Math.round(game.zoneCenter * BAR_W), y + 3, 1, 4);
    const cx = BAR_X + Math.round(game.pos * BAR_W);
    this.g.fillStyle(PALETTE_HEX[0]).fillRect(cx - 1, y - 4, 3, 18);
    const last = game.lastHit === null ? '' : `  LAST +${game.lastHit}`;
    setText(this.status, `HIT ${Math.min(game.scores.length + 1, hits)}/${hits}${last}`);
  }

  private drawSequence(game: ButtonSequenceGame, delta: number): void {
    if (game.lastWrong) this.flashMs = 250;
    this.flashMs = Math.max(0, this.flashMs - delta);
    game.sequence.forEach((_, i) => {
      const t = this.seqTexts[i];
      const bx = t.x - 3;
      if (i === game.index) {
        this.g.fillStyle(PALETTE_HEX[this.flashMs > 0 ? 1 : 0]).fillRect(bx, 72, 11, 15);
        t.setFont('font3');
      } else {
        this.g.lineStyle(1, PALETTE_HEX[i < game.index ? 1 : 0]).strokeRect(bx + 0.5, 72.5, 10, 14);
        t.setFont(i < game.index ? 'font1' : 'font0');
      }
    });
    const left = 1 - game.stepElapsed / game.params.stepTimeMs;
    drawMeter(this.g, BAR_X, 94, BAR_W, 5, left, 1);
    setText(this.status, `STEP ${Math.min(game.index + 1, game.sequence.length)}/${game.sequence.length}  MISSES ${game.mistakes}`);
  }

  private drawTorque(game: TorqueMeterGame): void {
    const y = 70;
    const { targetNm, maxNm, tolerance, bolts } = game.params;
    const px = (nm: number) => BAR_X + Math.round((nm / maxNm) * BAR_W);
    this.g.fillStyle(PALETTE_HEX[0]).fillRect(BAR_X - 1, y - 1, BAR_W + 2, 12);
    this.g.fillStyle(PALETTE_HEX[3]).fillRect(BAR_X, y, BAR_W, 10);
    const lo = px(targetNm * (1 - tolerance));
    const hi = px(targetNm * (1 + tolerance));
    this.g.fillStyle(PALETTE_HEX[1]).fillRect(lo, y - 3, Math.max(2, hi - lo), 16);
    this.g.fillStyle(PALETTE_HEX[0]).fillRect(BAR_X, y + 3, px(game.value) - BAR_X, 4);
    this.g.fillStyle(PALETTE_HEX[3]).fillRect(px(targetNm), y - 3, 1, 2);
    this.g.fillStyle(PALETTE_HEX[3]).fillRect(px(targetNm), y + 11, 1, 2);
    // Tick marks every quarter of the scale.
    for (let i = 1; i < 4; i++) this.g.fillStyle(PALETTE_HEX[0]).fillRect(BAR_X + (BAR_W * i) / 4, y + 10, 1, 3);
    const results = game.results.map((r) => (r === 'good' ? 'OK' : r.toUpperCase())).join(' ');
    setText(
      this.status,
      `${game.value.toFixed(1)} NM  TARGET ${targetNm}\nBOLT ${Math.min(game.scores.length + 1, bolts)}/${bolts} ${results}`,
    );
  }
}

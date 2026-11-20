import Phaser from 'phaser';
import { isMonthStart, monthOf } from '../core/calendar';
import { chartPoints, rangeWithZero } from '../core/chart';
import { chooseEnding, choicesThatMattered, type RunEndReason } from '../core/endings';
import { unlockEnding } from '../core/gallery';
import { gameState } from '../core/gameState';
import { wrapText } from '../gfx/font';
import { PALETTE_HEX, SCREEN_W } from '../gfx/palette';
import { addText, drawWindow } from '../gfx/ui';
import { showDialog } from './DialogScene';
import { newGame, session } from './session';

const REASON_TEXT: Record<RunEndReason, string> = {
  complete: 'TWELVE MONTHS ARE UP.',
  bankrupt: 'THE CASH RAN OUT.',
  sold: 'YOU SOLD THE SHOP.',
};

/** The run is over: title, vignette, final stats and the choices that mattered. */
export class EndingScene extends Phaser.Scene {
  private reason: RunEndReason = 'complete';
  private vignette!: Phaser.GameObjects.Image;
  private chart!: Phaser.GameObjects.Graphics;

  constructor() {
    super('Ending');
  }

  init(data: { reason?: RunEndReason }): void {
    this.reason = data.reason ?? 'complete';
  }

  create(): void {
    const s = gameState;
    const e = chooseEnding(s);
    unlockEnding(e.id);
    session.started = false; // the run is over; the title no longer offers to resume it
    this.cameras.main.setBackgroundColor(PALETTE_HEX[3]);
    const g = this.add.graphics();
    drawWindow(g, 0, 0, SCREEN_W, 24);
    const title = wrapText(e.title, 24);
    title.forEach((line, i) => addText(this, Math.floor((SCREEN_W - line.length * 6) / 2), (title.length > 1 ? 4 : 8) + i * 8, line, 0));
    this.vignette = this.add.image(SCREEN_W / 2, 26, `v_${e.vignette}`).setOrigin(0.5, 0);
    this.chart = this.add.graphics().setVisible(false);
    if (e.secret) addText(this, 4, 67, 'SECRET ENDING!', 0);

    void this.sequence(e);
  }

  /** Cash (solid) and reputation (dotted) for every day played, drawn where the vignette sits. */
  private async showYearChart(): Promise<void> {
    const history = gameState.snapshot.history;
    if (history.length < 2) return;
    const box = { x: 18, y: 27, w: 124, h: 38 };
    const g = this.chart.clear().setVisible(true);
    this.vignette.setVisible(false);
    g.fillStyle(PALETTE_HEX[0]).fillRect(box.x - 2, box.y - 2, box.w + 4, box.h + 4);
    g.fillStyle(PALETTE_HEX[3]).fillRect(box.x - 1, box.y - 1, box.w + 2, box.h + 2);
    const cash = history.map((h) => h.cash);
    const { min, max } = rangeWithZero(cash);
    // Zero line, and a tick at the start of each month.
    const [zero] = chartPoints([0], box, min, max);
    for (let x = box.x; x < box.x + box.w; x += 2) g.fillStyle(PALETTE_HEX[2]).fillRect(x, zero.y, 1, 1);
    const days = chartPoints(history.map((_, i) => i), box, 0, 1);
    history.forEach((h, i) => {
      if (isMonthStart(h.day)) g.fillStyle(PALETTE_HEX[1]).fillRect(days[i].x, box.y + box.h, 1, 2);
    });
    const plot = (pts: { x: number; y: number }[], shade: number, dotted: boolean) => {
      for (let i = 1; i < pts.length; i++) {
        const [a, b] = [pts[i - 1], pts[i]];
        const n = Math.max(Math.abs(b.x - a.x), Math.abs(b.y - a.y), 1);
        for (let k = 0; k <= n; k++) {
          if (dotted && k % 2) continue;
          g.fillStyle(PALETTE_HEX[shade]).fillRect(Math.round(a.x + ((b.x - a.x) * k) / n), Math.round(a.y + ((b.y - a.y) * k) / n), 1, 1);
        }
      }
    };
    plot(chartPoints(history.map((h) => h.reputation), box, 0, 100), 1, true);
    plot(chartPoints(cash, box, min, max), 0, false);
    await showDialog(this, {
      speaker: 'YOUR YEAR',
      pages: [`SOLID: CASH $${min} TO $${max}\nDOTTED: REPUTATION 0-100\nTICKS: EACH NEW MONTH\n${history.length} DAYS PLAYED`],
    });
    g.setVisible(false);
    this.vignette.setVisible(true);
  }

  private async sequence(e: ReturnType<typeof chooseEnding>): Promise<void> {
    const s = gameState;
    await showDialog(this, { speaker: 'EPILOGUE', pages: [`${REASON_TEXT[this.reason]} ${e.text}`] });
    await showDialog(this, {
      speaker: 'FINAL STATS',
      pages: [
        `MONTH ${Math.min(monthOf(s.day), 12)} OF 12\nCASH $${s.cash}\nREPUTATION ${s.reputation}\nSTAFF MORALE ${s.staffMorale}\nGOODWILL ${s.communityGoodwill}`,
        `AVG SKILL ${s.skillLevel.toFixed(1)}\nCERTIFIED: ${s.hasFlag('certified_mechanic') ? 'YES' : 'NO'}\nCOURSES TAKEN ${s.snapshot.trainingDone.length}`,
      ],
    });
    await this.showYearChart();
    await showDialog(this, { speaker: 'CHOICES THAT MATTERED', pages: [choicesThatMattered(e, s).map((l) => `- ${l}`).join('\n')] });
    for (;;) {
      const c = await showDialog(this, {
        pages: ['WHAT NEXT?'],
        choices: [{ label: 'NEW GAME' }, { label: 'ENDING GALLERY' }, { label: 'TITLE SCREEN' }],
      });
      if (c === 0) {
        newGame();
        this.scene.start('Shop');
        return;
      }
      if (c === 1) {
        this.scene.start('Gallery', { back: 'Title' });
        return;
      }
      if (c === 2) {
        this.scene.start('Title');
        return;
      }
    }
  }
}

import Phaser from 'phaser';
import { monthOf } from '../core/calendar';
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
    this.add.image(SCREEN_W / 2, 26, `v_${e.vignette}`).setOrigin(0.5, 0);
    if (e.secret) addText(this, 4, 67, 'SECRET ENDING!', 0);

    void this.sequence(e);
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

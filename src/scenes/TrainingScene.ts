import Phaser from 'phaser';
import dialogue from '../data/dialogue.json';
import { gameState, type WorkStationId } from '../core/gameState';
import { TRAINING_LAYOUT, type StationDef } from '../core/layout';
import { createRng } from '../core/rng';
import type { Trigger } from '../core/shop';
import { fmt } from '../core/text';
import {
  completeTraining,
  drawExam,
  gradeExam,
  PROGRAMS,
  trainingBlocker,
  trainingCost,
  type TrainingProgram,
} from '../core/training';
import { PALETTE_HEX, SCREEN_H, SCREEN_W } from '../gfx/palette';
import { addText, setText } from '../gfx/ui';
import { gamepad } from '../input/InputManager';
import { showDialog } from './DialogScene';
import { PlatformWorld } from './platformWorld';
import { session } from './session';
import { sound } from '../audio/sound';
import { runEndReason } from '../core/endings';

const D = dialogue.training;
const SKILL_NAMES: Record<WorkStationId, string> = {
  frame_jig: 'FRAME',
  wheel_stand: 'WHEEL',
  drivetrain_bench: 'DRIVETRAIN',
  suspension_bench: 'SUSPENSION',
};

/** The Training Center: same platformer controls, four training stations and an exit. */
export class TrainingScene extends Phaser.Scene {
  private world!: PlatformWorld;
  private hudTop!: Phaser.GameObjects.BitmapText;
  private hudBottom!: Phaser.GameObjects.BitmapText;
  private busy = false;

  constructor() {
    super('Training');
  }

  create(): void {
    this.busy = false;
    this.world = new PlatformWorld(this, TRAINING_LAYOUT, 'exit_door');
    const g = this.add.graphics().setScrollFactor(0).setDepth(100);
    g.fillStyle(PALETTE_HEX[0]).fillRect(0, 0, SCREEN_W, 8).fillRect(0, SCREEN_H - 8, SCREEN_W, 8);
    this.hudTop = addText(this, 2, 1, '', 3).setScrollFactor(0).setDepth(101);
    this.hudBottom = addText(this, 2, SCREEN_H - 7, '', 2).setScrollFactor(0).setDepth(101);
  }

  update(time: number, delta: number): void {
    setText(this.hudTop, `$${gameState.cash} TRAINING CENTER`);
    if (this.busy) return;
    this.world.player.update(gamepad, delta);
    const near = this.world.updateNearby(time);
    setText(this.hudBottom, near ? `A: ${near.short}` : 'B:JUMP  A:ENROLL');
    if (near && gamepad.justPressed('A')) void this.run(() => this.interact(near));
  }

  private async run(fn: () => Promise<void>): Promise<void> {
    this.busy = true;
    this.world.player.body.setVelocityX(0);
    this.world.prompt.setVisible(false);
    try {
      await fn();
    } finally {
      this.busy = false;
    }
  }

  private async interact(station: StationDef): Promise<void> {
    if (station.id === 'exit_door') {
      const c = await showDialog(this, { pages: [D.exitHint], choices: [{ label: dialogue.yes }, { label: dialogue.no }], cancellable: true });
      if (c === 0) this.backToShop();
      return;
    }
    const p = PROGRAMS.find((x) => x.station === station.id);
    if (!p) return;
    const blocker = trainingBlocker(p, gameState);
    const cost = trainingCost(p, gameState);
    const cover = gameState.modifier('staffCount') > 0 ? D.coverStaff : D.coverClosed;
    if (blocker) {
      await showDialog(this, { speaker: station.short, pages: [p.blurb, blocker] });
      return;
    }
    const choice = await showDialog(this, {
      speaker: station.short,
      pages: [p.blurb, fmt(D.details, { cost, days: p.days, cover })],
      choices: [{ label: fmt(D.enroll, { cost }) }, { label: D.leave }],
      cancellable: true,
    });
    if (choice !== 0) return;
    if (p.kind === 'exam') await this.takeExam(p, station);
    else await this.takeCourse(p, station);
    await this.daysAway(p.days);
    await showDialog(this, { pages: [D.backToShop] });
    this.backToShop();
  }

  private async takeCourse(p: TrainingProgram, station: StationDef): Promise<void> {
    const before = p.skill ? gameState.skill(p.skill) : 0;
    completeTraining(p, gameState);
    sound.play('levelup');
    const text = p.skill
      ? fmt(D.skillUp, { skill: SKILL_NAMES[p.skill], from: before, to: gameState.skill(p.skill) })
      : D.workshopDone;
    await showDialog(this, { speaker: station.short, pages: [text] });
  }

  private async takeExam(p: TrainingProgram, station: StationDef): Promise<void> {
    const rng = createRng(gameState.day * 7919 + gameState.snapshot.trainingDone.length + 17);
    const questions = drawExam(rng, p.questions ?? 10);
    await showDialog(this, { speaker: 'EXAM', pages: [D.examIntro] });
    const answers: number[] = [];
    for (const [i, q] of questions.entries()) {
      let a = -1;
      while (a < 0) {
        a = await showDialog(this, {
          speaker: 'EXAM',
          pages: [fmt(D.examQ, { n: i + 1, total: questions.length, question: q.question })],
          choices: q.choices.map((label) => ({ label })),
        });
      }
      answers.push(a);
    }
    const r = gradeExam(p, gameState, questions, answers);
    sound.play(r.passed ? 'levelup' : 'bad');
    await showDialog(this, { speaker: station.short, pages: [fmt(r.passed ? D.examPass : D.examFail, { score: r.score, total: r.total })] });
  }

  /** Days spent training: the shop is closed (or staff cover it). Morning events play back at the shop. */
  private async daysAway(days: number): Promise<void> {
    const triggers: Trigger[] = [...(session.pendingTriggers ?? [])];
    for (let i = 0; i < days; i++) {
      const sum = session.shop.endDay({ away: true });
      await showDialog(this, { speaker: `DAY ${sum.day}`, pages: [fmt(D.awayDay, { ...sum })] });
      triggers.push('end_of_day');
      // Last day of the run (or broke): the shop scene shows the ending after the end-of-day event.
      if (runEndReason(gameState, session.totalDays)) break;
      triggers.push(...session.shop.nextDay());
    }
    session.pendingTriggers = triggers;
  }

  private backToShop(): void {
    sound.play('door');
    session.spawnAt = 'training_door';
    this.scene.start('Shop');
  }
}

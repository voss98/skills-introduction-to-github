import Phaser from 'phaser';
import dialogue from '../data/dialogue.json';
import { BALANCE } from '../core/balance';
import { gameState, WORK_STATIONS, type WorkStationId } from '../core/gameState';
import { basePrice, estimatedMinutes, isJobDone, pendingTasks, TASKS, type JobTask } from '../core/jobs';
import { SHOP_LAYOUT, type StationDef } from '../core/layout';
import type { Customer, Trigger } from '../core/shop';
import { fmt, signed, signedMoney } from '../core/text';
import { PALETTE_HEX, SCREEN_H, SCREEN_W } from '../gfx/palette';
import { addText, setText } from '../gfx/ui';
import { gamepad } from '../input/InputManager';
import { showDialog } from './DialogScene';
import { playEvent, runDecision } from './decisionRunner';
import type { LedgerData } from './LedgerScene';
import { dayInMonth, monthName, monthOf } from '../core/calendar';
import { reportForMonth, reportText } from '../core/reports';
import type { MinigameData } from './MinigameScene';
import type { Player } from './Player';
import { PlatformWorld } from './platformWorld';
import { session } from './session';

const HUD_H = 8;
const D = dialogue;
const stationName = (id: string) => SHOP_LAYOUT.stations.find((s) => s.id === id)?.name ?? id;
const stationShort = (id: string) => SHOP_LAYOUT.stations.find((s) => s.id === id)?.short ?? id;
const isWorkStation = (id: string): id is WorkStationId => (WORK_STATIONS as readonly string[]).includes(id);

/** The shop floor: platforming, stations, customers, the clock and the HUD. */
export class ShopScene extends Phaser.Scene {
  private world!: PlatformWorld;
  private player!: Player;
  private prompt!: Phaser.GameObjects.Image;
  private customer!: Phaser.GameObjects.Sprite;
  private taskMarkers = new Map<string, Phaser.GameObjects.BitmapText>();
  private hudTop!: Phaser.GameObjects.BitmapText;
  private hudBottom!: Phaser.GameObjects.BitmapText;
  private nearby: StationDef | null = null;
  private busy = false;

  constructor() {
    super('Shop');
  }

  private get shop() {
    return session.shop;
  }

  create(): void {
    // Scene instances are reused across restarts (e.g. returning from training).
    this.busy = false;
    this.taskMarkers = new Map();
    this.buildWorld();
    this.createHud();
    const unsubscribe = gameState.subscribe(() => this.refreshHud());
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, unsubscribe);
    this.refreshHud();

    if (!session.started) {
      session.started = true;
      const triggers = this.shop.startDay();
      if (session.debugJob) this.shop.walkIn(session.debugJob);
      void this.run(() => this.morning(triggers));
    } else if (session.pendingTriggers) {
      // Back from training: play the end-of-day and morning events we missed.
      const pending = session.pendingTriggers;
      session.pendingTriggers = null;
      void this.run(async () => {
        for (const t of pending) await this.onTrigger(t);
        await this.say([fmt(D.day.morning, { month: monthName(gameState.day), day: dayInMonth(gameState.day), n: monthOf(gameState.day) })]);
      });
    }
  }

  // ------------------------------------------------------------ world

  private buildWorld(): void {
    this.world = new PlatformWorld(this, SHOP_LAYOUT, session.spawnAt);
    session.spawnAt = undefined;
    this.player = this.world.player;
    this.prompt = this.world.prompt;
    const ts = SHOP_LAYOUT.tileSize;
    for (const s of SHOP_LAYOUT.stations) {
      if (!isWorkStation(s.id)) continue;
      const img = this.world.stationImages.get(s.id)!;
      this.taskMarkers.set(s.id, addText(this, (s.tx + s.w / 2) * ts - 2, img.y - img.height - 10, '!', 0).setDepth(19));
    }
    // Waiting customer stands just inside the door, at the counter.
    const counter = SHOP_LAYOUT.stations.find((s) => s.id === 'front_counter')!;
    this.customer = this.add
      .sprite(counter.tx * ts - 3, (counter.ty + 1) * ts, 'customer', 0)
      .setOrigin(0.5, 1)
      .setDepth(2)
      .setVisible(false);
  }

  // ------------------------------------------------------------ HUD

  private createHud(): void {
    const g = this.add.graphics().setScrollFactor(0).setDepth(100);
    g.fillStyle(PALETTE_HEX[0]).fillRect(0, 0, SCREEN_W, HUD_H);
    g.fillStyle(PALETTE_HEX[0]).fillRect(0, SCREEN_H - HUD_H, SCREEN_W, HUD_H);
    this.hudTop = addText(this, 2, 1, '', 3).setScrollFactor(0).setDepth(101);
    this.hudBottom = addText(this, 2, SCREEN_H - HUD_H + 1, '', 2).setScrollFactor(0).setDepth(101);
  }

  private refreshHud(): void {
    const s = gameState;
    setText(this.hudTop, `$${s.cash} R${s.reputation} ${monthName(s.day)}${dayInMonth(s.day)} ${this.shop.clockText}`);
  }

  private hudHint(): string {
    if (this.nearby) return `A: ${this.nearby.name}`;
    const job = this.shop.activeJob;
    if (job && isJobDone(job)) return 'BIKE READY: GO TO COUNTER';
    if (job) return `${job.template.name.slice(0, 18)} ${job.tasks.length - pendingTasks(job).length}/${job.tasks.length}`;
    if (this.shop.waiting.length) return `CUSTOMERS WAITING: ${this.shop.waiting.length}`;
    return 'B:JUMP START:MENU';
  }

  // ------------------------------------------------------------ loop

  update(time: number, delta: number): void {
    // Visuals that reflect shop state
    const blink = Math.floor(time / 400) % 2 === 0;
    for (const [id, marker] of this.taskMarkers) {
      marker.setVisible(blink && !!this.shop.taskAt(id as WorkStationId));
    }
    this.customer.setVisible(this.shop.waiting.length > 0 || (!!this.shop.activeJob && isJobDone(this.shop.activeJob)));
    this.customer.setFrame(Math.floor(time / 700) % 2 ? 0 : 1);

    if (this.busy) return;
    this.player.update(gamepad, delta);
    this.shop.advance((delta / 1000) * BALANCE.clock.shopMinutesPerRealSecond);
    this.refreshHud();

    this.nearby = this.world.updateNearby(time);
    setText(this.hudBottom, this.hudHint());

    if (this.shop.closed) {
      void this.run(() => this.endOfDay(true));
    } else if (gamepad.justPressed('A') && this.nearby) {
      const station = this.nearby;
      void this.run(() => this.interact(station));
    } else if (gamepad.justPressed('START')) {
      void this.run(() => this.pauseMenu());
    }
  }

  /** Run an async interaction, freezing the player while it lasts. */
  private async run(fn: () => Promise<void>): Promise<void> {
    this.busy = true;
    this.player.body.setVelocityX(0);
    this.prompt.setVisible(false);
    try {
      await fn();
    } finally {
      this.busy = false;
      this.refreshHud();
    }
  }

  // ------------------------------------------------------------ interactions

  private say(pages: string[], speaker?: string) {
    return showDialog(this, { pages, speaker });
  }

  private async interact(station: StationDef): Promise<void> {
    if (station.id === 'front_counter') return this.frontCounter();
    if (station.id === 'parts_wall') return this.partsWall();
    if (isWorkStation(station.id)) return this.workStation(station.id);
    if (station.id === 'training_door') return this.trainingDoor();
    await this.say([(D.stations as Record<string, string>)[station.id]], station.name);
  }

  private async trainingDoor(): Promise<void> {
    const c = await showDialog(this, {
      speaker: 'TRAINING CENTER',
      pages: [D.stations.training_door],
      choices: [{ label: D.training.enter }, { label: D.training.notNow }],
      cancellable: true,
    });
    if (c === 0) this.scene.start('Training');
  }

  private async frontCounter(): Promise<void> {
    const action = this.shop.counter();
    if (action.kind === 'handover') {
      const r = this.shop.handOver();
      await this.say([r.reaction], r.customer);
      await this.say(
        [
          fmt(D.counter.handoverSummary, {
            quality: r.quality,
            time: r.timeScore,
            satisfaction: r.satisfaction,
            payment: r.payment,
            rep: signed(r.reputationDelta),
          }),
        ],
        r.jobName.toUpperCase().slice(0, 20),
      );
      return;
    }
    if (action.kind === 'busy') {
      const tasks = pendingTasks(action.job).map((t) => `${t.def.name} (${stationShort(t.def.station)})`);
      await this.say([fmt(D.counter.busy, { job: action.job.template.name, tasks: tasks.join(', ') })], 'FRONT COUNTER');
      return;
    }
    if (action.kind === 'empty') {
      await this.say([D.stations.front_counter], 'FRONT COUNTER');
      return;
    }
    await this.offerJob(action.customer);
  }

  /**
   * Big customers trigger a rush-vs-quality decision first. The decision leaves
   * flags behind that say how to take the job; they are consumed here.
   */
  private async beforeOffer(customer: Customer): Promise<{ rush: boolean; overtime: boolean; skip: boolean }> {
    if (!customer.big) return { rush: false, overtime: false, skip: false };
    if (!customer.plan) {
      await this.say([customer.request], customer.name);
      await runDecision(this, session.decisions, 'big_customer');
      const take = (flag: string) => {
        const had = gameState.hasFlag(flag);
        gameState.clearFlag(flag);
        return had;
      };
      const rush = take('rush_current_job');
      const overtime = take('overtime_current_job');
      if (take('decline_current_job')) {
        this.shop.decline(customer);
        return { rush, overtime, skip: true };
      }
      customer.plan = { rush, overtime };
    }
    return { ...customer.plan, skip: false };
  }

  private async offerJob(customer: Customer): Promise<void> {
    const { rush, overtime, skip } = await this.beforeOffer(customer);
    if (skip) return;
    const t = customer.template;
    const stations = [...new Set(t.tasks.map((id) => stationShort(TASKS[id].station)))];
    const price = Math.round(
      basePrice(t) * gameState.modifier('priceMultiplier') * (rush ? BALANCE.scoring.rushPriceFactor : 1),
    );
    const summary = fmt(D.counter.offerSummary, { job: t.name, price, stations: stations.join(', ') });
    const choice = await showDialog(this, {
      speaker: customer.name,
      pages: [...(customer.big ? [] : [customer.request]), rush ? `${summary}\n${D.counter.rushNote}` : summary],
      choices: [{ label: D.counter.accept }, { label: D.counter.decline }, { label: D.counter.later }],
      cancellable: true,
    });
    if (choice === 0) {
      this.shop.accept(customer, rush, overtime);
      await this.say([fmt(D.counter.accepted, { stations: stations.join(', ') })], customer.name);
    } else if (choice === 1) {
      this.shop.decline(customer);
      await this.say([D.counter.declined]);
    }
  }

  private async workStation(id: WorkStationId): Promise<void> {
    const task = this.shop.taskAt(id);
    const name = stationName(id);
    if (!task) {
      await this.say([(D.stations as Record<string, string>)[id], D.idle], name);
      return;
    }
    const choice = await showDialog(this, {
      speaker: name,
      pages: [`${task.def.name.toUpperCase()}\n${task.def.hint}`],
      choices: [{ label: D.work.start }, { label: D.work.later }],
      cancellable: true,
    });
    if (choice !== 0) return;
    const quality = await this.playMinigame(task, name);
    const result = this.shop.finishTask(task, quality);
    const pages = [fmt(D.work.done, { quality: result.quality, minutes: result.minutes })];
    if (result.rushOrdered) {
      pages.push(fmt(D.work.rushOrdered, { cost: this.shop.rushOrderCost(task) }));
    }
    if (this.shop.activeJob && isJobDone(this.shop.activeJob)) pages.push(D.work.bikeReady);
    await this.say(pages, name);
  }

  private playMinigame(task: JobTask, stationLabel: string): Promise<number> {
    return new Promise((resolve) => {
      const data: MinigameData = {
        task: task.def,
        stationName: stationLabel,
        skill: gameState.skill(task.def.station),
        game: this.shop.startTask(task),
        onDone: (q) => {
          this.scene.resume();
          resolve(q);
        },
      };
      gamepad.consume('A');
      this.scene.pause();
      this.scene.launch('Minigame', data);
    });
  }

  private async partsWall(): Promise<void> {
    const choice = await showDialog(this, {
      speaker: 'PARTS WALL',
      pages: [
        fmt(D.parts.status, {
          inventory: gameState.inventoryHealth,
          amount: BALANCE.economy.restockAmount,
          cost: this.shop.restockCost(),
        }),
      ],
      choices: [{ label: `${D.parts.restock} $${this.shop.restockCost()}` }, { label: D.parts.leave }],
      cancellable: true,
    });
    if (choice === 0) await this.say([this.shop.restock() ? D.parts.restocked : D.parts.cannot], 'PARTS WALL');
  }

  // ------------------------------------------------------------ menu and days

  private async pauseMenu(): Promise<void> {
    const m = D.pauseMenu;
    const items: { label: string; run: () => Promise<void> | void }[] = [
      { label: m.resume, run: () => {} },
      { label: m.job, run: () => this.showJob() },
      { label: m.stats, run: () => this.showStats() },
      { label: m.training, run: () => this.showTraining() },
      { label: m.ledger, run: () => this.openLedger() },
      { label: m.endDay, run: () => this.confirmEndDay() },
      { label: m.inputTest, run: () => void this.scene.start('InputTest') },
    ];
    const choice = await showDialog(this, {
      pages: [`${m.title}  ${monthName(gameState.day)} DAY ${dayInMonth(gameState.day)}  ${this.shop.clockText}`],
      choices: items.map((i) => ({ label: i.label })),
      cancellable: true,
    });
    if (choice >= 0) await items[choice].run();
  }

  /** Training progress: a bar per station skill, plus certifications. */
  private async showTraining(): Promise<void> {
    const s = gameState;
    const bar = (n: number) => '|'.repeat(n) + '-'.repeat(5 - n);
    const rows: [string, WorkStationId][] = [
      ['FRAME     ', 'frame_jig'],
      ['WHEELS    ', 'wheel_stand'],
      ['DRIVETRAIN', 'drivetrain_bench'],
      ['SUSPENSION', 'suspension_bench'],
    ];
    await this.say(
      [
        rows.map(([label, id]) => `${label} ${bar(s.skill(id))} ${s.skill(id)}/5`).join('\n'),
        `CERTIFIED: ${s.hasFlag('certified_mechanic') ? 'YES' : s.hasFlag('exam_failed') ? 'NOT YET (RETAKE)' : 'NO'}\nCS WORKSHOP: ${s.hasFlag('cs_trained') ? 'DONE' : 'NO'}\nCOURSES TAKEN: ${s.snapshot.trainingDone.length}`,
      ],
      'TRAINING',
    );
  }

  private async confirmEndDay(): Promise<void> {
    const sure = await showDialog(this, {
      pages: [D.day.endDayConfirm],
      choices: [{ label: D.yes }, { label: D.no }],
      cancellable: true,
    });
    if (sure === 0) await this.endOfDay(false);
  }

  private openLedger(): Promise<void> {
    return new Promise((resolve) => {
      this.scene.pause();
      this.scene.launch('Ledger', {
        onClose: () => {
          this.scene.resume();
          resolve();
        },
      } satisfies LedgerData);
    });
  }

  private async showJob(): Promise<void> {
    const job = this.shop.activeJob;
    if (!job) return void (await this.say([D.noJob]));
    const lines = job.tasks.map((t) => `${t.done ? '*' : '-'} ${t.def.name}${t.done ? ` ${t.quality}` : ''}`);
    const est = estimatedMinutes(job.template);
    await this.say([`${job.customer}: ${job.template.name}${job.rush ? ' (RUSH)' : ''}`, lines.join('\n'), `ESTIMATE ${est} MIN`], 'CURRENT JOB');
  }

  private async showStats(): Promise<void> {
    const s = gameState;
    await this.say(
      [
        `CASH $${s.cash}\nREPUTATION ${s.reputation}\nSTAFF MORALE ${s.staffMorale}\nINVENTORY ${s.inventoryHealth}\nGOODWILL ${s.communityGoodwill}`,
        `SKILL LEVELS\nFRAME JIG ${s.skill('frame_jig')}\nWHEELS ${s.skill('wheel_stand')}\nDRIVETRAIN ${s.skill('drivetrain_bench')}\nSUSPENSION ${s.skill('suspension_bench')}`,
        `PRICES X${s.modifier('priceMultiplier').toFixed(2)}\nSTAFF ${s.modifier('staffCount')}\nPARTS QUALITY ${signed(s.modifier('partsQualityBonus'))}\nEXTRA CUSTOMERS ${s.modifier('extraCustomersPerDay')}\nDECISIONS MADE ${this.decisionsMade()}`,
      ],
      'SHOP STATS',
    );
  }

  private decisionsMade(): number {
    const withChoices = (id: string) => !!session.decisions.data.nodes[id]?.choices;
    return gameState.snapshot.decisionsSeen.filter(withChoices).length;
  }

  private async endOfDay(auto: boolean): Promise<void> {
    if (auto) await this.say([D.day.closing]);
    const sum = this.shop.endDay();
    const pages = [
      fmt(D.day.summary, {
        day: sum.day,
        jobs: sum.jobsDone,
        revenue: sum.revenue,
        overhead: sum.overhead,
        wages: sum.wages,
        staffIncome: sum.staffIncome,
        net: signedMoney(sum.cashChange),
        rep: signed(sum.reputationChange),
      }),
    ];
    if (sum.unserved) pages.push(fmt(D.day.unserved, { count: sum.unserved }));
    await this.say(pages, 'END OF DAY');
    await this.onTrigger('end_of_day');
    const triggers = this.shop.nextDay();
    await this.morning(triggers);
  }

  private async morning(triggers: Trigger[]): Promise<void> {
    await this.say([fmt(D.day.morning, { month: monthName(gameState.day), day: dayInMonth(gameState.day), n: monthOf(gameState.day) })]);
    for (const t of triggers) await this.onTrigger(t);
  }

  private async onTrigger(trigger: Trigger): Promise<void> {
    if (trigger === 'industry_report') return this.industryReport();
    await runDecision(this, session.decisions, trigger);
  }

  /** Once a month: a real stat as a news item, then the decision it nudges (if eligible). */
  private async industryReport(): Promise<void> {
    const report = reportForMonth(monthOf(gameState.day));
    const text = reportText(report);
    await this.say([`${text.headline}\n${text.body}`, text.source], 'INDUSTRY REPORT');
    const ev = report.event ? session.decisions.beginEvent(report.event) : null;
    if (ev) await playEvent(this, session.decisions, ev);
  }
}

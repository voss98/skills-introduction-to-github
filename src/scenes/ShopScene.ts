import Phaser from 'phaser';
import dialogue from '../data/dialogue.json';
import { BALANCE } from '../core/balance';
import { gameState, WORK_STATIONS, type WorkStationId } from '../core/gameState';
import { estimatedMinutes, isJobDone, pendingTasks, TASKS, type JobTask } from '../core/jobs';
import { ladderRects, runsOf, SHOP_LAYOUT, type StationDef } from '../core/layout';
import type { Customer, Trigger } from '../core/shop';
import { fmt, signed, signedMoney } from '../core/text';
import { PALETTE_HEX, SCREEN_H, SCREEN_W } from '../gfx/palette';
import { TILE_FRAMES } from '../gfx/sprites';
import { addText, setText } from '../gfx/ui';
import { gamepad } from '../input/InputManager';
import { showDialog } from './DialogScene';
import type { MinigameData } from './MinigameScene';
import { Player } from './Player';
import { session } from './session';

const HUD_H = 8;
const D = dialogue;
const stationName = (id: string) => SHOP_LAYOUT.stations.find((s) => s.id === id)?.name ?? id;
const isWorkStation = (id: string): id is WorkStationId => (WORK_STATIONS as readonly string[]).includes(id);

/** The shop floor: platforming, stations, customers, the clock and the HUD. */
export class ShopScene extends Phaser.Scene {
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
    }
  }

  // ------------------------------------------------------------ world

  private buildWorld(): void {
    const L = SHOP_LAYOUT;
    const ts = L.tileSize;
    const worldW = L.cols * ts;
    const worldH = L.rows * ts;
    this.physics.world.setBounds(0, 0, worldW, worldH);
    this.physics.world.gravity.y = BALANCE.movement.gravity;
    this.cameras.main.setBackgroundColor(PALETTE_HEX[3]);

    const blit = this.add.blitter(0, 0, 'tiles');
    for (let y = 0; y < L.rows; y++) {
      for (let x = 0; x < L.cols; x++) {
        const t = L.tiles[y][x];
        if (t !== 'solid') blit.create(x * ts, y * ts, y === L.rows - 2 ? TILE_FRAMES.wallTrim : TILE_FRAMES.wall);
        if (t === 'solid') blit.create(x * ts, y * ts, TILE_FRAMES.solid);
        if (t === 'oneway' || t === 'ladderTop') blit.create(x * ts, y * ts, TILE_FRAMES.oneway);
      }
    }

    const place = (sprite: string, tx: number, ty: number) =>
      this.add.image(tx * ts, (ty + 1) * ts, sprite).setOrigin(0, 1);
    for (const d of L.decor) place(d.sprite, d.tx, d.ty);
    for (const s of L.stations) {
      const img = place(s.id, s.tx, s.ty).setDepth(1);
      if (isWorkStation(s.id)) {
        const marker = addText(this, (s.tx + s.w / 2) * ts - 2, img.y - img.height - 10, '!', 0).setDepth(19);
        this.taskMarkers.set(s.id, marker);
      }
    }

    const ladders = ladderRects(L);
    for (const l of ladders) {
      for (let y = l.y - ts; y < l.y + l.h; y += ts) blit.create(l.x, y, TILE_FRAMES.ladder);
    }

    const solids = this.physics.add.staticGroup();
    for (const r of runsOf(L, ['solid'])) solids.add(this.add.zone(r.x + r.w / 2, r.y + r.h / 2, r.w, r.h));
    const oneways = this.physics.add.staticGroup();
    for (const r of runsOf(L, ['oneway', 'ladderTop'])) {
      const z = this.add.zone(r.x + r.w / 2, r.y + r.h / 2, r.w, r.h);
      oneways.add(z);
      const body = z.body as Phaser.Physics.Arcade.StaticBody;
      body.checkCollision.down = false;
      body.checkCollision.left = false;
      body.checkCollision.right = false;
    }

    // Waiting customer stands just inside the door, at the counter.
    const counter = L.stations.find((s) => s.id === 'front_counter')!;
    this.customer = this.add
      .sprite(counter.tx * ts - 3, (counter.ty + 1) * ts, 'customer', 0)
      .setOrigin(0.5, 1)
      .setDepth(2)
      .setVisible(false);

    this.player = new Player(this, (L.playerStart.tx + 0.5) * ts, (L.playerStart.ty + 1) * ts, ladders);
    this.physics.add.collider(this.player.sprite, solids);
    this.physics.add.collider(this.player.sprite, oneways, undefined, (_p, platform) => {
      if (this.player.climbing) return false;
      const top = (platform as Phaser.GameObjects.Zone).body!.position.y;
      const b = this.player.body;
      return b.velocity.y >= 0 && b.prev.y + b.height <= top + 1;
    });

    this.prompt = this.add.image(0, 0, 'prompt').setOrigin(0.5, 1).setDepth(20).setVisible(false);

    this.cameras.main.setBounds(0, 0, worldW, worldH);
    this.cameras.main.startFollow(this.player.sprite, true, 1, 0);
    this.cameras.main.setRoundPixels(true);
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
    setText(this.hudTop, `$${s.cash} REP${s.reputation} D${s.day} ${this.shop.clockText}`);
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

  private findNearby(): StationDef | null {
    if (!this.player.onGround || this.player.climbing) return null;
    const ts = SHOP_LAYOUT.tileSize;
    const x = this.player.centerX;
    const feet = this.player.feetY;
    return (
      SHOP_LAYOUT.stations.find((s) => {
        const floor = (s.ty + 1) * ts;
        return x >= s.tx * ts - 2 && x <= (s.tx + s.w) * ts + 2 && Math.abs(feet - floor) <= 2;
      }) ?? null
    );
  }

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

    this.nearby = this.findNearby();
    if (this.nearby) {
      const ts = SHOP_LAYOUT.tileSize;
      const bob = Math.floor(time / 300) % 2;
      const top = this.textures.getFrame(this.nearby.id).height;
      this.prompt.setPosition((this.nearby.tx + this.nearby.w / 2) * ts, (this.nearby.ty + 1) * ts - top - 1 - bob);
    }
    this.prompt.setVisible(!!this.nearby);
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
    await this.say([(D.stations as Record<string, string>)[station.id]], station.name);
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
      const tasks = pendingTasks(action.job).map((t) => `${t.def.name} (${stationName(t.def.station)})`);
      await this.say([fmt(D.counter.busy, { job: action.job.template.name, tasks: tasks.join(', ') })], 'FRONT COUNTER');
      return;
    }
    if (action.kind === 'empty') {
      await this.say([D.stations.front_counter], 'FRONT COUNTER');
      return;
    }
    await this.offerJob(action.customer);
  }

  /** Hook for decision events (phase 4): may turn the job into a rush job. */
  protected async beforeOffer(_customer: Customer): Promise<{ rush: boolean }> {
    return { rush: false };
  }

  private async offerJob(customer: Customer): Promise<void> {
    const { rush } = await this.beforeOffer(customer);
    const t = customer.template;
    const stations = [...new Set(t.tasks.map((id) => stationName(TASKS[id].station)))];
    const price = Math.round(
      t.price * gameState.modifier('priceMultiplier') * (rush ? BALANCE.scoring.rushPriceFactor : 1),
    );
    const summary = fmt(D.counter.offerSummary, { job: t.name, price, stations: stations.join(', ') });
    const choice = await showDialog(this, {
      speaker: customer.name,
      pages: [customer.request, rush ? `${summary}\n${D.counter.rushNote}` : summary],
      choices: [{ label: D.counter.accept }, { label: D.counter.decline }, { label: D.counter.later }],
      cancellable: true,
    });
    if (choice === 0) {
      this.shop.accept(customer, rush);
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
    const pages = [fmt(D.work.done, { quality, minutes: result.minutes })];
    if (result.rushOrdered) {
      pages.push(fmt(D.work.rushOrdered, { cost: Math.round(BALANCE.economy.rushOrderPartsCost * gameState.modifier('partsCostMultiplier')) }));
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
    const choice = await showDialog(this, {
      pages: [`${m.title}  DAY ${gameState.day}  ${this.shop.clockText}`],
      choices: [{ label: m.resume }, { label: m.job }, { label: m.stats }, { label: m.endDay }, { label: m.inputTest }],
      cancellable: true,
    });
    if (choice === 1) await this.showJob();
    if (choice === 2) await this.showStats();
    if (choice === 3) {
      const sure = await showDialog(this, {
        pages: [D.day.endDayConfirm],
        choices: [{ label: D.yes }, { label: D.no }],
        cancellable: true,
      });
      if (sure === 0) await this.endOfDay(false);
    }
    if (choice === 4) this.scene.start('InputTest');
  }

  private async showJob(): Promise<void> {
    const job = this.shop.activeJob;
    if (!job) return void (await this.say([D.noJob]));
    const lines = job.tasks.map((t) => `${t.done ? '*' : '-'} ${t.def.name}${t.done ? ` ${t.quality}` : ''}`);
    const est = estimatedMinutes(job.template);
    await this.say([`${job.customer}: ${job.template.name}${job.rush ? ' (RUSH)' : ''}`, lines.join('\n'), `ESTIMATE ${est} MIN`], 'CURRENT JOB');
  }

  protected async showStats(): Promise<void> {
    const s = gameState;
    await this.say(
      [
        `CASH $${s.cash}\nREPUTATION ${s.reputation}\nSTAFF MORALE ${s.staffMorale}\nINVENTORY ${s.inventoryHealth}\nGOODWILL ${s.communityGoodwill}`,
        `SKILL LEVELS\nFRAME JIG ${s.skill('frame_jig')}\nWHEELS ${s.skill('wheel_stand')}\nDRIVETRAIN ${s.skill('drivetrain_bench')}\nSUSPENSION ${s.skill('suspension_bench')}`,
      ],
      'SHOP STATS',
    );
  }

  private async endOfDay(auto: boolean): Promise<void> {
    if (auto) await this.say([D.day.closing]);
    const sum = this.shop.endDay();
    const pages = [
      fmt(D.day.summary, {
        day: sum.day,
        jobs: sum.jobsDone,
        revenue: sum.revenue,
        rent: sum.rent,
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
    await this.say([fmt(D.day.morning, { day: gameState.day })]);
    for (const t of triggers) await this.onTrigger(t);
  }

  /** Decision events hook in here (phase 4). */
  protected async onTrigger(_trigger: Trigger): Promise<void> {}
}

import Phaser from 'phaser';
import dialogue from '../data/dialogue.json';
import { BALANCE } from '../core/balance';
import { gameState } from '../core/gameState';
import { ladderRects, runsOf, SHOP_LAYOUT, type StationDef } from '../core/layout';
import { PALETTE_HEX, SCREEN_H, SCREEN_W } from '../gfx/palette';
import { TILE_FRAMES } from '../gfx/sprites';
import { addText, setText } from '../gfx/ui';
import { gamepad } from '../input/InputManager';
import { showDialog } from './DialogScene';
import { Player } from './Player';

const HUD_H = 8;

/** The shop floor: platforming, stations, and the HUD. */
export class ShopScene extends Phaser.Scene {
  private player!: Player;
  private prompt!: Phaser.GameObjects.Image;
  private hudTop!: Phaser.GameObjects.BitmapText;
  private hudBottom!: Phaser.GameObjects.BitmapText;
  private nearby: StationDef | null = null;
  private busy = false;

  constructor() {
    super('Shop');
  }

  create(): void {
    const L = SHOP_LAYOUT;
    const ts = L.tileSize;
    const worldW = L.cols * ts;
    const worldH = L.rows * ts;
    this.physics.world.setBounds(0, 0, worldW, worldH);
    this.physics.world.gravity.y = BALANCE.movement.gravity;
    this.cameras.main.setBackgroundColor(PALETTE_HEX[3]);

    // Tiles
    const blit = this.add.blitter(0, 0, 'tiles');
    for (let y = 0; y < L.rows; y++) {
      for (let x = 0; x < L.cols; x++) {
        const t = L.tiles[y][x];
        if (t !== 'solid') blit.create(x * ts, y * ts, y === L.rows - 2 ? TILE_FRAMES.wallTrim : TILE_FRAMES.wall);
        if (t === 'solid') blit.create(x * ts, y * ts, TILE_FRAMES.solid);
        if (t === 'oneway' || t === 'ladderTop') blit.create(x * ts, y * ts, TILE_FRAMES.oneway);
      }
    }

    // Decor and stations stand on the tile row below their (tx, ty).
    const place = (sprite: string, tx: number, ty: number) =>
      this.add.image(tx * ts, (ty + 1) * ts, sprite).setOrigin(0, 1);
    for (const d of L.decor) place(d.sprite, d.tx, d.ty);
    for (const s of L.stations) place(s.id, s.tx, s.ty).setDepth(1);

    // Ladders are drawn over platforms so the climb path is visible.
    const ladders = ladderRects(L);
    for (const l of ladders) {
      for (let y = l.y - ts; y < l.y + l.h; y += ts) blit.create(l.x, y, TILE_FRAMES.ladder);
    }

    // Physics
    const solids = this.physics.add.staticGroup();
    for (const r of runsOf(L, ['solid'])) {
      solids.add(this.add.zone(r.x + r.w / 2, r.y + r.h / 2, r.w, r.h));
    }
    const oneways = this.physics.add.staticGroup();
    for (const r of runsOf(L, ['oneway', 'ladderTop'])) {
      const z = this.add.zone(r.x + r.w / 2, r.y + r.h / 2, r.w, r.h);
      oneways.add(z);
      const body = z.body as Phaser.Physics.Arcade.StaticBody;
      body.checkCollision.down = false;
      body.checkCollision.left = false;
      body.checkCollision.right = false;
    }

    this.player = new Player(this, (L.playerStart.tx + 0.5) * ts, (L.playerStart.ty + 1) * ts, ladders);
    this.physics.add.collider(this.player.sprite, solids);
    this.physics.add.collider(this.player.sprite, oneways, undefined, (_p, platform) => {
      if (this.player.climbing) return false;
      const top = (platform as Phaser.GameObjects.Zone).body!.position.y;
      const b = this.player.body;
      return b.velocity.y >= 0 && b.prev.y + b.height <= top + 1;
    });

    this.prompt = this.add.image(0, 0, 'prompt').setOrigin(0.5, 1).setDepth(20).setVisible(false);

    // Camera follows horizontally; the shop is exactly one screen tall.
    this.cameras.main.setBounds(0, 0, worldW, worldH);
    this.cameras.main.startFollow(this.player.sprite, true, 1, 0);
    this.cameras.main.setRoundPixels(true);

    this.createHud();
    const unsubscribe = gameState.subscribe(() => this.refreshHud());
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, unsubscribe);
    this.refreshHud();
  }

  private createHud(): void {
    const g = this.add.graphics().setScrollFactor(0).setDepth(100);
    g.fillStyle(PALETTE_HEX[0]).fillRect(0, 0, SCREEN_W, HUD_H);
    g.fillStyle(PALETTE_HEX[0]).fillRect(0, SCREEN_H - HUD_H, SCREEN_W, HUD_H);
    this.hudTop = addText(this, 2, 1, '', 3).setScrollFactor(0).setDepth(101);
    this.hudBottom = addText(this, 2, SCREEN_H - HUD_H + 1, '', 2).setScrollFactor(0).setDepth(101);
  }

  private refreshHud(): void {
    const s = gameState;
    setText(this.hudTop, `$${s.cash} REP${s.reputation} DAY ${s.day}`);
  }

  private hudHint(): string {
    if (this.nearby) return `A: ${this.nearby.name}`;
    return 'B:JUMP START:MENU';
  }

  /** The station whose footprint the player is standing in, if any. */
  private findNearby(): StationDef | null {
    if (!this.player.onGround || this.player.climbing) return null;
    const ts = SHOP_LAYOUT.tileSize;
    const x = this.player.centerX;
    const feet = this.player.feetY;
    return (
      SHOP_LAYOUT.stations.find((s) => {
        const left = s.tx * ts;
        const right = (s.tx + s.w) * ts;
        const floor = (s.ty + 1) * ts;
        return x >= left - 2 && x <= right + 2 && Math.abs(feet - floor) <= 2;
      }) ?? null
    );
  }

  update(time: number, delta: number): void {
    if (this.busy) return;
    this.player.update(gamepad, delta);

    this.nearby = this.findNearby();
    if (this.nearby) {
      const ts = SHOP_LAYOUT.tileSize;
      const bob = Math.floor(time / 300) % 2;
      const top = this.textures.getFrame(this.nearby.id).height;
      this.prompt.setPosition((this.nearby.tx + this.nearby.w / 2) * ts, (this.nearby.ty + 1) * ts - top - 1 - bob);
    }
    this.prompt.setVisible(!!this.nearby);
    setText(this.hudBottom, this.hudHint());

    if (gamepad.justPressed('A') && this.nearby) {
      void this.run(() => this.interact(this.nearby!));
    } else if (gamepad.justPressed('START')) {
      void this.run(() => this.pauseMenu());
    }
  }

  /** Run an async interaction, stopping the player while it lasts. */
  private async run(fn: () => Promise<void>): Promise<void> {
    this.busy = true;
    this.player.body.setVelocityX(0);
    try {
      await fn();
    } finally {
      this.busy = false;
    }
  }

  private async interact(station: StationDef): Promise<void> {
    const text = (dialogue.stations as Record<string, string>)[station.id];
    await showDialog(this, { speaker: station.name, pages: [text] });
  }

  private async pauseMenu(): Promise<void> {
    const m = dialogue.pauseMenu;
    const choice = await showDialog(this, {
      pages: [m.title],
      choices: [{ label: m.resume }, { label: m.stats }, { label: m.inputTest }],
      cancellable: true,
    });
    if (choice === 1) await this.showStats();
    if (choice === 2) this.scene.start('InputTest');
  }

  private async showStats(): Promise<void> {
    const s = gameState;
    await showDialog(this, {
      speaker: 'SHOP STATS',
      pages: [
        `CASH $${s.cash}\nREPUTATION ${s.reputation}\nSTAFF MORALE ${s.staffMorale}\nINVENTORY ${s.inventoryHealth}\nGOODWILL ${s.communityGoodwill}`,
      ],
    });
  }
}

import Phaser from 'phaser';
import { BALANCE } from '../core/balance';
import { ladderRects, runsOf, type ShopLayout, type StationDef } from '../core/layout';
import { PALETTE_HEX } from '../gfx/palette';
import { TILE_FRAMES } from '../gfx/sprites';
import { Player } from './Player';

/**
 * Builds a tile-map room (tiles, decor, stations, ladders, one-way platforms,
 * the player and the "A" prompt). Shared by the shop floor and the Training Center.
 */
export class PlatformWorld {
  readonly player: Player;
  readonly prompt: Phaser.GameObjects.Image;
  readonly stationImages = new Map<string, Phaser.GameObjects.Image>();
  nearby: StationDef | null = null;

  constructor(
    readonly scene: Phaser.Scene,
    readonly layout: ShopLayout,
    spawnStation?: string,
  ) {
    const L = layout;
    const ts = L.tileSize;
    const worldW = L.cols * ts;
    const worldH = L.rows * ts;
    scene.physics.world.setBounds(0, 0, worldW, worldH);
    scene.physics.world.gravity.y = BALANCE.movement.gravity;
    scene.cameras.main.setBackgroundColor(PALETTE_HEX[3]);

    const blit = scene.add.blitter(0, 0, 'tiles');
    for (let y = 0; y < L.rows; y++) {
      for (let x = 0; x < L.cols; x++) {
        const t = L.tiles[y][x];
        if (t !== 'solid') blit.create(x * ts, y * ts, y === L.rows - 2 ? TILE_FRAMES.wallTrim : TILE_FRAMES.wall);
        if (t === 'solid') blit.create(x * ts, y * ts, TILE_FRAMES.solid);
        if (t === 'oneway' || t === 'ladderTop') blit.create(x * ts, y * ts, TILE_FRAMES.oneway);
      }
    }

    const place = (sprite: string, tx: number, ty: number) => scene.add.image(tx * ts, (ty + 1) * ts, sprite).setOrigin(0, 1);
    for (const d of L.decor) place(d.sprite, d.tx, d.ty);
    for (const s of L.stations) this.stationImages.set(s.id, place(s.id, s.tx, s.ty).setDepth(1));

    const ladders = ladderRects(L);
    for (const l of ladders) {
      for (let y = l.y - ts; y < l.y + l.h; y += ts) blit.create(l.x, y, TILE_FRAMES.ladder);
    }

    const solids = scene.physics.add.staticGroup();
    for (const r of runsOf(L, ['solid'])) solids.add(scene.add.zone(r.x + r.w / 2, r.y + r.h / 2, r.w, r.h));
    const oneways = scene.physics.add.staticGroup();
    for (const r of runsOf(L, ['oneway', 'ladderTop'])) {
      const z = scene.add.zone(r.x + r.w / 2, r.y + r.h / 2, r.w, r.h);
      oneways.add(z);
      const body = z.body as Phaser.Physics.Arcade.StaticBody;
      body.checkCollision.down = false;
      body.checkCollision.left = false;
      body.checkCollision.right = false;
    }

    const spawn = L.stations.find((s) => s.id === spawnStation);
    const start = spawn ? { tx: spawn.tx + spawn.w / 2 - 0.5, ty: spawn.ty } : L.playerStart;
    this.player = new Player(scene, (start.tx + 0.5) * ts, (start.ty + 1) * ts, ladders);
    scene.physics.add.collider(this.player.sprite, solids);
    scene.physics.add.collider(this.player.sprite, oneways, undefined, (_p, platform) => {
      if (this.player.climbing) return false;
      const top = (platform as Phaser.GameObjects.Zone).body!.position.y;
      const b = this.player.body;
      return b.velocity.y >= 0 && b.prev.y + b.height <= top + 1;
    });

    this.prompt = scene.add.image(0, 0, 'prompt').setOrigin(0.5, 1).setDepth(20).setVisible(false);

    scene.cameras.main.setBounds(0, 0, worldW, worldH);
    scene.cameras.main.startFollow(this.player.sprite, true, 1, 0);
    scene.cameras.main.setRoundPixels(true);
  }

  /** The station whose footprint the player is standing in, if any. */
  findNearby(): StationDef | null {
    if (!this.player.onGround || this.player.climbing) return null;
    const ts = this.layout.tileSize;
    const x = this.player.centerX;
    const feet = this.player.feetY;
    return (
      this.layout.stations.find((s) => {
        const floor = (s.ty + 1) * ts;
        return x >= s.tx * ts - 2 && x <= (s.tx + s.w) * ts + 2 && Math.abs(feet - floor) <= 2;
      }) ?? null
    );
  }

  /** Update which station is nearby and bob the "A" prompt over it. */
  updateNearby(time: number): StationDef | null {
    this.nearby = this.findNearby();
    if (this.nearby) {
      const ts = this.layout.tileSize;
      const bob = Math.floor(time / 300) % 2;
      const top = this.stationImages.get(this.nearby.id)?.height ?? 16;
      this.prompt.setPosition((this.nearby.tx + this.nearby.w / 2) * ts, (this.nearby.ty + 1) * ts - top - 1 - bob);
    }
    this.prompt.setVisible(!!this.nearby);
    return this.nearby;
  }
}

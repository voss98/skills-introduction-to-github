import Phaser from 'phaser';
import { BALANCE } from '../core/balance';
import type { Rect } from '../core/layout';
import { PLAYER_FRAMES } from '../gfx/sprites';
import type { InputReader } from '../input/InputManager';
import { sound } from '../audio/sound';

const { walkSpeed, climbSpeed, jumpVelocity } = BALANCE.movement;
/** How close (px) the player's centre must be to a ladder's centre to grab it. */
const LADDER_GRAB = 4;

type Body = Phaser.Physics.Arcade.Body;

/** Walk, jump (B) and climb. Interaction is handled by the scene. */
export class Player {
  readonly sprite: Phaser.Types.Physics.Arcade.SpriteWithDynamicBody;
  climbing = false;
  private animTime = 0;

  constructor(
    scene: Phaser.Scene,
    x: number,
    feetY: number,
    private ladders: Rect[],
  ) {
    this.sprite = scene.physics.add.sprite(x, feetY, 'player', PLAYER_FRAMES.idle);
    this.sprite.setOrigin(0.5, 1);
    this.sprite.body.setSize(6, 12).setOffset(1, 2);
    this.sprite.setCollideWorldBounds(true);
    this.sprite.setDepth(10);
  }

  get body(): Body {
    return this.sprite.body;
  }

  get onGround(): boolean {
    return this.body.blocked.down || this.body.touching.down;
  }

  get centerX(): number {
    return this.body.center.x;
  }

  get feetY(): number {
    return this.body.bottom;
  }

  update(input: InputReader, delta: number): void {
    this.animTime += delta;
    if (this.climbing) this.updateClimb(input);
    else this.updateWalk(input);
  }

  private ladderHere(): Rect | undefined {
    return this.ladders.find((l) => Math.abs(this.centerX - (l.x + l.w / 2)) <= LADDER_GRAB);
  }

  private startClimb(l: Rect): void {
    this.climbing = true;
    this.body.setAllowGravity(false);
    this.body.setVelocity(0, 0);
    this.sprite.x = l.x + l.w / 2;
  }

  private stopClimb(): void {
    this.climbing = false;
    this.body.setAllowGravity(true);
  }

  private updateWalk(input: InputReader): void {
    const dir = (input.isDown('RIGHT') ? 1 : 0) - (input.isDown('LEFT') ? 1 : 0);
    this.body.setVelocityX(dir * walkSpeed);
    if (dir) this.sprite.setFlipX(dir < 0);

    if (input.justPressed('B') && this.onGround) {
      this.body.setVelocityY(-jumpVelocity);
      sound.play('jump');
    }

    const ladder = this.ladderHere();
    if (ladder) {
      const top = ladder.y;
      const bottom = ladder.y + ladder.h;
      if (input.isDown('UP') && this.feetY > top + 1 && this.feetY <= bottom + 1) {
        this.startClimb(ladder);
        return;
      }
      if (input.isDown('DOWN') && this.onGround && Math.abs(this.feetY - top) <= 2) {
        this.startClimb(ladder);
        this.sprite.y += 3; // step below the one-way ladder top
        return;
      }
    }

    // Animation
    if (!this.onGround) this.sprite.setFrame(PLAYER_FRAMES.jump);
    else if (dir) this.sprite.setFrame(Math.floor(this.animTime / 120) % 2 ? PLAYER_FRAMES.walk1 : PLAYER_FRAMES.walk2);
    else this.sprite.setFrame(PLAYER_FRAMES.idle);
  }

  private updateClimb(input: InputReader): void {
    const ladder = this.ladderHere();
    if (!ladder) return this.stopClimb();
    const dir = (input.isDown('DOWN') ? 1 : 0) - (input.isDown('UP') ? 1 : 0);
    this.body.setVelocity(0, dir * climbSpeed);

    const top = ladder.y;
    if (dir < 0 && this.feetY <= top) {
      // Stepped off the top onto the platform.
      this.sprite.y = top;
      this.body.updateFromGameObject();
      this.body.setVelocityY(0);
      this.stopClimb();
      return;
    }
    if (dir > 0 && this.body.blocked.down) return this.stopClimb();
    if (input.justPressed('B')) {
      this.stopClimb();
      this.body.setVelocityY(-jumpVelocity * 0.6);
      return;
    }
    if ((input.isDown('LEFT') || input.isDown('RIGHT')) && this.body.blocked.down) return this.stopClimb();

    if (dir) this.sprite.setFrame(Math.floor(this.animTime / 150) % 2 ? PLAYER_FRAMES.climb1 : PLAYER_FRAMES.climb2);
    else if (this.sprite.frame.name !== String(PLAYER_FRAMES.climb1) && this.sprite.frame.name !== String(PLAYER_FRAMES.climb2)) {
      this.sprite.setFrame(PLAYER_FRAMES.climb1);
    }
  }
}

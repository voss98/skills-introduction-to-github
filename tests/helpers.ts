import type { InputReader } from '../src/input/InputManager';
import type { GBInput } from '../src/input/keymap';
import { ButtonSequenceGame, TimingBarGame, TorqueMeterGame, type Minigame } from '../src/core/minigames';

/** An InputReader driven directly by tests: set what is held / pressed this frame. */
export class FakePad implements InputReader {
  held = new Set<GBInput>();
  pressed = new Set<GBInput>();
  released = new Set<GBInput>();
  isDown = (i: GBInput) => this.held.has(i);
  justPressed = (i: GBInput) => this.pressed.has(i);
  justReleased = (i: GBInput) => this.released.has(i);
  frame(press: GBInput[] = [], hold: GBInput[] = []) {
    const nextHeld = new Set([...hold, ...press]);
    this.released = new Set([...this.held].filter((i) => !nextHeld.has(i)));
    this.pressed = new Set(press);
    this.held = nextHeld;
  }
}

const DT = 16;

/** Play a minigame well ("skill" 0..1 controls how close to perfect the bot aims). */
export function playBot(game: Minigame, accuracy = 1, maxFrames = 20000): number {
  const pad = new FakePad();
  let holding = false;
  for (let f = 0; f < maxFrames && !game.done; f++) {
    if (game instanceof TimingBarGame) {
      const aim = accuracy >= 1 ? 0.012 : 0.25;
      pad.frame(Math.abs(game.pos - game.zoneCenter) < aim ? ['A'] : []);
    } else if (game instanceof ButtonSequenceGame) {
      const want = game.sequence[game.index];
      const wrong: GBInput = want === 'A' ? 'B' : 'A';
      pad.frame(f % 8 === 0 ? [accuracy >= 1 ? want : wrong] : []);
    } else if (game instanceof TorqueMeterGame) {
      const stopAt = game.params.targetNm * (accuracy >= 1 ? 1 : 1.6);
      if (!holding) {
        pad.frame(['A']);
        holding = true;
      } else if (game.value < stopAt) {
        pad.frame([], ['A']);
      } else {
        pad.frame([]);
        holding = false;
      }
    }
    game.update(DT, pad);
  }
  if (!game.done) throw new Error('bot did not finish the minigame');
  return game.quality;
}

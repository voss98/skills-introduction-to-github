import Phaser from 'phaser';
import './style.css';
import { BALANCE } from './core/balance';
import { gamepad } from './input/InputManager';
import { bindKeyboard, bindTouchButtons } from './input/bindings';
import { PALETTE, SCREEN_H, SCREEN_W } from './gfx/palette';
import { BootScene } from './scenes/BootScene';
import { DialogScene } from './scenes/DialogScene';
import { InputTestScene } from './scenes/InputTestScene';
import { LedgerScene } from './scenes/LedgerScene';
import { MinigameScene } from './scenes/MinigameScene';
import { ShopScene } from './scenes/ShopScene';
import { TitleScene } from './scenes/TitleScene';

/** Largest whole-number zoom that fits the window (pixel-perfect scaling). */
function integerZoom(): number {
  // Leave room for everything else in the shell (touch buttons, legends), plus the canvas border.
  const others = [...document.querySelectorAll<HTMLElement>('#shell > :not(#game)')];
  const reserved = others.reduce((h, el) => h + (getComputedStyle(el).display === 'none' ? 0 : el.offsetHeight + 12), 0) + 16;
  const z = Math.floor(Math.min((window.innerWidth - 16) / SCREEN_W, (window.innerHeight - reserved) / SCREEN_H));
  return Math.max(1, z);
}

bindKeyboard(gamepad);
bindTouchButtons(gamepad, document.getElementById('touch-controls')!);

const game = new Phaser.Game({
  type: Phaser.AUTO,
  parent: 'game',
  width: SCREEN_W,
  height: SCREEN_H,
  backgroundColor: PALETTE[3],
  pixelArt: true, // nearest-neighbour filtering, no antialiasing
  roundPixels: true,
  scale: {
    mode: Phaser.Scale.NONE,
    zoom: integerZoom(),
  },
  physics: {
    default: 'arcade',
    arcade: { gravity: { x: 0, y: BALANCE.movement.gravity }, debug: false },
  },
  scene: [BootScene, TitleScene, ShopScene, InputTestScene, MinigameScene, LedgerScene, DialogScene],
});

// One input edge-detection tick per game step, before any scene updates.
game.events.on(Phaser.Core.Events.PRE_STEP, () => gamepad.update());
window.addEventListener('resize', () => game.scale.setZoom(integerZoom()));

// Handy for debugging from the console.
(window as unknown as { game: Phaser.Game }).game = game;

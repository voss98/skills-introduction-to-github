import Phaser from 'phaser';
import './style.css';
import { BALANCE } from './core/balance';
import { gamepad } from './input/InputManager';
import { bindKeyboard, bindTouchButtons } from './input/bindings';
import { PALETTE, SCREEN_H, SCREEN_W } from './gfx/palette';
import { BootScene } from './scenes/BootScene';
import { DialogScene } from './scenes/DialogScene';
import { InputTestScene } from './scenes/InputTestScene';
import { MinigameScene } from './scenes/MinigameScene';
import { ShopScene } from './scenes/ShopScene';
import { TitleScene } from './scenes/TitleScene';

/** Largest whole-number zoom that fits the window (pixel-perfect scaling). */
function integerZoom(): number {
  const touch = document.getElementById('touch-controls');
  const reserved = touch && getComputedStyle(touch).display !== 'none' ? touch.offsetHeight + 24 : 16;
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
  scene: [BootScene, TitleScene, ShopScene, InputTestScene, MinigameScene, DialogScene],
});

// One input edge-detection tick per game step, before any scene updates.
game.events.on(Phaser.Core.Events.PRE_STEP, () => gamepad.update());
window.addEventListener('resize', () => game.scale.setZoom(integerZoom()));

// Handy for debugging from the console.
(window as unknown as { game: Phaser.Game }).game = game;

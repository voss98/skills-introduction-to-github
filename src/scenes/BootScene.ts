import Phaser from 'phaser';
import { bikeArt, customerArt, playerArt, promptArt, stationArt, tileArt, trainingArt, vignetteArt } from '../gfx/sprites';
import { createFontTextures, createPixelTexture } from '../gfx/textures';
import { setPublishers } from '../core/reports';
import { publisherShortNames } from './LedgerScene';

/** Generates every texture procedurally (no image assets), then hands off. */
export class BootScene extends Phaser.Scene {
  constructor() {
    super('Boot');
  }

  create(): void {
    createFontTextures(this);
    createPixelTexture(this, 'tiles', tileArt());
    createPixelTexture(this, 'player', playerArt());
    createPixelTexture(this, 'customer', customerArt());
    createPixelTexture(this, 'prompt', [promptArt()]);
    createPixelTexture(this, 'bike', [bikeArt()]);
    for (const [key, rows] of Object.entries({ ...stationArt(), ...trainingArt(), ...vignetteArt() })) createPixelTexture(this, key, [rows]);

    setPublishers(publisherShortNames());

    // The text box scene runs permanently on top and shows itself when needed.
    this.scene.launch('Dialog');

    // ?scene=shop or ?scene=input-test jumps straight in (handy for testing).
    const target = new URLSearchParams(window.location.search).get('scene');
    const routes: Record<string, string> = { shop: 'Shop', 'input-test': 'InputTest' };
    this.scene.start(routes[target ?? ''] ?? 'Title');
  }
}

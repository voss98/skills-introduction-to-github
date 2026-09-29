import Phaser from 'phaser';
import { createFontTextures } from '../gfx/textures';

/** Generates every texture procedurally (no image assets), then hands off. */
export class BootScene extends Phaser.Scene {
  constructor() {
    super('Boot');
  }

  create(): void {
    createFontTextures(this);
    const params = new URLSearchParams(window.location.search);
    void params; // scene routing is added with the title screen
    this.scene.start('InputTest');
  }
}

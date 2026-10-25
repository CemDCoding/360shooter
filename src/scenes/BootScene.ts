import Phaser from 'phaser';
import { ASSETS } from '../config/assets';

/** Lädt zuerst nur die Bitmap-Schriften, damit der Ladebildschirm in Astro Kapsel schreiben kann. */
export class BootScene extends Phaser.Scene {
  constructor() {
    super('BootScene');
  }

  preload(): void {
    // Fehlende Schrift: Warnung statt Absturz, der Ladebalken bleibt dann ohne Text.
    this.load.on('loaderror', (file: Phaser.Loader.File) => {
      console.warn(`[assets] Schrift konnte nicht geladen werden: ${file.key} (${file.url})`);
    });
    for (const def of ASSETS) {
      if (def.kind === 'bitmapFont') this.load.bitmapFont(def.key, def.path, def.xmlPath);
    }
  }

  create(): void {
    this.scene.start('PreloadScene');
  }
}

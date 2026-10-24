import Phaser from 'phaser';
import { ASSETS, animKey } from '../config/assets';
import { resolveStartTarget } from './debug';

export class PreloadScene extends Phaser.Scene {
  constructor() {
    super('PreloadScene');
  }

  preload(): void {
    const { width, height } = this.scale;
    const barW = 320;
    const frame = this.add
      .rectangle(width / 2, height / 2, barW + 4, 14)
      .setStrokeStyle(1, 0xffffff);
    const bar = this.add
      .rectangle(width / 2 - barW / 2, height / 2, 0, 10, 0x66ccff)
      .setOrigin(0, 0.5);
    this.add
      .text(width / 2, height / 2 - 24, 'Laden ...', { color: '#ffffff', fontSize: '14px' })
      .setOrigin(0.5);
    frame.setDepth(0);

    this.load.on('progress', (value: number) => {
      bar.width = barW * value;
    });
    // Fehlende Datei: Warnung statt Absturz
    this.load.on('loaderror', (file: Phaser.Loader.File) => {
      console.warn(`[assets] Datei konnte nicht geladen werden: ${file.key} (${file.url})`);
    });

    for (const def of ASSETS) {
      if (def.kind === 'spritesheet') {
        this.load.spritesheet(def.key, def.path, {
          frameWidth: def.frameWidth ?? 32,
          frameHeight: def.frameHeight ?? 32,
        });
      } else if (def.kind === 'image') {
        this.load.image(def.key, def.path);
      } else {
        this.load.audio(def.key, def.path);
      }
    }
  }

  create(): void {
    for (const def of ASSETS) {
      if (def.kind !== 'spritesheet' || (def.frames ?? 1) < 2) continue;
      if (!this.textures.exists(def.key) || this.anims.exists(animKey(def.key))) continue;
      this.anims.create({
        key: animKey(def.key),
        frames: this.anims.generateFrameNumbers(def.key, { start: 0, end: (def.frames ?? 1) - 1 }),
        frameRate: 4,
        repeat: -1,
      });
    }

    const debug = new URLSearchParams(window.location.search).get('assets') === '1';
    if (debug) this.showDebugView();
    else {
      const target = resolveStartTarget(window.location.search);
      if (target.scene === 'GameScene') this.scene.start('GameScene', { levelId: target.levelId });
      else this.scene.start('MenuScene');
    }
  }

  /** Debug-Ansicht (?assets=1): alle Sprites mit Animation. */
  private showDebugView(): void {
    const sprites = ASSETS.filter((d) => d.kind === 'spritesheet' && this.textures.exists(d.key));
    const cellW = 120;
    const cols = Math.floor(this.scale.width / cellW);
    sprites.forEach((def, i) => {
      const x = (i % cols) * cellW + cellW / 2;
      const y = Math.floor(i / cols) * 80 + 50;
      const s = this.add.sprite(x, y, def.key, 0);
      if (this.anims.exists(animKey(def.key))) s.play(animKey(def.key));
      this.add.text(x, y + 34, def.key, { color: '#ffffff', fontSize: '8px' }).setOrigin(0.5);
    });
  }
}

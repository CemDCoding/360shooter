import Phaser from 'phaser';

export class PreloadScene extends Phaser.Scene {
  constructor() {
    super('PreloadScene');
  }

  create(): void {
    this.add.text(320, 180, 'PreloadScene', { color: '#ffffff', fontSize: '16px' }).setOrigin(0.5);
    this.scene.start('MenuScene');
  }
}

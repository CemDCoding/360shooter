import Phaser from 'phaser';

export class BootScene extends Phaser.Scene {
  constructor() {
    super('BootScene');
  }

  create(): void {
    this.add.text(320, 180, 'BootScene', { color: '#ffffff', fontSize: '16px' }).setOrigin(0.5);
    this.scene.start('PreloadScene');
  }
}

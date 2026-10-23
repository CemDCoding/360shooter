import Phaser from 'phaser';

export class HudScene extends Phaser.Scene {
  constructor() {
    super('HudScene');
  }

  create(): void {
    this.add.text(320, 180, 'HudScene', { color: '#ffffff', fontSize: '16px' }).setOrigin(0.5);
  }
}

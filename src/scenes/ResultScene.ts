import Phaser from 'phaser';

export class ResultScene extends Phaser.Scene {
  constructor() {
    super('ResultScene');
  }

  create(): void {
    this.add.text(320, 180, 'ResultScene', { color: '#ffffff', fontSize: '16px' }).setOrigin(0.5);
  }
}

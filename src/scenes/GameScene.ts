import Phaser from 'phaser';

export class GameScene extends Phaser.Scene {
  constructor() {
    super('GameScene');
  }

  create(): void {
    this.add.text(320, 180, 'GameScene', { color: '#ffffff', fontSize: '16px' }).setOrigin(0.5);
  }
}

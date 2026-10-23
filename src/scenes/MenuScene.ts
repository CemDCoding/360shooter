import Phaser from 'phaser';

export class MenuScene extends Phaser.Scene {
  constructor() {
    super('MenuScene');
  }

  create(): void {
    this.add.text(320, 180, 'MenuScene', { color: '#ffffff', fontSize: '16px' }).setOrigin(0.5);
  }
}

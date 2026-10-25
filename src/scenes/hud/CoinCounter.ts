import Phaser from 'phaser';

/** Coin icon with the number of coins collected this round. */
export class CoinCounter {
  private readonly text: Phaser.GameObjects.Text;

  constructor(scene: Phaser.Scene, x: number, y: number, k: number, fontPx: number) {
    scene.add.image(x, y, 'coin-small', 0).setScale(k * 1.5);
    this.text = scene.add
      .text(x + 8 * k, y, '0', { fontFamily: 'monospace', fontSize: `${fontPx}px`, color: '#ffd700' })
      .setOrigin(0, 0.5)
      .setStroke('#000000', 2);
  }

  set(roundCoins: number): void {
    this.text.setText(String(Math.max(0, Math.floor(roundCoins) || 0)));
  }
}

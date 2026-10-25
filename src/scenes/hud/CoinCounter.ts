import Phaser from 'phaser';
import { FunkChip } from './FunkPanel';

/** Chip with the coin icon and the number of coins collected this round ("+4"). */
export class CoinCounter {
  readonly chip: FunkChip;

  constructor(scene: Phaser.Scene, k: number, private readonly onChange: () => void) {
    this.chip = new FunkChip(scene, { icon: { key: 'coin-small', frame: 0, scale: 2 }, k });
    this.set(0);
  }

  set(roundCoins: number): void {
    const n = Math.max(0, Math.floor(roundCoins) || 0);
    this.chip.setContent(`+${n}`, 'hud.gold');
    this.onChange();
  }
}

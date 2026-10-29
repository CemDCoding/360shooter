import Phaser from 'phaser';
import { FunkChip } from './FunkPanel';
import { chipShrink } from './hudMath';

/** Chip with the coin icon and the number of coins collected this round ("+4"). */
export class CoinCounter {
  readonly chip: FunkChip;

  constructor(
    scene: Phaser.Scene,
    k: number,
    private readonly onChange: () => void,
  ) {
    this.chip = new FunkChip(scene, {
      // The coin stays on a whole scale (AP-92 sets the 12 px coin); box and text shrink.
      icon: { key: 'coin-small', frame: 0, scale: 2, fixedScale: true },
      k,
      shrink: chipShrink('coin'),
    });
    this.set(0);
  }

  set(roundCoins: number): void {
    const n = Math.max(0, Math.floor(roundCoins) || 0);
    this.chip.setContent(`+${n}`, 'hud.gold');
    this.onChange();
  }
}

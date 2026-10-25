import Phaser from 'phaser';
import type { CoinRules } from '../contracts';
import { animKey } from '../config/assets';
import { coinMagnetStep, coinSizeFor } from '../logic/coins';

/** Pooled gold coin. No lifetime (Q-17). Lasers pass through it. */
export class Coin extends Phaser.Physics.Arcade.Sprite {
  value = 0;
  /** Time spent inside the magnet radius (ease-in, AP-64). Reset on spawn. */
  pullMs = 0;
  /** Called once when collected, with the coin value. */
  onCollected?: (value: number) => void;

  constructor(scene: Phaser.Scene, x: number, y: number) {
    super(scene, x, y, 'coin-small');
    scene.add.existing(this);
    scene.physics.add.existing(this);
    this.disableBody(true, true);
  }

  spawn(x: number, y: number, value: number): void {
    this.value = value;
    this.pullMs = 0;
    const key = coinSizeFor(value) === 'big' ? 'coin-big' : 'coin-small';
    this.setTexture(key);
    this.enableBody(true, x, y, true, true);
    const body = this.body as Phaser.Physics.Arcade.Body;
    body.setCircle(this.width / 2);
    const anim = animKey(key);
    if (this.scene.anims.exists(anim)) this.play(anim);
  }

  /** Magnet step towards the player; collects when close enough. */
  update(dtMs: number, player: { x: number; y: number }, rules: CoinRules): void {
    if (!this.active) return;
    const r = coinMagnetStep(this, player, dtMs, rules, this.pullMs);
    this.pullMs = r.pullMs;
    this.setPosition(r.x, r.y);
    if (r.collected) this.collect();
  }

  collect(): void {
    if (!this.active) return;
    const cb = this.onCollected;
    this.despawn();
    cb?.(this.value);
  }

  despawn(): void {
    this.anims.stop();
    this.disableBody(true, true);
  }
}

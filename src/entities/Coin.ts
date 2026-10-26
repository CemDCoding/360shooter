import Phaser from 'phaser';
import type { CoinRules } from '../contracts';
import { animKey } from '../config/assets';
import { COIN_VISUAL } from '../config/coins';
import { themeColor } from '../config/theme';
import { coinMagnetStep, coinSizeFor } from '../logic/coins';

/** Pooled gold coin. No lifetime (Q-17). Lasers pass through it. */
export class Coin extends Phaser.Physics.Arcade.Sprite {
  value = 0;
  /** Time spent inside the magnet radius (ease-in, AP-64). Reset on spawn. */
  pullMs = 0;
  /** Called once when collected, with the coin value. */
  onCollected?: (value: number) => void;
  /** One flat-tinted, slightly larger copy behind the coin: the outline (AP-70). */
  private halo?: Phaser.GameObjects.Sprite;

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
    const scale = key === 'coin-big' ? COIN_VISUAL.bigDisplayScale : COIN_VISUAL.smallDisplayScale;
    this.setScale(scale).setDepth(COIN_VISUAL.depth);
    this.enableBody(true, x, y, true, true);
    // Arcade scales the body with the sprite; the radius in unscaled px keeps the collect radius (logic) as is.
    const body = this.body as Phaser.Physics.Arcade.Body;
    body.setCircle(this.width / 2);
    const anim = animKey(key);
    if (this.scene.anims.exists(anim)) this.play(anim);
    this.syncHalo(true);
  }

  /** Keeps the outline copy at position, frame and size of the coin. */
  private syncHalo(visible: boolean): void {
    if (!this.halo) {
      this.halo = this.scene.add
        .sprite(this.x, this.y, this.texture.key, this.frame.name)
        .setTintFill(themeColor(COIN_VISUAL.outlineColorToken).num);
    }
    const h = this.halo;
    h.setVisible(visible);
    if (!visible) return;
    h.setTexture(this.texture.key, this.frame.name);
    h.setPosition(this.x, this.y);
    h.setDepth(this.depth - 1);
    h.setScale(this.scaleX + (2 * COIN_VISUAL.outlinePx) / this.width);
  }

  /** Magnet step towards the player; collects when close enough. */
  update(dtMs: number, player: { x: number; y: number }, rules: CoinRules): void {
    if (!this.active) return;
    const r = coinMagnetStep(this, player, dtMs, rules, this.pullMs);
    this.pullMs = r.pullMs;
    this.setPosition(r.x, r.y);
    this.syncHalo(true);
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
    this.halo?.setVisible(false);
  }

  override destroy(fromScene?: boolean): void {
    this.halo?.destroy();
    this.halo = undefined;
    super.destroy(fromScene);
  }
}

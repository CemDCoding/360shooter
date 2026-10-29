import Phaser from 'phaser';
import type { CoinRules } from '../contracts';
import { animKey } from '../config/assets';
import { COIN_VISUAL } from '../config/coins';
import { themeColor } from '../config/theme';
import { coinMagnetStep, coinSizeFor } from '../logic/coins';

const OFFSETS: ReadonlyArray<readonly [number, number]> = [
  [-1, 0],
  [1, 0],
  [0, -1],
  [0, 1],
];

/** Pooled gold coin. No lifetime (Q-17). Lasers pass through it. */
export class Coin extends Phaser.Physics.Arcade.Sprite {
  value = 0;
  /** Time spent inside the magnet radius (ease-in, AP-64). Reset on spawn. */
  pullMs = 0;
  /** Called once when collected, with the coin value. */
  onCollected?: (value: number) => void;
  /** Four flat-tinted copies behind the coin, offset by whole pixels: the outline (AP-70). */
  private halos?: Phaser.GameObjects.Sprite[];

  constructor(scene: Phaser.Scene, x: number, y: number) {
    super(scene, x, y, 'coin-field');
    scene.add.existing(this);
    scene.physics.add.existing(this);
    this.disableBody(true, true);
  }

  spawn(x: number, y: number, value: number): void {
    this.value = value;
    this.pullMs = 0;
    const key = coinSizeFor(value) === 'big' ? 'coin-big' : 'coin-field';
    this.setTexture(key);
    const scale = key === 'coin-big' ? COIN_VISUAL.bigDisplayScale : COIN_VISUAL.smallDisplayScale;
    this.setScale(scale).setDepth(COIN_VISUAL.depth);
    this.enableBody(true, x, y, true, true);
    // Arcade scales the body with the sprite: the radius is set in unscaled px so the body covers
    // half the shown size (6 world px for both coins at 12 px, AP-74, AP-92).
    const body = this.body as Phaser.Physics.Arcade.Body;
    const radius = this.width / 2;
    body.setCircle(radius, this.width / 2 - radius, this.height / 2 - radius);
    const anim = animKey(key);
    if (this.scene.anims.exists(anim)) this.play(anim);
    this.syncHalo(true);
  }

  /** Keeps the four outline copies at position, frame and scale of the coin (hard whole-pixel outline). */
  private syncHalo(visible: boolean): void {
    if (!this.halos) {
      const color = themeColor(COIN_VISUAL.outlineColorToken).num;
      this.halos = OFFSETS.map(() =>
        this.scene.add.sprite(this.x, this.y, this.texture.key, this.frame.name).setTintFill(color),
      );
    }
    const px = COIN_VISUAL.outlinePx;
    this.halos.forEach((h, i) => {
      h.setVisible(visible);
      if (!visible) return;
      h.setTexture(this.texture.key, this.frame.name);
      h.setPosition(this.x + OFFSETS[i][0] * px, this.y + OFFSETS[i][1] * px);
      h.setScale(this.scaleX);
      h.setDepth(this.depth - 0.1);
    });
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
    this.halos?.forEach((h) => h.setVisible(false));
  }

  override destroy(fromScene?: boolean): void {
    this.halos?.forEach((h) => h.destroy());
    this.halos = undefined;
    super.destroy(fromScene);
  }
}

import Phaser from 'phaser';
import { animKey } from '../../config/assets';

export const ROOT_SPIKE_TEXTURE = 'boss-root-spike';
/** Time a spike stays up after it broke out (ms). */
const SPIKE_LIFETIME_MS = 600;
const SPIKE_DEPTH = 2;

/**
 * Root spike of the root monster (AP-17). It breaks out after the warning, hurts once and
 * disappears after a short time. The scene checks the overlap with the player and calls tryHit().
 * The boss owns the spikes and removes them (tick() / destroy()).
 */
export class RootSpike extends Phaser.Physics.Arcade.Sprite {
  private lifeLeftMs = SPIKE_LIFETIME_MS;
  private consumed = false;

  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    private readonly damage: number,
  ) {
    super(scene, x, y, ROOT_SPIKE_TEXTURE);
    scene.add.existing(this);
    scene.physics.add.existing(this);
    this.setDepth(SPIKE_DEPTH);
    const anim = animKey(ROOT_SPIKE_TEXTURE);
    if (scene.anims.exists(anim)) this.play(anim, true);
  }

  /** Returns the damage the first time the spike hits, afterwards 0 (one hit per spike). */
  tryHit(): number {
    if (this.consumed || !this.active) return 0;
    this.consumed = true;
    return this.damage;
  }

  /** Advances the lifetime. Returns true when the spike is gone and should be removed. */
  tick(deltaMs: number): boolean {
    this.lifeLeftMs -= deltaMs;
    return this.lifeLeftMs <= 0;
  }
}

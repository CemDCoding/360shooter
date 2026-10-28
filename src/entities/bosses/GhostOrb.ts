import Phaser from 'phaser';
import { THEME } from '../../config/theme';

const ORB_TINT = THEME.colors['mint.200'].num;

/** Ghost orb of the forest ghost (AP-18). Created by ForestGhost; the scene checks overlap with the player. */
export class GhostOrb extends Phaser.Physics.Arcade.Sprite {
  /** Damage on contact (already scaled by the variant). */
  damage = 0;
  private lifeMs = 0;

  constructor(scene: Phaser.Scene, x: number, y: number) {
    super(scene, x, y, 'boss-ghost-orb');
    scene.add.existing(this);
    scene.physics.add.existing(this);
    this.setTint(ORB_TINT);
    this.setDepth(2);
    this.kill();
  }

  fire(
    x: number,
    y: number,
    angleRad: number,
    speed: number,
    damage: number,
    lifeMs: number,
  ): void {
    this.enableBody(true, x, y, true, true);
    this.setActive(true).setVisible(true);
    this.damage = damage;
    this.lifeMs = lifeMs;
    this.setRotation(angleRad);
    this.scene.physics.velocityFromRotation(
      angleRad,
      speed,
      (this.body as Phaser.Physics.Arcade.Body).velocity,
    );
  }

  /** Counts the lifetime down; returns false once the orb expired and was removed. */
  tick(delta: number): boolean {
    if (!this.active) return false;
    this.lifeMs -= delta;
    if (this.lifeMs <= 0) {
      this.kill();
      return false;
    }
    return true;
  }

  /** Removes the orb (hit the player or expired). */
  kill(): void {
    this.disableBody(true, true);
    this.setActive(false).setVisible(false);
  }
}

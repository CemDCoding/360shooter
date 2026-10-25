import Phaser from 'phaser';
import type { WeaponStats } from '../contracts';
import { shotPattern } from '../logic/powers';
import { Laser } from './Laser';

/** Object pool of lasers backed by an Arcade group. Use `group` for overlap checks. */
export class LaserPool {
  readonly group: Phaser.Physics.Arcade.Group;

  constructor(private readonly scene: Phaser.Scene) {
    this.group = scene.physics.add.group({
      classType: Laser,
      runChildUpdate: false,
      allowGravity: false,
    });
  }

  /**
   * Fires one volley from (x, y) in direction angleRad. The pattern for the given double-shot
   * stage decides how many lasers are created (sideways offset, relative angle).
   */
  fire(x: number, y: number, angleRad: number, stats: WeaponStats, doubleShotStage = 0): Laser[] {
    const fired: Laser[] = [];
    const perpX = -Math.sin(angleRad);
    const perpY = Math.cos(angleRad);
    for (const spec of shotPattern(doubleShotStage)) {
      let laser = this.group.getFirstDead(false) as Laser | null;
      if (!laser) {
        laser = new Laser(this.scene, x, y);
        this.group.add(laser, true);
      }
      laser.fire(
        x + perpX * spec.offsetPx,
        y + perpY * spec.offsetPx,
        angleRad + Phaser.Math.DegToRad(spec.angleDeg),
        stats.projectileSpeed,
        stats.projectileScale,
        stats.damage,
        stats.range,
      );
      fired.push(laser);
    }
    return fired;
  }

  /** Returns a laser to the pool (e.g. after it hit something). */
  release(laser: Laser): void {
    laser.deactivate();
  }

  /** Recycles lasers beyond their range. Call once per frame. */
  update(): void {
    for (const child of this.group.getChildren()) {
      const laser = child as Laser;
      if (laser.active && laser.isOutOfRange()) laser.deactivate();
    }
  }

  destroy(): void {
    this.group.destroy(true);
  }
}

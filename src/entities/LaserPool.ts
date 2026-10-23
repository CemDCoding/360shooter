import Phaser from 'phaser';
import type { WeaponStats } from '../contracts';
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

  /** Fires one laser from (x, y) in direction angleRad using the current weapon stats. */
  fire(x: number, y: number, angleRad: number, stats: WeaponStats): Laser {
    let laser = this.group.getFirstDead(false) as Laser | null;
    if (!laser) {
      laser = new Laser(this.scene, x, y);
      this.group.add(laser, true);
    }
    laser.fire(
      x,
      y,
      angleRad,
      stats.projectileSpeed,
      stats.projectileScale,
      stats.damage,
      stats.range,
    );
    return laser;
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

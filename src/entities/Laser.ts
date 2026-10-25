import Phaser from 'phaser';
import { THEME } from '../config/theme';

/** Pooled laser projectile. Created and recycled by LaserPool only. */
export class Laser extends Phaser.Physics.Arcade.Sprite {
  damage = 0;
  range = 0;
  private startX = 0;
  private startY = 0;

  constructor(scene: Phaser.Scene, x: number, y: number) {
    super(scene, x, y, 'laser');
    this.setTint(THEME.colors['game.laser-raygun'].num);
  }

  fire(
    x: number,
    y: number,
    angleRad: number,
    speed: number,
    scale: number,
    damage: number,
    range: number,
  ): void {
    this.enableBody(true, x, y, true, true);
    this.startX = x;
    this.startY = y;
    this.damage = damage;
    this.range = range;
    this.setRotation(angleRad);
    this.setScale(scale);
    const body = this.body as Phaser.Physics.Arcade.Body;
    body.setSize(this.width, this.height);
    this.scene.physics.velocityFromRotation(angleRad, speed, body.velocity);
  }

  /** True once the laser travelled farther than its range. */
  isOutOfRange(): boolean {
    return Phaser.Math.Distance.Between(this.startX, this.startY, this.x, this.y) >= this.range;
  }

  deactivate(): void {
    this.disableBody(true, true);
  }
}

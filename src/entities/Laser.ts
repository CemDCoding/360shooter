import Phaser from 'phaser';
import { THEME } from '../config/theme';

/** Pooled laser projectile. Created and recycled by LaserPool only. */
export class Laser extends Phaser.Physics.Arcade.Sprite {
  damage = 0;
  range = 0;
  /** Extra enemies this shot may still pass through (heaven body piece, AP-143); 0 = stops at the first. */
  pierceLeft = 0;
  private startX = 0;
  private startY = 0;
  /** Enemies already hit by this shot: a piercing laser overlaps them for several frames (AP-143). */
  private readonly hitTargets: object[] = [];

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
    pierce = 0,
  ): void {
    this.enableBody(true, x, y, true, true);
    this.startX = x;
    this.startY = y;
    this.damage = damage;
    this.range = range;
    this.pierceLeft = Number.isFinite(pierce) && pierce > 0 ? Math.floor(pierce) : 0;
    this.hitTargets.length = 0;
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

  /** True if this shot already hit `target` (a piercing laser hits every enemy once). */
  hasHit(target: object): boolean {
    return this.hitTargets.includes(target);
  }

  /**
   * Records a hit on `target`. Returns true if the laser flies on (pierce left), false if it must be
   * released now.
   */
  registerHit(target: object): boolean {
    if (this.pierceLeft <= 0) return false;
    this.pierceLeft -= 1;
    this.hitTargets.push(target);
    return true;
  }

  deactivate(): void {
    this.disableBody(true, true);
  }
}

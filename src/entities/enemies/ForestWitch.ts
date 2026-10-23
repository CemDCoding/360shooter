import type Phaser from 'phaser';
import { Enemy, type EnemyContext } from './Enemy';
import type { WitchBoltPool } from './WitchBoltPool';

export interface ForestWitchContext extends EnemyContext {
  boltPool: WitchBoltPool;
}

/** Shooter behavior: approaches to keepDistance, stops, fires bolts at the center. */
export class ForestWitch extends Enemy {
  private readonly boltPool: WitchBoltPool;
  private cooldownMs = 0;

  constructor(scene: Phaser.Scene, ctx: ForestWitchContext) {
    super(scene, 'forestWitch', ctx);
    this.boltPool = ctx.boltPool;
  }

  protected onSpawn(): void {
    this.cooldownMs = this.def.projectile?.intervalMs ?? 0;
  }

  protected behave(delta: number): void {
    const proj = this.def.projectile;
    if (!proj) return;
    const dist = Math.hypot(this.center.x - this.x, this.center.y - this.y);
    const inRange = dist <= proj.keepDistance;
    if (inRange) {
      this.halt();
      this.faceCenter();
    } else {
      this.moveToCenter();
    }
    this.cooldownMs -= delta;
    if (this.cooldownMs <= 0 && inRange) {
      this.cooldownMs = proj.intervalMs;
      this.boltPool.fire(this.x, this.y, this.center.x, this.center.y, proj.damage, proj.speed);
    }
  }
}

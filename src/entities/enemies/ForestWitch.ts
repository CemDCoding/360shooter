import type Phaser from 'phaser';
import type { EnemyId } from '../../contracts';
import { distance } from '../../logic/geometry';
import { Enemy, type EnemyContext } from './Enemy';
import type { WitchBoltPool } from './WitchBoltPool';

export interface ForestWitchContext extends EnemyContext {
  boltPool: WitchBoltPool;
}

/** Behavior 'shooter': approaches to keepDistance, stops, fires bolts at the center. */
export class ForestWitch extends Enemy {
  private readonly boltPool: WitchBoltPool;
  private cooldownMs = 0;

  constructor(scene: Phaser.Scene, id: EnemyId, ctx: ForestWitchContext) {
    super(scene, id, ctx);
    this.boltPool = ctx.boltPool;
  }

  protected onSpawn(): void {
    this.cooldownMs = this.def.projectile?.intervalMs ?? 0;
  }

  protected behave(delta: number): void {
    const proj = this.def.projectile;
    if (!proj) return;
    const dist = distance(this.x, this.y, this.center.x, this.center.y);
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

import type Phaser from 'phaser';
import type { EnemyId } from '../../contracts';
import { MIN_TELEGRAPH_MS } from '../../config/bosses';
import { SHOOTER_WINDUP } from '../../config/enemies';
import { animKey } from '../../config/assets';
import { distance } from '../../logic/geometry';
import { Enemy, type EnemyContext } from './Enemy';
import { projectileTextureKey } from './projectileTexture';
import type { WitchBoltPool } from './WitchBoltPool';

export interface ForestWitchContext extends EnemyContext {
  boltPool: WitchBoltPool;
}

/**
 * Behavior 'shooter' (forest witch, camel, mummy, archaeologist): approaches to keepDistance, stops and
 * fires at the center. Generic (AP-101): sprite from `projectile.spriteKey` (drawn beam or witch bolt as
 * transition) and `projectile.onHit` on every shot. With a SHOOTER_WINDUP entry (camel) the sprite holds the
 * wind-up frame for at least MIN_TELEGRAPH_MS before each shot.
 */
export class ForestWitch extends Enemy {
  private readonly boltPool: WitchBoltPool;
  private readonly boltKey: string;
  private cooldownMs = 0;
  private windupLeftMs = 0;

  constructor(scene: Phaser.Scene, id: EnemyId, ctx: ForestWitchContext) {
    super(scene, id, ctx);
    this.boltPool = ctx.boltPool;
    this.boltKey = projectileTextureKey(scene, id, this.def.projectile?.spriteKey);
  }

  /** True while the wind-up before a shot runs (camel with full cheeks). */
  get isWindingUp(): boolean {
    return this.windupLeftMs > 0;
  }

  protected onSpawn(): void {
    this.cooldownMs = this.def.projectile?.intervalMs ?? 0;
    this.windupLeftMs = 0;
  }

  protected behave(delta: number): void {
    const proj = this.def.projectile;
    if (!proj) return;
    const dist = distance(this.x, this.y, this.center.x, this.center.y);
    const inRange = dist <= proj.keepDistance;
    if (inRange || this.isWindingUp) {
      this.halt();
      this.faceCenter();
    } else {
      this.moveToCenter();
    }
    this.cooldownMs -= delta;
    if (this.isWindingUp) {
      this.windupLeftMs -= delta;
      if (this.windupLeftMs <= 0) {
        this.windupLeftMs = 0;
        this.resumeAnim();
        this.shoot();
      }
      return;
    }
    if (!inRange) return;
    const windup = SHOOTER_WINDUP[this.def.id];
    if (!windup) {
      if (this.cooldownMs <= 0) this.shoot();
      return;
    }
    // The wind-up starts early enough that the shot still comes after intervalMs (balancing unchanged).
    const windupMs = Math.max(MIN_TELEGRAPH_MS, windup.ms);
    if (this.cooldownMs <= windupMs) {
      this.windupLeftMs = windupMs;
      this.stop();
      this.setFrame(windup.frame);
    }
  }

  private shoot(): void {
    const proj = this.def.projectile;
    if (!proj) return;
    this.cooldownMs = proj.intervalMs;
    this.boltPool.fire(this.x, this.y, this.center.x, this.center.y, proj.damage, proj.speed, {
      spriteKey: this.boltKey,
      onHit: proj.onHit,
    });
  }

  private resumeAnim(): void {
    const anim = animKey(this.def.spriteKey);
    if (this.scene.anims.exists(anim)) this.play(anim, true);
  }
}

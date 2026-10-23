import Phaser from 'phaser';
import { animKey } from '../../config/assets';
import { ENEMIES } from '../../config/enemies';
import type { EnemyDef, EnemyId } from '../../contracts';
import { distance } from '../../logic/geometry';
import { applyDamage, auraDamage, isDead } from '../../logic/health';

export const ARENA_CENTER = { x: 320, y: 180 } as const;
const FLASH_MS = 120;
const FLASH_TINT = 0xffb0b0;

export interface EnemyContext {
  /** Target point, defaults to the arena center (player position). */
  center?: { x: number; y: number };
  /** Called once when the enemy dies. */
  onDeath?: (x: number, y: number, xp: number) => void;
}

/** Base class for all enemies. Pool friendly: use spawn() and despawn(). */
export class Enemy extends Phaser.Physics.Arcade.Sprite {
  readonly def: EnemyDef;
  hp: number;
  protected readonly center: { x: number; y: number };
  private readonly ctx: EnemyContext;
  private flashLeftMs = 0;
  private auraGfx?: Phaser.GameObjects.Arc;

  constructor(scene: Phaser.Scene, id: EnemyId, ctx: EnemyContext = {}) {
    const def = ENEMIES[id];
    super(scene, -100, -100, def.spriteKey);
    this.def = def;
    this.hp = def.hp;
    this.ctx = ctx;
    this.center = ctx.center ?? ARENA_CENTER;
    scene.add.existing(this);
    scene.physics.add.existing(this);
    if (def.aura) {
      this.auraGfx = scene.add
        .circle(0, 0, def.aura.radius, 0x9b59b6, 0.25)
        .setDepth(this.depth - 1)
        .setVisible(false);
    }
    this.despawn();
  }

  spawn(x: number, y: number): void {
    this.hp = this.def.hp;
    this.flashLeftMs = 0;
    this.clearTint();
    this.enableBody(true, x, y, true, true);
    this.setActive(true).setVisible(true);
    this.auraGfx?.setVisible(true).setPosition(x, y);
    this.faceCenter();
    const anim = animKey(this.def.spriteKey);
    if (this.scene.anims.exists(anim)) this.play(anim, true);
    this.onSpawn();
  }

  despawn(): void {
    this.disableBody(true, true);
    this.setActive(false).setVisible(false);
    this.auraGfx?.setVisible(false);
  }

  protected onSpawn(): void {}

  /** Returns true if the hit killed the enemy. No damage numbers (PE-31). */
  takeDamage(amount: number): boolean {
    if (!this.active) return false;
    this.hp = applyDamage(this.hp, amount);
    if (isDead(this.hp)) {
      const { x, y } = this;
      this.despawn();
      this.ctx.onDeath?.(x, y, this.def.xp);
      return true;
    }
    this.flashLeftMs = FLASH_MS;
    this.setTint(FLASH_TINT);
    return false;
  }

  /** Contact damage for dtMs of ongoing contact with the player (config value is per second). */
  contactDamageFor(dtMs: number): number {
    return auraDamage(this.def.contactDamage, dtMs);
  }

  /** Aura damage dealt to a target at (tx, ty) during dtMs; 0 if no aura or out of range. */
  auraDamageAt(tx: number, ty: number, dtMs: number): number {
    const aura = this.def.aura;
    if (!aura || !this.active) return 0;
    if (distance(this.x, this.y, tx, ty) > aura.radius) return 0;
    return auraDamage(aura.dps, dtMs);
  }

  update(_time: number, delta: number): void {
    if (!this.active) return;
    if (this.flashLeftMs > 0) {
      this.flashLeftMs -= delta;
      if (this.flashLeftMs <= 0) this.clearTint();
    }
    this.behave(delta);
    this.auraGfx?.setPosition(this.x, this.y);
  }

  /** Behavior hook, overridden by subclasses. */
  protected behave(delta: number): void {
    void delta;
  }

  protected faceCenter(): void {
    this.setFlipX(this.center.x < this.x);
  }

  /** Moves towards the center; returns the remaining distance. */
  protected moveToCenter(): number {
    const dx = this.center.x - this.x;
    const dy = this.center.y - this.y;
    const dist = distance(this.x, this.y, this.center.x, this.center.y);
    if (dist < 1) {
      this.setVelocity(0, 0);
    } else {
      this.setVelocity((dx / dist) * this.def.speed, (dy / dist) * this.def.speed);
    }
    this.faceCenter();
    return dist;
  }

  protected halt(): void {
    this.setVelocity(0, 0);
  }

  destroy(fromScene?: boolean): void {
    this.auraGfx?.destroy();
    super.destroy(fromScene);
  }
}

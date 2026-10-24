import Phaser from 'phaser';
import type { ItemDef, WeaponStacks, WeaponStats } from '../contracts';
import { ITEMS, PLAYER, WEAPON_BASE } from '../config';
import { animKey } from '../config/assets';
import { applyDamage, applyHeal, isDead } from '../logic/health';
import { applyItem } from '../logic/items';
import { stepRotation } from '../logic/rotation';
import { computeWeaponStats, emptyStacks, FireTimer } from '../logic/weapon';
import { LaserPool } from './LaserPool';

const HIT_TINT = 0xffb0b0;
const HIT_TINT_MS = 120;
const SHOOT_ANIM_MS = 150;
const MUZZLE_OFFSET = 14;
const BODY_RADIUS = 10;
const IDLE_ANIM = `${animKey('astronaut')}-idle`;
const SHOOT_ANIM = `${animKey('astronaut')}-shoot`;

export interface PlayerCallbacks {
  onHpChange?: (hp: number, maxHp: number) => void;
  onStatsChange?: (stats: WeaponStats, stacks: WeaponStacks) => void;
  onShoot?: () => void;
  onHurt?: () => void;
  onDeath?: () => void;
}

/** Player in the screen center: delayed turning, auto-fire. No scene imports. */
export class Player extends Phaser.Physics.Arcade.Sprite {
  readonly callbacks: PlayerCallbacks = {};
  hp: number = PLAYER.maxHp;
  stacks: WeaponStacks = emptyStacks();
  stats: WeaponStats = computeWeaponStats(WEAPON_BASE, this.stacks, ITEMS);
  /** Facing in degrees, (-180, 180]. */
  facingDeg = 0;
  private readonly fireTimer = new FireTimer();
  private readonly lasers: LaserPool;
  private hitTintLeft = 0;
  private shootAnimLeft = 0;
  private dead = false;

  constructor(scene: Phaser.Scene, x: number, y: number, lasers: LaserPool) {
    super(scene, x, y, 'astronaut');
    this.lasers = lasers;
    scene.add.existing(this);
    scene.physics.add.existing(this);
    (this.body as Phaser.Physics.Arcade.Body).setCircle(
      BODY_RADIUS,
      this.width / 2 - BODY_RADIUS,
      this.height / 2 - BODY_RADIUS,
    );
    this.ensureAnims();
    this.play(IDLE_ANIM);
  }

  private ensureAnims(): void {
    const anims = this.scene.anims;
    if (!anims.exists(IDLE_ANIM)) {
      anims.create({
        key: IDLE_ANIM,
        frames: anims.generateFrameNumbers('astronaut', { start: 0, end: 1 }),
        frameRate: 4,
        repeat: -1,
      });
    }
    if (!anims.exists(SHOOT_ANIM)) {
      anims.create({
        key: SHOOT_ANIM,
        frames: anims.generateFrameNumbers('astronaut', { start: 2, end: 3 }),
        frameRate: 12,
        repeat: -1,
      });
    }
  }

  get isDead(): boolean {
    return this.dead;
  }

  /** dt in ms, targetAngle in radians (from AimInput). */
  update(dt: number, targetAngle: number): void {
    if (this.dead) return;
    this.facingDeg = stepRotation(
      this.facingDeg,
      Phaser.Math.RadToDeg(targetAngle),
      PLAYER.turnSpeedDegPerSec,
      dt,
    );
    const rad = Phaser.Math.DegToRad(this.facingDeg);
    this.setRotation(rad);

    const shots = this.fireTimer.tick(dt, this.stats.fireRatePerSec);
    if (shots > 0) {
      for (let i = 0; i < shots; i++) {
        this.lasers.fire(
          this.x + Math.cos(rad) * MUZZLE_OFFSET,
          this.y + Math.sin(rad) * MUZZLE_OFFSET,
          rad,
          this.stats,
        );
      }
      this.shootAnimLeft = SHOOT_ANIM_MS;
      this.callbacks.onShoot?.();
    }
    this.updateVisuals(dt);
  }

  private updateVisuals(dt: number): void {
    const key = this.shootAnimLeft > 0 ? SHOOT_ANIM : IDLE_ANIM;
    this.shootAnimLeft = Math.max(0, this.shootAnimLeft - dt);
    if (this.anims.currentAnim?.key !== key) this.play(key);
    if (this.hitTintLeft > 0) {
      this.hitTintLeft -= dt;
      if (this.hitTintLeft <= 0) this.clearTint();
    }
  }

  takeDamage(amount: number): void {
    if (this.dead) return;
    this.hp = applyDamage(this.hp, amount);
    this.setTint(HIT_TINT);
    this.hitTintLeft = HIT_TINT_MS;
    this.callbacks.onHurt?.();
    this.callbacks.onHpChange?.(this.hp, PLAYER.maxHp);
    if (isDead(this.hp)) {
      this.dead = true;
      this.callbacks.onDeath?.();
    }
  }

  heal(amount: number): void {
    if (this.dead) return;
    this.hp = applyHeal(this.hp, amount, PLAYER.maxHp);
    this.callbacks.onHpChange?.(this.hp, PLAYER.maxHp);
  }

  applyItem(def: ItemDef): void {
    if (this.dead) return;
    const result = applyItem(this.stacks, def);
    this.stacks = result.stacks;
    this.stats = computeWeaponStats(WEAPON_BASE, this.stacks, ITEMS);
    if (result.heal > 0) this.heal(result.heal);
    this.callbacks.onStatsChange?.(this.stats, this.stacks);
  }
}

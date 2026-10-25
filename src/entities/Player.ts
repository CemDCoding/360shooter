import Phaser from 'phaser';
import type { ActivePowers, ItemDef, WeaponStats } from '../contracts';
import { WEAPON_BASE } from '../config';
import { animKey } from '../config/assets';
import { applyDamage, applyHeal, isDead } from '../logic/health';
import { applyPowerItem } from '../logic/items';
import { absorbDamage, emptyPowers, tickPowers } from '../logic/powers';
import { stepRotation } from '../logic/rotation';
import {
  faceLeft,
  handPoint,
  muzzlePoint,
  weaponBehindFigure,
  weaponFrame,
} from '../logic/weaponMount';
import { WEAPON_MOUNT } from '../config/weaponMount';
import { THEME } from '../config/theme';
import { computeWeaponStats, FireTimer } from '../logic/weapon';
import type { WeaponFactors } from '../logic/weapon';
import { LaserPool } from './LaserPool';

const HIT_TINT = THEME.colors['game.hit-flash'].num;
const HIT_TINT_MS = 120;
const SHOOT_ANIM_MS = 150;
const BODY_RADIUS = 10;
const IDLE_ANIM = `${animKey('astronaut')}-idle`;
const SHOOT_ANIM = `${animKey('astronaut')}-shoot`;

/** Upgrade values, passed in by the scene (see upgradeFactors). */
export interface PlayerConfig extends WeaponFactors {
  maxHp: number;
  turnSpeedDegPerSec: number;
  /** Weapon sprite stage 0..2 (see weaponStageForUpgrades). */
  weaponStage: number;
}

const SHIELD_RING_RADIUS = 20;
const SHIELD_RING_COLOR = THEME.colors['game.shield-ring'].num;

export interface PlayerCallbacks {
  onHpChange?: (hp: number, maxHp: number) => void;
  onStatsChange?: (stats: WeaponStats, powers: ActivePowers) => void;
  /** Remaining shield points after damage was absorbed. */
  onShieldChange?: (shieldLeft: number) => void;
  onShoot?: () => void;
  onHurt?: () => void;
  onDeath?: () => void;
}

/** Player in the screen center: delayed turning, auto-fire. No scene imports. */
export class Player extends Phaser.Physics.Arcade.Sprite {
  readonly callbacks: PlayerCallbacks = {};
  hp: number;
  powers: ActivePowers = emptyPowers();
  stats: WeaponStats;
  /** Facing in degrees, (-180, 180]. */
  facingDeg = 0;
  private readonly fireTimer = new FireTimer();
  private readonly lasers: LaserPool;
  private hitTintLeft = 0;
  private shootAnimLeft = 0;
  private readonly shieldRing: Phaser.GameObjects.Arc;
  private weapon: Phaser.GameObjects.Sprite | null;
  private dead = false;

  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    lasers: LaserPool,
    private readonly config: PlayerConfig,
  ) {
    super(scene, x, y, 'astronaut');
    this.lasers = lasers;
    this.hp = config.maxHp;
    this.stats = this.computeStats();
    this.shieldRing = scene.add
      .circle(x, y, SHIELD_RING_RADIUS, SHIELD_RING_COLOR, 0.15)
      .setStrokeStyle(2, SHIELD_RING_COLOR, 0.6)
      .setVisible(false);
    scene.add.existing(this);
    this.weapon = scene.add
      .sprite(x, y, 'weapon-raygun', weaponFrame(config.weaponStage, 0))
      .setOrigin(
        WEAPON_MOUNT.grip.x / WEAPON_MOUNT.frame.width,
        WEAPON_MOUNT.grip.y / WEAPON_MOUNT.frame.height,
      );
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

  private computeStats(): WeaponStats {
    return computeWeaponStats(WEAPON_BASE, this.config, this.powers);
  }

  get isDead(): boolean {
    return this.dead;
  }

  /** dt in ms, targetAngle in radians (from AimInput). */
  update(dt: number, targetAngle: number): void {
    if (this.dead) return;
    this.updatePowers(dt);
    this.facingDeg = stepRotation(
      this.facingDeg,
      Phaser.Math.RadToDeg(targetAngle),
      this.config.turnSpeedDegPerSec,
      dt,
    );
    const rad = Phaser.Math.DegToRad(this.facingDeg);
    const left = faceLeft(this.facingDeg);
    this.setFlipX(left);
    const hand = handPoint(this.x, this.y, left);
    this.updateWeapon(hand, left);

    const shots = this.fireTimer.tick(dt, this.stats.fireRatePerSec);
    if (shots > 0) {
      for (let i = 0; i < shots; i++) {
        const muzzle = muzzlePoint(hand.x, hand.y, this.facingDeg, left);
        this.lasers.fire(muzzle.x, muzzle.y, rad, this.stats, this.powers.doubleShotStage);
      }
      this.shootAnimLeft = SHOOT_ANIM_MS;
      this.callbacks.onShoot?.();
    }
    this.updateVisuals(dt);
  }

  private updateWeapon(hand: { x: number; y: number }, left: boolean): void {
    if (!this.weapon) return;
    this.weapon
      .setPosition(hand.x, hand.y)
      .setRotation(Phaser.Math.DegToRad(this.facingDeg))
      .setFlipY(left)
      .setDepth(this.depth + (weaponBehindFigure(this.facingDeg) ? -1 : 1));
  }

  private updatePowers(dt: number): void {
    const wasRapid = this.powers.rapidFireMsLeft > 0;
    this.powers = tickPowers(this.powers, dt);
    if (wasRapid && this.powers.rapidFireMsLeft <= 0) this.refreshStats();
  }

  private refreshStats(): void {
    this.stats = this.computeStats();
    this.callbacks.onStatsChange?.(this.stats, this.powers);
  }

  private updateVisuals(dt: number): void {
    this.shieldRing.setPosition(this.x, this.y).setVisible(this.powers.shieldLeft > 0);
    const key = this.shootAnimLeft > 0 ? SHOOT_ANIM : IDLE_ANIM;
    this.shootAnimLeft = Math.max(0, this.shootAnimLeft - dt);
    if (this.anims.currentAnim?.key !== key) this.play(key);
    this.weapon?.setFrame(weaponFrame(this.config.weaponStage, key === SHOOT_ANIM ? 1 : 0));
    if (this.hitTintLeft > 0) {
      this.hitTintLeft -= dt;
      if (this.hitTintLeft <= 0) this.clearTint();
    }
  }

  takeDamage(amount: number): void {
    if (this.dead) return;
    const absorbed = absorbDamage(this.powers, amount);
    const shieldChanged = absorbed.state.shieldLeft !== this.powers.shieldLeft;
    this.powers = absorbed.state;
    if (shieldChanged) {
      this.shieldRing.setVisible(this.powers.shieldLeft > 0);
      this.callbacks.onShieldChange?.(this.powers.shieldLeft);
    }
    this.setTintFill(HIT_TINT);
    this.hitTintLeft = HIT_TINT_MS;
    this.callbacks.onHurt?.();
    if (absorbed.remainingDamage <= 0) return;
    this.hp = applyDamage(this.hp, absorbed.remainingDamage);
    this.callbacks.onHpChange?.(this.hp, this.config.maxHp);
    if (isDead(this.hp)) {
      this.dead = true;
      this.shieldRing.setVisible(false);
      this.weapon?.setVisible(false);
      this.callbacks.onDeath?.();
    }
  }

  heal(amount: number): void {
    if (this.dead) return;
    this.hp = applyHeal(this.hp, amount, this.config.maxHp);
    this.callbacks.onHpChange?.(this.hp, this.config.maxHp);
  }

  applyItem(def: ItemDef): void {
    if (this.dead) return;
    if (def.effect === 'heal') {
      this.heal(def.perStack);
      return;
    }
    this.powers = applyPowerItem(this.powers, def);
    this.shieldRing.setVisible(this.powers.shieldLeft > 0);
    this.refreshStats();
    this.callbacks.onShieldChange?.(this.powers.shieldLeft);
  }

  destroy(fromScene?: boolean): void {
    this.shieldRing.destroy();
    this.weapon?.destroy();
    this.weapon = null;
    super.destroy(fromScene);
  }
}

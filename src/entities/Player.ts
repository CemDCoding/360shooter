import Phaser from 'phaser';
import type {
  ActivePlayerStatus,
  ActivePowers,
  GearModifiers,
  ItemDef,
  StatusOnHit,
  UpgradeLevels,
  WeaponStats,
} from '../contracts';
import {
  applyGearToStats,
  healAmount,
  resolveIncomingDamage,
  type GearSetState,
} from '../logic/gear';
import type { IncomingDamageResult } from '../logic/gear';
import type { Rng } from '../logic/rng';
import { upgradeFactors } from '../logic/upgrades';
import { weaponStageForUpgrades } from '../logic/weaponMount';
import { PlayerStatusState } from '../logic/status';
import { WEAPON_BASE } from '../config';
import { animKey } from '../config/assets';
import { applyDamage, applyHeal, isDead } from '../logic/health';
import { applyPowerItem } from '../logic/items';
import { absorbDamage, emptyPowers, tickPowers } from '../logic/powers';
import { stepRotation } from '../logic/rotation';
import { faceLeft, stepMirror, weaponFrame, weaponPose } from '../logic/weaponMount';
import { prefersReducedMotion } from '../platform/motion';
import type { WeaponPose } from '../logic/weaponMount';
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

/**
 * Player values of a round: gold upgrades first, then the bought gear on top (F-16, AP-143). With empty gear
 * (`gearModifiers` of nothing) the values equal the upgrade values exactly.
 */
export function playerConfigFor(
  levels: UpgradeLevels | undefined,
  gear: GearModifiers,
): PlayerConfig {
  const lv = levels ?? { weaponFireRate: 0, weaponDamage: 0, playerMaxHp: 0, playerTurnSpeed: 0 };
  const f = applyGearToStats(upgradeFactors(lv), gear);
  return {
    maxHp: f.playerMaxHp,
    turnSpeedDegPerSec: f.playerTurnSpeedDegPerSec,
    weaponFireRateMult: f.weaponFireRateMult,
    weaponDamageMult: f.weaponDamageMult,
    weaponStage: weaponStageForUpgrades(lv),
  };
}

/** Gear of the round for the damage path and heals (AP-143). */
export interface PlayerGear {
  modifiers: GearModifiers;
  /** Set effects of the round; its diamond block is used up by a blocked hit. */
  sets: GearSetState;
  /** Round randomness (block chance); only drawn with the diamond head piece. */
  rng: Rng;
}

/** What stopped a hit completely (gear): the diamond set block or the block chance of the head piece. */
export type GearBlock = NonNullable<IncomingDamageResult['blockedBy']>;

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
  /** Active status effects changed (start, end or shown seconds). */
  onStatusChange?: (effects: ActivePlayerStatus[]) => void;
  /** A hit was stopped completely by the gear (AP-143); no damage, no flash, no hurt sound. */
  onGearBlock?: (by: GearBlock) => void;
}

/** Player in the screen center: delayed turning, auto-fire. No scene imports. */
export class Player extends Phaser.Physics.Arcade.Sprite {
  readonly callbacks: PlayerCallbacks = {};
  hp: number;
  powers: ActivePowers = emptyPowers();
  stats: WeaponStats;
  /** Facing in degrees, (-180, 180]. */
  facingDeg = 0;
  /** Weapon side, continuous in [-1, 1]: +1 right hand, -1 mirrored (see stepMirror). */
  private mirror = 1;
  private readonly fireTimer = new FireTimer();
  private readonly lasers: LaserPool;
  private hitTintLeft = 0;
  private shootAnimLeft = 0;
  private readonly shieldRing: Phaser.GameObjects.Arc;
  private weapon: Phaser.GameObjects.Sprite | null;
  private dead = false;
  private readonly status = new PlayerStatusState();
  private lastStatusKey = '';
  /** False while no effect can be running: update() then skips building the event key. */
  private statusMaybeActive = false;
  /** Gear of the round (AP-143); null: the old damage path (shield only). */
  private gear: PlayerGear | null = null;

  /** Sets the gear of the round (once, right after the player was created). */
  setGear(gear: PlayerGear | null): void {
    this.gear = gear;
  }

  /** Ends all status effects (round end, death). */
  clearStatus(): void {
    this.status.clear();
    this.emitStatus(false);
  }

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
      .setStrokeStyle(2, SHIELD_RING_COLOR, 1)
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

  /** True during the white hit flash (gear overlays flash along, AP-143). */
  get isHitFlashing(): boolean {
    return this.hitTintLeft > 0;
  }

  /** dt in ms, targetAngle in radians (from AimInput). */
  update(dt: number, targetAngle: number): void {
    if (this.dead) return;
    this.updatePowers(dt);
    this.updateStatus(dt);
    if (this.dead) return;
    this.facingDeg = stepRotation(
      this.facingDeg,
      Phaser.Math.RadToDeg(targetAngle),
      this.config.turnSpeedDegPerSec * this.status.turnFactor(),
      dt,
    );
    const rad = Phaser.Math.DegToRad(this.facingDeg);
    const left = faceLeft(this.facingDeg);
    this.setFlipX(left);
    this.mirror = stepMirror(
      this.mirror,
      left ? -1 : 1,
      dt,
      prefersReducedMotion() ? 0 : WEAPON_MOUNT.mirrorMs,
    );
    const pose = weaponPose(this.x, this.y, this.facingDeg, this.mirror);
    this.updateWeapon(pose);

    const shots = this.fireTimer.tick(dt, this.stats.fireRatePerSec);
    if (shots > 0) {
      for (let i = 0; i < shots; i++) {
        const muzzle = pose.muzzle;
        this.lasers.fire(muzzle.x, muzzle.y, rad, this.stats, this.powers.doubleShotStage);
      }
      this.shootAnimLeft = SHOOT_ANIM_MS;
      this.callbacks.onShoot?.();
    }
    this.updateVisuals(dt);
  }

  private updateWeapon(pose: WeaponPose): void {
    if (!this.weapon) return;
    // scaleY statt flipY: flipY spiegelt um die Framemitte, der Griff wanderte um 8 px (siehe weaponPose).
    this.weapon
      .setPosition(pose.hand.x, pose.hand.y)
      .setRotation(Phaser.Math.DegToRad(pose.rotationDeg))
      .setScale(1, this.mirror)
      .setDepth(this.depth + (pose.behind ? -1 : 1));
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
      if (this.hitTintLeft <= 0) {
        this.clearTint();
        this.weapon?.clearTint();
      }
    }
  }

  /** Applies the status effects of a hit (poison, slow). No effect once dead. */
  applyStatus(effects: StatusOnHit | undefined): void {
    if (this.dead || !effects) return;
    this.status.apply(effects);
    this.statusMaybeActive = true;
    this.emitStatus(false);
  }

  /** Active effects with remaining time (copy). */
  get activeStatus(): ActivePlayerStatus[] {
    return this.status.active();
  }

  /** Pause-safe: runs only from update(dt). Poison goes through the shield like any damage. */
  private updateStatus(dt: number): void {
    const poison = this.status.tick(dt);
    if (poison > 0) this.takeDamage(poison, true);
    this.emitStatus(false);
  }

  /** player-status only when an effect starts or ends or the shown seconds change. */
  private emitStatus(force: boolean): void {
    if (!force && !this.statusMaybeActive) return;
    const list = this.status.active();
    this.statusMaybeActive = list.length > 0;
    const key = list.map((e) => `${e.kind}:${Math.ceil(e.remainingMs / 1000)}`).join('|');
    if (!force && key === this.lastStatusKey) return;
    this.lastStatusKey = key;
    this.callbacks.onStatusChange?.(list);
  }

  /**
   * The one damage path of the player. `overTime`: damage over time (poison), no hit flash and no hurt sound
   * each frame. With gear the order is fixed by `resolveIncomingDamage` (AP-138): set block, block chance,
   * damage reduction, shield. Returns false if the gear stopped the hit completely (then its status effect
   * does not apply either), true otherwise.
   */
  takeDamage(amount: number, overTime = false): boolean {
    if (this.dead) return true;
    const r = this.resolveDamage(amount, overTime);
    if (r.blockedBy !== null) {
      if (r.setBlockUsed) this.gear?.sets.consumeBlock();
      this.callbacks.onGearBlock?.(r.blockedBy);
      return false;
    }
    const shieldChanged = r.powers.shieldLeft !== this.powers.shieldLeft;
    this.powers = r.powers;
    if (shieldChanged) {
      this.shieldRing.setVisible(this.powers.shieldLeft > 0);
      this.callbacks.onShieldChange?.(this.powers.shieldLeft);
    }
    if (!overTime) {
      this.setTintFill(HIT_TINT);
      this.weapon?.setTintFill(HIT_TINT);
      this.hitTintLeft = HIT_TINT_MS;
      this.callbacks.onHurt?.();
    }
    if (r.damage <= 0) return true;
    this.applyHpDamage(r.damage);
    return true;
  }

  /**
   * Without gear exactly the old path (shield only). Damage over time (poison) never uses up the diamond set
   * block, so the 30 s block stays for a real hit.
   */
  private resolveDamage(amount: number, overTime: boolean): IncomingDamageResult {
    const gear = this.gear;
    if (!gear) {
      const absorbed = absorbDamage(this.powers, amount);
      return {
        damage: absorbed.remainingDamage,
        powers: absorbed.state,
        blockedBy: null,
        setBlockUsed: false,
      };
    }
    const blockReady = !overTime && gear.sets.blockReady();
    return resolveIncomingDamage(amount, gear.modifiers, blockReady, this.powers, gear.rng);
  }

  private applyHpDamage(damage: number): void {
    this.hp = applyDamage(this.hp, damage);
    this.callbacks.onHpChange?.(this.hp, this.config.maxHp);
    if (isDead(this.hp)) {
      this.dead = true;
      this.status.clear();
      this.emitStatus(false);
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
      // Heaven head piece doubles the heal (AP-143); without gear the plain item value.
      this.heal(this.gear ? healAmount(this.gear.modifiers, def.perStack) : def.perStack);
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

/**
 * Damage first (shield first), then the status effect of the hit (bolt, boss hazard). A hit the gear stopped
 * completely (`takeDamage` returns false) brings no status effect either (AP-143).
 */
export function hitPlayer(
  player: {
    takeDamage(amount: number): boolean | void;
    applyStatus(effects: StatusOnHit | undefined): void;
  },
  damage: number,
  onHit: StatusOnHit | undefined,
): void {
  if (player.takeDamage(damage) === false) return;
  player.applyStatus(onHit);
}

/**
 * Collects the contact statuses of one frame without allocating: at most one applyStatus per kind,
 * so a pile of snakes does not refresh and redraw once per snake and frame.
 */
export class ContactStatus {
  private poison: StatusOnHit | undefined;
  private slow: StatusOnHit | undefined;

  add(onHit: StatusOnHit | undefined): void {
    if (!onHit) return;
    if (onHit.poison && !this.poison) this.poison = onHit;
    if (onHit.slow && !this.slow) this.slow = onHit;
  }

  /** Applies the collected effects and resets for the next frame. */
  flush(player: Pick<Player, 'applyStatus'>): void {
    const { poison, slow } = this;
    this.poison = undefined;
    this.slow = undefined;
    if (poison) player.applyStatus(poison);
    if (slow && slow !== poison) player.applyStatus(slow);
  }
}

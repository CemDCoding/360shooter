import Phaser from 'phaser';
import { animKey } from '../../config/assets';
import { OPACITY, THEME } from '../../config/theme';
import { ENEMIES, ENEMY_BODY_SIZE } from '../../config/enemies';
import { contactHitDamage, dealsContactHit } from '../../logic/contactHit';
import type { EliteRules, EnemyDef, EnemyId, EnemyStatusState, StatusOnHit } from '../../contracts';
import { ARENA, BASE_SPAWN_RADIUS } from '../../config/arena';
import { approachSpeedFactor } from '../../logic/approach';
import { distance } from '../../logic/geometry';
import { applyDamage, auraDamage, isDead } from '../../logic/health';
import {
  applyBurn,
  applySlow,
  createEnemyStatus,
  enemySpeedFactor,
  tickEnemyStatus,
} from '../../logic/enemyStatus';
import { tierTintColor } from './tierTint';

/** Fallback target point (base arena center). */
const FALLBACK_CENTER = { x: ARENA.baseWidth / 2, y: ARENA.height / 2 } as const;
const FLASH_MS = 120;
const AURA_COLOR = THEME.colors['game.aura'].num;
const FLASH_TINT = THEME.colors['game.hit-flash'].num;
/** Critical laser hit (AP-143, brief H-35): golden instead of white flash, same duration. */
const CRIT_TINT = THEME.colors['game.crit'].num;
/** Burn mark above the enemy (gear-burn 8x8 x 4, 8 fps, brief H-35). */
const BURN_KEY = 'gear-burn';
const BURN_ANIM = 'gear-burn-8fps';
const BURN_FPS = 8;
/** Thorns and knockback hit the same enemy at most this often (per-second contact enemies, AP-143). */
const RECOIL_GAP_MS = 500;
/** Elite marking (AP-178, brief H-43): 1 px ice-white outline from 4 silhouette copies, crown above the head. */
const ELITE_EDGE_COLOR = THEME.colors['game.elite-edge'].num;
const ELITE_EDGE_PX = THEME.sizePx['size.elite-edge'];
const ELITE_CROWN_KEY = 'elite-crown';
const ELITE_CROWN_GAP = THEME.sizePx['size.elite-crown-gap'];
/** Offsets of the 4 outline copies (px, in x and y). */
const ELITE_EDGE_OFFSETS: readonly (readonly [number, number])[] = [
  [-ELITE_EDGE_PX, -ELITE_EDGE_PX],
  [ELITE_EDGE_PX, -ELITE_EDGE_PX],
  [-ELITE_EDGE_PX, ELITE_EDGE_PX],
  [ELITE_EDGE_PX, ELITE_EDGE_PX],
];

/**
 * Scale of an elite (AP-178): hp and contact/shot damage times the elite factors; speed, xp and coin chance
 * stay as they are. The size factor is applied by `Enemy.markElite`, not here.
 */
export function eliteScale<T extends { hp: number; contact?: number; shot?: number }>(
  scale: T,
  rules: Pick<EliteRules, 'hpMul' | 'damageMul'>,
): T {
  return {
    ...scale,
    hp: scale.hp * rules.hpMul,
    ...(scale.contact !== undefined ? { contact: scale.contact * rules.damageMul } : {}),
    ...(scale.shot !== undefined ? { shot: scale.shot * rules.damageMul } : {}),
  };
}

/** Flash of a hit: white, golden (critical laser hit) or none (burn ticks). */
export type EnemyHitFlash = 'hit' | 'crit' | 'none';

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
  private contactSpent = false;
  private tintStep = 0;
  /** Damage factor of the tier on aura and bolts (AP-134, V-24 (a)), 1 = unchanged. */
  protected shotFactor = 1;
  private auraGfx?: Phaser.GameObjects.Arc;
  /** Burn and slow (AP-143; slow is used by the pets from AP-144). Reset on every spawn. */
  private status: EnemyStatusState = createEnemyStatus();
  /** Burn damage of the last updates, taken by the scene through its damage path. */
  private burnDamage = 0;
  /** Burn mark, created on the first burn only (no extra sprite for rounds without gear). */
  private burnFx?: Phaser.GameObjects.Sprite;
  private recoilLeftMs = 0;
  /** Elite flag (AP-178). Stays readable after the death (kill rewards), reset on every spawn. */
  private eliteFlag = false;
  /** Outline copies and crown, created on the first elite only. */
  private eliteEdge: Phaser.GameObjects.Image[] = [];
  private eliteCrown?: Phaser.GameObjects.Image;

  constructor(scene: Phaser.Scene, id: EnemyId, ctx: EnemyContext = {}) {
    const def = ENEMIES[id];
    super(scene, -100, -100, def.spriteKey);
    this.def = def;
    this.hp = def.hp;
    this.ctx = ctx;
    this.center = ctx.center ?? FALLBACK_CENTER;
    scene.add.existing(this);
    scene.physics.add.existing(this);
    // Hit box from the config (brief frame sizes, AP-101), not from the placeholder PNG.
    const size = ENEMY_BODY_SIZE[id];
    if (size) this.setBodySize(size, size, true);
    if (def.aura) {
      this.auraGfx = scene.add
        .circle(0, 0, def.aura.radius, AURA_COLOR, OPACITY.aura)
        .setStrokeStyle(1, AURA_COLOR, 1)
        .setDepth(this.depth - 1)
        .setVisible(false);
    }
    this.despawn();
  }

  /**
   * `size` is the tier size factor (AP-128), `tintStep` the tier tint (AP-134), `shot` the tier damage factor
   * on aura and bolts (AP-134). All are set on every spawn, so a pooled enemy never keeps an old one.
   */
  spawn(x: number, y: number, size = 1, tintStep = 0, shot = 1): void {
    this.hp = this.def.hp;
    this.flashLeftMs = 0;
    this.contactSpent = false;
    this.status = createEnemyStatus();
    this.burnDamage = 0;
    this.recoilLeftMs = 0;
    this.eliteFlag = false;
    this.showElite(false);
    this.tintStep = tintStep;
    this.shotFactor = Number.isFinite(shot) && shot > 0 ? shot : 1;
    this.applyTierTint();
    // The arcade body follows the sprite scale, so hit and contact area grow with the picture.
    this.setScale(size);
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
    // Also runs inside the base constructor (before the field initialisers); spawn() resets the status.
    this.burnDamage = 0;
    this.burnFx?.setVisible(false);
    this.showElite(false);
    this.onDespawn();
  }

  /** Back to the tier tint (multiplicative, step 0 = none) after a hit flash or on spawn. */
  private applyTierTint(): void {
    const color = tierTintColor(this.tintStep);
    if (color === null) this.clearTint();
    else this.setTint(color);
  }

  protected onSpawn(): void {}

  /** True for an elite (AP-178), also right after its death. */
  get isElite(): boolean {
    return this.eliteFlag;
  }

  /**
   * Marks the spawned enemy as an elite (AP-178): size times `scaleMul`, outline and crown. hp and damage come
   * through the scale (`eliteScale`). Call right after `spawn`; the next `spawn` resets everything.
   */
  markElite(scaleMul: number): void {
    if (!this.active) return;
    const mul = Number.isFinite(scaleMul) && scaleMul > 0 ? scaleMul : 1;
    this.eliteFlag = true;
    this.setScale(this.scaleX * mul);
    this.showElite(true);
  }

  /** Outline copies (tint fill, behind the body) and crown; hidden again by despawn and spawn. */
  private showElite(on: boolean): void {
    if (!on) {
      for (const c of this.eliteEdge) c.setVisible(false);
      this.eliteCrown?.setVisible(false);
      return;
    }
    if (this.eliteEdge.length === 0) {
      const add = this.scene.add;
      this.eliteEdge = ELITE_EDGE_OFFSETS.map(() =>
        add.image(this.x, this.y, this.texture.key).setTintFill(ELITE_EDGE_COLOR),
      );
      if (this.scene.textures.exists(ELITE_CROWN_KEY)) {
        this.eliteCrown = add.image(this.x, this.y, ELITE_CROWN_KEY);
      }
    }
    for (const c of this.eliteEdge) c.setVisible(true);
    this.eliteCrown?.setVisible(true);
    this.syncElite();
  }

  /** Copies follow position, picture, direction, size and visibility of the body (crown is not scaled). */
  private syncElite(): void {
    if (!this.eliteFlag || this.eliteEdge.length === 0) return;
    const frame = this.frame?.name;
    const visible = this.visible && this.active;
    for (let i = 0; i < this.eliteEdge.length; i++) {
      const [dx, dy] = ELITE_EDGE_OFFSETS[i] ?? [0, 0];
      this.eliteEdge[i]!.setTexture(this.texture.key, frame)
        .setPosition(this.x + dx, this.y + dy)
        .setFlipX(this.flipX)
        .setScale(this.scaleX, this.scaleY)
        .setAlpha(this.alpha)
        .setDepth(this.depth - 0.5)
        .setVisible(visible);
    }
    // Whole pixels, so the 9x7 crown stays sharp (brief H-43).
    this.eliteCrown
      ?.setPosition(
        Math.round(this.x),
        Math.round(
          this.y -
            (this.height * Math.abs(this.scaleY)) / 2 -
            ELITE_CROWN_GAP -
            this.eliteCrown.height / 2,
        ),
      )
      .setAlpha(this.alpha)
      .setDepth(this.depth + 1)
      .setVisible(visible);
  }

  /** Hook to hide the visuals of a subclass. Also runs inside the base constructor, before subclass fields exist. */
  protected onDespawn(): void {}

  /** True while lasers and other damage cannot hurt the enemy (burrowed sand worm, AP-101). */
  get isInvulnerable(): boolean {
    return false;
  }

  /** Factor on incoming damage (rolling armadillo 0.5, AP-101). */
  protected damageFactor(): number {
    return 1;
  }

  /** Status effect of the contact with the player, from the config (AP-97). Applied by the scene from AP-102 on. */
  get onHit(): StatusOnHit | undefined {
    return this.def.onHit;
  }

  /**
   * Returns true if the hit killed the enemy. No damage numbers (PE-31). `flash`: white hit flash, golden
   * flash of a critical hit (AP-143) or none (burn ticks); after the flash the tier tint returns.
   */
  takeDamage(amount: number, flash: EnemyHitFlash = 'hit'): boolean {
    // After the contact hit the enemy only plays its flash: no kill, no coin, no xp (AP-112).
    if (!this.active || this.isInvulnerable || this.contactSpent) return false;
    return this.hurt(amount, flash);
  }

  private hurt(amount: number, flash: EnemyHitFlash): boolean {
    this.hp = applyDamage(this.hp, amount * this.damageFactor());
    if (isDead(this.hp)) {
      const { x, y } = this;
      this.despawn();
      this.ctx.onDeath?.(x, y, this.def.xp);
      return true;
    }
    if (flash !== 'none') {
      this.flashLeftMs = FLASH_MS;
      this.setTintFill(flash === 'crit' ? CRIT_TINT : FLASH_TINT);
    }
    return false;
  }

  /**
   * Thorns and knockback of the diamond gear after a contact (AP-143): pushes the enemy by (dx, dy) and deals
   * `damage`, also during the contact flash (AP-112), so thorns can still defeat the enemy that touched the
   * player (with reward). At most once per RECOIL_GAP_MS per enemy. Returns true if the enemy died.
   */
  recoil(damage: number, dx: number, dy: number): boolean {
    if (!this.active || this.isInvulnerable || this.recoilLeftMs > 0) return false;
    const dmg = Number.isFinite(damage) && damage > 0 ? damage : 0;
    if (dmg === 0 && dx === 0 && dy === 0) return false;
    this.recoilLeftMs = RECOIL_GAP_MS;
    if (dx !== 0 || dy !== 0) this.setPosition(this.x + dx, this.y + dy);
    // A spent enemy keeps its running contact flash (it ends in the despawn): no second flash.
    return dmg > 0 ? this.hurt(dmg, this.contactSpent ? 'none' : 'hit') : false;
  }

  /** Burn of the hell body piece (AP-143): refreshes, never stacks (enemyStatus). */
  applyBurn(burn: { durationMs: number; dps: number }): void {
    if (!this.active || this.contactSpent) return;
    this.status = applyBurn(this.status, burn);
    if (this.status.burnMsLeft > 0) this.showBurn(true);
  }

  /** Slow (pets, AP-144): `slow` is a fraction, refreshes, never stacks (enemyStatus). */
  applySlow(effect: { slow: number; durationMs: number }): void {
    if (!this.active || this.contactSpent) return;
    this.status = applySlow(this.status, effect);
  }

  /** True while the enemy burns. */
  get isBurning(): boolean {
    return this.status.burnMsLeft > 0;
  }

  /** Factor on the walking speed from a slow (1 = none). */
  get speedFactor(): number {
    return enemySpeedFactor(this.status);
  }

  /** Burn damage collected since the last call; the scene deals it through its damage path (rewards). */
  takeBurnDamage(): number {
    const d = this.burnDamage;
    this.burnDamage = 0;
    return d;
  }

  private showBurn(on: boolean): void {
    if (!on) {
      this.burnFx?.setVisible(false);
      return;
    }
    if (!this.burnFx) {
      const anims = this.scene.anims;
      if (!anims.exists(BURN_ANIM) && this.scene.textures.exists(BURN_KEY)) {
        anims.create({
          key: BURN_ANIM,
          frames: anims.generateFrameNumbers(BURN_KEY, { start: 0, end: 3 }),
          frameRate: BURN_FPS,
          repeat: -1,
        });
      }
      this.burnFx = this.scene.add.sprite(this.x, this.y, BURN_KEY, 0);
      if (anims.exists(BURN_ANIM)) this.burnFx.play(BURN_ANIM);
    }
    this.burnFx.setVisible(true).setDepth(this.depth + 1);
    this.placeBurn();
  }

  /** Burn mark centred above the head of the enemy (brief H-35: "über dem Gegner"). */
  private placeBurn(): void {
    this.burnFx?.setPosition(this.x, this.y - (this.height * Math.abs(this.scaleY)) / 2 - 2);
  }

  /** Burn ticks and slow on pausable game time (only while the enemy is in the round). */
  private updateStatus(delta: number): void {
    const s = this.status;
    if (s.burnMsLeft <= 0 && s.slowMsLeft <= 0) return;
    const t = tickEnemyStatus(s, delta);
    this.status = t.state;
    this.burnDamage += t.damage;
    if (t.state.burnMsLeft <= 0) this.showBurn(false);
    else this.placeBurn();
  }

  /**
   * Contact damage for dtMs of contact with the player (unscaled). Chasers, chargers and burrowers hit once
   * (contactDamage x CONTACT_HIT_SECONDS), switch their body off and vanish after the flash, without
   * onDeath (AP-112). Aura enemies and shooters keep the damage per second (Q-57).
   */
  contactDamageFor(dtMs: number): number {
    const cd = this.def.contactDamage;
    if (!dealsContactHit(this.def.behavior, cd)) return auraDamage(cd, dtMs);
    if (!this.active || this.isInvulnerable || this.contactSpent) return 0;
    this.contactSpent = true;
    this.setVelocity(0, 0);
    this.setHittable(false);
    this.flashLeftMs = FLASH_MS;
    this.setTintFill(FLASH_TINT);
    return contactHitDamage(cd);
  }

  /** Aura damage dealt to a target at (tx, ty) during dtMs; 0 if no aura or out of range. */
  auraDamageAt(tx: number, ty: number, dtMs: number): number {
    const aura = this.def.aura;
    if (!aura || !this.active) return 0;
    if (distance(this.x, this.y, tx, ty) > aura.radius) return 0;
    return auraDamage(aura.dps * this.shotFactor, dtMs);
  }

  update(_time: number, delta: number): void {
    if (!this.active) return;
    if (this.recoilLeftMs > 0) this.recoilLeftMs -= delta;
    if (this.contactSpent) {
      // Flash, then vanish. No onDeath: no coin, item, xp or kill count. Returns before behave, so a
      // burrowing worm cannot switch its body on again (AP-112).
      this.flashLeftMs -= delta;
      if (this.flashLeftMs <= 0) this.despawn();
      else this.syncElite();
      return;
    }
    if (this.flashLeftMs > 0) {
      this.flashLeftMs -= delta;
      if (this.flashLeftMs <= 0) this.applyTierTint();
    }
    this.updateStatus(delta);
    this.behave(delta);
    this.auraGfx?.setPosition(this.x, this.y);
    this.syncElite();
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
      const speed = this.approachSpeed(dist);
      this.setVelocity((dx / dist) * speed, (dy / dist) * speed);
    }
    this.faceCenter();
    return dist;
  }

  /** Walking speed at a distance to the center. PE-100: faster only outside the 640 spawn ring, unchanged inside. */
  protected approachSpeed(dist: number): number {
    return (
      this.def.speed *
      approachSpeedFactor(dist, BASE_SPAWN_RADIUS, ARENA.offscreenSpeedFactor) *
      this.speedFactor
    );
  }

  protected halt(): void {
    this.setVelocity(0, 0);
  }

  /**
   * Switches the physics body on or off without hiding the sprite. Without a body there is no overlap:
   * lasers pass and there is no contact damage (AP-101).
   */
  protected setHittable(on: boolean): void {
    const body = this.body as Phaser.Physics.Arcade.Body | null;
    if (!body || body.enable === on) return;
    body.enable = on;
    if (on) body.reset(this.x, this.y);
  }

  destroy(fromScene?: boolean): void {
    this.auraGfx?.destroy();
    this.burnFx?.destroy();
    this.burnFx = undefined;
    for (const c of this.eliteEdge) c.destroy();
    this.eliteEdge = [];
    this.eliteCrown?.destroy();
    this.eliteCrown = undefined;
    super.destroy(fromScene);
  }
}

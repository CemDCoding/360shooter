import Phaser from 'phaser';
import { animKey } from '../../config/assets';
import { OPACITY, THEME } from '../../config/theme';
import { CONTACT_DESPAWN_DAMAGE, ENEMIES, ENEMY_BODY_SIZE } from '../../config/enemies';
import { addContact, isContactSpent } from '../../logic/contactBudget';
import type { EnemyDef, EnemyId, StatusOnHit } from '../../contracts';
import { ARENA, BASE_SPAWN_RADIUS } from '../../config/arena';
import { approachSpeedFactor } from '../../logic/approach';
import { distance } from '../../logic/geometry';
import { applyDamage, auraDamage, isDead } from '../../logic/health';

/** Fallback target point (base arena center). */
const FALLBACK_CENTER = { x: ARENA.baseWidth / 2, y: ARENA.height / 2 } as const;
const FLASH_MS = 120;
const AURA_COLOR = THEME.colors['game.aura'].num;
const FLASH_TINT = THEME.colors['game.hit-flash'].num;

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
  private contactDealt = 0;
  private contactSpent = false;
  private auraGfx?: Phaser.GameObjects.Arc;

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

  spawn(x: number, y: number): void {
    this.hp = this.def.hp;
    this.flashLeftMs = 0;
    this.contactDealt = 0;
    this.contactSpent = false;
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
    this.onDespawn();
  }

  protected onSpawn(): void {}

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

  /** Returns true if the hit killed the enemy. No damage numbers (PE-31). */
  takeDamage(amount: number): boolean {
    if (!this.active || this.isInvulnerable) return false;
    this.hp = applyDamage(this.hp, amount * this.damageFactor());
    if (isDead(this.hp)) {
      const { x, y } = this;
      this.despawn();
      this.ctx.onDeath?.(x, y, this.def.xp);
      return true;
    }
    this.flashLeftMs = FLASH_MS;
    this.setTintFill(FLASH_TINT);
    return false;
  }

  /** Contact damage for dtMs of ongoing contact with the player (config value is per second). */
  contactDamageFor(dtMs: number): number {
    const dmg = auraDamage(this.def.contactDamage, dtMs);
    this.contactDealt = addContact(this.contactDealt, dmg);
    if (isContactSpent(this.contactDealt, CONTACT_DESPAWN_DAMAGE[this.def.id])) {
      this.contactSpent = true;
    }
    return dmg;
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
    if (this.contactSpent) {
      // No onDeath: no coin, item, xp or kill count (AP-60). Runs here, not in the physics callback.
      this.despawn();
      return;
    }
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
      const speed = this.approachSpeed(dist);
      this.setVelocity((dx / dist) * speed, (dy / dist) * speed);
    }
    this.faceCenter();
    return dist;
  }

  /** Walking speed at a distance to the center. PE-100: faster only outside the 640 spawn ring, unchanged inside. */
  protected approachSpeed(dist: number): number {
    return (
      this.def.speed * approachSpeedFactor(dist, BASE_SPAWN_RADIUS, ARENA.offscreenSpeedFactor)
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
    super.destroy(fromScene);
  }
}

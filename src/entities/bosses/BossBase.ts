import Phaser from 'phaser';
import { animKey } from '../../config/assets';
import { ARENA } from '../../config/arena';
import { BOSSES, BOSS_TUNING } from '../../config/bosses';
import { THEME } from '../../config/theme';
import type {
  ArenaRect,
  BossAttackDef,
  BossDef,
  BossId,
  BossVariant,
  EnemyId,
} from '../../contracts';
import {
  AttackScheduler,
  NO_TINT,
  scaledDamage,
  scaledHp,
  variantForLevel,
  type AttackEvent,
  type SchedulerRng,
} from '../../logic/boss';
import { applyDamage, auraDamage, isDead } from '../../logic/health';
import {
  ParryTracker,
  parriedDamage,
  type BossHazard,
  type ParryGroup,
  type ParryOutcome,
} from './hazards';

export type {
  BossHazard,
  HazardShape,
  LaserProbe,
  ParryGroup,
  ParryOutcome,
  ParryTap,
} from './hazards';

const FLASH_MS = 120;
const FLASH_TINT = THEME.colors['game.hit-flash'].num;

/** Arena used when the context gives none: the base arena (PE-101). */
const FALLBACK_ARENA: ArenaRect = {
  width: ARENA.baseWidth,
  height: ARENA.height,
  margin: BOSS_TUNING.arena.margin,
};

export interface BossContext {
  /**
   * Real arena size plus the inner margin (PE-101). Bosses, trees and warnings stay inside it.
   * Default: base arena (ARENA.baseWidth x ARENA.height), so 640 x 360 behaves as before.
   */
  arena?: ArenaRect;
  /** Fixed arena centre (player position). */
  center?: { x: number; y: number };
  /** Random source for the attack choice. */
  rng?: SchedulerRng;
  /** HP changed (also once at spawn). The scene turns this into the boss-hp-changed event. */
  onHpChanged?: (hp: number, maxHp: number) => void;
  /** Boss died. The scene turns this into boss-defeated and RoundState.bossDefeated(). */
  onDefeated?: (x: number, y: number) => void;
  /**
   * Generic summon (M5, AP-97): the scene spawns one enemy of `enemyId` per position over the normal
   * spawn path (e.g. the guardian dog calls mummies). `onSummonTrees` of the root monster stays as it is.
   */
  onSummon?: (enemyId: EnemyId, positions: { x: number; y: number }[]) => void;
  /**
   * Quicktime result of an attack at its impact (AP-133), called right before onAttack. The scene shows the
   * final grades and, if `blocked`, the "PARRY!" effect with the sound.
   */
  onParryResolved?: (outcome: ParryOutcome) => void;
}

/**
 * Base class of all bosses (AP-16). Holds HP, soft flash on hit (PE-31, no shake, no damage numbers),
 * the variant tint, the attack timing and the callbacks. Subclasses (AP-17 to AP-19) only add behaviour:
 * - onTelegraph(attack): show the warning (use Telegraph) - runs when an attack is announced,
 * - onAttack(attackId): the attack hits now (after telegraphMs),
 * - behave(delta): movement,
 * - invulnerable / damageFactor: ghost phase, half damage of the stone,
 * - getHazards(): projectiles and danger zones for the generic hit path of the scene (PE-134).
 * Pool friendly like Enemy: spawn() and despawn().
 */
export abstract class BossBase extends Phaser.Physics.Arcade.Sprite {
  readonly def: BossDef;
  readonly variant: BossVariant;
  readonly maxHp: number;
  hp: number;
  /** Contact damage per second of the boss body after the variant multiplier. */
  readonly contactDps: number;
  /** true: hits do nothing (e.g. ghost phase). */
  protected invulnerable = false;
  /** Multiplier on incoming damage (stone: 0.5). */
  protected damageFactor = 1;
  protected readonly center: { x: number; y: number };
  /** Arena of this boss (from the context or the base arena). */
  protected readonly arena: ArenaRect;
  private readonly scheduler: AttackScheduler;
  private readonly ctx: BossContext;
  private flashLeftMs = 0;
  /** Quicktime circles of the announced attacks (AP-133); emptied by despawn(). */
  private readonly parry = new ParryTracker();
  private readonly parryRng: SchedulerRng;

  constructor(scene: Phaser.Scene, bossId: BossId, levelId: number, ctx: BossContext = {}) {
    const def = BOSSES[bossId];
    super(scene, -200, -200, def.spriteKey);
    this.def = def;
    this.variant = variantForLevel(levelId);
    this.maxHp = scaledHp(def, this.variant);
    this.hp = this.maxHp;
    this.contactDps = scaledDamage(def.baseDamage, this.variant);
    this.ctx = ctx;
    this.arena = ctx.arena ?? FALLBACK_ARENA;
    this.center = ctx.center ?? { x: this.arena.width / 2, y: this.arena.height / 2 };
    this.scheduler = new AttackScheduler(
      def,
      this.variant,
      ctx.rng ?? { next: Math.random },
      this.optInAttacks(),
    );
    this.parryRng = ctx.rng ?? { next: Math.random };
    scene.add.existing(this);
    scene.physics.add.existing(this);
    // Rule for subclasses: this call runs inside the base constructor, before their fields exist.
    // An overridden despawn() must guard its own fields with ?. / ?? / early return.
    this.despawn();
  }

  /** true while hits do nothing (e.g. ghost phase). The scene lets lasers pass through then. */
  get isInvulnerable(): boolean {
    return this.invulnerable;
  }

  /** Brings the boss into the arena at (x, y) with full HP. */
  spawn(x: number, y: number): void {
    this.hp = this.maxHp;
    this.flashLeftMs = 0;
    this.applyBaseTint();
    this.enableBody(true, x, y, true, true);
    this.setActive(true).setVisible(true);
    const anim = animKey(this.def.spriteKey);
    if (this.scene.anims.exists(anim)) this.play(anim, true);
    this.ctx.onHpChanged?.(this.hp, this.maxHp);
    this.onSpawn();
  }

  despawn(): void {
    this.scheduler.cancel();
    // Boss death, round end or split: open circles go with the boss (no later damage or sound).
    this.parry.clear();
    this.disableBody(true, true);
    this.setActive(false).setVisible(false);
  }

  /** Called after spawn(). */
  protected onSpawn(): void {}

  /** Warning of an attack starts (show a Telegraph for attack.telegraphMs). */
  protected onTelegraph(attack: BossAttackDef): void {
    void attack;
  }

  /**
   * The announced attack hits now. `damage` already carries the quicktime share (AP-133): projectiles and zones
   * made here with `damage` are reduced for exactly this attack. `parryFactor` (0..1, 1 = no circles or all
   * missed) is for damage fixed earlier in onTelegraph (e.g. the root bud).
   */
  protected onAttack(attackId: string, damage: number, parryFactor: number): void {
    void attackId;
    void damage;
    void parryFactor;
  }

  /**
   * false: this announcement gets no quicktime circles although the attack has some (the subclass skips the
   * attack, e.g. the stone is still rolling). Called right before onTelegraph.
   */
  protected canParry(attack: BossAttackDef): boolean {
    void attack;
    return true;
  }

  /** Ids of the optIn attacks this boss unlocks (M9, PE-193). Called in the constructor: return a constant. */
  protected optInAttacks(): readonly string[] {
    return [];
  }

  /** Open quicktime groups of this boss (read by the scene for ParryOverlay). */
  get parryGroups(): readonly ParryGroup[] {
    return this.parry.groups;
  }

  /**
   * A tap or click at `point` (world coordinates); `center` is the player. Returns true if it hit an open
   * circle: the tap is used up and must not aim.
   */
  tapParry(point: { x: number; y: number }, center: { x: number; y: number }): boolean {
    if (!this.active) return false;
    return this.parry.tap(point, center) !== null;
  }

  /** Movement hook, runs every frame while the boss lives. */
  protected behave(delta: number): void {
    void delta;
  }

  /**
   * Projectiles and danger zones of this boss that can hit the player (PE-134). The scene checks them every
   * frame on one generic path (lasers first, then the player). Default: none.
   */
  getHazards(): readonly BossHazard[] {
    return [];
  }

  /** Damage of an attack of this boss after the variant multiplier. */
  attackDamage(attackId: string): number {
    const a = this.def.attacks.find((x) => x.id === attackId);
    return a ? scaledDamage(a.damage, this.variant) : 0;
  }

  /** Contact damage for dtMs of contact with the player. */
  contactDamageFor(dtMs: number): number {
    return auraDamage(this.contactDps, dtMs);
  }

  /** Returns true if the hit killed the boss. No damage numbers (PE-31). */
  takeDamage(amount: number): boolean {
    if (!this.active || this.invulnerable || !(amount > 0)) return false;
    this.hp = applyDamage(this.hp, amount * this.damageFactor);
    this.ctx.onHpChanged?.(this.hp, this.maxHp);
    if (isDead(this.hp)) {
      const { x, y } = this;
      this.despawn();
      this.ctx.onDefeated?.(x, y);
      return true;
    }
    this.flashLeftMs = FLASH_MS;
    this.setTintFill(FLASH_TINT);
    return false;
  }

  update(_time: number, delta: number): void {
    if (!this.active) return;
    if (this.flashLeftMs > 0) {
      this.flashLeftMs -= delta;
      if (this.flashLeftMs <= 0) this.applyBaseTint();
    }
    this.behave(delta);
    // Same play time as the scheduler: the last circle stays gradable until the impact (fairness).
    this.parry.tick(delta);
    for (const ev of this.scheduler.tick(delta)) this.handle(ev);
  }

  private handle(ev: AttackEvent): void {
    if (!this.active) return;
    if (ev.type === 'telegraph') {
      const attack = this.def.attacks.find((a) => a.id === ev.attackId);
      if (!attack) return;
      // Only attacks with damage get circles (PE-157); the boss can still skip one (canParry).
      const withCircles = attack.damage > 0 && attack.parryCircles > 0 && this.canParry(attack);
      this.onTelegraph(attack);
      if (withCircles && this.active) {
        this.parry.open(attack.id, attack.parryCircles, ev.telegraphMs, this.parryRng);
      }
    } else {
      const outcome = this.parry.resolve(ev.attackId);
      const factor = outcome ? outcome.damageFactor : 1;
      if (outcome) this.ctx.onParryResolved?.(outcome);
      // The share holds for this attack only; later attacks start with their own circles.
      this.onAttack(ev.attackId, parriedDamage(ev.damage, factor), factor);
    }
  }

  private applyBaseTint(): void {
    this.clearTint();
    if (this.variant.tint !== NO_TINT) this.setTint(this.variant.tint);
  }
}

import Phaser from 'phaser';
import { BOSS_TUNING } from '../../config/bosses';
import { PARRY_RULES } from '../../config/parry';
import { EASY_PARRY_KEY, type BossAttackDef, type ParryRules } from '../../contracts';
import { circlePosition, type ParryCircleState } from '../../logic/parry';
import { ringSpikeAngles, treePositions } from './bossGeometry';
import { BossBase, type BossContext, type ParryAnchor } from './BossBase';
import { bodyShape, type BossHazard } from './hazards';
import { RootSpike } from './RootSpike';
import { Telegraph } from './Telegraph';

const TUNING = BOSS_TUNING.rootMonster;
const FULL_TURN = Math.PI * 2;
const RAD_TO_DEG = 180 / Math.PI;
/** Angle between two neighbouring quicktime circles of the root monster (AP-153); 70 degrees = 64 px apart. */
const CIRCLE_STEP_DEG = 70;
/** Fallback body radius when the sprite has no size yet. */
const FALLBACK_BODY_RADIUS = 24;

/** Angles (degrees) of `count` circles in a fan centred on `baseDeg`. */
export function circleFan(baseDeg: number, count: number, stepDeg: number): number[] {
  const out: number[] = [];
  for (let i = 0; i < count; i++) out.push(baseDeg + (i - (count - 1) / 2) * stepDeg);
  return out;
}

/**
 * Centre angle of a circle fan around the player (AP-153, fairness): `preferredDeg` if no circle of the fan
 * would sit under the boss body, otherwise the direction away from the body (never hidden by the boss).
 */
export function fanBaseAngle(
  preferredDeg: number,
  count: number,
  stepDeg: number,
  player: { x: number; y: number },
  body: { x: number; y: number; radius: number },
  rules: ParryRules = PARRY_RULES,
): number {
  const clear = circleFan(preferredDeg, count, stepDeg).every((angleDeg) => {
    const p = circlePosition({ angleDeg }, player, rules);
    return Math.hypot(p.x - body.x, p.y - body.y) >= body.radius + rules.circleRadiusPx;
  });
  if (clear) return preferredDeg;
  return Math.atan2(player.y - body.y, player.x - body.x) * RAD_TO_DEG;
}

/** Angle (degrees) from the boss to the player, i.e. the side of the player that faces away from the boss. */
export function awayFromBodyDeg(
  player: { x: number; y: number },
  body: { x: number; y: number },
): number {
  return Math.atan2(player.y - body.y, player.x - body.x) * RAD_TO_DEG;
}

export interface RootMonsterContext extends BossContext {
  /** The boss calls cursed trees: the scene spawns one cursedTree per position. */
  onSummonTrees?: (positions: { x: number; y: number }[]) => void;
}

/**
 * Boss "Baummonster" (Forest 0-4, PE-34): stands rooted and never moves.
 * Attacks (all announced with a Telegraph first, all counterable with the laser, PE-75):
 * - rootThrust: a harmless root bud appears at the player at once and grows during the announcement.
 *   Every laser hit weakens it (spike.laserHit()); afterwards the root hurts once with the reduced damage.
 * - forestCall: summons 3-5 cursed trees inside the arena.
 * - rootRing (extra attack): ring of roots with one gap, the roots creep toward the player; a laser removes a root.
 * Scene contract: `activeSpikes` holds buds, roots and ring roots; getHazards() hands them to the generic hit
 * path (PE-134). Player overlap: spike.tryHit(); laser overlap: if (spike.laserHit()) recycle the laser.
 */
export class RootMonster extends BossBase {
  private spikes: RootSpike[] | undefined;
  private telegraphs: Telegraph[] | undefined;
  private pendingTrees: { x: number; y: number }[] = [];
  private ringGapStart = 0;
  /** Bud of the running rootThrust announcement; takes the quicktime share at the impact. */
  private pendingBud: RootSpike | undefined;
  private readonly monsterCtx: RootMonsterContext;
  private readonly random: () => number;

  constructor(scene: Phaser.Scene, levelId: number, ctx: RootMonsterContext = {}) {
    super(scene, 'rootMonster', levelId, ctx);
    this.monsterCtx = ctx;
    const rng = ctx.rng;
    this.random = rng ? () => rng.next() : Math.random;
    this.spikes = [];
    this.telegraphs = [];
  }

  /** Spikes that are up right now. */
  get activeSpikes(): readonly RootSpike[] {
    return this.spikes ?? [];
  }

  /** Buds, roots and ring roots for the generic hit path (PE-134); rules unchanged (laserHit, tryHit). */
  override getHazards(): readonly BossHazard[] {
    const out: BossHazard[] = [];
    for (const spike of this.spikes ?? []) {
      const body = spike.body as Phaser.Physics.Arcade.Body | null;
      if (!body) continue;
      out.push({
        get active() {
          return spike.active;
        },
        shape: bodyShape(body),
        shootable: true,
        laserHit: () => spike.laserHit(),
        playerHit: () => spike.tryHit(),
      });
    }
    return out;
  }

  override despawn(): void {
    super.despawn();
    // Also called by the base constructor before our fields exist, hence the guards.
    for (const t of this.telegraphs ?? []) t.cancel();
    if (this.telegraphs) this.telegraphs.length = 0;
    for (const s of this.spikes ?? []) s.destroy();
    if (this.spikes) this.spikes.length = 0;
    this.pendingTrees = [];
    this.pendingBud = undefined;
  }

  protected override onSpawn(): void {
    // Rooted: no movement at all.
    this.setVelocity(0, 0);
    this.setImmovable(true);
  }

  protected override behave(delta: number): void {
    const spikes = this.spikes;
    if (!spikes) return;
    for (let i = spikes.length - 1; i >= 0; i--) {
      const spike = spikes[i];
      if (spike.tick(delta)) {
        spike.destroy();
        spikes.splice(i, 1);
      }
    }
  }

  /**
   * Circle places (AP-153). rootThrust: the bud sits under the player, so the hold and the tap circle fan out on
   * the side facing away from the boss. rootRing: the circles sit on the closing ring, on the side opposite
   * the gap (the ring is chosen in onTelegraph, which runs before the circles are planned); they step aside
   * only if the boss body would hide one.
   */
  protected override parryAnchor(attack: BossAttackDef, circle: ParryCircleState): ParryAnchor {
    if (attack.id !== 'rootThrust' && attack.id !== 'rootRing') {
      return super.parryAnchor(attack, circle);
    }
    // Einfache Abwehr drops the decoy circles: fan only as many circles as are really shown.
    const steps = attack.parryPattern?.steps;
    const registry = (this.scene as Partial<Phaser.Scene> | undefined)?.registry;
    const easy = registry?.get?.(EASY_PARRY_KEY) === true;
    const count = steps
      ? easy
        ? steps.filter((s) => s.kind !== 'decoy').length
        : steps.length
      : attack.parryCircles;
    const body = {
      x: this.x,
      y: this.y,
      radius: Math.max(this.width, this.height) / 2 || FALLBACK_BODY_RADIUS,
    };
    const preferred =
      attack.id === 'rootRing'
        ? (this.ringGapStart + TUNING.ring.gapRad / 2) * RAD_TO_DEG + 180
        : awayFromBodyDeg(this.center, body);
    const base = fanBaseAngle(preferred, count, CIRCLE_STEP_DEG, this.center, body);
    const angles = circleFan(base, count, CIRCLE_STEP_DEG);
    return { angleDeg: angles[circle.index] ?? circle.angleDeg };
  }

  protected override onTelegraph(attack: BossAttackDef): void {
    const ms = attack.telegraphMs;
    if (attack.id === 'rootThrust') {
      // The bud sits under the player at once and grows while the warning runs.
      const x = this.center.x;
      const y = this.center.y;
      const bud = new RootSpike(this.scene, x, y, this.attackDamage('rootThrust'), {
        mode: 'sprout',
        sproutMs: ms,
      });
      this.spikes?.push(bud);
      this.pendingBud = bud;
      this.track(Telegraph.circle(this.scene, x, y, TUNING.sprout.hitRadius, ms));
    } else if (attack.id === 'forestCall') {
      this.pendingTrees = this.pickTreePositions();
      for (const p of this.pendingTrees) {
        this.track(Telegraph.circle(this.scene, p.x, p.y, TUNING.call.warnRadius, ms));
      }
    } else if (attack.id === 'rootRing') {
      this.ringGapStart = this.random() * FULL_TURN;
      this.track(
        Telegraph.ring(
          this.scene,
          this.center.x,
          this.center.y,
          TUNING.ring.radius,
          TUNING.ring.thickness,
          ms,
          undefined,
          { start: this.ringGapStart, size: TUNING.ring.gapRad },
        ),
      );
    }
  }

  protected override onAttack(attackId: string, damage: number, parryFactor: number): void {
    if (attackId === 'rootThrust') {
      // The bud was made during the announcement with the full damage: the quicktime share of this
      // attack goes onto exactly that bud (AP-133).
      if (this.pendingBud) this.pendingBud.damageFactor = parryFactor;
      this.pendingBud = undefined;
    } else if (attackId === 'forestCall') {
      const positions = this.pendingTrees;
      this.pendingTrees = [];
      this.monsterCtx.onSummonTrees?.(positions);
    } else if (attackId === 'rootRing') {
      const ring = TUNING.ring;
      const target = { x: this.center.x, y: this.center.y };
      for (const angle of ringSpikeAngles(ring.spikeCount, this.ringGapStart, ring.gapRad)) {
        this.spikes?.push(
          new RootSpike(
            this.scene,
            target.x + Math.cos(angle) * ring.radius,
            target.y + Math.sin(angle) * ring.radius,
            damage * ring.damageShare,
            { mode: 'creep', target, speedPxPerSec: ring.speedPxPerSec },
          ),
        );
      }
    }
    // rootThrust: the bud made in onTelegraph turns into the root by itself (RootSpike.tick).
  }

  /** Keeps a telegraph so despawn() can cancel it; finished ones are dropped. */
  private track(t: Telegraph): void {
    const list = this.telegraphs;
    if (!list) return;
    for (let i = list.length - 1; i >= 0; i--) if (!list[i].scene) list.splice(i, 1);
    list.push(t);
  }

  private pickTreePositions(): { x: number; y: number }[] {
    const call = TUNING.call;
    const count = call.minTrees + Math.floor(this.random() * (call.maxTrees - call.minTrees + 1));
    const base = this.random() * FULL_TURN;
    return treePositions({ x: this.x, y: this.y }, count, base, call.distance, this.arena);
  }
}

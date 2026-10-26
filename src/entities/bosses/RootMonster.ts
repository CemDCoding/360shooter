import Phaser from 'phaser';
import { BOSS_TUNING } from '../../config/bosses';
import type { BossAttackDef } from '../../contracts';
import { ringSpikeAngles, treePositions } from './bossGeometry';
import { BossBase, type BossContext } from './BossBase';
import { RootSpike } from './RootSpike';
import { Telegraph } from './Telegraph';

const TUNING = BOSS_TUNING.rootMonster;
const FULL_TURN = Math.PI * 2;

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
 * Scene contract: `activeSpikes` holds buds, roots and ring roots. Player overlap: spike.tryHit(); laser overlap:
 * if (spike.laserHit()) recycle the laser.
 */
export class RootMonster extends BossBase {
  private spikes: RootSpike[] | undefined;
  private telegraphs: Telegraph[] | undefined;
  private pendingTrees: { x: number; y: number }[] = [];
  private ringGapStart = 0;
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

  override despawn(): void {
    super.despawn();
    // Also called by the base constructor before our fields exist, hence the guards.
    for (const t of this.telegraphs ?? []) t.cancel();
    if (this.telegraphs) this.telegraphs.length = 0;
    for (const s of this.spikes ?? []) s.destroy();
    if (this.spikes) this.spikes.length = 0;
    this.pendingTrees = [];
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

  protected override onTelegraph(attack: BossAttackDef): void {
    const ms = attack.telegraphMs;
    if (attack.id === 'rootThrust') {
      // The bud sits under the player at once and grows while the warning runs.
      const x = this.center.x;
      const y = this.center.y;
      this.spikes?.push(
        new RootSpike(this.scene, x, y, this.attackDamage('rootThrust'), { mode: 'sprout', sproutMs: ms }),
      );
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

  protected override onAttack(attackId: string, damage: number): void {
    if (attackId === 'forestCall') {
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
    return treePositions({ x: this.x, y: this.y }, count, base, call.distance, BOSS_TUNING.arena);
  }
}

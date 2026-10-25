import Phaser from 'phaser';
import type { BossAttackDef } from '../../contracts';
import { BossBase, type BossContext } from './BossBase';
import { RootSpike } from './RootSpike';
import { Telegraph } from './Telegraph';

// Geometry of the attacks (not balance values; timing, damage and cooldowns come from config/bosses.ts).
const SPIKE_WARN_RADIUS = 22;
const CALL_MIN_TREES = 3;
const CALL_MAX_TREES = 5;
const CALL_DISTANCE = 56;
const CALL_WARN_RADIUS = 16;
const RING_RADIUS = 96;
const RING_THICKNESS = 20;
const RING_SPIKE_COUNT = 12;
/** Width of the visible gap in the ring (radians, about 70 degrees). */
const RING_GAP = 1.2;
const FULL_TURN = Math.PI * 2;

export interface RootMonsterContext extends BossContext {
  /** The boss calls cursed trees: the scene spawns one cursedTree per position. */
  onSummonTrees?: (positions: { x: number; y: number }[]) => void;
}

/**
 * Boss "Baummonster" (Forest 0-4, PE-34): stands rooted and never moves.
 * Attacks: rootThrust (spike under the player), forestCall (summons 3-5 cursed trees),
 * rootRing (extra attack: ring of roots with one gap). Every attack shows a Telegraph first.
 * The scene reads `activeSpikes` and calls spike.tryHit() on overlap with the player.
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
      this.track(Telegraph.circle(this.scene, this.center.x, this.center.y, SPIKE_WARN_RADIUS, ms));
    } else if (attack.id === 'forestCall') {
      this.pendingTrees = this.pickTreePositions();
      for (const p of this.pendingTrees) {
        this.track(Telegraph.circle(this.scene, p.x, p.y, CALL_WARN_RADIUS, ms));
      }
    } else if (attack.id === 'rootRing') {
      this.ringGapStart = this.random() * FULL_TURN;
      this.track(
        Telegraph.ring(
          this.scene,
          this.center.x,
          this.center.y,
          RING_RADIUS,
          RING_THICKNESS,
          ms,
          undefined,
          { start: this.ringGapStart, size: RING_GAP },
        ),
      );
    }
  }

  protected override onAttack(attackId: string, damage: number): void {
    if (attackId === 'rootThrust') {
      this.addSpike(this.center.x, this.center.y, damage);
    } else if (attackId === 'forestCall') {
      const positions = this.pendingTrees;
      this.pendingTrees = [];
      this.monsterCtx.onSummonTrees?.(positions);
    } else if (attackId === 'rootRing') {
      const step = FULL_TURN / RING_SPIKE_COUNT;
      for (let i = 0; i < RING_SPIKE_COUNT; i++) {
        const angle = i * step;
        // Distance of the angle from the gap start (0..2pi). Inside the gap there is no spike.
        const rel = (((angle - this.ringGapStart) % FULL_TURN) + FULL_TURN) % FULL_TURN;
        if (rel < RING_GAP) continue;
        this.addSpike(
          this.center.x + Math.cos(angle) * RING_RADIUS,
          this.center.y + Math.sin(angle) * RING_RADIUS,
          damage,
        );
      }
    }
  }

  private addSpike(x: number, y: number, damage: number): void {
    this.spikes?.push(new RootSpike(this.scene, x, y, damage));
  }

  /** Keeps a telegraph so despawn() can cancel it; finished ones are dropped. */
  private track(t: Telegraph): void {
    const list = this.telegraphs;
    if (!list) return;
    for (let i = list.length - 1; i >= 0; i--) if (!list[i].scene) list.splice(i, 1);
    list.push(t);
  }

  private pickTreePositions(): { x: number; y: number }[] {
    const count =
      CALL_MIN_TREES + Math.floor(this.random() * (CALL_MAX_TREES - CALL_MIN_TREES + 1));
    const base = this.random() * FULL_TURN;
    const out: { x: number; y: number }[] = [];
    for (let i = 0; i < count; i++) {
      const angle = base + (i / count) * FULL_TURN;
      out.push({
        x: this.x + Math.cos(angle) * CALL_DISTANCE,
        y: this.y + Math.sin(angle) * CALL_DISTANCE,
      });
    }
    return out;
  }
}

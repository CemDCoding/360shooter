/**
 * Charge state machine (armadillo, boar, PE-127). Pure logic, no Phaser.
 * approach -> telegraph (at least 700 ms) -> dash (straight line to the point at the start of the
 * announcement) -> recover -> approach.
 */
import { MIN_TELEGRAPH_MS } from '../config/bosses';
import type { EnemyChargeDef } from '../contracts/enemy';
import type { Vec2 } from './zigzag';

export type ChargePhase = 'approach' | 'telegraph' | 'dash' | 'recover';

export interface ChargeStep {
  /** Displacement in pixels for this step. */
  dx: number;
  dy: number;
}

/** Announcement time actually used: never below MIN_TELEGRAPH_MS. */
export function effectiveTelegraphMs(def: Pick<EnemyChargeDef, 'telegraphMs'>): number {
  return Number.isFinite(def.telegraphMs)
    ? Math.max(MIN_TELEGRAPH_MS, def.telegraphMs)
    : MIN_TELEGRAPH_MS;
}

export class ChargeState {
  phase: ChargePhase = 'approach';
  private elapsedMs = 0;
  private target: Vec2 = { x: 0, y: 0 };
  private dir: Vec2 = { x: 0, y: 0 };

  constructor(
    private readonly def: EnemyChargeDef,
    /** Distance to the player below which the announcement starts. */
    private readonly triggerDistance: number,
  ) {}

  /** Point the dash runs along (fixed at the start of the announcement). */
  get dashTarget(): Vec2 {
    return { ...this.target };
  }

  /** Remaining announcement time in ms (0 outside of telegraph). */
  get telegraphLeftMs(): number {
    return this.phase === 'telegraph'
      ? Math.max(0, effectiveTelegraphMs(this.def) - this.elapsedMs)
      : 0;
  }

  /** Factor on incoming damage: dashDamageFactor while dashing, otherwise 1. */
  damageFactor(): number {
    return this.phase === 'dash' ? this.def.dashDamageFactor : 1;
  }

  /**
   * Advances by dtMs. `approachSpeed` is the slow walking speed (pixels per second) in phase approach.
   * Returns the displacement of this step. Large dtMs are split across phases.
   */
  update(dtMs: number, pos: Vec2, player: Vec2, approachSpeed: number): ChargeStep {
    let left = Number.isFinite(dtMs) && dtMs > 0 ? dtMs : 0;
    let x = pos.x;
    let y = pos.y;
    let guard = 0;
    while (guard++ < 16) {
      if (this.phase === 'approach') {
        const dx = player.x - x;
        const dy = player.y - y;
        const dist = Math.hypot(dx, dy);
        if (dist <= this.triggerDistance) {
          this.startTelegraph(dx, dy, dist, player);
          continue;
        }
        const gap = dist - this.triggerDistance;
        const reach = (Math.max(0, approachSpeed) * left) / 1000;
        const move = Math.min(gap, reach);
        x += (dx / dist) * move;
        y += (dy / dist) * move;
        if (reach <= gap) break;
        // Arrived at the trigger distance: the remaining time goes into the announcement.
        left -= (gap / approachSpeed) * 1000;
      }
      if (this.phase === 'telegraph') {
        const total = effectiveTelegraphMs(this.def);
        const used = Math.min(left, total - this.elapsedMs);
        this.elapsedMs += used;
        left -= used;
        if (this.elapsedMs >= total) this.enter('dash');
        else break;
        continue;
      }
      if (this.phase === 'dash') {
        const used = Math.max(0, Math.min(left, this.def.dashMs - this.elapsedMs));
        const move = (this.def.dashSpeed * used) / 1000;
        x += this.dir.x * move;
        y += this.dir.y * move;
        this.elapsedMs += used;
        left -= used;
        if (this.elapsedMs >= this.def.dashMs) this.enter('recover');
        else break;
        continue;
      }
      // recover
      const used = Math.max(0, Math.min(left, this.def.cooldownMs - this.elapsedMs));
      this.elapsedMs += used;
      left -= used;
      if (this.elapsedMs >= this.def.cooldownMs) this.enter('approach');
      else break;
    }
    return { dx: x - pos.x, dy: y - pos.y };
  }

  private startTelegraph(dx: number, dy: number, dist: number, player: Vec2): void {
    this.target = { x: player.x, y: player.y };
    this.dir = dist > 0 ? { x: dx / dist, y: dy / dist } : { x: 0, y: 0 };
    this.enter('telegraph');
  }

  private enter(phase: ChargePhase): void {
    this.phase = phase;
    this.elapsedMs = 0;
  }
}

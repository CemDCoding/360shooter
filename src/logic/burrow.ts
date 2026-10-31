/**
 * Burrow state machine (sand worm, PE-127). Pure logic, no Phaser.
 * surface -> under (invulnerable, the hill walks toward the player) -> emerge (announcement,
 * fixed point at least surfaceDistance from the player) -> surface.
 */
import { MIN_TELEGRAPH_MS } from '../config/bosses';
import type { EnemyBurrowDef } from '../contracts/enemy';
import type { Vec2 } from './zigzag';

export type BurrowPhase = 'surface' | 'under' | 'emerge';

/** Announcement time actually used: never below MIN_TELEGRAPH_MS. */
export function effectiveEmergeMs(def: Pick<EnemyBurrowDef, 'telegraphMs'>): number {
  return Number.isFinite(def.telegraphMs)
    ? Math.max(MIN_TELEGRAPH_MS, def.telegraphMs)
    : MIN_TELEGRAPH_MS;
}

/**
 * Moves `point` radially away from `player` until it is at least minDistance away.
 * A point exactly on the player is pushed along +x.
 */
export function keepAwayFrom(point: Vec2, player: Vec2, minDistance: number): Vec2 {
  const dx = point.x - player.x;
  const dy = point.y - player.y;
  const dist = Math.hypot(dx, dy);
  if (dist >= minDistance) return { x: point.x, y: point.y };
  if (dist === 0) return { x: player.x + minDistance, y: player.y };
  return { x: player.x + (dx / dist) * minDistance, y: player.y + (dy / dist) * minDistance };
}

export class BurrowState {
  phase: BurrowPhase = 'surface';
  /** Hill position under the sand, the surfacing point during emerge. */
  position: Vec2;
  private elapsedMs = 0;

  constructor(
    private readonly def: EnemyBurrowDef,
    start: Vec2,
  ) {
    this.position = { x: start.x, y: start.y };
  }

  /** Invulnerable while under the sand and while the announcement runs. */
  get invulnerable(): boolean {
    return this.phase !== 'surface';
  }

  /** Remaining announcement time in ms (0 outside of emerge). */
  get emergeLeftMs(): number {
    return this.phase === 'emerge' ? Math.max(0, effectiveEmergeMs(this.def) - this.elapsedMs) : 0;
  }

  /**
   * Advances by dtMs. `moveSpeed` is the hill speed (pixels per second) under the sand.
   * While surfaced the caller moves the enemy itself and passes its position via sync().
   */
  update(dtMs: number, player: Vec2, moveSpeed: number): void {
    let left = Number.isFinite(dtMs) && dtMs > 0 ? dtMs : 0;
    let guard = 0;
    while (guard++ < 16) {
      if (this.phase === 'surface') {
        const used = Math.max(0, Math.min(left, this.def.surfaceMs - this.elapsedMs));
        this.elapsedMs += used;
        left -= used;
        if (this.elapsedMs >= this.def.surfaceMs) this.enter('under');
        else break;
      } else if (this.phase === 'under') {
        const used = Math.max(0, Math.min(left, this.def.underMs - this.elapsedMs));
        this.walk(used, player, moveSpeed);
        this.elapsedMs += used;
        left -= used;
        if (this.elapsedMs >= this.def.underMs) {
          this.position = keepAwayFrom(this.position, player, this.def.surfaceDistance);
          this.enter('emerge');
        } else break;
      } else {
        const total = effectiveEmergeMs(this.def);
        const used = Math.max(0, Math.min(left, total - this.elapsedMs));
        this.elapsedMs += used;
        left -= used;
        if (this.elapsedMs >= total) {
          // The player may have moved during the announcement: never surface on top of her.
          this.position = keepAwayFrom(this.position, player, this.def.surfaceDistance);
          this.enter('surface');
        } else break;
      }
    }
  }

  /** Copies the position of the surfaced enemy so the dive starts where it stands. */
  sync(pos: Vec2): void {
    if (this.phase === 'surface') this.position = { x: pos.x, y: pos.y };
  }

  private walk(ms: number, player: Vec2, speed: number): void {
    const dx = player.x - this.position.x;
    const dy = player.y - this.position.y;
    const dist = Math.hypot(dx, dy);
    const stop = this.def.surfaceDistance;
    if (dist <= stop || dist === 0) return;
    const move = Math.min(dist - stop, (speed * ms) / 1000);
    this.position = {
      x: this.position.x + (dx / dist) * move,
      y: this.position.y + (dy / dist) * move,
    };
  }

  private enter(phase: BurrowPhase): void {
    this.phase = phase;
    this.elapsedMs = 0;
  }
}

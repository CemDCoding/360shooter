/**
 * Status effects on the player (PE-127). Pure logic, no Phaser.
 * Poison: damage over time, a new hit refreshes the duration and does not stack.
 * Slow: turn factor over a duration, several effects take the strongest, never multiplied.
 */
import type { ActivePlayerStatus } from '../contracts/events';

export interface PoisonEffect {
  dps: number;
  durationMs: number;
}
export interface SlowEffect {
  turnFactor: number;
  durationMs: number;
}

function sane(value: number): number {
  return Number.isFinite(value) && value > 0 ? value : 0;
}

export class PlayerStatusState {
  private poisonDps = 0;
  private poisonLeftMs = 0;
  private slowFactor = 1;
  private slowLeftMs = 0;

  /** Applies a hit. Poison: strongest dps wins, duration is refreshed to the longer value (no stacking). */
  apply(effects: { poison?: PoisonEffect; slow?: SlowEffect }): void {
    const p = effects.poison;
    if (p && sane(p.dps) > 0 && sane(p.durationMs) > 0) {
      if (this.poisonLeftMs > 0) {
        this.poisonDps = Math.max(this.poisonDps, p.dps);
        this.poisonLeftMs = Math.max(this.poisonLeftMs, p.durationMs);
      } else {
        this.poisonDps = p.dps;
        this.poisonLeftMs = p.durationMs;
      }
    }
    const s = effects.slow;
    if (s && sane(s.durationMs) > 0 && Number.isFinite(s.turnFactor)) {
      const factor = Math.min(1, Math.max(0, s.turnFactor));
      if (this.slowLeftMs > 0) {
        this.slowFactor = Math.min(this.slowFactor, factor);
        this.slowLeftMs = Math.max(this.slowLeftMs, s.durationMs);
      } else {
        this.slowFactor = factor;
        this.slowLeftMs = s.durationMs;
      }
    }
  }

  /** Advances by dtMs and returns the poison damage of this step (only for the time it was still active). */
  tick(dtMs: number): number {
    const dt = sane(dtMs);
    let damage = 0;
    if (this.poisonLeftMs > 0) {
      const used = Math.min(dt, this.poisonLeftMs);
      damage = (this.poisonDps * used) / 1000;
      this.poisonLeftMs -= used;
      if (this.poisonLeftMs <= 0) this.clearPoison();
    }
    if (this.slowLeftMs > 0) {
      this.slowLeftMs -= dt;
      if (this.slowLeftMs <= 0) this.clearSlow();
    }
    return damage;
  }

  /** Factor on the turn speed (1 = no slow). */
  turnFactor(): number {
    return this.slowLeftMs > 0 ? this.slowFactor : 1;
  }

  /** Active effects with remaining time, for the event `player-status`. */
  active(): ActivePlayerStatus[] {
    const list: ActivePlayerStatus[] = [];
    if (this.poisonLeftMs > 0) list.push({ kind: 'poison', remainingMs: this.poisonLeftMs });
    if (this.slowLeftMs > 0) list.push({ kind: 'slow', remainingMs: this.slowLeftMs });
    return list;
  }

  clear(): void {
    this.clearPoison();
    this.clearSlow();
  }

  private clearPoison(): void {
    this.poisonDps = 0;
    this.poisonLeftMs = 0;
  }
  private clearSlow(): void {
    this.slowFactor = 1;
    this.slowLeftMs = 0;
  }
}

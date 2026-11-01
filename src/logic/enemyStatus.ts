/**
 * Burn and slow on one enemy (M8, AP-138; used by AP-143 and AP-144). Pure logic, no Phaser.
 * The same effect refreshes its time (the longer remaining time wins), the stronger burn or slow
 * wins, nothing stacks. `dtMs` is pausable game time.
 */
import type { EnemyStatusState } from '../contracts';

function sane(value: number): number {
  return Number.isFinite(value) && value > 0 ? value : 0;
}

export function createEnemyStatus(): EnemyStatusState {
  return { burnMsLeft: 0, burnDps: 0, slowMsLeft: 0, slow: 0 };
}

/** Burn (hell body piece): refreshes the time, the higher dps wins. */
export function applyBurn(
  state: EnemyStatusState,
  burn: { durationMs: number; dps: number },
): EnemyStatusState {
  const durationMs = sane(burn.durationMs);
  const dps = sane(burn.dps);
  if (durationMs === 0 || dps === 0) return { ...state };
  const active = state.burnMsLeft > 0;
  return {
    ...state,
    burnMsLeft: active ? Math.max(state.burnMsLeft, durationMs) : durationMs,
    burnDps: active ? Math.max(state.burnDps, dps) : dps,
  };
}

/** Slow (pets): `slow` is a fraction (0.4 = 40 % slower), the stronger one wins, time refreshes. */
export function applySlow(
  state: EnemyStatusState,
  effect: { slow: number; durationMs: number },
): EnemyStatusState {
  const durationMs = sane(effect.durationMs);
  const slow = Math.min(1, sane(effect.slow));
  if (durationMs === 0 || slow === 0) return { ...state };
  const active = state.slowMsLeft > 0;
  return {
    ...state,
    slowMsLeft: active ? Math.max(state.slowMsLeft, durationMs) : durationMs,
    slow: active ? Math.max(state.slow, slow) : slow,
  };
}

export interface EnemyStatusTick {
  state: EnemyStatusState;
  /** Burn damage of this step (only for the time the burn was still active). */
  damage: number;
  /** Factor on the enemy speed after this step (1 = no slow). */
  speedFactor: number;
}

export function tickEnemyStatus(state: EnemyStatusState, dtMs: number): EnemyStatusTick {
  const dt = sane(dtMs);
  let { burnMsLeft, burnDps, slowMsLeft, slow } = state;
  let damage = 0;
  if (burnMsLeft > 0) {
    const used = Math.min(dt, burnMsLeft);
    damage = (burnDps * used) / 1000;
    burnMsLeft -= used;
    if (burnMsLeft <= 0) {
      burnMsLeft = 0;
      burnDps = 0;
    }
  }
  if (slowMsLeft > 0) {
    slowMsLeft -= dt;
    if (slowMsLeft <= 0) {
      slowMsLeft = 0;
      slow = 0;
    }
  }
  const next: EnemyStatusState = { burnMsLeft, burnDps, slowMsLeft, slow };
  return { state: next, damage, speedFactor: enemySpeedFactor(next) };
}

/** Current speed factor of the enemy (1 = no slow). */
export function enemySpeedFactor(state: EnemyStatusState): number {
  return state.slowMsLeft > 0 ? 1 - Math.min(1, Math.max(0, state.slow)) : 1;
}

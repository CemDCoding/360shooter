import { RAPID_FIRE_MAX_PER_SEC } from '../config';
import type { ActivePowers } from '../contracts';

/** Highest double-shot stage the logic knows (contract type is `number`). */
export const MAX_DOUBLE_SHOT_STAGE = 2;

export interface ShotSpec {
  /** Sideways offset of the shot origin in px */
  offsetPx: number;
  /** Angle relative to the aim direction in degrees */
  angleDeg: number;
}

export function emptyPowers(): ActivePowers {
  return { doubleShotStage: 0, shieldLeft: 0, rapidFireMsLeft: 0 };
}

export function clampStage(stage: number): 0 | 1 | 2 {
  if (!(stage >= 1)) return 0;
  return stage >= MAX_DOUBLE_SHOT_STAGE ? 2 : 1;
}

/** Shield absorbs damage first; an empty shield breaks (stage 0, shieldLeft 0). */
export function absorbDamage(
  state: ActivePowers,
  dmg: number,
): { state: ActivePowers; remainingDamage: number } {
  const damage = Math.max(0, dmg);
  if (!(state.shieldLeft > 0) || damage === 0)
    return { state: { ...state }, remainingDamage: damage };
  if (damage < state.shieldLeft) {
    return { state: { ...state, shieldLeft: state.shieldLeft - damage }, remainingDamage: 0 };
  }
  return {
    state: { ...state, shieldLeft: 0 },
    remainingDamage: damage - state.shieldLeft,
  };
}

/** dtMs is pausable game time (no wall clock). */
export function tickPowers(state: ActivePowers, dtMs: number): ActivePowers {
  if (!(dtMs > 0) || !(state.rapidFireMsLeft > 0)) return { ...state };
  return { ...state, rapidFireMsLeft: Math.max(0, state.rapidFireMsLeft - dtMs) };
}

export function isRapidFireActive(state: ActivePowers): boolean {
  return state.rapidFireMsLeft > 0;
}

export function shotPattern(stage: number): ShotSpec[] {
  switch (clampStage(stage)) {
    case 1:
      return [
        { offsetPx: -4, angleDeg: 0 },
        { offsetPx: 4, angleDeg: 0 },
      ];
    case 2:
      return [
        { offsetPx: 0, angleDeg: -8 },
        { offsetPx: 0, angleDeg: 0 },
        { offsetPx: 0, angleDeg: 8 },
      ];
    default:
      return [{ offsetPx: 0, angleDeg: 0 }];
  }
}

export function effectiveFireRate(baseRatePerSec: number, rapidFireActive: boolean): number {
  return rapidFireActive ? Math.max(baseRatePerSec, RAPID_FIRE_MAX_PER_SEC) : baseRatePerSec;
}

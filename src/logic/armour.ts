import type { ActiveArmour, ArmourDef, ArmourRules } from '../contracts/armour';
import { circlesOverlap } from './geometry';
import type { Rng } from './rng';

export function createArmourState(): ActiveArmour {
  return { id: null, activeMsLeft: 0, cooldownMsLeft: 0 };
}

/** Activates only without active armour and without cooldown (PE-57); else returns state unchanged. */
export function activateArmour(state: ActiveArmour, def: ArmourDef): ActiveArmour {
  if (state.id !== null || state.cooldownMsLeft > 0) return state;
  return { id: def.id, activeMsLeft: def.durationMs, cooldownMsLeft: 0 };
}

/**
 * Advances time by dtMs of pausable game time. The cooldown starts when the
 * active time ends (def supplies cooldownMs; leftover dt counts towards it).
 */
export function tickArmour(state: ActiveArmour, dtMs: number, def: ArmourDef): ActiveArmour {
  if (dtMs <= 0) return state;
  if (state.id !== null) {
    const left = state.activeMsLeft - dtMs;
    if (left > 0) return { ...state, activeMsLeft: left };
    return { id: null, activeMsLeft: 0, cooldownMsLeft: Math.max(0, def.cooldownMs + left) };
  }
  if (state.cooldownMsLeft > 0) {
    return { ...state, cooldownMsLeft: Math.max(0, state.cooldownMsLeft - dtMs) };
  }
  return state;
}

export function ringDamageFor(def: ArmourDef, dtMs: number): number {
  return (def.damagePerSec * dtMs) / 1000;
}

/** True if a circle (enemy) at (tx, ty) with radius tr touches the ring around (cx, cy). */
export function isInRing(
  def: ArmourDef,
  cx: number,
  cy: number,
  tx: number,
  ty: number,
  tr: number,
): boolean {
  return circlesOverlap(cx, cy, def.radiusPx, tx, ty, tr);
}

export function rollArmourDrop(rng: Rng, rules: ArmourRules): boolean {
  return rng.next() < rules.dropChance;
}

export function resetArmour(): ActiveArmour {
  return createArmourState();
}

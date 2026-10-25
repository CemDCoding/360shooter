import type { ActivePowers, ItemDef, ItemRules } from '../contracts';
import { MAX_DOUBLE_SHOT_STAGE } from './powers';
import type { Rng } from './rng';

/** Weighted drop: first checks dropChance, then picks a def by dropWeight. */
export function rollDrop(rng: Rng, rules: ItemRules, defs: readonly ItemDef[]): ItemDef | null {
  if (rng.next() >= rules.dropChance) return null;
  const total = defs.reduce((sum, d) => sum + Math.max(0, d.dropWeight), 0);
  if (total <= 0) return null;
  let roll = rng.next() * total;
  for (const d of defs) {
    roll -= Math.max(0, d.dropWeight);
    if (roll < 0) return d;
  }
  return defs[defs.length - 1] ?? null;
}

/** Returns the new power state; heal leave it unchanged. */
export function applyPowerItem(state: ActivePowers, def: ItemDef): ActivePowers {
  switch (def.effect) {
    case 'doubleShot':
      return {
        ...state,
        doubleShotStage: Math.min(def.maxStacks, MAX_DOUBLE_SHOT_STAGE, Math.max(0, state.doubleShotStage) + 1),
      };
    case 'shield':
      // No stage field in ActivePowers: stage = ceil(shieldLeft / perStack), capped via maxStacks.
      return {
        ...state,
        shieldLeft: Math.min(def.maxStacks * def.perStack, state.shieldLeft + def.perStack),
      };
    case 'rapidFire':
      return { ...state, rapidFireMsLeft: def.durationMs ?? 0 };
    default:
      return { ...state };
  }
}

export function isExpired(spawnedAtMs: number, nowMs: number, lifetimeMs: number): boolean {
  return nowMs - spawnedAtMs >= lifetimeMs;
}

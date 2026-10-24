import type { ActivePowers, ItemDef, WeaponStacks, WeaponStats } from '../contracts';
import { clampStage, effectiveFireRate, isRapidFireActive, shotPattern } from './powers';

/** Upgrade factors, passed in by the caller (see upgradeFactors in AP-29). */
export interface WeaponFactors {
  weaponFireRateMult: number;
  weaponDamageMult: number;
}

export function emptyStacks(): WeaponStacks {
  return { fireRate: 0, damage: 0, size: 0 };
}

export function computeWeaponStats(
  base: WeaponStats,
  factors: WeaponFactors,
  state: ActivePowers,
): WeaponStats;
/** @deprecated legacy stack-based variant, removed in AP-36 */
export function computeWeaponStats(
  base: WeaponStats,
  stacks: WeaponStacks,
  itemDefs: readonly ItemDef[],
): WeaponStats;
export function computeWeaponStats(
  base: WeaponStats,
  second: WeaponFactors | WeaponStacks,
  third: ActivePowers | readonly ItemDef[],
): WeaponStats {
  if (Array.isArray(third)) return legacyStats(base, second as WeaponStacks, third);
  const factors = second as WeaponFactors;
  const state = third as ActivePowers;
  return {
    ...base,
    fireRatePerSec: effectiveFireRate(
      base.fireRatePerSec * factors.weaponFireRateMult,
      isRapidFireActive(state),
    ),
    damage: base.damage * factors.weaponDamageMult,
    shotCount: shotPattern(clampStage(state.doubleShotStage)).length,
  };
}

/** Each stack adds `perStack` (relative) to the base value; heal items have no weapon effect. */
function legacyStats(
  base: WeaponStats,
  stacks: WeaponStacks,
  itemDefs: readonly ItemDef[],
): WeaponStats {
  const bonus = (effect: keyof WeaponStacks): number => {
    const def = itemDefs.find((d) => d.effect === effect);
    return def ? 1 + def.perStack * stacks[effect] : 1;
  };
  return {
    ...base,
    fireRatePerSec: base.fireRatePerSec * bonus('fireRate'),
    damage: base.damage * bonus('damage'),
    projectileScale: base.projectileScale * bonus('size'),
  };
}

/** Frame-rate independent fire accumulator. */
export class FireTimer {
  private charge = 0;

  /** Returns the number of shots due in this step. */
  tick(dtMs: number, fireRatePerSec: number): number {
    if (!(dtMs > 0) || !(fireRatePerSec > 0)) return 0;
    this.charge += (dtMs / 1000) * fireRatePerSec;
    const shots = Math.floor(this.charge + 1e-9);
    this.charge = Math.max(0, this.charge - shots);
    return shots;
  }

  reset(): void {
    this.charge = 0;
  }
}

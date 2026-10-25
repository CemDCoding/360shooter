import type { ActivePowers, WeaponStats } from '../contracts';
import { clampStage, effectiveFireRate, isRapidFireActive, shotPattern } from './powers';

/** Upgrade factors, passed in by the caller (see upgradeFactors in AP-29). */
export interface WeaponFactors {
  weaponFireRateMult: number;
  weaponDamageMult: number;
}

export function computeWeaponStats(
  base: WeaponStats,
  factors: WeaponFactors,
  state: ActivePowers,
): WeaponStats {
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

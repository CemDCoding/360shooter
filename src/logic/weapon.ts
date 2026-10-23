import type { ItemDef, WeaponStacks, WeaponStats } from '../contracts';

export function emptyStacks(): WeaponStacks {
  return { fireRate: 0, damage: 0, size: 0 };
}

/** Each stack adds `perStack` (relative) to the base value; heal items have no weapon effect. */
export function computeWeaponStats(
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

import type { ArmourDef, ArmourRules } from '../contracts/armour';

export const ARMOURS: readonly ArmourDef[] = [
  {
    id: 'fire-ring',
    label: 'Feuerring',
    durationMs: 5000,
    cooldownMs: 20000,
    radiusPx: 72,
    damagePerSec: 20,
  },
];

/** dropChance 0.02 is an assumed guideline (Q-23, not confirmed). */
export const ARMOUR_RULES: ArmourRules = {
  dropChance: 0.02,
};

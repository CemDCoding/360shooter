/** Armour definition (data only). */
export interface ArmourDef {
  id: string;
  /** German display label. */
  label: string;
  durationMs: number;
  cooldownMs: number;
  radiusPx: number;
  damagePerSec: number;
}

export interface ArmourRules {
  /** Drop chance per kill, 0..1. */
  dropChance: number;
}

/** Runtime armour state; id is null while no armour is active. */
export interface ActiveArmour {
  id: string | null;
  activeMsLeft: number;
  cooldownMsLeft: number;
}

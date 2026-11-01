/** Bought player gear (M8, PE-169). Named `gear` so it does not clash with the fire-ring `armour` (F-17). */
export type GearSet = 'diamond' | 'hell' | 'heaven';

/** Slot of a gear piece; `legs` is trousers and shoes as one piece. */
export type GearSlot = 'head' | 'body' | 'legs';

/** Equipped piece id per slot; null: nothing equipped. */
export type EquippedGear = Record<GearSlot, string | null>;

/** Plain stat changes of a piece; every field is optional. Multipliers are factors (1.1 = +10 %). */
export interface GearStats {
  maxHpAdd?: number;
  damageMul?: number;
  fireRateMul?: number;
  turnSpeedMul?: number;
  damageTakenMul?: number;
}

/** Special effect of a single piece (tagged union over `kind`). */
export type GearEffectDef =
  | { kind: 'blockChance'; chance: number }
  | { kind: 'thorns'; damage: number }
  | { kind: 'knockback'; px: number }
  | { kind: 'crit'; chance: number; mul: number }
  | { kind: 'burn'; durationMs: number; dps: number }
  | { kind: 'deathBlast'; radiusPx: number; damage: number }
  | { kind: 'healBoost'; mul: number }
  | { kind: 'pierce'; extraTargets: number }
  | { kind: 'magnet'; magnetMul: number; itemLifetimeMul: number };

export interface GearPieceDef {
  id: string;
  set: GearSet;
  slot: GearSlot;
  /** German display label in capitals. */
  label: string;
  stats: GearStats;
  effect: GearEffectDef;
}

/** Set effect for wearing all three pieces of a set. */
export interface GearSetBonusDef {
  set: GearSet;
  kind: 'timedBlock' | 'autoRing' | 'regen';
  /** timedBlock: time between blocks; autoRing: time between ignitions; regen: time between ticks. */
  intervalMs: number;
  /** autoRing only: how long the ring burns. */
  durationMs?: number;
  /** regen only: HP per tick. */
  hpPerTick?: number;
}

/** Sum of all equipped values and the active effects (result of AP-138). */
export interface GearModifiers {
  maxHpAdd: number;
  damageMul: number;
  fireRateMul: number;
  turnSpeedMul: number;
  damageTakenMul: number;
  effects: GearEffectDef[];
  setBonuses: GearSetBonusDef[];
}

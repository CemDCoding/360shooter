// Kauf-Ruestung (M8, AP-136, PE-169): alle Werte sind Startwerte fuer den Handtest, nur hier aendern.
// Labels: Namen der Teile aus Brief H-35 (PE-183), Grossbuchstaben (Pixelschrift, PE-64).
import type { ArmourDef, GearPieceDef, GearSet, GearSetBonusDef, GearSlot } from '../contracts';
import { ARMOURS } from './armour';

export const GEAR_SETS: readonly GearSet[] = ['diamond', 'hell', 'heaven'];
export const GEAR_SLOTS: readonly GearSlot[] = ['head', 'body', 'legs'];

/** Set names for hints like "SET HOELLE 2/3". */
export const GEAR_SET_LABELS: Readonly<Record<GearSet, string>> = {
  diamond: 'DIAMANT',
  hell: 'HÖLLE',
  heaven: 'HIMMEL',
};

/** Set names on the pet gear labels ("BIENE · KRISTALL"). */
export const PET_GEAR_SET_LABELS: Readonly<Record<GearSet, string>> = {
  diamond: 'KRISTALL',
  hell: 'GLUT',
  heaven: 'HIMMEL',
};

/** Burn from the hell body piece: 3 s, 5 damage per second. */
const BURN = { durationMs: 3000, dps: 5 };
/** Small explosion of defeated enemies (assumed). */
const DEATH_BLAST = { radiusPx: 40, damage: 15 };
/** Knockback on contact in px (assumed). */
const KNOCKBACK_PX = 24;
const THORNS_DAMAGE = 10;

/** Texture key of a piece (naming rule for AP-140). */
export function gearTextureKey(set: GearSet, slot: GearSlot): string {
  return `gear-${set}-${slot}`;
}

function piece(
  set: GearSet,
  slot: GearSlot,
  label: string,
  stats: GearPieceDef['stats'],
  effect: GearPieceDef['effect'],
): GearPieceDef {
  return { id: gearTextureKey(set, slot), set, slot, label, stats, effect };
}

export const GEAR_PIECES: readonly GearPieceDef[] = [
  // Diamant: Verteidigung
  piece('diamond', 'head', 'KRISTALLHELM', { maxHpAdd: 10 }, { kind: 'blockChance', chance: 0.1 }),
  piece(
    'diamond',
    'body',
    'KRISTALLPANZER',
    { damageTakenMul: 0.9 },
    { kind: 'thorns', damage: THORNS_DAMAGE },
  ),
  piece(
    'diamond',
    'legs',
    'KRISTALLSTIEFEL',
    { maxHpAdd: 10 },
    { kind: 'knockback', px: KNOCKBACK_PX },
  ),
  // Hoelle: Angriff
  piece('hell', 'head', 'TEUFELSHÖRNER', { damageMul: 1.1 }, { kind: 'crit', chance: 0.1, mul: 2 }),
  piece('hell', 'body', 'GLUTPANZER', { damageMul: 1.1 }, { kind: 'burn', ...BURN }),
  piece('hell', 'legs', 'LAVASTIEFEL', { damageMul: 1.05 }, { kind: 'deathBlast', ...DEATH_BLAST }),
  // Himmel: Tempo
  piece('heaven', 'head', 'HEILIGENSCHEIN', { turnSpeedMul: 1.1 }, { kind: 'healBoost', mul: 2 }),
  piece('heaven', 'body', 'ENGELSWESTE', { fireRateMul: 1.1 }, { kind: 'pierce', extraTargets: 1 }),
  piece(
    'heaven',
    'legs',
    'WOLKENSTIEFEL',
    { turnSpeedMul: 1.1 },
    { kind: 'magnet', magnetMul: 1.5, itemLifetimeMul: 1.5 },
  ),
];

/** Fire ring of the hell set: the `fire-ring` definition with a duration of 3 s (PE-169). */
const BASE_RING = ARMOURS.find((a) => a.id === 'fire-ring');
if (!BASE_RING) throw new Error('fire-ring armour missing');
export const HELL_SET_RING: ArmourDef = { ...BASE_RING, durationMs: 3000 };

export const GEAR_SET_BONUSES: readonly GearSetBonusDef[] = [
  { set: 'diamond', kind: 'timedBlock', intervalMs: 30000 },
  {
    set: 'hell',
    kind: 'autoRing',
    intervalMs: 20000,
    durationMs: HELL_SET_RING.durationMs,
  },
  { set: 'heaven', kind: 'regen', intervalMs: 2000, hpPerTick: 1 },
];

export function getGearPiece(id: string): GearPieceDef | undefined {
  return GEAR_PIECES.find((p) => p.id === id);
}

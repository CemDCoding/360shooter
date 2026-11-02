import type { EquippedGear } from '../contracts/gear';
import type { PetId } from '../contracts/pet';
import type { SaveGame } from '../contracts/save';
import { MAX_UPGRADE_LEVEL, type UpgradeLevels, type UpgradeTrack } from '../contracts/upgrade';
import { MAX_ASSIST_LOSSES } from '../config/assist';
import { LEVEL_COUNT } from '../config/levels';
import { GEAR_SLOTS, getGearPiece } from '../config/gear';
import { PET_IDS } from '../config/pets';
import { eggItemId, getShopItem } from '../config/shop';
import { MAX_DIAMONDS, migrateDiamonds } from '../logic/diamonds';
import { isFinisherVariantId, markSeen } from '../logic/finisher';

export const SAVE_KEY = '360shooter.save.v1';

export const MAX_XP = 1_000_000_000;
export const MAX_LEVEL = 1000;
export const MAX_GOLD = 1_000_000_000;

const UPGRADE_TRACKS: readonly UpgradeTrack[] = [
  'weaponFireRate',
  'weaponDamage',
  'playerMaxHp',
  'playerTurnSpeed',
];

function zeroUpgrades(): UpgradeLevels {
  return { weaponFireRate: 0, weaponDamage: 0, playerMaxHp: 0, playerTurnSpeed: 0 };
}

export interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

export function defaultSave(): SaveGame {
  return {
    version: 3,
    playerXp: 0,
    playerLevel: 1,
    highestUnlockedLevel: 0,
    muted: false,
    gold: 0,
    upgrades: zeroUpgrades(),
    diamonds: 0,
    wonLevels: [],
    owned: [],
    equippedGear: { head: null, body: null, legs: null },
    activePet: null,
    petGear: {},
    easyParry: false,
    seenFinishers: [],
    reduceEffects: false,
  };
}

function defaultStorage(): StorageLike | null {
  try {
    return typeof localStorage === 'undefined' ? null : localStorage;
  } catch {
    return null;
  }
}

function isIntInRange(v: unknown, min: number, max: number): v is number {
  return typeof v === 'number' && Number.isInteger(v) && v >= min && v <= max;
}

function parseSeenFinishers(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  const out: string[] = [];
  for (const v of raw) if (isFinisherVariantId(v) && !out.includes(v)) out.push(v);
  return out;
}

function parseAssistLosses(raw: unknown): Record<string, number> {
  const out: Record<string, number> = {};
  if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) return out;
  for (const [k, v] of Object.entries(raw)) {
    if (!/^\d{1,2}$/.test(k) || !isIntInRange(Number(k), 0, LEVEL_COUNT - 1)) continue;
    if (isIntInRange(v, 1, MAX_ASSIST_LOSSES)) out[String(Number(k))] = v;
  }
  return out;
}

/** Validates unknown data; returns a clean SaveGame (only known fields) or null. */
export function parseSave(data: unknown): SaveGame | null {
  if (typeof data !== 'object' || data === null || Array.isArray(data)) return null;
  const d = data as Record<string, unknown>;
  if (d.version !== 1 && d.version !== 2 && d.version !== 3) return null;
  if (!isIntInRange(d.playerXp, 0, MAX_XP)) return null;
  if (!isIntInRange(d.playerLevel, 1, MAX_LEVEL)) return null;
  if (!isIntInRange(d.highestUnlockedLevel, 0, LEVEL_COUNT - 1)) return null;
  if (typeof d.muted !== 'boolean') return null;
  // v1 has no gold/upgrades; broken values reset only themselves (PE-44).
  const gold = isIntInRange(d.gold, 0, MAX_GOLD) ? d.gold : 0;
  const upgrades = zeroUpgrades();
  const rawUp =
    typeof d.upgrades === 'object' && d.upgrades !== null && !Array.isArray(d.upgrades)
      ? (d.upgrades as Record<string, unknown>)
      : {};
  for (const t of UPGRADE_TRACKS) {
    const v = rawUp[t];
    upgrades[t] = isIntInRange(v, 0, MAX_UPGRADE_LEVEL) ? v : 0;
  }
  const base: SaveGame = {
    version: 3,
    gold,
    upgrades,
    playerXp: d.playerXp,
    playerLevel: d.playerLevel,
    highestUnlockedLevel: d.highestUnlockedLevel,
    muted: d.muted,
    // Only a real boolean counts, anything else (or a missing field) is off (AP-152).
    easyParry: d.easyParry === true,
    // Strict (AP-161, R6): only valid, unique variant ids; only a real boolean counts.
    seenFinishers: parseSeenFinishers(d.seenFinishers),
    reduceEffects: d.reduceEffects === true,
  };
  // Strict (AP-172, R6): only level ids 0..LEVEL_COUNT-1 with whole numbers 1..MAX_ASSIST_LOSSES; empty = no field.
  const assistLosses = parseAssistLosses(d.assistLosses);
  if (Object.keys(assistLosses).length > 0) base.assistLosses = assistLosses;
  // Below version 3 the diamonds are granted retroactively, once (PE-166).
  if (d.version !== 3)
    return migrateDiamonds({ ...parseShopFields({}, base), wonLevels: undefined });
  return parseShopFields(d, base);
}

/** Strict, field by field: a broken field resets only itself (PE-44, R6). */
function parseShopFields(d: Record<string, unknown>, base: SaveGame): SaveGame {
  const wonLevels = Array.isArray(d.wonLevels)
    ? [
        ...new Set(d.wonLevels.filter((v): v is number => isIntInRange(v, 0, LEVEL_COUNT - 1))),
      ].sort((a, b) => a - b)
    : undefined;
  const owned = Array.isArray(d.owned)
    ? [...new Set(d.owned.filter((v): v is string => typeof v === 'string' && !!getShopItem(v)))]
    : [];
  const has = (id: unknown): id is string => typeof id === 'string' && owned.includes(id);

  const equippedGear: EquippedGear = { head: null, body: null, legs: null };
  const rawGear =
    typeof d.equippedGear === 'object' && d.equippedGear !== null && !Array.isArray(d.equippedGear)
      ? (d.equippedGear as Record<string, unknown>)
      : {};
  for (const slot of GEAR_SLOTS) {
    const id = rawGear[slot];
    if (has(id) && getGearPiece(id)?.slot === slot) equippedGear[slot] = id;
  }

  const rawPet = d.activePet;
  const activePet =
    typeof rawPet === 'string' &&
    (PET_IDS as readonly string[]).includes(rawPet) &&
    has(eggItemId(rawPet as PetId))
      ? (rawPet as PetId)
      : null;

  const petGear: Partial<Record<PetId, string | null>> = {};
  const rawPetGear =
    typeof d.petGear === 'object' && d.petGear !== null && !Array.isArray(d.petGear)
      ? (d.petGear as Record<string, unknown>)
      : {};
  for (const pet of PET_IDS) {
    const id = rawPetGear[pet];
    if (has(id)) {
      const item = getShopItem(id);
      if (item?.category === 'petGear' && item.petId === pet) petGear[pet] = id;
    }
  }

  return {
    ...base,
    diamonds: isIntInRange(d.diamonds, 0, MAX_DIAMONDS) ? d.diamonds : 0,
    ...(wonLevels ? { wonLevels } : { wonLevels: [] }),
    owned,
    equippedGear,
    activePet,
    petGear,
  };
}

export function loadSave(storage: StorageLike | null = defaultStorage()): SaveGame {
  try {
    const raw = storage?.getItem(SAVE_KEY);
    if (!raw) return defaultSave();
    return parseSave(JSON.parse(raw)) ?? defaultSave();
  } catch {
    return defaultSave();
  }
}

/** Returns true if the save was written; false if invalid or storage failed. */
export function writeSave(save: SaveGame, storage: StorageLike | null = defaultStorage()): boolean {
  const clean = parseSave(save);
  if (!clean || !storage) return false;
  try {
    storage.setItem(SAVE_KEY, JSON.stringify(clean));
    return true;
  } catch {
    return false;
  }
}

export function resetSave(storage: StorageLike | null = defaultStorage()): void {
  try {
    storage?.removeItem(SAVE_KEY);
  } catch {
    // ignore
  }
}

/** Marks a finisher variant as seen (AP-161); an invalid id changes nothing. Returns true if written. */
export function markFinisherSeen(
  variantId: string,
  storage: StorageLike | null = defaultStorage(),
): boolean {
  const save = loadSave(storage);
  return writeSave(
    { ...save, seenFinishers: markSeen(save.seenFinishers ?? [], variantId) },
    storage,
  );
}

/** Stores the switch "reduce effects" (AP-161, used by AP-162). Returns true if written. */
export function setReduceEffects(
  on: boolean,
  storage: StorageLike | null = defaultStorage(),
): boolean {
  const save = loadSave(storage);
  return writeSave({ ...save, reduceEffects: on === true }, storage);
}

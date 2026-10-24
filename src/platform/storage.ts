import type { SaveGame } from '../contracts/save';
import { MAX_UPGRADE_LEVEL, type UpgradeLevels, type UpgradeTrack } from '../contracts/upgrade';
import { LEVEL_COUNT } from '../config/levels';

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
    version: 2,
    playerXp: 0,
    playerLevel: 1,
    highestUnlockedLevel: 0,
    muted: false,
    gold: 0,
    upgrades: zeroUpgrades(),
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

/** Validates unknown data; returns a clean SaveGame (only known fields) or null. */
export function parseSave(data: unknown): SaveGame | null {
  if (typeof data !== 'object' || data === null || Array.isArray(data)) return null;
  const d = data as Record<string, unknown>;
  if (d.version !== 1 && d.version !== 2) return null;
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
  return {
    version: 2,
    gold,
    upgrades,
    playerXp: d.playerXp,
    playerLevel: d.playerLevel,
    highestUnlockedLevel: d.highestUnlockedLevel,
    muted: d.muted,
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

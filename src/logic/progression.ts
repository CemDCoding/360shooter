import type { ProgressionRules, SaveGame } from '../contracts';
import { LEVEL_COUNT } from '../config';

export type RoundResult = 'won' | 'lost';

/** Wertebereiche wie in platform/storage. */
const MAX_XP = 1e9;
const MAX_PLAYER_LEVEL = 1000;

/** Gesamt-XP, die fuer Spielerlevel n noetig sind (Level 1 = 0 XP). */
export function xpForLevel(n: number, rules: ProgressionRules): number {
  if (!Number.isFinite(n) || n <= 1) return 0;
  return Math.round(rules.xpCurveBase * Math.pow(n - 1, rules.xpCurveExponent));
}

export function levelForXp(xp: number, rules: ProgressionRules): number {
  let level = 1;
  while (level < MAX_PLAYER_LEVEL && xpForLevel(level + 1, rules) <= xp) level += 1;
  return level;
}

/** XP einer Runde: bei Niederlage anteilig (PE-17). */
export function roundXp(killXp: number, result: RoundResult, rules: ProgressionRules): number {
  const base = Number.isFinite(killXp) ? Math.max(0, killXp) : 0;
  return Math.floor(result === 'lost' ? base * rules.lossXpFactor : base);
}

export function applyRoundResult(
  save: SaveGame,
  levelId: number,
  result: RoundResult,
  xp: number,
  rules: ProgressionRules,
): SaveGame {
  const gained = Number.isFinite(xp) ? Math.max(0, xp) : 0;
  const playerXp = Math.min(MAX_XP, save.playerXp + gained);
  let highestUnlockedLevel = save.highestUnlockedLevel;
  if (result === 'won') {
    highestUnlockedLevel = Math.max(highestUnlockedLevel, Math.min(LEVEL_COUNT - 1, levelId + 1));
  }
  return {
    ...save,
    playerXp,
    playerLevel: Math.max(save.playerLevel, levelForXp(playerXp, rules)),
    highestUnlockedLevel,
  };
}

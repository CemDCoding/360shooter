// Diamanten (M8, AP-137, PE-166, PE-177): erster Sieg je Level, rueckwirkende Umwandlung. Reine Funktionen.
import type { SaveGame } from '../contracts';
import { LEVEL_COUNT } from '../config/levels';
import { diamondsForLevel } from '../config/shop';
import type { RoundResult } from './progression';

/** Obergrenze fuer Diamanten (gleicher Wert wie in der Speicherung). */
export const MAX_DIAMONDS = 1000;

export interface FirstWinResult {
  save: SaveGame;
  diamondsGained: number;
}

/** Erster Sieg eines Levels: traegt es in `wonLevels` ein und schreibt die Diamanten gut. */
export function applyFirstWin(
  save: SaveGame,
  levelId: number,
  result: RoundResult,
): FirstWinResult {
  const won = save.wonLevels ?? [];
  if (
    result !== 'won' ||
    !Number.isInteger(levelId) ||
    levelId < 0 ||
    levelId >= LEVEL_COUNT ||
    won.includes(levelId)
  ) {
    return { save, diamondsGained: 0 };
  }
  const current = Math.min(MAX_DIAMONDS, Math.max(0, save.diamonds ?? 0));
  const diamonds = Math.min(MAX_DIAMONDS, current + diamondsForLevel(levelId));
  return {
    save: { ...save, wonLevels: [...won, levelId], diamonds },
    diamondsGained: diamonds - current,
  };
}

/**
 * Einmalige Umwandlung alter Staende (ohne `wonLevels`): alle Level unter `highestUnlockedLevel`
 * gelten als gewonnen, das letzte Level nicht. Staende mit `wonLevels` bleiben unveraendert.
 */
export function migrateDiamonds(save: SaveGame): SaveGame {
  if (save.wonLevels !== undefined) return save;
  const upTo = Math.min(save.highestUnlockedLevel, LEVEL_COUNT - 1);
  const wonLevels: number[] = [];
  let diamonds = 0;
  for (let id = 0; id < upTo; id += 1) {
    wonLevels.push(id);
    diamonds += diamondsForLevel(id);
  }
  return { ...save, wonLevels, diamonds: Math.min(MAX_DIAMONDS, diamonds) };
}

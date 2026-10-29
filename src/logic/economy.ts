// Wirtschaft (AP-29): Goldauszahlung am Rundenende. Reine Funktionen.
import type { ProgressionRules, SaveGame } from '../contracts';
import { GOLD_KEEP_ON_LOSS, GOLD_KEEP_ON_WIN } from '../config/coins';
import { applyRoundResult, roundXp, type RoundResult } from './progression';

/** Obergrenze fuer Gold (gleicher Wert wie in der Speicherung). */
export const MAX_GOLD = 1_000_000_000;

/** Gold, das aus einer Runde gutgeschrieben wird: Sieg alles, Niederlage abgerundet die Haelfte. */
export function goldPayout(collected: number, result: RoundResult): number {
  const base = Number.isFinite(collected) ? Math.max(0, Math.floor(collected)) : 0;
  return Math.floor(base * (result === 'won' ? GOLD_KEEP_ON_WIN : GOLD_KEEP_ON_LOSS));
}

/** Neuer Spielstand mit gutgeschriebenem Gold, gedeckelt bei MAX_GOLD. */
export function applyRoundGold(save: SaveGame, collected: number, result: RoundResult): SaveGame {
  const current = Math.min(MAX_GOLD, Math.max(0, save.gold ?? 0));
  return { ...save, gold: Math.min(MAX_GOLD, current + goldPayout(collected, result)) };
}

/** Ergebnis der Rundenabrechnung (AP-88): was gespeichert wird und was die Ergebnisszene zeigt. */
export interface RoundSettlement {
  /** Neuer Spielstand; nur zu schreiben, wenn `shouldWrite`. */
  next: SaveGame;
  /** Spielstand, den die Ergebnisszene zeigt (Debug-Runde: der unveraenderte alte). */
  shown: SaveGame;
  xpGained: number;
  goldGained: number;
  /** Genau ein Schreibvorgang je normaler Runde; Debug-Runde schreibt nie (PE-40, PE-49). */
  shouldWrite: boolean;
  debugRound: boolean;
}

/** Rechnet eine Runde ab: XP, Freischaltung und Gold. Rein, kein Speicherzugriff. */
export function settleRound(
  save: SaveGame,
  levelId: number,
  result: RoundResult,
  killXp: number,
  roundCoins: number,
  debug: boolean,
  rules: ProgressionRules,
): RoundSettlement {
  const xp = roundXp(killXp, result, rules);
  const withResult = applyRoundResult(save, levelId, result, xp, rules);
  const next = applyRoundGold(withResult, roundCoins, result);
  return {
    next,
    shown: debug ? save : next,
    xpGained: debug ? 0 : xp,
    goldGained: debug ? 0 : goldPayout(roundCoins, result),
    shouldWrite: !debug,
    debugRound: debug,
  };
}

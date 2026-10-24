// Wirtschaft (AP-29): Goldauszahlung am Rundenende. Reine Funktionen.
import type { SaveGame } from '../contracts';
import { GOLD_KEEP_ON_LOSS, GOLD_KEEP_ON_WIN } from '../config/coins';
import type { RoundResult } from './progression';

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

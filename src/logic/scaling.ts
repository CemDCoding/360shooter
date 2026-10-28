// Skalierung je Level (AP-90): reine Funktion, Werte stehen in config/scaling.ts.
import { LEVEL_SCALING } from '../config/scaling';

export interface EnemyScale {
  /** Faktor auf die Lebenspunkte */
  hp: number;
  /** Faktor auf die Erfahrung je Kill */
  xp: number;
  /** Faktor auf die Drop-Wahrscheinlichkeit der Muenzen */
  coin: number;
  /** Faktor auf den Kontaktschaden */
  contact: number;
}

export const DEFAULT_ENEMY_SCALE: Readonly<EnemyScale> = { hp: 1, xp: 1, coin: 1, contact: 1 };

function factor(v: number | undefined): number {
  return typeof v === 'number' && Number.isFinite(v) && v > 0 ? v : 1;
}

/** Faktoren fuer ein Level. Unbekannte Level oder ungueltige Werte liefern den Standard (1). */
export function enemyScaleFor(levelId: number): EnemyScale {
  const s = Number.isInteger(levelId) ? LEVEL_SCALING[levelId] : undefined;
  if (!s) return { ...DEFAULT_ENEMY_SCALE };
  return { hp: factor(s.hp), xp: factor(s.xp), coin: factor(s.coin), contact: factor(s.contact) };
}

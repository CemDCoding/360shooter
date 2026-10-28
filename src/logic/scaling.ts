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

/** Remembers the scale of each live enemy. Every spawn writes the entry, so pooled enemies never keep an old one. */
export class ScaleRegistry<T extends object> {
  private scales = new WeakMap<T, EnemyScale>();

  /** Record the scale for a (re)spawned enemy. Without a scale the default applies. */
  assign(enemy: T, scale: EnemyScale = DEFAULT_ENEMY_SCALE): void {
    this.scales.set(enemy, scale);
  }

  get(enemy: T): EnemyScale {
    return this.scales.get(enemy) ?? DEFAULT_ENEMY_SCALE;
  }

  clear(): void {
    this.scales = new WeakMap();
  }
}

/** Extra XP on top of the base XP that the pool already credited (0 at factor 1). */
export function xpBonus(baseXp: number, scale: EnemyScale): number {
  return baseXp * (scale.xp - 1);
}

/** Coin drop probability for a scaled enemy, capped at 1. */
export function scaledDropChance(baseChance: number, scale: EnemyScale): number {
  return Math.min(1, baseChance * scale.coin);
}

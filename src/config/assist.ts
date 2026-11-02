// Verdeckter Rueckenwind (AP-172, RS-05.6, PE-213): nach der 2. Niederlage in Folge im selben Level wird der naechste
// Versuch je Stufe (bis MAX_ASSIST_STAGE) unbemerkt etwas leichter. Alle Faktoren sind multiplikativ je Stufe.
// Gold, Erfahrung, Diamanten und Abwehr-Zeitfenster bleiben unveraendert. Erklaerung in docs/balancing.md.

/** Hoechste Stufe. */
export const MAX_ASSIST_STAGE = 3;

/** Erste Niederlage zaehlt nicht: Stufe = min(MAX, max(0, Niederlagen - ASSIST_FREE_LOSSES)). */
export const ASSIST_FREE_LOSSES = 1;

/** Obergrenze der gespeicherten Niederlagen je Level (haelt den Spielstand klein). */
export const MAX_ASSIST_LOSSES = 99;

export const ASSIST_PER_STAGE = {
  /** Lebenspunkte der normalen Gegner. */
  enemyHp: 0.92,
  /** Spawn-Abstand (groesser = weniger Gegner). */
  spawnInterval: 1.06,
  /** Lebenspunkte des Bosses. */
  bossHp: 0.9,
  /** Schaden des Bosses (Angriffe und Koerper). */
  bossDamage: 0.9,
} as const;

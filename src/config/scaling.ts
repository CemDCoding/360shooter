// Skalierung je Level (AP-90): Faktoren auf Gegner-Lebenspunkte, Erfahrung, Muenz-Drop und Kontaktschaden.
// Alle Werte 1,0 (Verhalten unveraendert), die Zahlen setzt AP-91. Index = Level-ID (0 bis 20).
export interface LevelScaling {
  hp: number;
  xp: number;
  coin: number;
  contact: number;
}

export const LEVEL_SCALING: readonly LevelScaling[] = Array.from({ length: 21 }, () => ({
  hp: 1,
  xp: 1,
  coin: 1,
  contact: 1,
}));

// Skalierung je Level (AP-90, Zahlen AP-91): Faktoren auf Gegner-Lebenspunkte, Erfahrung, Muenz-Drop und Kontaktschaden.
// Index = Level-ID (0 bis 20). Level 0 bis 4 haben seit AP-91 etwa doppelt so viele, dafuer schwaechere Gegner:
// Die Faktoren sind das Verhaeltnis alte zu neue Gegnerzahl, sodass Druck, Gold, Erfahrung und
// Kontaktschaden je Level gleich bleiben (Q-51). Der Baum hat 50 Lebenspunkte, hp * 50 ist ganzzahlig.
// Level 5 bis 20 sind unveraendert (Faktor 1,0). Erklaerung in docs/balancing.md.
export interface LevelScaling {
  hp: number;
  xp: number;
  coin: number;
  contact: number;
}

const DENSE: readonly LevelScaling[] = [
  { hp: 0.46, xp: 0.462, coin: 0.462, contact: 0.46 },
  { hp: 0.48, xp: 0.488, coin: 0.488, contact: 0.49 },
  { hp: 0.52, xp: 0.512, coin: 0.512, contact: 0.51 },
  { hp: 0.56, xp: 0.57, coin: 0.57, contact: 0.57 },
  { hp: 0.62, xp: 0.621, coin: 0.621, contact: 0.62 },
];

export const LEVEL_SCALING: readonly LevelScaling[] = Array.from({ length: 21 }, (_, id) =>
  id < DENSE.length ? { ...DENSE[id] } : { hp: 1, xp: 1, coin: 1, contact: 1 },
);

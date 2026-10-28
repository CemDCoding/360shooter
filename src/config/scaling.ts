// Skalierung je Level (AP-90, Zahlen AP-91): Faktoren auf Gegner-Lebenspunkte, Erfahrung, Muenz-Drop und Kontaktschaden.
// Index = Level-ID (0 bis 20). Level 0 bis 4 haben seit AP-91 etwa doppelt so viele, dafuer schwaechere Gegner:
// Die Faktoren sind das Verhaeltnis alte zu neue Gegnerzahl, sodass Druck, Gold, Erfahrung und
// Kontaktschaden je Level gleich bleiben (Q-51). Der Baum hat 50 Lebenspunkte, hp * 50 ist ganzzahlig.
// Level 5 bis 20 (AP-95): etwa 1,3-mal so viele Gegner, hp und contact 0,77, xp und coin = alte durch neue Gegnerzahl.
// Erklaerung in docs/balancing.md.
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

/** Level 5 bis 20 (AP-95), Index 0 = Level 5: xp und coin sind das Verhaeltnis alte zu neue Gegnerzahl. */
const DENSE_LATE_XP: readonly number[] = [
  0.771, 0.769, 0.773, 0.77, 0.771, 0.774, 0.776, 0.774, 0.771, 0.775, 0.771, 0.77, 0.772, 0.77, 0.774,
  0.77,
];

export const LEVEL_SCALING: readonly LevelScaling[] = Array.from({ length: 21 }, (_, id) =>
  id < DENSE.length
    ? { ...DENSE[id] }
    : { hp: 0.77, xp: DENSE_LATE_XP[id - 5], coin: DENSE_LATE_XP[id - 5], contact: 0.77 },
);

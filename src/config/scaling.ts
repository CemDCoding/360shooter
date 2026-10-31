// Skalierung je Level (AP-90, Zahlen AP-91): Faktoren auf Gegner-Lebenspunkte, Erfahrung, Muenz-Drop und Kontaktschaden.
// Index = Level-ID (0 bis 40). Level 0 bis 4 haben seit AP-91 etwa doppelt so viele, dafuer schwaechere Gegner:
// Die Faktoren sind das Verhaeltnis alte zu neue Gegnerzahl, sodass Druck, Gold, Erfahrung und
// Kontaktschaden je Level gleich bleiben (Q-51). Der Baum hat 50 Lebenspunkte, hp * 50 ist ganzzahlig.
// AP-105: hp in Level 0 bis 4 um einen Baum-Lebenspunkt gesenkt, das gleicht Wildschwein und Baer aus (PE-125).
// Level 5 bis 20 (AP-95): etwa 1,3-mal so viele Gegner, hp und contact 0,77, xp und coin = alte durch neue Gegnerzahl.
// Level 21 bis 40 (AP-105, PE-129): die Gegner selbst werden staerker (hp ueber 0,77 hinaus).
// Erklaerung in docs/balancing.md.
export interface LevelScaling {
  hp: number;
  xp: number;
  coin: number;
  contact: number;
}

const DENSE: readonly LevelScaling[] = [
  { hp: 0.44, xp: 0.462, coin: 0.462, contact: 0.46 },
  { hp: 0.46, xp: 0.488, coin: 0.488, contact: 0.49 },
  { hp: 0.5, xp: 0.512, coin: 0.512, contact: 0.51 },
  { hp: 0.54, xp: 0.57, coin: 0.57, contact: 0.57 },
  { hp: 0.6, xp: 0.621, coin: 0.621, contact: 0.62 },
];

/** Level 5 bis 20 (AP-95), Index 0 = Level 5: xp und coin sind das Verhaeltnis alte zu neue Gegnerzahl. */
const DENSE_LATE_XP: readonly number[] = [
  0.771, 0.769, 0.773, 0.77, 0.771, 0.774, 0.776, 0.774, 0.771, 0.775, 0.771, 0.77, 0.772, 0.77,
  0.774, 0.77,
];

/** First level of M5 (desert). */
const M5_FIRST = 21;

/**
 * Level 21 bis 40 (AP-105), Index 0 = Level 21: `hp` traegt die Druck-Kurve (etwa +7,5 % je Level,
 * Batch-Sprung etwa +9,5 %).
 */
const M5_HP: readonly number[] = [
  0.806, 0.85, 0.917, 0.984, 1.043, 1.054, 1.122, 1.191, 1.279, 1.344, 1.385, 1.472, 1.563, 1.663,
  1.772, 1.891, 2.022, 2.147, 2.272, 2.422,
];

/** `coin` (= `xp`) ab Level 21: 1,2 plus 0,05 je Level, damit eine Upgrade-Spur bis etwa Level 35 Stufe 15 erreicht. */
const m5Coin = (i: number): number => Math.round((1.2 + 0.05 * i) * 1000) / 1000;

/** `contact` ab Level 21: waechst wie die angenommenen Lebenspunkte der Spielerin (200 bei Stufe 10 bis 250 bei Stufe 15). */
const m5Contact = (i: number): number => Math.round(0.77 * (1 + (0.25 * i) / 19) * 1000) / 1000;

export const LEVEL_SCALING: readonly LevelScaling[] = Array.from({ length: 41 }, (_, id) => {
  if (id < DENSE.length) return { ...DENSE[id] };
  if (id < M5_FIRST) {
    return { hp: 0.77, xp: DENSE_LATE_XP[id - 5], coin: DENSE_LATE_XP[id - 5], contact: 0.77 };
  }
  const i = id - M5_FIRST;
  return { hp: M5_HP[i], xp: m5Coin(i), coin: m5Coin(i), contact: m5Contact(i) };
});

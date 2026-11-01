// Skalierung je Level (AP-90, Zahlen AP-91): Faktoren auf Gegner-Lebenspunkte, Erfahrung, Muenz-Drop und Kontaktschaden.
// Index = Level-ID (0 bis 40). Level 0 bis 4 haben seit AP-91 etwa doppelt so viele, dafuer schwaechere Gegner:
// Die Faktoren sind das Verhaeltnis alte zu neue Gegnerzahl, sodass Druck, Gold, Erfahrung und
// Kontaktschaden je Level gleich bleiben (Q-51). Der Baum hat 50 Lebenspunkte, hp * 50 ist ganzzahlig.
// AP-105: hp in Level 0 bis 4 um einen Baum-Lebenspunkt gesenkt, das gleicht Wildschwein und Baer aus (PE-125).
// AP-113 (PE-136): Wildschwein, Baer und Fee erscheinen deutlich haeufiger; hp, xp und coin sind neu eingestellt, contact
// ist wegen des Einmaltreffers (AP-112) doppelt so hoch (CONTACT_COMPENSATION).
// Level 5 bis 20 (AP-95): etwa 1,3-mal so viele Gegner, hp und contact 0,77, xp und coin = alte durch neue Gegnerzahl.
// Level 21 bis 40 (AP-105, PE-129): die Gegner selbst werden staerker (hp ueber 0,77 hinaus).
// M7 (AP-127, PE-152, PE-163): etwa 2,5-mal so viele Gegner (ENEMY_COUNT_FACTOR in levels.ts). `hp` und `contact` je Gegner
// bleiben, `xp` und `coin` werden durch den Faktor geteilt (Gold und Erfahrung je Runde gleich). Wo die Obergrenze
// MAX_ENEMIES_CAP greift, bekommt `hp` den Aufschlag CAP_HP_BONUS. Die Gegnerstufe (tierFor) steckt NICHT in diesen Werten,
// `enemyScaleFor` in logic/scaling.ts rechnet sie dazu.
// Erklaerung in docs/balancing.md.
import { ENEMY_COUNT_FACTOR, MAX_ENEMIES_CAP, MAX_ENEMIES_WANTED } from './levels';

export interface LevelScaling {
  hp: number;
  xp: number;
  coin: number;
  contact: number;
}

/**
 * Ausgleichsfaktor auf `contact` (AP-113, PE-135, Q-56): Kontakt-Gegner treffen nur noch einmal mit
 * `CONTACT_HIT_SECONDS` (0,5 s) statt wie bisher im Mittel etwa 1 s. Damit sich der Druck gleich anfuehlt, ist
 * `contact` in allen Leveln doppelt so hoch.
 */
export const CONTACT_COMPENSATION = 2;

/**
 * Level 0 bis 4 (AP-91, AP-113): `hp` ist die Tank-Skala des Baums (50 Lebenspunkte, ganzzahlig), `xp` und `coin`
 * gleichen die neue Pool-Mischung mit Wildschwein, Baer und Fee aus (der Baum bringt 5 Erfahrung, Wildschwein
 * und Baer 7), `contact` ist die alte Skala mal `CONTACT_COMPENSATION`.
 */
const DENSE: readonly LevelScaling[] = [
  { hp: 0.44, xp: 0.443, coin: 0.462, contact: 0.92 },
  { hp: 0.46, xp: 0.467, coin: 0.488, contact: 0.98 },
  { hp: 0.5, xp: 0.49, coin: 0.512, contact: 1.02 },
  { hp: 0.54, xp: 0.546, coin: 0.57, contact: 1.14 },
  { hp: 0.6, xp: 0.595, coin: 0.621, contact: 1.24 },
];

/** Level 5 bis 20 (AP-95, AP-113), Index 0 = Level 5: `hp` traegt den Druck der neuen Pool-Mischung. */
const DENSE_LATE_HP: readonly number[] = [
  0.714, 0.71, 0.7, 0.7, 0.7, 0.81, 0.81, 0.81, 0.81, 0.81, 0.81, 0.81, 0.81, 0.81, 0.81, 0.81,
];

/** Level 5 bis 20 (AP-95, AP-113), Index 0 = Level 5: xp und coin gleichen Gegnerzahl und Pool-Mischung aus. */
const DENSE_LATE_XP: readonly number[] = [
  0.781, 0.779, 0.783, 0.78, 0.781, 0.781, 0.783, 0.781, 0.778, 0.782, 0.778, 0.777, 0.779, 0.777,
  0.781, 0.777,
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
const m5Contact = (i: number): number =>
  Math.round(CONTACT_COMPENSATION * 0.77 * (1 + (0.25 * i) / 19) * 1000) / 1000;

/** Werte vor AP-127 (Stand AP-113), Index = Level-ID. */
const BASE_LEVEL_SCALING: readonly LevelScaling[] = Array.from({ length: 41 }, (_, id) => {
  if (id < DENSE.length) return { ...DENSE[id] };
  if (id < M5_FIRST) {
    return {
      hp: DENSE_LATE_HP[id - 5],
      xp: DENSE_LATE_XP[id - 5],
      coin: DENSE_LATE_XP[id - 5],
      contact: Math.round(CONTACT_COMPENSATION * 0.77 * 1000) / 1000,
    };
  }
  const i = id - M5_FIRST;
  return { hp: M5_HP[i], xp: m5Coin(i), coin: m5Coin(i), contact: m5Contact(i) };
});

const round = (v: number, digits: number): number => Math.round(v * 10 ** digits) / 10 ** digits;

/**
 * HP-Aufschlag ab der Obergrenze (AP-127, PE-152): gewuenschte durch moegliche gleichzeitige Gegner
 * (`MAX_ENEMIES_WANTED / MAX_ENEMIES_CAP`, mindestens 1). Level 0 bis 14 haben 1, Level 15 1,04, Level 20 1,3, Level 40 1,5.
 * Annahme: Die Obergrenze bremst die Gegnerzahl im selben Verhaeltnis, der Aufschlag holt den Druck zurueck.
 */
export const CAP_HP_BONUS: readonly number[] = MAX_ENEMIES_WANTED.map((w) =>
  round(Math.max(1, w / MAX_ENEMIES_CAP), 4),
);

/**
 * Faktoren je Level ab AP-127. `hp` = Wert vor AP-127 mal `CAP_HP_BONUS`. `xp` und `coin` = Wert vor AP-127 durch den
 * wirksamen Gegnerzahl-Faktor (`ENEMY_COUNT_FACTOR / CAP_HP_BONUS`): Wo die Obergrenze greift, kommen weniger, dafuer
 * zaehere Gegner, und jeder bringt im selben Verhaeltnis mehr. Gold und Erfahrung je Runde bleiben so gleich (PE-163).
 * `contact` je Gegner bleibt (bewusst mehr Druck, PE-152).
 */
export const LEVEL_SCALING: readonly LevelScaling[] = BASE_LEVEL_SCALING.map((s, id) => {
  const bonus = CAP_HP_BONUS[id];
  const reward = bonus / ENEMY_COUNT_FACTOR[id];
  return {
    hp: round(s.hp * bonus, 3),
    xp: round(s.xp * reward, 4),
    coin: round(s.coin * reward, 4),
    contact: s.contact,
  };
});

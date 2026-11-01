// Balancing (AP-15, Level 5-20 neu in AP-23, alle Level neu eingestellt in AP-56): alle Level-Werte stehen hier, Erklaerung in docs/balancing.md.
// Level 21-40 (M5): Kurve eingestellt in AP-105 (PE-129), Level 0-20 mit Wildschwein, Baer und Fee (PE-125).
// M7 (AP-127, PE-152, PE-153): etwa 2,5-mal so viele Gegner, Obergrenze 250.
import type { BatchId, BossId, EnemyPoolEntry, LevelDef } from '../contracts';

export const LEVEL_COUNT = 41;

/** First level of every batch in level order (PE-123). A batch runs up to the next start. */
export const BATCH_STARTS: readonly { batch: BatchId; first: number }[] = [
  { batch: 'forest', first: 0 },
  { batch: 'forestNight', first: 5 },
  { batch: 'elfForest', first: 10 },
  { batch: 'desert', first: 21 },
  { batch: 'pyramids', first: 26 },
  { batch: 'oasis', first: 31 },
];

/** Batch of a level id (ids outside 0..LEVEL_COUNT-1 are not checked here). */
export function batchOf(id: number): BatchId {
  let batch: BatchId = BATCH_STARTS[0].batch;
  for (const s of BATCH_STARTS) if (id >= s.first) batch = s.batch;
  return batch;
}

/** One boss per batch, the other levels use it as variants (PE-33, AP-16, PE-123). */
export const BOSS_OF_BATCH: Readonly<Record<BatchId, BossId>> = {
  forest: 'rootMonster',
  forestNight: 'forestGhost',
  elfForest: 'giantStone',
  desert: 'giantSandWorm',
  pyramids: 'guardianDog',
  oasis: 'pharaoh',
};

/** Erste Batch-Haelfte (aufgerundet) = 180 s, Rest 300 s (PE-05, PE-09, PE-10, PE-129). */
const SHORT_LEVELS: readonly number[] = [
  0, 1, 2, 5, 6, 7, 10, 11, 12, 13, 14, 15, 21, 22, 23, 26, 27, 28, 31, 32, 33, 34, 35,
];

/**
 * Gegnerzahl-Faktor je Level (M7, AP-127, F-25, PE-152, PE-153): Level 0 1,5, Level 1 1,75, Level 2 2,0,
 * Level 3 2,25, ab Level 4 2,5. Der Spawn-Abstand wird durch den Faktor geteilt, `MAX_ENEMIES` mit ihm
 * multipliziert (hoechstens `MAX_ENEMIES_CAP`). Die HP je Gegner bleiben gleich, `xp` und `coin` in
 * LEVEL_SCALING werden durch den Faktor geteilt (PE-163). Index = Level-ID.
 */
const COUNT_RAMP: readonly number[] = [1.5, 1.75, 2, 2.25];
const COUNT_FACTOR_FULL = 2.5;
export const ENEMY_COUNT_FACTOR: readonly number[] = Array.from(
  { length: LEVEL_COUNT },
  (_, id) => COUNT_RAMP[id] ?? COUNT_FACTOR_FULL,
);

/**
 * Obergrenze gleichzeitig lebender Gegner (AP-127, PE-152, ersetzt 150 aus RI-6). Bei Ruckeln am iPhone diesen
 * Wert senken (RI-28); der HP-Aufschlag in `scaling.ts` gleicht den fehlenden Druck dann von selbst aus.
 */
export const MAX_ENEMIES_CAP = 250;

/**
 * Untergrenze des Spawn-Abstands in ms (AP-127). Am Rundenende sinkt der Abstand auf 60 % (90 ms, gut 5 Frames bei
 * 60 fps), so kommt hoechstens ein Gegner je 5 Frames. Der kleinste Wert (Level 40) liegt mit 172 ms darueber.
 */
export const MIN_SPAWN_INTERVAL_MS = 150;

/**
 * Spawn-Abstand pro Level in ms vor AP-127 (Anfang der Runde, sinkt im Lauf der Runde auf 60 %).
 * Kleiner = mehr Gegner. Index = Level-ID.
 * Level 0 bis 4 (AP-91): dichter, groesste Luecke hoechstens 1,5 s. Level 5 bis 20 (AP-95): etwa 1,3-mal so viele
 * Gegner je Minute, die einzelnen Gegner dafuer schwaecher (LEVEL_SCALING).
 * Level 21 bis 40 (AP-105, PE-129): sinkt nur noch um 5 ms je Level (525 auf 430 ms, etwa +1 % Gegner je Level).
 * Staerker werden die Gegner selbst (LEVEL_SCALING `hp`), nicht ihre Zahl.
 */
const BASE_SPAWN_INTERVAL_MS: readonly number[] = [
  1500, 1450, 1400, 1360, 1330, 870, 840, 810, 770, 740, 615, 610, 600, 590, 585, 575, 560, 555,
  545, 540, 530, 525, 520, 515, 510, 505, 500, 495, 490, 485, 480, 475, 470, 465, 460, 455, 450,
  445, 440, 435, 430,
];

/**
 * Maximal gleichzeitig lebende Gegner pro Level vor AP-127 (Obergrenze damals 150, RI-6).
 * Level 21 bis 40 (AP-105, PE-129): +1 je Level von 131 bis 150. Index = Level-ID.
 */
const BASE_MAX_ENEMIES: readonly number[] = [
  25, 28, 31, 34, 37, 52, 55, 57, 60, 62, 78, 83, 88, 94, 99, 104, 109, 114, 120, 125, 130, 131,
  132, 133, 134, 135, 136, 137, 138, 139, 140, 141, 142, 143, 144, 145, 146, 147, 148, 149, 150,
];

/** Spawn-Abstand ab AP-127: bisheriger Abstand durch den Faktor, auf ganze ms gerundet (Level 0: 1000, Level 40: 172). */
const SPAWN_INTERVAL_MS: readonly number[] = BASE_SPAWN_INTERVAL_MS.map((ms, id) =>
  Math.max(MIN_SPAWN_INTERVAL_MS, Math.round(ms / ENEMY_COUNT_FACTOR[id])),
);

/**
 * Gewuenschte gleichzeitige Gegner ab AP-127: bisheriger Wert mal Faktor, gerundet. Wo dieser Wert ueber
 * `MAX_ENEMIES_CAP` liegt (Level 15 bis 40), greift die Obergrenze und `hp` bekommt einen Aufschlag (scaling.ts).
 */
export const MAX_ENEMIES_WANTED: readonly number[] = BASE_MAX_ENEMIES.map((max, id) =>
  Math.round(max * ENEMY_COUNT_FACTOR[id]),
);

/** Maximal gleichzeitig lebende Gegner pro Level ab AP-127 (Level 0: 38, ab Level 15: 250). Index = Level-ID. */
const MAX_ENEMIES: readonly number[] = MAX_ENEMIES_WANTED.map((w) => Math.min(MAX_ENEMIES_CAP, w));

/**
 * Spawn-Pool je Batch (F-19, PE-125). Der Pool haengt am Batch. Die alten Gewichte sind vervielfacht
 * (gleiche Anteile untereinander). AP-113 (PE-136, Q-56): Anteil am Pool Wald je Wildschwein und Baer 5,5 %, Wald bei
 * Nacht je 4,9 % und Fee 10,1 %, Elfenwald Fee 5,3 % (vorher 2,4 / 0,7 / 4,1 / 0,9 %). Die Gewichte mit LEVEL_SCALING
 * halten Druck, Gold und Erfahrung von Level 0 bis 20 im Band (AP-105, AP-113).
 * Wueste, Pyramiden und Oase: Gewichte so, dass die wirksamen mittleren Lebenspunkte je Pool fast gleich sind und
 * die Kurve ueber LEVEL_SCALING laeuft (Tanks selten, siehe docs/balancing.md).
 */
const POOL_OF_BATCH: Readonly<Record<BatchId, readonly EnemyPoolEntry[]>> = {
  forest: [
    { enemyId: 'cursedTree', weight: 178 },
    { enemyId: 'boar', weight: 11 },
    { enemyId: 'bear', weight: 11 },
  ],
  forestNight: [
    { enemyId: 'cursedTree', weight: 120 },
    { enemyId: 'forestWitch', weight: 60 },
    { enemyId: 'zombieSquirrel', weight: 96 },
    { enemyId: 'boar', weight: 17 },
    { enemyId: 'bear', weight: 17 },
    { enemyId: 'fairy', weight: 35 },
  ],
  elfForest: [
    { enemyId: 'cursedTree', weight: 80 },
    { enemyId: 'forestWitch', weight: 40 },
    { enemyId: 'zombieSquirrel', weight: 64 },
    { enemyId: 'forestSpirit', weight: 32 },
    { enemyId: 'fairy', weight: 12 },
  ],
  desert: [
    { enemyId: 'sandWorm', weight: 10 },
    { enemyId: 'armadillo', weight: 2 },
    { enemyId: 'camel', weight: 4 },
    { enemyId: 'snake', weight: 10 },
  ],
  pyramids: [
    { enemyId: 'mummy', weight: 3 },
    { enemyId: 'sandWorm', weight: 14 },
    { enemyId: 'archaeologist', weight: 8 },
    { enemyId: 'sphinx', weight: 1 },
  ],
  oasis: [
    { enemyId: 'mummy', weight: 4 },
    { enemyId: 'snake', weight: 14 },
    { enemyId: 'archaeologist', weight: 6 },
    { enemyId: 'sphinx', weight: 2 },
  ],
};

export const LEVELS: readonly LevelDef[] = Array.from({ length: LEVEL_COUNT }, (_, id) => ({
  id,
  batch: batchOf(id),
  durationSec: SHORT_LEVELS.includes(id) ? 180 : 300,
  enemyPool: POOL_OF_BATCH[batchOf(id)].map((e) => ({ ...e })),
  spawnIntervalMs: SPAWN_INTERVAL_MS[id],
  maxEnemies: MAX_ENEMIES[id],
  bossId: BOSS_OF_BATCH[batchOf(id)],
}));

export function getLevel(id: number): LevelDef | undefined {
  return LEVELS.find((l) => l.id === id);
}

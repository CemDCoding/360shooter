// Balancing (AP-15, Level 5-20 neu in AP-23, alle Level neu eingestellt in AP-56): alle Level-Werte stehen hier, Erklaerung in docs/balancing.md.
import type { BatchId, BossId, EnemyPoolEntry, LevelDef } from '../contracts';

export const LEVEL_COUNT = 21;

function batchOf(id: number): BatchId {
  if (id <= 4) return 'forest';
  if (id <= 9) return 'forestNight';
  return 'elfForest';
}

/** One boss per batch, the other levels use it as variants (PE-33, AP-16). */
const BOSS_OF_BATCH: Readonly<Record<BatchId, BossId>> = {
  forest: 'rootMonster',
  forestNight: 'forestGhost',
  elfForest: 'giantStone',
};

/** Erste Batch-Haelfte (aufgerundet) = 180 s, Rest 300 s (PE-05, PE-09, PE-10). */
const SHORT_LEVELS: readonly number[] = [0, 1, 2, 5, 6, 7, 10, 11, 12, 13, 14, 15];

/**
 * Spawn-Abstand pro Level in ms (Anfang der Runde, sinkt im Lauf der Runde auf 60 %).
 * Kleiner = mehr Gegner. Index = Level-ID.
 * Level 0 bis 4 (AP-91): dichter, groesste Luecke hoechstens 1,5 s. Level 5 bis 20 (AP-95): etwa 1,3-mal so viele
 * Gegner je Minute. Die einzelnen Gegner sind dafuer schwaecher (LEVEL_SCALING), sodass Druck, Gold
 * und Erfahrung gleich bleiben.
 */
const SPAWN_INTERVAL_MS: readonly number[] = [
  1500, 1450, 1400, 1360, 1330, 870, 840, 810, 770, 740, 615, 610, 600, 590, 585, 575, 560, 555,
  545, 540, 530,
];

/** Maximal gleichzeitig lebende Gegner pro Level (Obergrenze 150; Level 5 bis 20 seit AP-95 hoechstens +30 %, RI-6). Index = Level-ID. */
const MAX_ENEMIES: readonly number[] = [
  25, 28, 31, 34, 37, 52, 55, 57, 60, 62, 78, 83, 88, 94, 99, 104, 109, 114, 120, 125, 130,
];

function poolOf(id: number): EnemyPoolEntry[] {
  const pool: EnemyPoolEntry[] = [{ enemyId: 'cursedTree', weight: 10 }];
  if (id >= 5) {
    pool.push({ enemyId: 'forestWitch', weight: 5 }, { enemyId: 'zombieSquirrel', weight: 8 });
  }
  if (id >= 10) pool.push({ enemyId: 'forestSpirit', weight: 4 });
  return pool;
}

export const LEVELS: readonly LevelDef[] = Array.from({ length: LEVEL_COUNT }, (_, id) => ({
  id,
  batch: batchOf(id),
  durationSec: SHORT_LEVELS.includes(id) ? 180 : 300,
  enemyPool: poolOf(id),
  spawnIntervalMs: SPAWN_INTERVAL_MS[id],
  maxEnemies: MAX_ENEMIES[id],
  bossId: BOSS_OF_BATCH[batchOf(id)],
}));

export function getLevel(id: number): LevelDef | undefined {
  return LEVELS.find((l) => l.id === id);
}

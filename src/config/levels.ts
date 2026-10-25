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
 */
const SPAWN_INTERVAL_MS: readonly number[] = [
  3320, 3020, 2800, 2410, 2170, 1130, 1090, 1050, 1000, 960, 800, 790, 780, 770, 760, 750, 730, 720,
  710, 700, 690,
];

/** Maximal gleichzeitig lebende Gegner pro Level (Obergrenze 150). Index = Level-ID. */
const MAX_ENEMIES: readonly number[] = [
  25, 28, 31, 34, 37, 40, 42, 44, 46, 48, 60, 64, 68, 72, 76, 80, 84, 88, 92, 96, 100,
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

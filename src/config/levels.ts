// Startwerte, Feintuning in AP-15, nur hier ändern.
import type { BatchId, EnemyPoolEntry, LevelDef } from '../contracts';

export const LEVEL_COUNT = 21;

function batchOf(id: number): BatchId {
  if (id <= 4) return 'forest';
  if (id <= 9) return 'forestNight';
  return 'elfForest';
}

/** Erste Batch-Haelfte (aufgerundet) = 180 s, Rest 300 s (PE-05, PE-09, PE-10). */
const SHORT_LEVELS: readonly number[] = [0, 1, 2, 5, 6, 7, 10, 11, 12, 13, 14, 15];

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
  spawnIntervalMs: 1500 - id * 50,
  maxEnemies: Math.min(150, 30 + id * 6),
  bossId: '',
}));

export function getLevel(id: number): LevelDef | undefined {
  return LEVELS.find((l) => l.id === id);
}

// Balancing (AP-15, Level 5-20 neu in AP-23): alle Level-Werte stehen hier, Erklaerung in docs/balancing.md.
import type { BatchId, EnemyPoolEntry, LevelDef } from '../contracts';

export const LEVEL_COUNT = 21;

function batchOf(id: number): BatchId {
  if (id <= 4) return 'forest';
  if (id <= 9) return 'forestNight';
  return 'elfForest';
}

/** Erste Batch-Haelfte (aufgerundet) = 180 s, Rest 300 s (PE-05, PE-09, PE-10). */
const SHORT_LEVELS: readonly number[] = [0, 1, 2, 5, 6, 7, 10, 11, 12, 13, 14, 15];

/**
 * Spawn-Abstand pro Level in ms (Anfang der Runde, sinkt im Lauf der Runde auf 60 %).
 * Kleiner = mehr Gegner. Index = Level-ID.
 */
const SPAWN_INTERVAL_MS: readonly number[] = [
  3570, 3130, 2780, 2450, 2190, 1330, 1270, 1210, 1160, 1100, 930, 900, 860, 830, 800, 770, 740, 710,
  680, 650, 620,
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
  bossId: '',
}));

export function getLevel(id: number): LevelDef | undefined {
  return LEVELS.find((l) => l.id === id);
}

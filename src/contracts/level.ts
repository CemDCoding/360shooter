import type { EnemyId } from './enemy';

export type BatchId = 'forest' | 'forestNight' | 'elfForest';

export interface EnemyPoolEntry {
  enemyId: EnemyId;
  weight: number;
}

export interface LevelDef {
  id: number;
  batch: BatchId;
  durationSec: number;
  enemyPool: EnemyPoolEntry[];
  spawnIntervalMs: number;
  maxEnemies: number;
  bossId?: string;
}

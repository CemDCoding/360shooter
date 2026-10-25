import type { BossId } from './boss';
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
  /** Boss of the level (AP-16). Set: the round ends only with the boss defeat (PE-18). */
  bossId?: BossId;
}

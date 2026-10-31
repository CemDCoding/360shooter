import type { BossId } from './boss';
import type { EnemyId } from './enemy';

/** Batches in level order: forest 0-4, forestNight 5-9, elfForest 10-20, desert 21-25, pyramids 26-30, oasis 31-40 (PE-123). */
export type BatchId = 'forest' | 'forestNight' | 'elfForest' | 'desert' | 'pyramids' | 'oasis';

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

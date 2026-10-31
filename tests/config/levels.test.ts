import { describe, expect, it } from 'vitest';
import {
  BATCH_STARTS,
  BOSS_OF_BATCH,
  ENEMIES,
  LEVELS,
  LEVEL_COUNT,
  batchOf,
  getLevel,
} from '../../src/config';
import type { BatchId, EnemyId } from '../../src/contracts';

const shortIds = [
  0, 1, 2, 5, 6, 7, 10, 11, 12, 13, 14, 15, 21, 22, 23, 26, 27, 28, 31, 32, 33, 34, 35,
];

/** Expected batch per level (PE-123). */
function expectedBatch(id: number): BatchId {
  if (id <= 4) return 'forest';
  if (id <= 9) return 'forestNight';
  if (id <= 20) return 'elfForest';
  if (id <= 25) return 'desert';
  if (id <= 30) return 'pyramids';
  return 'oasis';
}

/** Spawn pools per batch from the shared M5 rules (F-19, PE-125). */
const POOL_IDS: Record<BatchId, EnemyId[]> = {
  forest: ['cursedTree', 'boar', 'bear'],
  forestNight: ['cursedTree', 'forestWitch', 'zombieSquirrel', 'boar', 'bear', 'fairy'],
  elfForest: ['cursedTree', 'forestWitch', 'zombieSquirrel', 'forestSpirit', 'fairy'],
  desert: ['sandWorm', 'armadillo', 'camel', 'snake'],
  pyramids: ['mummy', 'sandWorm', 'archaeologist', 'sphinx'],
  oasis: ['mummy', 'snake', 'archaeologist', 'sphinx'],
};

/** Values of level 0 to 20 before AP-97: they must stay unchanged (only the pools grow). */
const OLD_INTERVALS = [
  1500, 1450, 1400, 1360, 1330, 870, 840, 810, 770, 740, 615, 610, 600, 590, 585, 575, 560, 555,
  545, 540, 530,
];
const OLD_MAX = [
  25, 28, 31, 34, 37, 52, 55, 57, 60, 62, 78, 83, 88, 94, 99, 104, 109, 114, 120, 125, 130,
];

describe('levels', () => {
  it('has 41 levels with ids 0..40', () => {
    expect(LEVEL_COUNT).toBe(41);
    expect(LEVELS.map((l) => l.id)).toEqual(Array.from({ length: 41 }, (_, i) => i));
  });

  it.each(LEVELS.map((l) => [l.id, l] as const))('level %i table', (id, l) => {
    const batch = expectedBatch(id);
    expect(l.batch).toBe(batch);
    expect(batchOf(id)).toBe(batch);
    expect(l.durationSec).toBe(shortIds.includes(id) ? 180 : 300);
    expect(l.enemyPool.map((e) => e.enemyId).sort()).toEqual([...POOL_IDS[batch]].sort());
    expect(l.enemyPool.every((e) => e.weight > 0)).toBe(true);
    expect(l.maxEnemies).toBeLessThanOrEqual(150);
    expect(l.bossId).toBe(BOSS_OF_BATCH[batch]);
  });

  it('runs the batches in order with the borders of PE-123', () => {
    expect(BATCH_STARTS.map((s) => [s.batch, s.first])).toEqual([
      ['forest', 0],
      ['forestNight', 5],
      ['elfForest', 10],
      ['desert', 21],
      ['pyramids', 26],
      ['oasis', 31],
    ]);
  });

  it('has one boss per batch (PE-123)', () => {
    expect(BOSS_OF_BATCH).toEqual({
      forest: 'rootMonster',
      forestNight: 'forestGhost',
      elfForest: 'giantStone',
      desert: 'giantSandWorm',
      pyramids: 'guardianDog',
      oasis: 'pharaoh',
    });
  });

  it('uses 180 s for 21-23, 26-28, 31-35 and 300 s for 24-25, 29-30, 36-40 (PE-129)', () => {
    for (const id of [21, 22, 23, 26, 27, 28, 31, 32, 33, 34, 35]) {
      expect(getLevel(id)?.durationSec, `level ${id}`).toBe(180);
    }
    for (const id of [24, 25, 29, 30, 36, 37, 38, 39, 40]) {
      expect(getLevel(id)?.durationSec, `level ${id}`).toBe(300);
    }
  });

  it('keeps the spawn interval and max enemies of level 0 to 20 unchanged (AP-97)', () => {
    expect(LEVELS.slice(0, 21).map((l) => l.spawnIntervalMs)).toEqual(OLD_INTERVALS);
    expect(LEVELS.slice(0, 21).map((l) => l.maxEnemies)).toEqual(OLD_MAX);
  });

  it('keeps the old enemies in the old pools with their old shares', () => {
    for (const l of LEVELS.filter((x) => x.id <= 20)) {
      const w = (id: EnemyId) => l.enemyPool.find((e) => e.enemyId === id)?.weight ?? 0;
      if (l.id >= 5) {
        expect(w('forestWitch') / w('cursedTree'), `level ${l.id}`).toBeCloseTo(0.5, 9);
        expect(w('zombieSquirrel') / w('cursedTree'), `level ${l.id}`).toBeCloseTo(0.8, 9);
      }
      if (l.id >= 10) expect(w('forestSpirit') / w('cursedTree')).toBeCloseTo(0.4, 9);
      // Boar, bear and fairy come with small weights (at most 10 % of the trees each).
      for (const id of ['boar', 'bear', 'fairy'] as const) {
        expect(w(id), `${id} level ${l.id}`).toBeLessThanOrEqual(w('cursedTree') * 0.1);
      }
    }
  });

  it('has a pool entry with a config for every enemy id and uses every enemy somewhere', () => {
    const used = new Set(LEVELS.flatMap((l) => l.enemyPool.map((e) => e.enemyId)));
    for (const id of used) expect(ENEMIES[id], id).toBeDefined();
    expect([...used].sort()).toEqual(Object.keys(ENEMIES).sort());
  });

  it('spawn interval decreases strictly', () => {
    for (let i = 1; i < LEVELS.length; i++) {
      expect(LEVELS[i].spawnIntervalMs).toBeLessThan(LEVELS[i - 1].spawnIntervalMs);
    }
  });

  it('getLevel', () => {
    expect(getLevel(20)?.id).toBe(20);
    expect(getLevel(40)?.id).toBe(40);
    expect(getLevel(41)).toBeUndefined();
  });

  it('max enemies never fall from level to level and level 0 starts at 1.5 s (AP-91)', () => {
    for (let i = 1; i < LEVELS.length; i++) {
      expect(LEVELS[i].maxEnemies).toBeGreaterThan(LEVELS[i - 1].maxEnemies);
    }
    expect(LEVELS[0].spawnIntervalMs).toBeGreaterThanOrEqual(1000);
    expect(LEVELS[0].spawnIntervalMs).toBeLessThanOrEqual(1500);
  });

  it('level 0 to 4 never wait longer than 1.5 s for a spawn and stay at the max enemies of level 5 or below (AP-91)', () => {
    for (let i = 0; i <= 4; i++) {
      expect(LEVELS[i].spawnIntervalMs, `level ${i}`).toBeLessThanOrEqual(1500);
      expect(LEVELS[i].maxEnemies, `level ${i}`).toBeLessThanOrEqual(LEVELS[5].maxEnemies);
    }
  });

  it('the interval step from level 5 on is at most 10 percent (AP-91)', () => {
    for (let i = 6; i < LEVELS.length; i++) {
      if (i === 10) continue; // Batch-Sprung 9 -> 10 bleibt gross (AP-91)
      const step = LEVELS[i - 1].spawnIntervalMs / LEVELS[i].spawnIntervalMs;
      expect(step, `level ${i}`).toBeLessThanOrEqual(1.1);
    }
  });

  it('max enemies of level 5 to 20 grow at most 30 percent over the peak after AP-91 (100), phone performance RI-6 (AP-95)', () => {
    for (let i = 5; i <= 20; i++) {
      expect(LEVELS[i].maxEnemies, `level ${i}`).toBeLessThanOrEqual(130);
    }
  });

  it('max enemies of level 21 to 40 stay at 150 or below, level 40 at the cap (PE-129)', () => {
    for (let i = 21; i < LEVELS.length; i++) {
      expect(LEVELS[i].maxEnemies, `level ${i}`).toBeLessThanOrEqual(150);
    }
    expect(LEVELS[40].maxEnemies).toBe(150);
  });
});

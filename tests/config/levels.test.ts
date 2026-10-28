import { describe, expect, it } from 'vitest';
import { LEVELS, LEVEL_COUNT, getLevel } from '../../src/config';

const shortIds = [0, 1, 2, 5, 6, 7, 10, 11, 12, 13, 14, 15];

describe('levels', () => {
  it('has 21 levels with ids 0..20', () => {
    expect(LEVEL_COUNT).toBe(21);
    expect(LEVELS.map((l) => l.id)).toEqual(Array.from({ length: 21 }, (_, i) => i));
  });

  it.each(LEVELS.map((l) => [l.id, l] as const))('level %i table', (id, l) => {
    const batch = id <= 4 ? 'forest' : id <= 9 ? 'forestNight' : 'elfForest';
    expect(l.batch).toBe(batch);
    expect(l.durationSec).toBe(shortIds.includes(id) ? 180 : 300);
    const ids = l.enemyPool.map((e) => e.enemyId);
    expect(ids.includes('cursedTree')).toBe(true);
    expect(ids.includes('forestWitch')).toBe(id >= 5);
    expect(ids.includes('zombieSquirrel')).toBe(id >= 5);
    expect(ids.includes('forestSpirit')).toBe(id >= 10);
    expect(l.enemyPool.every((e) => e.weight > 0)).toBe(true);
    expect(l.maxEnemies).toBeLessThanOrEqual(150);
    expect(l.bossId).toBe(id <= 4 ? 'rootMonster' : id <= 9 ? 'forestGhost' : 'giantStone');
  });

  it('spawn interval decreases strictly', () => {
    for (let i = 1; i < LEVELS.length; i++) {
      expect(LEVELS[i].spawnIntervalMs).toBeLessThan(LEVELS[i - 1].spawnIntervalMs);
    }
  });

  it('getLevel', () => {
    expect(getLevel(20)?.id).toBe(20);
    expect(getLevel(21)).toBeUndefined();
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
});

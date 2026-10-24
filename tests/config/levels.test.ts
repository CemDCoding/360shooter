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
    expect(l.bossId ?? '').toBe('');
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

  it('levels 0-4 keep their fixed spawn values (AP-23)', () => {
    const fixed = [
      [3570, 25],
      [3130, 28],
      [2780, 31],
      [2450, 34],
      [2190, 37],
    ];
    fixed.forEach(([interval, max], id) => {
      expect(LEVELS[id].spawnIntervalMs).toBe(interval);
      expect(LEVELS[id].maxEnemies).toBe(max);
    });
  });
});

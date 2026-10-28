import { describe, expect, it } from 'vitest';
import { ENEMIES, LEVEL_COUNT, LEVEL_SCALING } from '../../src/config';

describe('LEVEL_SCALING', () => {
  it('has one entry per level', () => {
    expect(LEVEL_SCALING).toHaveLength(21);
    expect(LEVEL_SCALING).toHaveLength(LEVEL_COUNT);
  });

  it('has finite positive factors that never exceed 1', () => {
    for (const s of LEVEL_SCALING) {
      for (const v of [s.hp, s.xp, s.coin, s.contact]) {
        expect(Number.isFinite(v)).toBe(true);
        expect(v).toBeGreaterThan(0);
        expect(v).toBeLessThanOrEqual(1);
      }
    }
  });

  it('weakens the single enemies of the denser level 0 to 4 step by step (AP-91)', () => {
    for (let i = 1; i <= 4; i++) {
      expect(LEVEL_SCALING[i].hp, `level ${i}`).toBeGreaterThan(LEVEL_SCALING[i - 1].hp);
    }
    expect(LEVEL_SCALING[0].hp).toBeLessThan(1);
    expect(LEVEL_SCALING[0].hp).toBeGreaterThanOrEqual(0.4);
  });

  it('gives whole hit points for the cursed tree in level 0 to 4', () => {
    for (let i = 0; i <= 4; i++) {
      const hp = ENEMIES.cursedTree.hp * LEVEL_SCALING[i].hp;
      expect(hp).toBeCloseTo(Math.round(hp), 9);
    }
  });

  it('leaves level 5 to 20 unchanged', () => {
    for (let i = 5; i < LEVEL_COUNT; i++) {
      expect(LEVEL_SCALING[i], `level ${i}`).toEqual({ hp: 1, xp: 1, coin: 1, contact: 1 });
    }
  });
});

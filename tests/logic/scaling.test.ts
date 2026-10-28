import { describe, expect, it } from 'vitest';
import { COIN_RULES } from '../../src/config';
import { DEFAULT_ENEMY_SCALE, enemyScaleFor } from '../../src/logic/scaling';

describe('enemyScaleFor', () => {
  it('returns finite factors above 0 for every level', () => {
    for (let id = 0; id <= 20; id += 1) {
      for (const v of Object.values(enemyScaleFor(id))) {
        expect(Number.isFinite(v)).toBe(true);
        expect(v).toBeGreaterThan(0);
      }
    }
  });

  it('keeps all factors at 1 (behavior unchanged, AP-90)', () => {
    for (let id = 0; id <= 20; id += 1) expect(enemyScaleFor(id)).toEqual(DEFAULT_ENEMY_SCALE);
  });

  it('falls back to the default for unknown levels', () => {
    for (const id of [-1, 21, 1.5, Number.NaN, Infinity]) {
      expect(enemyScaleFor(id)).toEqual({ hp: 1, xp: 1, coin: 1, contact: 1 });
    }
  });

  it('leaves hp, xp and drop chance identical with factor 1', () => {
    const s = enemyScaleFor(0);
    expect(Math.max(1, Math.round(50 * s.hp))).toBe(50);
    expect(7 * s.xp).toBe(7);
    expect(Math.min(1, COIN_RULES.dropChance * s.coin)).toBe(COIN_RULES.dropChance);
  });
});

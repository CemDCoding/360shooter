import { describe, expect, it } from 'vitest';
import { COIN_RULES, LEVEL_SCALING } from '../../src/config';
import {
  DEFAULT_ENEMY_SCALE,
  ScaleRegistry,
  enemyScaleFor,
  scaledDropChance,
  xpBonus,
} from '../../src/logic/scaling';

describe('enemyScaleFor', () => {
  it('returns finite factors above 0 for every level', () => {
    for (let id = 0; id <= 20; id += 1) {
      for (const v of Object.values(enemyScaleFor(id))) {
        expect(Number.isFinite(v)).toBe(true);
        expect(v).toBeGreaterThan(0);
      }
    }
  });

  it('returns the configured factors: weaker enemies in level 0 to 20 (AP-91, AP-95)', () => {
    for (let id = 0; id <= 20; id += 1) {
      expect(enemyScaleFor(id)).toEqual(LEVEL_SCALING[id]);
      expect(enemyScaleFor(id).hp).toBeLessThan(1);
    }
  });

  it('falls back to the default for unknown levels', () => {
    for (const id of [-1, LEVEL_SCALING.length, 1.5, Number.NaN, Infinity]) {
      expect(enemyScaleFor(id)).toEqual({ hp: 1, xp: 1, coin: 1, contact: 1 });
    }
  });

  it('leaves hp, xp and drop chance identical with factor 1 (the default)', () => {
    const s = DEFAULT_ENEMY_SCALE;
    expect(Math.max(1, Math.round(50 * s.hp))).toBe(50);
    expect(7 * s.xp).toBe(7);
    expect(scaledDropChance(COIN_RULES.dropChance, s)).toBe(COIN_RULES.dropChance);
    expect(xpBonus(7, s)).toBe(0);
  });
});

describe('ScaleRegistry (pool recycling)', () => {
  const scaled = { hp: 2, xp: 3, coin: 0.5, contact: 4 };

  it('gives a recycled enemy the default scale when it is respawned as a summon', () => {
    const tree = {};
    const reg = new ScaleRegistry<object>();
    reg.assign(tree, scaled); // normal spawn
    expect(reg.get(tree)).toEqual(scaled);
    reg.assign(tree); // same instance reused by a boss summon
    expect(reg.get(tree)).toEqual(DEFAULT_ENEMY_SCALE);
  });

  it('returns the default for unknown enemies and after clear', () => {
    const e = {};
    const reg = new ScaleRegistry<object>();
    expect(reg.get(e)).toEqual(DEFAULT_ENEMY_SCALE);
    reg.assign(e, scaled);
    reg.clear();
    expect(reg.get(e)).toEqual(DEFAULT_ENEMY_SCALE);
  });
});

describe('xpBonus and scaledDropChance', () => {
  it('scale xp and drop chance and cap the chance at 1', () => {
    expect(xpBonus(10, { ...DEFAULT_ENEMY_SCALE, xp: 0.5 })).toBe(-5);
    expect(scaledDropChance(0.08, { ...DEFAULT_ENEMY_SCALE, coin: 2 })).toBeCloseTo(0.16);
    expect(scaledDropChance(0.5, { ...DEFAULT_ENEMY_SCALE, coin: 10 })).toBe(1);
  });
});

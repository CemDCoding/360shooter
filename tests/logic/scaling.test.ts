import { describe, expect, it } from 'vitest';
import { COIN_RULES, LEVEL_SCALING } from '../../src/config';
import {
  DEFAULT_ENEMY_SCALE,
  ScaleRegistry,
  enemyScaleFor,
  scaledDropChance,
  xpBonus,
} from '../../src/logic/scaling';
import { tierFor } from '../../src/logic/tier';

describe('enemyScaleFor', () => {
  it('returns finite factors above 0 for every level', () => {
    for (let id = 0; id <= 20; id += 1) {
      for (const v of Object.values(enemyScaleFor(id)).filter((x) => x !== 0)) {
        expect(Number.isFinite(v)).toBe(true);
        expect(v).toBeGreaterThan(0);
      }
    }
  });

  it('returns the configured factors: weaker enemies in level 0 to 20 (AP-91, AP-95)', () => {
    for (let id = 0; id <= 20; id += 1) {
      const s = enemyScaleFor(id);
      const t = tierFor(id);
      expect(s.hp).toBeCloseTo(LEVEL_SCALING[id].hp * t.hpFactor);
      expect(s.contact).toBeCloseTo(LEVEL_SCALING[id].contact * t.damageFactor);
      expect(s.xp).toBe(LEVEL_SCALING[id].xp);
      expect(s.coin).toBe(LEVEL_SCALING[id].coin);
      expect(s.size).toBe(t.scale);
    }
  });

  it('multiplies the level factor by the tier once (AP-128)', () => {
    // Stage 0 keeps the old values, stage 4 is level factor times 1.32 hp / 1.2 contact.
    expect(enemyScaleFor(5)).toEqual({ ...LEVEL_SCALING[5], size: 1, tintStep: 0, shot: 1 });
    expect(enemyScaleFor(9).hp).toBeCloseTo(LEVEL_SCALING[9].hp * 1.32);
    expect(enemyScaleFor(9).contact).toBeCloseTo(LEVEL_SCALING[9].contact * 1.2);
    expect(enemyScaleFor(9).size).toBeCloseTo(1.12);
  });

  it('falls back to the default for unknown levels', () => {
    for (const id of [-1, LEVEL_SCALING.length, 1.5, Number.NaN, Infinity]) {
      expect(enemyScaleFor(id)).toEqual({
        hp: 1,
        xp: 1,
        coin: 1,
        contact: 1,
        size: 1,
        tintStep: 0,
        shot: 1,
      });
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
  const scaled = {
    hp: 2,
    xp: 3,
    coin: 0.5,
    contact: 4,
    size: 1.1,
    tintStep: 2 as const,
    shot: 1.1,
  };

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

describe('tintStep and shot (AP-134)', () => {
  it('takes tintStep and the damage factor of the tier for every level', () => {
    for (let id = 0; id < LEVEL_SCALING.length; id += 1) {
      const t = tierFor(id);
      const s = enemyScaleFor(id);
      expect(s.tintStep).toBe(t.tintStep);
      // Only the tier factor, not the level factor: bolts and aura were never scaled per level.
      expect(s.shot).toBe(t.damageFactor);
    }
  });

  it('keeps stage 0 unchanged and grows shot with the stage', () => {
    expect(enemyScaleFor(5).shot).toBe(1);
    expect(enemyScaleFor(5).tintStep).toBe(0);
    expect(enemyScaleFor(9).shot).toBeCloseTo(1.2);
    expect(enemyScaleFor(9).tintStep).toBe(3);
  });

  it('defaults to no tint and shot 1', () => {
    expect(DEFAULT_ENEMY_SCALE.tintStep).toBe(0);
    expect(DEFAULT_ENEMY_SCALE.shot).toBe(1);
  });
});

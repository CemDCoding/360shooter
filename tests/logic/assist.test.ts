import { describe, expect, it } from 'vitest';
import { BATCH_STARTS, LEVEL_COUNT, batchOf } from '../../src/config/levels';
import {
  NO_ASSIST,
  assistFactors,
  assistStage,
  assistedPressure,
  recordResult,
} from '../../src/logic/assist';
import { referencePressure } from '../../src/logic/balanceModel';
import { enemyScaleFor } from '../../src/logic/scaling';

describe('assistStage', () => {
  it('is 0/0/1/2/3/3 after 0 to 5 losses', () => {
    expect([0, 1, 2, 3, 4, 5].map(assistStage)).toEqual([0, 0, 1, 2, 3, 3]);
  });
  it('ignores broken input', () => {
    expect(assistStage(Number.NaN)).toBe(0);
    expect(assistStage(-4)).toBe(0);
    expect(assistStage(500)).toBe(3);
  });
});

describe('recordResult', () => {
  it('counts losses per level and a win resets only that level', () => {
    let l: Record<string, number> = {};
    l = recordResult(l, 4, 'loss');
    l = recordResult(l, 4, 'loss');
    l = recordResult(l, 5, 'loss');
    expect(l).toEqual({ '4': 2, '5': 1 });
    l = recordResult(l, 4, 'win');
    expect(l).toEqual({ '5': 1 });
    expect(assistStage(l['4'] ?? 0)).toBe(0);
  });
  it('a win after many losses sets the stage back to 0', () => {
    let l: Record<string, number> = {};
    for (let i = 0; i < 5; i++) l = recordResult(l, 2, 'loss');
    expect(assistStage(l['2'])).toBe(3);
    l = recordResult(l, 2, 'win');
    expect(assistStage(l['2'] ?? 0)).toBe(0);
  });
  it('does not change its input and handles undefined', () => {
    const src = { '1': 1 };
    recordResult(src, 1, 'loss');
    expect(src).toEqual({ '1': 1 });
    expect(recordResult(undefined, 2, 'loss')).toEqual({ '2': 1 });
  });
  it('caps the count', () => {
    let l: Record<string, number> = {};
    for (let i = 0; i < 150; i++) l = recordResult(l, 0, 'loss');
    expect(l['0']).toBe(99);
  });
});

describe('assistFactors', () => {
  it('stage 0 changes nothing', () => {
    expect(assistFactors(10, 0)).toEqual(NO_ASSIST);
  });
  it('uses the configured factors per stage where the floor leaves room', () => {
    const f = assistFactors(39, 3);
    expect(f.bossHp).toBeCloseTo(0.729, 3);
    expect(f.bossDamage).toBeCloseTo(0.729, 3);
    expect(f.enemyHp).toBeLessThan(1);
    expect(f.spawnInterval).toBeGreaterThan(1);
    expect(f.enemyHp / f.spawnInterval).toBeGreaterThanOrEqual(0.92 ** 3 / 1.06 ** 3 - 1e-9);
  });
  it('gives the enemy side no relief on the first level of a batch (floor), the boss still gets it', () => {
    const f = assistFactors(0, 3);
    expect(f.enemyHp / f.spawnInterval).toBeCloseTo(1, 10);
    expect(f.bossHp).toBeCloseTo(0.729, 3);
  });
  it('is never harder than the normal attempt', () => {
    for (let id = 0; id < LEVEL_COUNT; id++) {
      for (let s = 1; s <= 3; s++) {
        const a = assistFactors(id, s);
        expect(a.enemyHp).toBeLessThanOrEqual(1);
        expect(a.spawnInterval).toBeGreaterThanOrEqual(1);
        expect(a.bossHp).toBeLessThan(1);
        expect(a.bossDamage).toBeLessThan(1);
      }
    }
  });
  it('keeps the reference pressure at or above the first level of the batch for all levels', () => {
    for (let id = 0; id < LEVEL_COUNT; id++) {
      const first = BATCH_STARTS.find((b) => b.batch === batchOf(id))!.first;
      const floor = Math.min(referencePressure(id), referencePressure(first));
      for (let s = 0; s <= 3; s++) {
        expect(assistedPressure(id, assistFactors(id, s))).toBeGreaterThanOrEqual(floor * 0.999999);
      }
    }
  });
  it('touches neither xp, coin nor contact scale (gold, xp, diamonds, parry stay)', () => {
    expect(Object.keys(assistFactors(5, 3)).sort()).toEqual([
      'bossDamage',
      'bossHp',
      'enemyHp',
      'spawnInterval',
    ]);
    const scale = enemyScaleFor(5);
    const assisted = { ...scale, hp: scale.hp * assistFactors(5, 3).enemyHp };
    expect(assisted.xp).toBe(scale.xp);
    expect(assisted.coin).toBe(scale.coin);
    expect(assisted.contact).toBe(scale.contact);
  });
});

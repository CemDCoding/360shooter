import { describe, expect, it } from 'vitest';
import { BATCH_STARTS, LEVEL_COUNT } from '../../src/config/levels';
import { tierFor, tierStage } from '../../src/logic/tier';

describe('tierStage', () => {
  it('is the index inside the batch at the batch borders', () => {
    const expected: [number, number][] = [
      [0, 0],
      [4, 4],
      [5, 0],
      [9, 4],
      [10, 0],
      [20, 10],
      [21, 0],
      [40, 9],
    ];
    for (const [id, stage] of expected) expect(tierStage(id), `level ${id}`).toBe(stage);
  });

  it('is derived from the batch starts for every level', () => {
    for (let id = 0; id < LEVEL_COUNT; id += 1) {
      const first = Math.max(...BATCH_STARTS.filter((s) => s.first <= id).map((s) => s.first));
      expect(tierStage(id)).toBe(id - first);
    }
  });

  it('is 0 for invalid ids', () => {
    for (const id of [-1, LEVEL_COUNT, 1.5, Number.NaN, Infinity]) expect(tierStage(id)).toBe(0);
  });
});

describe('tierFor', () => {
  it('leaves stage 0 unchanged', () => {
    for (const id of [0, 5, 10, 21, 26, 31]) {
      expect(tierFor(id)).toEqual({
        stage: 0,
        hpFactor: 1,
        damageFactor: 1,
        scale: 1,
        tintStep: 0,
      });
    }
  });

  it('adds +8 % hp and +5 % damage per stage, additive', () => {
    const t = tierFor(4);
    expect(t.hpFactor).toBeCloseTo(1.32);
    expect(t.damageFactor).toBeCloseTo(1.2);
    expect(tierFor(20).hpFactor).toBeCloseTo(1.8);
  });

  it('grows the size by 3 % per stage and caps it at 1.15', () => {
    expect(tierFor(2).scale).toBeCloseTo(1.06);
    expect(tierFor(9).scale).toBeCloseTo(1.12);
    expect(tierFor(15).scale).toBeCloseTo(1.15);
    for (let id = 0; id < LEVEL_COUNT; id += 1) expect(tierFor(id).scale).toBeLessThanOrEqual(1.15);
    expect(tierFor(20).scale).toBeCloseTo(1.15);
  });

  it('caps the tint step at 3', () => {
    expect(tierFor(2).tintStep).toBe(2);
    expect(tierFor(3).tintStep).toBe(3);
    expect(tierFor(20).tintStep).toBe(3);
  });
});

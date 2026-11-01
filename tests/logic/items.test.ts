import { describe, expect, it } from 'vitest';
import { DOUBLE_SHOT_STAGE_MS, ITEM_DROP_FACTOR, ITEMS, ITEM_RULES } from '../../src/config';
import type { ItemDef } from '../../src/contracts';
import { applyPowerItem, isExpired, rollDrop, scaledDropRate } from '../../src/logic/items';
import { emptyPowers } from '../../src/logic/powers';
import { createRng } from '../../src/logic/rng';

const def = (id: string): ItemDef => {
  const d = ITEMS.find((i) => i.id === id);
  if (!d) throw new Error(`missing item ${id}`);
  return d;
};
const always = { ...ITEM_RULES, dropChance: 1 };

describe('rollDrop', () => {
  it('drops at about dropChance, weighted by dropWeight (fixed seed)', () => {
    const rng = createRng(12345);
    const counts: Record<string, number> = {};
    let drops = 0;
    const n = 50000;
    for (let i = 0; i < n; i++) {
      const d = rollDrop(rng, ITEM_RULES, ITEMS);
      if (d) {
        drops++;
        counts[d.id] = (counts[d.id] ?? 0) + 1;
      }
    }
    expect(Math.abs(drops / n - ITEM_RULES.dropChance)).toBeLessThan(0.01);
    const total = ITEMS.reduce((s, d) => s + d.dropWeight, 0);
    for (const d of ITEMS) {
      const share = (counts[d.id] ?? 0) / drops;
      expect(Math.abs(share - d.dropWeight / total)).toBeLessThan(0.03);
    }
  });
  it('is reproducible with the same seed', () => {
    const a = createRng(9);
    const b = createRng(9);
    for (let i = 0; i < 50; i++)
      expect(rollDrop(a, always, ITEMS)).toEqual(rollDrop(b, always, ITEMS));
  });
  it('handles chance 0, empty and zero-weight lists', () => {
    expect(rollDrop(createRng(1), { ...ITEM_RULES, dropChance: 0 }, ITEMS)).toBeNull();
    expect(rollDrop(createRng(1), always, [])).toBeNull();
    const zero = ITEMS.map((d) => ({ ...d, dropWeight: 0 }));
    expect(rollDrop(createRng(1), always, zero)).toBeNull();
  });
  it('picks first and last entries at the roll extremes', () => {
    expect(rollDrop({ next: () => 0 }, always, ITEMS)).toBe(ITEMS[0]);
    expect(rollDrop({ next: () => 0.999999 }, always, ITEMS)).toBe(ITEMS[ITEMS.length - 1]);
  });
  it('falls back to the last def when rounding leaves the roll non-negative', () => {
    const seq = [0, 1];
    expect(rollDrop({ next: () => seq.shift() ?? 1 }, always, ITEMS)).toBe(ITEMS[ITEMS.length - 1]);
  });
});

describe('applyPowerItem double shot timer', () => {
  it('pickup resets the remaining time, also at stage 2', () => {
    const d = def('doubleShot');
    const s = applyPowerItem({ ...emptyPowers(), doubleShotStage: 2, doubleShotMsLeft: 3000 }, d);
    expect(s.doubleShotStage).toBe(2);
    expect(s.doubleShotMsLeft).toBe(DOUBLE_SHOT_STAGE_MS);
  });
});

describe('applyPowerItem', () => {
  it('doubleShot stacks up to maxStacks without mutating', () => {
    const s0 = emptyPowers();
    let s = s0;
    for (let i = 0; i < 5; i++) s = applyPowerItem(s, def('doubleShot'));
    expect(s.doubleShotStage).toBe(def('doubleShot').maxStacks);
    expect(s0.doubleShotStage).toBe(0);
  });
  it('shield adds perStack, capped at maxStacks * perStack', () => {
    const d = def('shield');
    let s = applyPowerItem(emptyPowers(), d);
    expect(s.shieldLeft).toBe(d.perStack);
    for (let i = 0; i < 6; i++) s = applyPowerItem(s, d);
    expect(s.shieldLeft).toBe(d.maxStacks * d.perStack);
  });
  it('rapidFire sets the duration and does not stack', () => {
    const d = def('rapidFire');
    let s = applyPowerItem({ ...emptyPowers(), rapidFireMsLeft: 1200 }, d);
    expect(s.rapidFireMsLeft).toBe(d.durationMs);
    s = applyPowerItem(s, d);
    expect(s.rapidFireMsLeft).toBe(d.durationMs);
  });
  it('heal leaves powers unchanged', () => {
    const s = { doubleShotStage: 1, shieldLeft: 10, rapidFireMsLeft: 100, doubleShotMsLeft: 0 };
    expect(applyPowerItem(s, def('heal'))).toEqual(s);
  });
});

describe('isExpired', () => {
  it('uses lifetime', () => {
    expect(isExpired(0, ITEM_RULES.lifetimeMs - 1, ITEM_RULES.lifetimeMs)).toBe(false);
    expect(isExpired(0, ITEM_RULES.lifetimeMs, ITEM_RULES.lifetimeMs)).toBe(true);
  });
});

describe('scaledDropRate (AP-146)', () => {
  it('multiplies the chance by the level factor', () => {
    expect(scaledDropRate(0.08, 20)).toBeCloseTo(0.08 * ITEM_DROP_FACTOR[20], 12);
    expect(scaledDropRate(0.08, 0)).toBeCloseTo(0.08 * ITEM_DROP_FACTOR[0], 12);
  });

  it('is clamped to 0..1', () => {
    expect(scaledDropRate(0, 5)).toBe(0);
    expect(scaledDropRate(-1, 5)).toBe(0);
    expect(scaledDropRate(100, 5)).toBe(1);
    expect(scaledDropRate(Number.NaN, 5)).toBe(0);
  });
});

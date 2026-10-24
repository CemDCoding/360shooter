import { describe, expect, it } from 'vitest';
import { ITEMS, ITEM_RULES } from '../../src/config';
import type { ItemDef } from '../../src/contracts';
import { applyItem, isExpired, rollDrop } from '../../src/logic/items';
import { createRng } from '../../src/logic/rng';
import { emptyStacks } from '../../src/logic/weapon';

const def = (id: string): ItemDef => {
  const d = ITEMS.find((i) => i.id === id);
  if (!d) throw new Error(`missing item ${id}`);
  return d;
};
// Alte Item-Typen sind nicht mehr in ITEMS (AP-27), applyItem kennt sie noch.
const legacy = (effect: 'fireRate' | 'damage' | 'size'): ItemDef => ({
  id: effect,
  effect,
  perStack: 0.2,
  maxStacks: 5,
  dropWeight: 30,
  spriteKey: `item-${effect}`,
});
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

describe('applyItem', () => {
  it('adds a stack without mutating input', () => {
    const s = emptyStacks();
    const r = applyItem(s, legacy('damage'));
    expect(r.stacks.damage).toBe(1);
    expect(s.damage).toBe(0);
    expect(r.heal).toBe(0);
  });
  it('caps at maxStacks', () => {
    let s = emptyStacks();
    const d = legacy('fireRate');
    for (let i = 0; i < d.maxStacks + 3; i++) s = applyItem(s, d).stacks;
    expect(s.fireRate).toBe(d.maxStacks);
  });
  it('heal keeps stacks and returns amount', () => {
    const s = { fireRate: 2, damage: 1, size: 0 };
    const r = applyItem(s, def('heal'));
    expect(r.stacks).toEqual(s);
    expect(r.heal).toBe(def('heal').perStack);
  });
  it('new effects leave stacks unchanged', () => {
    const s = { fireRate: 2, damage: 1, size: 0 };
    for (const effect of ['doubleShot', 'shield', 'rapidFire'] as const) {
      const r = applyItem(s, { ...legacy('damage'), effect });
      expect(r.stacks).toEqual(s);
      expect(r.heal).toBe(0);
    }
  });
});

describe('isExpired', () => {
  it('uses lifetime', () => {
    expect(isExpired(0, ITEM_RULES.lifetimeMs - 1, ITEM_RULES.lifetimeMs)).toBe(false);
    expect(isExpired(0, ITEM_RULES.lifetimeMs, ITEM_RULES.lifetimeMs)).toBe(true);
  });
});

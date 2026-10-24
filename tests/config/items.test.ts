import { describe, expect, it } from 'vitest';
import { ITEMS, ITEM_RULES, PLAYER, PROGRESSION, WEAPON_BASE } from '../../src/config';

describe('items and base values', () => {
  it('items have positive values and weights', () => {
    expect(ITEMS.map((i) => i.dropWeight)).toEqual([30, 30, 30, 10]);
    for (const i of ITEMS) {
      expect(i.perStack).toBeGreaterThan(0);
      expect(i.maxStacks).toBeGreaterThan(0);
      expect(i.dropWeight).toBeGreaterThan(0);
    }
    expect(ITEMS.filter((i) => i.effect !== 'heal').every((i) => i.maxStacks === 5)).toBe(true);
    expect(ITEM_RULES).toEqual({ dropChance: 0.08, lifetimeMs: 10000 });
  });

  it('weapon, player, progression', () => {
    expect(WEAPON_BASE.fireRatePerSec).toBe(4);
    expect(PLAYER).toEqual({ maxHp: 100, turnSpeedDegPerSec: 270 });
    expect(PROGRESSION.lossXpFactor).toBe(0.5);
  });
});

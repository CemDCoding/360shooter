import { describe, expect, it } from 'vitest';
import {
  ITEMS,
  ITEM_RULES,
  PLAYER,
  PROGRESSION,
  RAPID_FIRE_MAX_PER_SEC,
  WEAPON_BASE,
} from '../../src/config';

describe('items and base values', () => {
  it('has the four new items, old types are gone', () => {
    expect(ITEMS.map((i) => i.id)).toEqual(['doubleShot', 'shield', 'rapidFire', 'heal']);
    expect(ITEMS.map((i) => i.effect)).toEqual(['doubleShot', 'shield', 'rapidFire', 'heal']);
    expect(ITEMS.some((i) => ['fireRate', 'damage', 'size'].includes(i.effect))).toBe(false);
  });

  it('values and weights', () => {
    const by = Object.fromEntries(ITEMS.map((i) => [i.id, i]));
    expect(by.doubleShot).toMatchObject({ perStack: 1, maxStacks: 2 });
    expect(by.shield).toMatchObject({ perStack: 60, maxStacks: 2 });
    expect(by.rapidFire).toMatchObject({ maxStacks: 1, durationMs: 4000 });
    expect(by.heal).toMatchObject({ perStack: 25, maxStacks: 1 });
    expect(ITEMS.reduce((s, i) => s + i.dropWeight, 0)).toBe(100);
    for (const i of ITEMS) {
      expect(i.perStack).toBeGreaterThan(0);
      expect(i.maxStacks).toBeGreaterThan(0);
    }
    expect(ITEM_RULES).toEqual({ dropChance: 0.08, lifetimeMs: 10000 });
    expect(RAPID_FIRE_MAX_PER_SEC).toBe(20);
  });

  it('weapon, player, progression', () => {
    expect(WEAPON_BASE.fireRatePerSec).toBe(4);
    expect(PLAYER).toEqual({ maxHp: 100, turnSpeedDegPerSec: 360 });
    expect(PROGRESSION.lossXpFactor).toBe(0.5);
  });
});

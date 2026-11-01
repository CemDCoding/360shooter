import { describe, expect, it } from 'vitest';
import {
  DIAMOND_RULES,
  GEAR_PIECES,
  GEAR_SETS,
  GEAR_SLOTS,
  LEVEL_COUNT,
  MAP_FINAL_LEVELS,
  PET_IDS,
  SHOP_ITEMS,
  diamondsForLevel,
  gearIconIndex,
  getShopItem,
  petGearIconIndex,
  petGearTextureKey,
} from '../../src/config';

describe('shop config (PE-172, PE-173)', () => {
  it('has 21 items with unique ids', () => {
    expect(SHOP_ITEMS).toHaveLength(21);
    expect(new Set(SHOP_ITEMS.map((i) => i.id)).size).toBe(21);
  });

  it('has 3 eggs (5), 9 gear (3) and 9 pet gear (2), total 60', () => {
    const of = (c: string) => SHOP_ITEMS.filter((i) => i.category === c);
    expect(of('egg')).toHaveLength(3);
    expect(of('gear')).toHaveLength(9);
    expect(of('petGear')).toHaveLength(9);
    expect(of('egg').every((i) => i.price === 5)).toBe(true);
    expect(of('gear').every((i) => i.price === 3)).toBe(true);
    expect(of('petGear').every((i) => i.price === 2)).toBe(true);
    expect(SHOP_ITEMS.reduce((s, i) => s + i.price, 0)).toBe(60);
  });

  it('uses stable ids', () => {
    expect(getShopItem('egg-bee')).toMatchObject({ category: 'egg', petId: 'bee' });
    expect(getShopItem('gear-hell-body')).toMatchObject({
      category: 'gear',
      gearId: 'gear-hell-body',
      set: 'hell',
    });
    expect(getShopItem('petgear-penguin-heaven')).toMatchObject({
      category: 'petGear',
      petId: 'penguin',
      set: 'heaven',
    });
    for (const p of GEAR_PIECES) expect(getShopItem(p.id)?.gearId).toBe(p.id);
  });

  it('derives the last level of every map: 4, 9, 20, 25, 30, 40', () => {
    expect(MAP_FINAL_LEVELS).toEqual([4, 9, 20, 25, 30, 40]);
  });

  it('pays 53 diamonds in total', () => {
    expect(DIAMOND_RULES).toEqual({ perLevel: 1, perMapFinal: 3 });
    let sum = 0;
    for (let id = 0; id < LEVEL_COUNT; id++) sum += diamondsForLevel(id);
    expect(sum).toBe(53);
    expect(diamondsForLevel(3)).toBe(1);
    expect(diamondsForLevel(4)).toBe(3);
  });

  it('gear icon index = set * 3 + slot', () => {
    expect(gearIconIndex('diamond', 'head')).toBe(0);
    expect(gearIconIndex('diamond', 'legs')).toBe(2);
    expect(gearIconIndex('hell', 'body')).toBe(4);
    expect(gearIconIndex('heaven', 'legs')).toBe(8);
    const all = GEAR_SETS.flatMap((s) => GEAR_SLOTS.map((sl) => gearIconIndex(s, sl)));
    expect(all).toEqual([0, 1, 2, 3, 4, 5, 6, 7, 8]);
  });

  it('pet gear icon index = pet * 3 + set', () => {
    expect(petGearIconIndex('bee', 'diamond')).toBe(0);
    expect(petGearIconIndex('penguin', 'hell')).toBe(4);
    expect(petGearIconIndex('capybara', 'heaven')).toBe(8);
    const all = PET_IDS.flatMap((p) => GEAR_SETS.map((s) => petGearIconIndex(p, s)));
    expect(all).toEqual([0, 1, 2, 3, 4, 5, 6, 7, 8]);
  });

  it('texture key of pet gear', () => {
    expect(petGearTextureKey('bee', 'hell')).toBe('petgear-bee-hell');
  });
});

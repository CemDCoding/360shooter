import { describe, expect, it } from 'vitest';
import { LEVELS } from '../../src/config';
import { groupLevels } from '../../src/scenes/menu/levelGroups';
import {
  buyCaption,
  centerOffset,
  groupRange,
  isFreshSave,
  nextWeaponStage,
  pipStates,
  tileState,
} from '../../src/scenes/menu/menuLogic';

describe('tileState', () => {
  it('marks done, current and locked levels', () => {
    expect(tileState(3, 7)).toBe('done');
    expect(tileState(7, 7)).toBe('current');
    expect(tileState(8, 7)).toBe('locked');
  });
  it('first level is current on a fresh save', () => {
    expect(tileState(0, 0)).toBe('current');
    expect(tileState(1, 0)).toBe('locked');
  });
});

describe('groupRange', () => {
  it('uses the short hyphen for the three biome groups', () => {
    const ranges = groupLevels(LEVELS, 0).map(groupRange);
    expect(ranges).toEqual(['0-4', '5-9', '10-20']);
  });
});

describe('pipStates', () => {
  it('fills the first n of total pips', () => {
    expect(pipStates(3, 10).filter(Boolean)).toHaveLength(3);
    expect(pipStates(3, 10)).toHaveLength(10);
  });
  it('clamps below 0 and above total', () => {
    expect(pipStates(-2, 10).some(Boolean)).toBe(false);
    expect(pipStates(99, 10).every(Boolean)).toBe(true);
  });
});

describe('buyCaption', () => {
  it('shows price when affordable', () => {
    expect(buyCaption(27, 86)).toEqual({ text: 'KAUFEN 27', state: 'buy' });
  });
  it('shows ZU TEUER when gold is short', () => {
    expect(buyCaption(105, 86)).toEqual({ text: '105 ZU TEUER', state: 'poor' });
  });
  it('shows MAX at the end of the track', () => {
    expect(buyCaption(null, 999)).toEqual({ text: 'MAX', state: 'max' });
  });
});

describe('nextWeaponStage', () => {
  const limits = [6, 13, 20];
  it('names the next stage and the sum it starts at', () => {
    expect(nextWeaponStage(0, limits)).toEqual({ stage: 2, fromSum: 7 });
    expect(nextWeaponStage(1, limits)).toEqual({ stage: 3, fromSum: 14 });
  });
  it('is null on the last stage', () => {
    expect(nextWeaponStage(2, limits)).toBeNull();
  });
});

describe('isFreshSave', () => {
  it('is true only without xp, gold and progress', () => {
    expect(isFreshSave({ playerXp: 0, highestUnlockedLevel: 0 })).toBe(true);
    expect(isFreshSave({ playerXp: 0, highestUnlockedLevel: 0, gold: 0 })).toBe(true);
    expect(isFreshSave({ playerXp: 5, highestUnlockedLevel: 0 })).toBe(false);
    expect(isFreshSave({ playerXp: 0, highestUnlockedLevel: 1 })).toBe(false);
    expect(isFreshSave({ playerXp: 0, highestUnlockedLevel: 0, gold: 3 })).toBe(false);
  });
});

describe("centerOffset", () => {
  it("is 0 at the base width and centres wider arenas", () => {
    expect(centerOffset(640, 640)).toBe(0);
    expect(centerOffset(734, 640)).toBe(47);
    expect(centerOffset(800, 640)).toBe(80);
  });
  it("never goes negative", () => {
    expect(centerOffset(600, 640)).toBe(0);
  });
});

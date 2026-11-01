import { describe, expect, it } from 'vitest';
import { LEVEL_COUNT } from '../../src/config/levels';
import { diamondsForLevel } from '../../src/config/shop';
import { defaultSave } from '../../src/platform/storage';
import { applyFirstWin, migrateDiamonds } from '../../src/logic/diamonds';

describe('applyFirstWin', () => {
  it('level 3 gives 1, level 4 (map final) gives 3', () => {
    const a = applyFirstWin(defaultSave(), 3, 'won');
    expect(a.diamondsGained).toBe(1);
    expect(a.save.diamonds).toBe(1);
    expect(a.save.wonLevels).toEqual([3]);
    const b = applyFirstWin(a.save, 4, 'won');
    expect(b.diamondsGained).toBe(3);
    expect(b.save.diamonds).toBe(4);
  });
  it('second win gives nothing', () => {
    const a = applyFirstWin(defaultSave(), 3, 'won');
    const b = applyFirstWin(a.save, 3, 'won');
    expect(b.diamondsGained).toBe(0);
    expect(b.save).toBe(a.save);
  });
  it('a loss gives nothing and does not mark the level', () => {
    const r = applyFirstWin(defaultSave(), 3, 'lost');
    expect(r.diamondsGained).toBe(0);
    expect(r.save.wonLevels).toEqual([]);
  });
  it('ignores invalid level ids', () => {
    for (const id of [-1, LEVEL_COUNT, 1.5, NaN]) {
      expect(applyFirstWin(defaultSave(), id, 'won').diamondsGained).toBe(0);
    }
  });
  it('does not mutate the input', () => {
    const s = defaultSave();
    applyFirstWin(s, 0, 'won');
    expect(s.wonLevels).toEqual([]);
    expect(s.diamonds).toBe(0);
  });
});

describe('migrateDiamonds', () => {
  const old = (highest: number) => ({
    ...defaultSave(),
    wonLevels: undefined,
    highestUnlockedLevel: highest,
  });
  it('highest 10 gives levels 0..9 and 14 diamonds', () => {
    const m = migrateDiamonds(old(10));
    expect(m.wonLevels).toEqual([0, 1, 2, 3, 4, 5, 6, 7, 8, 9]);
    expect(m.diamonds).toBe(14);
  });
  it('highest 0 gives nothing', () => {
    expect(migrateDiamonds(old(0))).toMatchObject({ wonLevels: [], diamonds: 0 });
  });
  it('the last level never counts', () => {
    const m = migrateDiamonds(old(LEVEL_COUNT - 1));
    expect(m.wonLevels).toHaveLength(LEVEL_COUNT - 1);
    expect(m.wonLevels).not.toContain(LEVEL_COUNT - 1);
  });
  it('is idempotent: a save with wonLevels stays as it is', () => {
    const s = { ...defaultSave(), highestUnlockedLevel: 10 };
    expect(migrateDiamonds(s)).toBe(s);
  });
  it('sum equals diamondsForLevel over the levels', () => {
    let sum = 0;
    for (let i = 0; i < 20; i += 1) sum += diamondsForLevel(i);
    expect(migrateDiamonds(old(20)).diamonds).toBe(sum);
  });
});

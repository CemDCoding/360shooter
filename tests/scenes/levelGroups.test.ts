import { describe, expect, it } from 'vitest';
import { LEVELS } from '../../src/config';
import {
  formatDuration,
  groupLevels,
  isLevelUnlocked,
  xpFraction,
} from '../../src/scenes/menu/levelGroups';

describe('levelGroups', () => {
  it('groups all levels into three batches', () => {
    const g = groupLevels(LEVELS, 0);
    expect(g.map((x) => x.label)).toEqual(['Wald', 'Wald bei Nacht', 'Elfenwald']);
    expect(g.reduce((n, x) => n + x.cells.length, 0)).toBe(LEVELS.length);
  });
  it('treats highestUnlockedLevel as an index', () => {
    expect(isLevelUnlocked(0, 0)).toBe(true);
    expect(isLevelUnlocked(1, 0)).toBe(false);
    expect(isLevelUnlocked(3, 3)).toBe(true);
    const cells = groupLevels(LEVELS, 2).flatMap((x) => x.cells);
    expect(cells.filter((c) => c.unlocked).map((c) => c.id)).toEqual([0, 1, 2]);
  });
  it('formats durations', () => {
    expect(formatDuration(180)).toBe('3:00');
    expect(formatDuration(300)).toBe('5:00');
    expect(formatDuration(65)).toBe('1:05');
  });
  it('computes xp fraction safely', () => {
    expect(xpFraction(150, 100, 200)).toBe(0.5);
    expect(xpFraction(50, 100, 200)).toBe(0);
    expect(xpFraction(500, 100, 200)).toBe(1);
    expect(xpFraction(5, 10, 10)).toBe(1);
  });
});

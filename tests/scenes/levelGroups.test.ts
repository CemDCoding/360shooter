import { describe, expect, it } from 'vitest';
import { LEVELS } from '../../src/config';
import {
  BATCHES_PER_PAGE,
  BATCH_LABELS,
  BATCH_ORDER,
  pageCount,
  formatDuration,
  groupLevels,
  isLevelUnlocked,
  xpFraction,
} from '../../src/scenes/menu/levelGroups';

describe('levelGroups', () => {
  it('shows the three forest batches on page 0 (default)', () => {
    const g = groupLevels(LEVELS, 0);
    expect(g.map((x) => x.label)).toEqual(['Wald', 'Wald bei Nacht', 'Elfenwald']);
    expect(g.reduce((n, x) => n + x.cells.length, 0)).toBe(21);
    expect(groupLevels(LEVELS, 0, 0)).toEqual(g);
  });

  it('shows desert, pyramids and oasis on page 1 (AP-97)', () => {
    const g = groupLevels(LEVELS, 0, 1);
    expect(g.map((x) => x.batch)).toEqual(['desert', 'pyramids', 'oasis']);
    expect(g.map((x) => x.label)).toEqual(['Wüste', 'Pyramiden', 'Pyramiden-Oase']);
    expect(g.map((x) => [x.cells[0].id, x.cells[x.cells.length - 1].id])).toEqual([
      [21, 25],
      [26, 30],
      [31, 40],
    ]);
    expect(g.flatMap((x) => x.cells).every((c) => !c.unlocked)).toBe(true);
  });

  it('covers every level exactly once over all pages', () => {
    expect(pageCount(LEVELS)).toBe(2);
    const ids = [0, 1].flatMap((p) => groupLevels(LEVELS, 40, p).flatMap((g) => g.cells));
    expect(ids.map((c) => c.id)).toEqual(LEVELS.map((l) => l.id));
    expect(ids.every((c) => c.unlocked)).toBe(true);
  });

  it('gives an empty list for pages out of range or invalid', () => {
    for (const p of [2, -1, 0.5, Number.NaN]) expect(groupLevels(LEVELS, 0, p)).toEqual([]);
  });

  it('counts pages only for batches that have levels', () => {
    expect(pageCount([])).toBe(1);
    expect(pageCount(LEVELS.slice(0, 21))).toBe(1);
    expect(pageCount(LEVELS.slice(0, 22))).toBe(2);
  });

  it('has a label and an order entry for every batch', () => {
    expect(BATCH_ORDER).toEqual([
      'forest',
      'forestNight',
      'elfForest',
      'desert',
      'pyramids',
      'oasis',
    ]);
    expect(Object.keys(BATCH_LABELS).sort()).toEqual([...BATCH_ORDER].sort());
    expect(BATCHES_PER_PAGE).toBe(3);
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

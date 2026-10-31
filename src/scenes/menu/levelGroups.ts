import type { BatchId, LevelDef } from '../../contracts';

export interface LevelCell {
  id: number;
  durationSec: number;
  unlocked: boolean;
}

export interface LevelGroup {
  batch: BatchId;
  label: string;
  cells: LevelCell[];
}

export const BATCH_LABELS: Record<BatchId, string> = {
  forest: 'Wald',
  forestNight: 'Wald bei Nacht',
  elfForest: 'Elfenwald',
  desert: 'Wüste',
  pyramids: 'Pyramiden',
  oasis: 'Pyramiden-Oase',
};

/** Menu order of the batches (level order). */
export const BATCH_ORDER: readonly BatchId[] = [
  'forest',
  'forestNight',
  'elfForest',
  'desert',
  'pyramids',
  'oasis',
];

/** Batches per level select page (F-21). */
export const BATCHES_PER_PAGE = 3;

/** Number of level select pages for the batches that have levels (at least 1). */
export function pageCount(levels: readonly LevelDef[]): number {
  const used = BATCH_ORDER.filter((b) => levels.some((l) => l.batch === b)).length;
  return Math.max(1, Math.ceil(used / BATCHES_PER_PAGE));
}

/** highestUnlockedLevel is an index: level n is free if n <= highestUnlockedLevel. */
export function isLevelUnlocked(levelId: number, highestUnlockedLevel: number): boolean {
  return levelId <= highestUnlockedLevel;
}

/**
 * Groups levels by batch (in menu order) and marks which ones are unlocked. `page` selects
 * BATCHES_PER_PAGE batches (default page 0); invalid or out-of-range pages give an empty list.
 */
export function groupLevels(
  levels: readonly LevelDef[],
  highestUnlockedLevel: number,
  page = 0,
): LevelGroup[] {
  if (!Number.isInteger(page) || page < 0) return [];
  const used = BATCH_ORDER.filter((b) => levels.some((l) => l.batch === b));
  const start = page * BATCHES_PER_PAGE;
  return used
    .slice(start, start + BATCHES_PER_PAGE)
    .map((batch) => ({
      batch,
      label: BATCH_LABELS[batch],
      cells: levels
        .filter((l) => l.batch === batch)
        .map((l) => ({
          id: l.id,
          durationSec: l.durationSec,
          unlocked: isLevelUnlocked(l.id, highestUnlockedLevel),
        })),
    }))
    .filter((g) => g.cells.length > 0);
}

/** 180 -> "3:00" */
export function formatDuration(sec: number): string {
  const s = Math.max(0, Math.floor(sec));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

/** Progress 0..1 between the XP of the current level and the next one. */
export function xpFraction(xp: number, currentLevelXp: number, nextLevelXp: number): number {
  const span = nextLevelXp - currentLevelXp;
  if (!(span > 0)) return 1;
  return Math.min(1, Math.max(0, (xp - currentLevelXp) / span));
}

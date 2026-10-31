// Reine Hilfsfunktionen der Menü-Szenen (ohne Phaser, testbar).
import { THEME } from '../../config/theme';
import type { LevelDef } from '../../contracts';
import { groupLevels, pageCount, type LevelGroup } from './levelGroups';

export type TileState = 'done' | 'current' | 'locked';

/** Level unter dem höchsten freien sind geschafft, das höchste freie ist aktuell, alle darüber gesperrt. */
export function tileState(levelId: number, highestUnlockedLevel: number): TileState {
  if (levelId < highestUnlockedLevel) return 'done';
  return levelId === highestUnlockedLevel ? 'current' : 'locked';
}

/** Bereich einer Gruppe als Text, z. B. "0-4" (die Schrift hat nur den kurzen Strich). */
export function groupRange(group: LevelGroup): string {
  const first = group.cells[0]?.id ?? 0;
  const last = group.cells[group.cells.length - 1]?.id ?? first;
  return `${first}-${last}`;
}

/** Pips einer Upgrade-Zeile: `total` Felder, die ersten `level` sind gefüllt. */
export function pipStates(level: number, total: number): boolean[] {
  const filled = Math.min(Math.max(0, Math.floor(level)), total);
  return Array.from({ length: total }, (_, i) => i < filled);
}

/** Beschriftung des Kaufen-Knopfes je Zustand (Text, nie nur Farbe). */
export function buyCaption(
  cost: number | null,
  gold: number,
): { text: string; state: 'buy' | 'poor' | 'max' } {
  if (cost === null) return { text: 'MAX', state: 'max' };
  if (gold < cost) return { text: `${cost} ZU TEUER`, state: 'poor' };
  return { text: `KAUFEN ${cost}`, state: 'buy' };
}

/** Nächste Waffen-Ausbaustufe (1-basiert) und die Summe, ab der sie gilt; null bei der letzten Stufe. */
export function nextWeaponStage(
  stage: number,
  stageMaxUpgrades: readonly number[],
): { stage: number; fromSum: number } | null {
  if (stage >= stageMaxUpgrades.length - 1) return null;
  return { stage: stage + 2, fromSum: (stageMaxUpgrades[stage] ?? 0) + 1 };
}

/** Leerer Spielstand: noch nichts erspielt (Willkommens-Hinweis im Menü). */
export function isFreshSave(save: {
  playerXp: number;
  highestUnlockedLevel: number;
  gold?: number;
}): boolean {
  return save.playerXp === 0 && save.highestUnlockedLevel === 0 && (save.gold ?? 0) === 0;
}

export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface BevelRects {
  shadow: Rect;
  outline: Rect;
  fill: Rect;
  hi: Rect[];
  lo: Rect[];
}

/** Rechtecke einer Kassetten-Fläche: 2-px-Fase, 2-px-Umriss, 4-px-Schatten (mit 2 px Ausdehnung). */
export function bevelRects(x: number, y: number, w: number, h: number, shadow = true): BevelRects {
  const bevel = THEME.borderPx['border.menu'];
  const drop = THEME.spacePx['space.1'];
  return {
    shadow: shadow
      ? { x: x + drop - bevel, y: y + drop - bevel, w: w + 2 * bevel, h: h + 2 * bevel }
      : { x, y, w: 0, h: 0 },
    outline: { x: x - bevel, y: y - bevel, w: w + 2 * bevel, h: h + 2 * bevel },
    fill: { x, y, w, h },
    hi: [
      { x, y, w, h: bevel },
      { x, y, w: bevel, h },
    ],
    lo: [
      { x, y: y + h - bevel, w, h: bevel },
      { x: x + w - bevel, y, w: bevel, h },
    ],
  };
}

/** Dauer einer Bewegung in ms; bei „weniger Bewegung“ 0 (Grundsatz 7). */
export function motionMs(reduced: boolean, ms: number): number {
  return reduced ? 0 : ms;
}

// --- Level select pages (AP-107, F-21) ---

/** Slide of one page: 4 steps over 200 ms (plan AP-107, pixel easing). */
export const PAGE_SLIDE_MS = 200;
export const PAGE_SLIDE_STEPS = 4;
/** Horizontal swipe distance (px) from which a swipe turns the page. */
export const SWIPE_MIN_PX = 48;
/** From this many pages on, the pager shows "SEITE x / n" instead of one key per page. */
export const PAGER_INDICATOR_FROM = 10;

/** Keeps a page index inside 0..count-1 (NaN gives 0). */
export function clampPage(page: number, count: number): number {
  if (!Number.isFinite(page)) return 0;
  return Math.min(Math.max(0, Math.floor(page)), Math.max(1, count) - 1);
}

/** "A" for page 0, "B" for page 1 and so on. */
export function pageLetter(page: number): string {
  return String.fromCharCode(65 + (Math.max(0, Math.floor(page)) % 26));
}

/** "SEITE A" */
export function pageLabel(page: number): string {
  return `SEITE ${pageLetter(page)}`;
}

/** "SEITE 3 / 12" (1-based, for 10 or more pages). */
export function pageIndicator(page: number, count: number): string {
  return `SEITE ${clampPage(page, count) + 1} / ${Math.max(1, count)}`;
}

/** Whether the pager shows one key per page (fewer than 10 pages). */
export function pagerShowsKeys(count: number): boolean {
  return count < PAGER_INDICATOR_FROM;
}

/** First and last level id of a page, or null for an empty page. */
export function pageSpan(
  levels: readonly LevelDef[],
  page: number,
): { first: number; last: number } | null {
  const ids = groupLevels(levels, 0, page).flatMap((g) => g.cells.map((c) => c.id));
  if (ids.length === 0) return null;
  return { first: Math.min(...ids), last: Math.max(...ids) };
}

/** Range text of a page, e.g. "0-20" (the font has only the short hyphen). */
export function pageRange(levels: readonly LevelDef[], page: number): string {
  const span = pageSpan(levels, page);
  return span ? `${span.first}-${span.last}` : '';
}

/** Page that contains the level (0 if it is unknown). */
export function pageOfLevel(levels: readonly LevelDef[], levelId: number): number {
  const count = pageCount(levels);
  for (let p = 0; p < count; p++) {
    const span = pageSpan(levels, p);
    if (span && levelId >= span.first && levelId <= span.last) return p;
  }
  return 0;
}

/** The menu opens on the page of the current level (highestUnlockedLevel). */
export function startPage(levels: readonly LevelDef[], highestUnlockedLevel: number): number {
  return pageOfLevel(levels, Math.max(0, Math.floor(highestUnlockedLevel) || 0));
}

/** Arrow keys are disabled on the first and last page. */
export function arrowStates(page: number, count: number): { prev: boolean; next: boolean } {
  const p = clampPage(page, count);
  return { prev: p > 0, next: p < Math.max(1, count) - 1 };
}

/** Page after a step of -1 or +1, clamped. */
export function stepPage(page: number, dir: -1 | 1, count: number): number {
  return clampPage(page + dir, count);
}

/** Swipe left (dx <= -48) shows the next page (+1), swipe right the previous (-1), else 0. */
export function swipeDirection(dx: number, min = SWIPE_MIN_PX): -1 | 0 | 1 {
  if (!Number.isFinite(dx)) return 0;
  if (dx <= -min) return 1;
  if (dx >= min) return -1;
  return 0;
}

/** Is the whole page locked, i.e. its first level is not free yet? */
export function isPageLocked(
  levels: readonly LevelDef[],
  page: number,
  highestUnlockedLevel: number,
): boolean {
  const span = pageSpan(levels, page);
  return span !== null && span.first > highestUnlockedLevel;
}

/** Hint line in the header: note for a locked page, else welcome or tap hint. */
export function pageNote(
  levels: readonly LevelDef[],
  page: number,
  highestUnlockedLevel: number,
  fresh: boolean,
): { text: string; strong: boolean } {
  const span = pageSpan(levels, page);
  if (span && isPageLocked(levels, page, highestUnlockedLevel)) {
    return { text: `${pageLabel(page)} ÖFFNET SICH AB LEVEL ${span.first}.`, strong: false };
  }
  return fresh
    ? { text: 'Willkommen! Starte mit Level 0.', strong: true }
    : { text: 'Tippe auf ein freies Level.', strong: false };
}

/**
 * x offsets of the incoming page, one per step (the last is 0). `dir` +1 means the new page comes
 * from the right. With reduced motion there is a single step at 0 (instant switch).
 */
export function slideOffsets(distance: number, dir: -1 | 1, reduced: boolean): number[] {
  if (reduced) return [0];
  return Array.from({ length: PAGE_SLIDE_STEPS }, (_, i) => {
    const v = Math.round((distance * (PAGE_SLIDE_STEPS - 1 - i)) / PAGE_SLIDE_STEPS);
    return v === 0 ? 0 : dir * v;
  });
}

/** Horizontal offset that centres the base-width layout in a wider arena (PE-102); never negative. */
export function centerOffset(width: number, baseWidth: number): number {
  return Math.max(0, Math.round((width - baseWidth) / 2));
}

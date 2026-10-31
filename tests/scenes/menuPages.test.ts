import { describe, expect, it } from 'vitest';
import { LEVELS } from '../../src/config';
import { pageCount } from '../../src/scenes/menu/levelGroups';
import {
  PAGE_SLIDE_MS,
  PAGE_SLIDE_STEPS,
  SWIPE_MIN_PX,
  arrowStates,
  clampPage,
  isPageLocked,
  pageIndicator,
  pageLabel,
  pageNote,
  pageOfLevel,
  pageRange,
  pagerShowsKeys,
  slideOffsets,
  startPage,
  stepPage,
  swipeDirection,
} from '../../src/scenes/menu/menuLogic';

describe('level pages', () => {
  it('has two pages for 41 levels, A with 0-20 and B with 21-40', () => {
    expect(pageCount(LEVELS)).toBe(2);
    expect(pageLabel(0)).toBe('SEITE A');
    expect(pageLabel(1)).toBe('SEITE B');
    expect(pageRange(LEVELS, 0)).toBe('0-20');
    expect(pageRange(LEVELS, 1)).toBe('21-40');
  });
  it('opens on the page of the current level', () => {
    expect(startPage(LEVELS, 0)).toBe(0);
    expect(startPage(LEVELS, 20)).toBe(0);
    expect(startPage(LEVELS, 21)).toBe(1);
    expect(startPage(LEVELS, 40)).toBe(1);
    expect(startPage(LEVELS, 999)).toBe(0);
    expect(pageOfLevel(LEVELS, 27)).toBe(1);
  });
  it('clamps pages and steps', () => {
    expect(clampPage(-1, 2)).toBe(0);
    expect(clampPage(5, 2)).toBe(1);
    expect(clampPage(Number.NaN, 2)).toBe(0);
    expect(stepPage(1, 1, 2)).toBe(1);
    expect(stepPage(0, -1, 2)).toBe(0);
  });
  it('disables the arrows on the first and last page', () => {
    expect(arrowStates(0, 2)).toEqual({ prev: false, next: true });
    expect(arrowStates(1, 2)).toEqual({ prev: true, next: false });
    expect(arrowStates(0, 1)).toEqual({ prev: false, next: false });
  });
  it('shows keys below 10 pages and the indicator from 10', () => {
    expect(pagerShowsKeys(2)).toBe(true);
    expect(pagerShowsKeys(9)).toBe(true);
    expect(pagerShowsKeys(10)).toBe(false);
    expect(pageIndicator(2, 12)).toBe('SEITE 3 / 12');
    expect(pageLabel(2)).toBe('SEITE C');
  });
  it('locks page B until level 21 and says so', () => {
    expect(isPageLocked(LEVELS, 1, 7)).toBe(true);
    expect(isPageLocked(LEVELS, 1, 21)).toBe(false);
    expect(isPageLocked(LEVELS, 0, 0)).toBe(false);
    expect(pageNote(LEVELS, 1, 7, false).text).toBe('SEITE B ÖFFNET SICH AB LEVEL 21.');
    expect(pageNote(LEVELS, 0, 0, true)).toEqual({
      text: 'Willkommen! Starte mit Level 0.',
      strong: true,
    });
    expect(pageNote(LEVELS, 0, 7, false).text).toBe('Tippe auf ein freies Level.');
  });
  it('swipes from 48 px horizontally', () => {
    expect(SWIPE_MIN_PX).toBe(48);
    expect(swipeDirection(-47)).toBe(0);
    expect(swipeDirection(-48)).toBe(1);
    expect(swipeDirection(48)).toBe(-1);
    expect(swipeDirection(47)).toBe(0);
  });
  it('slides in 4 steps over 200 ms, instantly with reduced motion', () => {
    expect(PAGE_SLIDE_MS).toBe(200);
    expect(PAGE_SLIDE_STEPS).toBe(4);
    expect(slideOffsets(400, 1, false)).toEqual([300, 200, 100, 0]);
    expect(slideOffsets(400, -1, false)).toEqual([-300, -200, -100, 0]);
    expect(slideOffsets(400, 1, true)).toEqual([0]);
  });
});

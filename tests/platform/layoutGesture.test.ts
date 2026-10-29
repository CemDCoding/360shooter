import { describe, expect, it } from 'vitest';
import { HoldGesture, LAYOUT_GESTURE } from '../../src/platform/layoutGesture';

/** Puts three fingers down within the window, starting at t. Returns the due time. */
function threeDown(g: HoldGesture, t: number, blocked = false): number | null {
  g.touches(1, t, blocked);
  g.touches(2, t + 50, blocked);
  return g.touches(3, t + 100, blocked);
}

describe('HoldGesture', () => {
  it('three fingers held for 2 s fire once', () => {
    const g = new HoldGesture();
    const due = threeDown(g, 0);
    expect(due).toBe(100 + LAYOUT_GESTURE.holdMs);
    expect(g.check(1000, false)).toBe(false);
    expect(g.check(2100, false)).toBe(true);
    expect(g.check(3000, false)).toBe(false);
  });
  it('fires again only after all fingers were lifted', () => {
    const g = new HoldGesture();
    threeDown(g, 0);
    expect(g.check(2100, false)).toBe(true);
    g.touches(2, 2200, false);
    expect(g.touches(3, 2300, false)).toBeNull();
    g.touches(0, 2400, false);
    threeDown(g, 3000);
    expect(g.check(5100, false)).toBe(true);
  });
  it('one or two fingers (joystick, button) never fire', () => {
    const g = new HoldGesture();
    expect(g.touches(1, 0, false)).toBeNull();
    expect(g.touches(2, 10, false)).toBeNull();
    expect(g.check(5000, false)).toBe(false);
  });
  it('four fingers or lifting one finger cancels the hold', () => {
    const g = new HoldGesture();
    threeDown(g, 0);
    g.touches(4, 500, false);
    expect(g.check(2100, false)).toBe(false);
    const h = new HoldGesture();
    threeDown(h, 0);
    h.touches(2, 500, false);
    expect(h.check(2100, false)).toBe(false);
  });
  it('fingers arriving one by one too slowly do not start a hold', () => {
    const g = new HoldGesture();
    g.touches(1, 0, false);
    g.touches(2, 400, false);
    expect(g.touches(3, 700, false)).toBeNull();
    expect(g.check(3000, false)).toBe(false);
  });
  it('does nothing while a round runs', () => {
    const g = new HoldGesture();
    expect(threeDown(g, 0, true)).toBeNull();
    expect(g.check(2100, true)).toBe(false);
  });
  it('a round starting during the hold cancels it', () => {
    const g = new HoldGesture();
    threeDown(g, 0);
    expect(g.check(2100, true)).toBe(false);
    expect(g.check(2200, false)).toBe(false);
  });
  it('ignores garbage counts', () => {
    const g = new HoldGesture();
    expect(g.touches(Number.NaN, 0, false)).toBeNull();
    expect(g.check(5000, false)).toBe(false);
  });
});

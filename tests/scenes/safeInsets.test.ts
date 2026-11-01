import { describe, expect, it } from 'vitest';
import { SAFE_INSETS_KEY, type SafeInsets } from '../../src/contracts';
import { bossBarRect, powerSlotRects, STICK_CATCH_DIAMETER } from '../../src/scenes/hud/hudMath';
import {
  clampSpan,
  edge,
  edges,
  insetContentOffset,
  liftForBottom,
  NO_SAFE_INSETS,
  readSafeInsets,
  sideMargins,
  stickCenter,
} from '../../src/scenes/safeInsets';

const W = 780;
const H = 360;
const BOTH: SafeInsets = { top: 0, right: 43, bottom: 20, left: 43 };
const LEFT_ONLY: SafeInsets = { top: 0, right: 0, bottom: 20, left: 43 };
const RIGHT_ONLY: SafeInsets = { top: 0, right: 43, bottom: 20, left: 0 };
const base = { size: 40, gap: 8, margin: 8 };
const reg = (v: unknown) => ({ get: (k: string) => (k === SAFE_INSETS_KEY ? v : undefined) });

describe('readSafeInsets / edge', () => {
  it('missing or broken value means 0', () => {
    expect(readSafeInsets(reg(undefined))).toEqual(NO_SAFE_INSETS);
    expect(readSafeInsets(reg('x'))).toEqual(NO_SAFE_INSETS);
    expect(readSafeInsets(reg({ top: -3, right: NaN, bottom: 'a', left: 5 }))).toEqual({
      top: 0,
      right: 0,
      bottom: 0,
      left: 5,
    });
  });
  it('reads the registry value', () => {
    expect(readSafeInsets(reg(BOTH))).toEqual(BOTH);
  });
  it('edge is max(design margin, inset)', () => {
    expect(edge(8, 0)).toBe(8);
    expect(edge(8, 43)).toBe(43);
    expect(edge(24, 20)).toBe(24);
    expect(edge(8, NaN)).toBe(8);
  });
});

describe('HUD edges', () => {
  it('without insets every edge is the design margin (PC unchanged)', () => {
    for (const m of [8, 9, 11]) {
      expect(edges(m, NO_SAFE_INSETS)).toEqual({ top: m, right: m, bottom: m, left: m });
    }
  });
  it('no HUD anchor lies inside an inset strip, both and one-sided', () => {
    for (const ins of [BOTH, LEFT_ONLY, RIGHT_ONLY]) {
      for (const m of [8, 11]) {
        const e = edges(m, ins);
        expect(e.left).toBeGreaterThanOrEqual(ins.left);
        expect(e.right).toBeGreaterThanOrEqual(ins.right);
        expect(e.bottom).toBeGreaterThanOrEqual(ins.bottom);
        expect(e.top).toBeGreaterThanOrEqual(ins.top);
        // Pause button (top right), mute (left of it), energy (top left), slots (bottom left).
        const size = 32;
        const pauseRight = W - e.right;
        expect(pauseRight).toBeLessThanOrEqual(W - ins.right);
        expect(pauseRight - size - m - size).toBeGreaterThanOrEqual(ins.left);
        const slots = powerSlotRects(2, 1, H, base, e.bottom, e.left);
        for (const r of slots) {
          expect(r.x).toBeGreaterThanOrEqual(ins.left);
          expect(r.y + r.h).toBeLessThanOrEqual(H - ins.bottom);
        }
      }
    }
  });
  it('slots keep their old place when the left edge is not given', () => {
    expect(powerSlotRects(2, 1, H, base, 8, 8)).toEqual(powerSlotRects(2, 1, H, base, 8));
  });
  it('boss bar stays centred, moves inward only if it would reach an inset', () => {
    const plain = bossBarRect(640, H, 1, 200, 8, 8);
    expect(bossBarRect(640, H, 1, 200, 8, 8, { bottom: 8, minX: 8, maxX: 632 })).toEqual(plain);
    const bar = bossBarRect(W, H, 1, 200, 8, 8, { bottom: 20, minX: 43, maxX: W - 43 });
    expect(bar.x).toBe(290);
    expect(bar.y + bar.h).toBeLessThanOrEqual(H - 20);
    const narrow = bossBarRect(240, H, 1, 200, 8, 8, { minX: 43, maxX: 197 });
    expect(narrow.x).toBe(43);
  });
  it('clampSpan keeps a span inside the limits', () => {
    expect(clampSpan(100, 50, 43, 737)).toBe(100);
    expect(clampSpan(10, 50, 43, 737)).toBe(43);
    expect(clampSpan(720, 50, 43, 737)).toBe(687);
  });
});

describe('stick', () => {
  it('without insets: 24 from the edge, as before', () => {
    const r = STICK_CATCH_DIAMETER / 2;
    expect(stickCenter(640, 360, r, 24, NO_SAFE_INSETS)).toEqual({
      x: 640 - 24 - r,
      y: 360 - 24 - r,
    });
  });
  it('whole catch circle is above the home bar and left of the side inset', () => {
    const r = STICK_CATCH_DIAMETER / 2;
    for (const ins of [BOTH, RIGHT_ONLY, { ...BOTH, bottom: 40, right: 60 }]) {
      const c = stickCenter(W, H, r, 24, ins);
      expect(c.y + r).toBeLessThanOrEqual(H - ins.bottom);
      expect(c.x + r).toBeLessThanOrEqual(W - ins.right);
    }
  });
});

describe('result and menu', () => {
  it('result sides: 32 at 640, inset only where the centred layout is too close', () => {
    expect(sideMargins(32, 640, 640, 0, NO_SAFE_INSETS)).toEqual({ left: 32, right: 32 });
    // 780: offset 70 per side, inset 43 lies inside the offset
    expect(sideMargins(32, W, 640, 70, BOTH)).toEqual({ left: 32, right: 32 });
    // arena 700: offset 30, inset 43 -> 43 - 30 = 13 < 32, margin stays 32
    expect(sideMargins(32, 700, 640, 30, BOTH)).toEqual({ left: 32, right: 32 });
    expect(sideMargins(32, 640, 640, 0, BOTH)).toEqual({ left: 43, right: 43 });
    expect(sideMargins(32, 700, 640, 30, { ...BOTH, left: 80 })).toEqual({ left: 50, right: 32 });
  });
  it('result: all content lies outside the insets at 780 (text left edge, buttons right edge)', () => {
    const ox = 70;
    const s = sideMargins(32, W, 640, ox, BOTH);
    expect(ox + s.left).toBeGreaterThanOrEqual(BOTH.left);
    expect(W - (ox + 640 - s.right)).toBeGreaterThanOrEqual(BOTH.right);
    // Button row: centre at height - max(44, bottom + 24), 32 high.
    const y = H - Math.max(44, BOTH.bottom + 24);
    expect(y + 16).toBeLessThanOrEqual(H - BOTH.bottom);
  });
  it('menu offset: centred when it already clears the insets (PE-102 unchanged)', () => {
    expect(insetContentOffset(640, 640, NO_SAFE_INSETS)).toBe(0);
    expect(insetContentOffset(734, 640, NO_SAFE_INSETS)).toBe(47);
    expect(insetContentOffset(W, 640, BOTH)).toBe(70);
  });
  it('menu offset: moves away from an inset that the centred layout would touch', () => {
    expect(insetContentOffset(700, 640, { left: 43, right: 0 })).toBe(43);
    // No room for both insets: stay centred.
    expect(insetContentOffset(700, 640, BOTH)).toBe(30);
    expect(insetContentOffset(690, 640, { left: 0, right: 40 })).toBe(10);
  });
  it('menu: 640 content at 780 with insets 43 keeps the lowest row clear except the home bar', () => {
    const off = insetContentOffset(W, 640, BOTH);
    expect(off).toBeGreaterThanOrEqual(BOTH.left);
    expect(W - (off + 640)).toBeGreaterThanOrEqual(BOTH.right);
    // Lowest row ends at 348 of 360 (12 free) but the home bar needs 20: lift by 8.
    const lift = liftForBottom(H, 348, BOTH.bottom);
    expect(lift).toBe(8);
    expect(348 - lift).toBeLessThanOrEqual(H - BOTH.bottom);
    expect(liftForBottom(H, 348, 0)).toBe(0);
    expect(liftForBottom(H, 348, 12)).toBe(0);
  });
  it('upgrade panel (304 high, centred) and dialog stay clear of a 20 unit bottom inset', () => {
    expect((H - 304) / 2).toBeGreaterThanOrEqual(BOTH.bottom);
    expect(H / 2 + 112 / 2 - 18).toBeLessThanOrEqual(H - BOTH.bottom);
  });
});

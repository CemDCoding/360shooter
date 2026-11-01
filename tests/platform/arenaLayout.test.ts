import { describe, expect, it } from 'vitest';
import {
  ArenaWidthController,
  hostBoxFor,
  insetsInArenaUnits,
  measureArena,
} from '../../src/platform/arenaLayout';
import { ARENA } from '../../src/config/arena';

// Photo IMG_6372: iPhone landscape home screen app, 852x393, insets t0 r47 b21 l47.
const photo = {
  probeW: 852,
  probeH: 393,
  insets: { top: 0, right: 47, bottom: 21, left: 47 },
  vv: { width: 852, height: 393, offsetLeft: 0, offsetTop: 0 },
  win: { width: 852, height: 393 },
};

describe('measureArena', () => {
  it('photo values (852x393, insets 0/47/21/47) want 780 from the whole area (PE-140)', () => {
    const m = measureArena(photo);
    expect(m.availW).toBe(758); // room inside the insets, only for the overlay
    expect(m.availH).toBe(372);
    expect(m.wantedW).toBe(780);
  });
  it('host box covers the whole screen (852x393 +-1), not the safe area', () => {
    const m = measureArena(photo);
    const box = hostBoxFor(m.area, m.wantedW);
    expect(Math.abs(box.left)).toBeLessThanOrEqual(1);
    expect(Math.abs(box.top)).toBeLessThanOrEqual(1);
    expect(852 - box.width).toBeLessThanOrEqual(1);
    expect(393 - box.height).toBeLessThanOrEqual(1);
  });
  it('insets in arena units: about 0/43/20/43, rounded up', () => {
    const { wantedInsets: i } = measureArena(photo);
    expect(i.top).toBe(0);
    expect(Math.abs(i.right - 43)).toBeLessThanOrEqual(1);
    expect(Math.abs(i.bottom - 20)).toBeLessThanOrEqual(1);
    expect(Math.abs(i.left - 43)).toBeLessThanOrEqual(1);
  });
  it('mirrored and one-sided insets give the same width and the same box', () => {
    const base = measureArena(photo);
    const variants = [
      { top: 0, right: 21, bottom: 47, left: 47 },
      { top: 0, right: 47, bottom: 21, left: 0 },
      { top: 0, right: 0, bottom: 0, left: 0 },
    ];
    for (const insets of variants) {
      const m = measureArena({ ...photo, insets });
      expect(m.wantedW).toBe(780);
      expect(hostBoxFor(m.area, m.wantedW)).toEqual(hostBoxFor(base.area, base.wantedW));
    }
    const left = measureArena({ ...photo, insets: { top: 0, right: 0, bottom: 21, left: 47 } });
    const right = measureArena({ ...photo, insets: { top: 0, right: 47, bottom: 21, left: 0 } });
    expect(left.wantedInsets.left).toBe(right.wantedInsets.right);
    expect(left.wantedInsets.right).toBe(0);
  });
  it('with width 640 the box would leave bars (why the width follows the screen)', () => {
    const box = hostBoxFor(measureArena(photo).area, 640);
    expect(box.width).toBeLessThan(800);
  });
  it('insetsInArenaUnits rounds up, never goes negative, survives garbage', () => {
    const z = { top: 0, right: 0, bottom: 0, left: 0 };
    expect(insetsInArenaUnits({ top: 1, right: 10, bottom: 10.01, left: -5 }, 2)).toEqual({
      top: 1,
      right: 5,
      bottom: 6,
      left: 0,
    });
    expect(insetsInArenaUnits({ top: 5, right: NaN, bottom: 5, left: 5 }, 0)).toEqual(z);
    expect(insetsInArenaUnits({ top: 5, right: 5, bottom: 5, left: 5 }, NaN)).toEqual(z);
  });
  it('iPad 4:3 (1024x768): 640, bars top and bottom, bars eat the inset', () => {
    const m = measureArena({
      probeW: 1024,
      probeH: 768,
      insets: { top: 20, right: 0, bottom: 20, left: 0 },
      vv: null,
      win: { width: 1024, height: 768 },
    });
    expect(m.wantedW).toBe(640);
    const box = hostBoxFor(m.area, 640);
    expect(box.left).toBe(0);
    expect(box.width).toBe(1024);
    expect(box.top).toBe(96); // (768 - 576) / 2 bar each
    expect(m.wantedInsets).toEqual({ top: 0, right: 0, bottom: 0, left: 0 });
  });
  it('desktop window and aspect ratios stay within 640..900', () => {
    const cases: [number, number, number][] = [
      [1280, 720, 640],
      [1920, 1080, 640],
      [1000, 500, 720],
      [900, 400, 810],
      [800, 600, 640],
      [1600, 400, 900],
    ];
    for (const [w, h, want] of cases) {
      const m = measureArena({
        probeW: w,
        probeH: h,
        insets: { top: 0, right: 0, bottom: 0, left: 0 },
        vv: null,
        win: { width: w, height: h },
      });
      expect(m.wantedW).toBe(want);
    }
  });
  it('portrait or garbage input falls back to the minimum width', () => {
    const m = measureArena({
      probeW: 0,
      probeH: Number.NaN,
      insets: { top: 0, right: 0, bottom: 0, left: 0 },
      vv: null,
      win: null,
    });
    expect(m.wantedW).toBe(640);
  });
});

/*
 * AP-96 diagnosis states, iPhone 15 landscape 852x393, insets t0 r47 b21 l47. Safari with toolbar:
 * the bar takes the top of the layout viewport; 51 pt is an assumed bar height (no device at hand),
 * every bar taller than 31 pt gives the same result (availH < 341 gives want 850 or more, at most maxWidth 900).
 */
const phone = (h: number) => ({
  probeW: 852,
  probeH: h,
  insets: { top: 0, right: 47, bottom: 21, left: 47 },
  vv: { width: 852, height: h, offsetLeft: 0, offsetTop: 0 },
  win: { width: 852, height: h },
});
const restLeft = (h: number, w: number): number => hostBoxFor(measureArena(phone(h)).area, w).left;

describe('AP-96 diagnosis states', () => {
  it('home screen app / Safari without bar (393): want 780, rest <= 1 per side', () => {
    const m = measureArena(phone(393));
    expect([m.availW, m.availH, m.wantedW]).toEqual([758, 372, 780]);
    const box = hostBoxFor(m.area, m.wantedW);
    expect(box.width).toBe(851);
    expect(box.height).toBe(392); // 392.99 floored, rest <= 1
    expect(box.left).toBeCloseTo(0.25, 1);
  });
  it('Safari with bar (342): want 897 (852/342), rest <= 1, insets by the smaller scale', () => {
    const m = measureArena(phone(342));
    expect([m.availW, m.availH, m.wantedW]).toEqual([758, 321, 897]);
    const box = hostBoxFor(m.area, m.wantedW);
    expect(box.height).toBe(341);
    expect(box.width).toBe(852);
    expect(852 - box.width).toBeLessThanOrEqual(1);
    expect(342 - box.height).toBeLessThanOrEqual(1);
    expect(m.wantedInsets).toEqual({ top: 0, right: 50, bottom: 23, left: 50 });
  });
  it('capped at 900 (height 330): a rest of 27 px per side stays, as computed', () => {
    const m = measureArena(phone(330));
    expect(m.wantedW).toBe(900);
    const box = hostBoxFor(m.area, 900);
    expect(box.width).toBe(825);
    expect(box.left).toBeCloseTo(13.5, 5);
  });
  it('want rises above 798 for bars taller than 31 pt, rest stays <= 1', () => {
    expect(measureArena(phone(363)).wantedW).toBe(845);
    expect(measureArena(phone(362)).wantedW).toBe(847);
    expect(restLeft(363, 845)).toBeLessThanOrEqual(1);
  });
  it('want never exceeds ARENA.maxWidth (900)', () => {
    for (let h = 100; h <= 393; h += 1)
      expect(measureArena(phone(h)).wantedW).toBeLessThanOrEqual(ARENA.maxWidth);
  });
  it('PC 1280x720: 640, no bars', () => {
    const m = measureArena({
      probeW: 1280,
      probeH: 720,
      insets: { top: 0, right: 0, bottom: 0, left: 0 },
      vv: { width: 1280, height: 720, offsetLeft: 0, offsetTop: 0 },
      win: { width: 1280, height: 720 },
    });
    expect(m.wantedW).toBe(640);
    expect(hostBoxFor(m.area, 640)).toEqual({ left: 0, top: 0, width: 1280, height: 720 });
  });
  it('bar only in visualViewport (probe still 393): covered home bar inset dropped, 897', () => {
    const m = measureArena({
      ...phone(393),
      vv: { width: 852, height: 342, offsetLeft: 0, offsetTop: 0 },
    });
    expect(m.area.insets.bottom).toBe(0);
    expect(m.wantedInsets.bottom).toBe(0);
    expect(m.availH).toBe(342);
    expect(m.wantedW).toBe(897);
  });
  it('PC 1920x1080: 640, insets 0', () => {
    const m = measureArena({
      probeW: 1920,
      probeH: 1080,
      insets: { top: 0, right: 0, bottom: 0, left: 0 },
      vv: null,
      win: { width: 1920, height: 1080 },
    });
    expect(m.wantedW).toBe(640);
    expect(m.wantedInsets).toEqual({ top: 0, right: 0, bottom: 0, left: 0 });
    expect(hostBoxFor(m.area, 640)).toEqual({ left: 0, top: 0, width: 1920, height: 1080 });
  });
});

describe('ArenaWidthController insets (PE-109, PE-141, Q-61)', () => {
  const a = { top: 0, right: 43, bottom: 20, left: 43 };
  const b = { top: 0, right: 20, bottom: 43, left: 0 };
  it('applies width and insets together outside a round', () => {
    const c = new ArenaWidthController();
    c.want(780, a);
    expect(c.currentInsets).toEqual(a);
    expect(c.want(780, b)).toBe(780); // same width, flipped notch: still a change
    expect(c.currentInsets).toEqual(b);
    expect(c.want(780, b)).toBeNull();
  });
  it('keeps width and insets fixed during a round, applies both at its end', () => {
    const c = new ArenaWidthController();
    c.want(780, a);
    c.roundStart();
    expect(c.want(897, b)).toBeNull();
    expect([c.currentW, c.currentInsets]).toEqual([780, a]);
    expect(c.roundEnd()).toBe(897);
    expect([c.currentW, c.currentInsets]).toEqual([897, b]);
  });
  it('insets alone are deferred during a round, too', () => {
    const c = new ArenaWidthController();
    c.want(780, a);
    c.roundStart();
    expect(c.want(780, b)).toBeNull();
    expect(c.currentInsets).toEqual(a);
    expect(c.roundEnd()).toBe(780);
    expect(c.currentInsets).toEqual(b);
  });
});

describe('ArenaWidthController', () => {
  it('round end without SHUTDOWN (H-b): the width is applied once no round exists', () => {
    const c = new ArenaWidthController();
    c.want(734);
    c.roundStart();
    expect(c.want(800)).toBeNull(); // bar shown during the round
    expect(c.syncRound(true)).toBeNull(); // still running (or paused)
    expect(c.currentW).toBe(734);
    expect(c.syncRound(false)).toBe(800); // round gone, no SHUTDOWN seen
    expect([c.currentW, c.roundRunning, c.lastChange]).toEqual([800, false, 'end']);
    expect(c.syncRound(false)).toBeNull();
  });
  it('a round seen without START is frozen without changing the width', () => {
    const c = new ArenaWidthController();
    c.want(734);
    expect(c.syncRound(true)).toBeNull();
    expect(c.roundRunning).toBe(true);
    expect(c.want(800)).toBeNull();
    expect(c.currentW).toBe(734);
  });
  it('Safari bar on and off between rounds: want = now after each change, no repeat', () => {
    const c = new ArenaWidthController();
    c.want(measureArena(phone(393)).wantedW);
    const seq = [342, 393, 342, 393];
    for (const h of seq) {
      const w = measureArena(phone(h)).wantedW;
      expect(c.want(w)).toBe(w);
      expect(c.currentW).toBe(c.wantedW);
      // A relayout caused by setGameSize measures the same size: nothing to apply again.
      expect(c.want(w)).toBeNull();
      expect(c.syncRound(false)).toBeNull();
    }
    expect(c.changeCount).toBe(seq.length);
  });
  it('bar toggled during a round: fixed until the end, then want = now', () => {
    const c = new ArenaWidthController();
    c.want(734);
    c.roundStart();
    c.want(800);
    c.want(734);
    c.want(800);
    expect(c.currentW).toBe(734);
    expect(c.roundEnd()).toBe(800);
    expect(c.currentW).toBe(c.wantedW);
  });
  it('first measurement sets the width without an action', () => {
    const c = new ArenaWidthController();
    expect(c.want(734)).toBeNull();
    expect(c.currentW).toBe(734);
  });
  it('applies a changed width at once outside a round (want = now)', () => {
    const c = new ArenaWidthController();
    c.want(640);
    expect(c.want(734)).toBe(734);
    expect(c.currentW).toBe(c.wantedW);
  });
  it('keeps the width during a round and applies it when the round ends', () => {
    const c = new ArenaWidthController();
    c.want(640);
    expect(c.roundStart()).toBeNull();
    expect(c.want(734)).toBeNull();
    expect(c.currentW).toBe(640);
    expect(c.wantedW).toBe(734);
    expect(c.roundEnd()).toBe(734);
    expect(c.currentW).toBe(734);
  });
  it('a paused round (no end) keeps the width fixed', () => {
    const c = new ArenaWidthController();
    c.want(640);
    c.roundStart();
    expect(c.want(734)).toBeNull();
    expect(c.want(734)).toBeNull();
    expect(c.currentW).toBe(640);
  });
  it('"Nochmal": shutdown then start applies the wanted width before the new round', () => {
    const c = new ArenaWidthController();
    c.want(640);
    c.roundStart();
    c.want(734); // deferred
    expect(c.roundEnd()).toBe(734);
    expect(c.roundStart()).toBeNull();
    expect(c.currentW).toBe(734);
    expect(c.want(734)).toBeNull();
  });
  it('counts applied changes and remembers the reason of the last one', () => {
    const c = new ArenaWidthController();
    c.want(640);
    expect(c.changeCount).toBe(0);
    expect(c.lastChange).toBeNull();
    c.want(734);
    expect([c.changeCount, c.lastChange]).toEqual([1, 'want']);
    c.roundStart();
    c.want(800);
    expect(c.changeCount).toBe(1);
    c.roundEnd();
    expect([c.changeCount, c.lastChange]).toEqual([2, 'end']);
    c.want(734);
    c.roundStart();
    expect([c.changeCount, c.lastChange]).toEqual([3, 'want']);
  });
  it('a round started with a stale width gets the wanted width at its start', () => {
    const c = new ArenaWidthController();
    c.want(640);
    // wanted changed without a relayout in between: start applies it
    c.want(734);
    expect(c.currentW).toBe(734);
    const d = new ArenaWidthController();
    d.want(640);
    expect(d.roundStart()).toBeNull();
    expect(d.roundRunning).toBe(true);
    d.roundEnd();
    expect(d.roundRunning).toBe(false);
  });
});

import { describe, expect, it } from 'vitest';
import { ArenaWidthController, hostBoxFor, measureArena } from '../../src/platform/arenaLayout';
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
  it('photo values (758x372 safe area) want 734, not 640', () => {
    const m = measureArena(photo);
    expect(m.availW).toBe(758);
    expect(m.availH).toBe(372);
    expect(m.wantedW).toBe(734);
  });
  it('host box fills the safe area width with the wanted width', () => {
    const m = measureArena(photo);
    const box = hostBoxFor(m.area, m.wantedW);
    expect(box.left).toBeCloseTo(47, 0);
    expect(758 - box.width).toBeLessThanOrEqual(2);
    expect(372 - box.height).toBeLessThanOrEqual(2);
  });
  it('with width 640 the same box leaves bars (the bug of the photo)', () => {
    const box = hostBoxFor(measureArena(photo).area, 640);
    expect(box.width).toBeLessThan(670);
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
  it('home screen app / Safari without bar (393): want 734, rest = inset 47 per side (H-e)', () => {
    const m = measureArena(phone(393));
    expect([m.availW, m.availH, m.wantedW]).toEqual([758, 372, 734]);
    const box = hostBoxFor(m.area, m.wantedW);
    expect(box.width).toBe(758);
    expect(box.height).toBe(371);
    expect(box.left).toBeCloseTo(47, 5);
  });
  it('Safari with bar (342): want 850, rest = inset (47 plus rounding)', () => {
    const m = measureArena(phone(342));
    expect([m.availW, m.availH, m.wantedW]).toEqual([758, 321, 850]);
    const box = hostBoxFor(m.area, m.wantedW);
    expect(box.height).toBe(321);
    expect(box.width).toBe(757);
    expect(restLeft(342, 850)).toBeLessThan(48.5);
  });
  it('want rises above 798 for bars taller than 31 pt', () => {
    expect(measureArena(phone(363)).wantedW).toBe(798);
    expect(measureArena(phone(362)).wantedW).toBe(800);
    expect(restLeft(363, 798)).toBeLessThan(48);
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
  it('bar only in visualViewport (probe still 393): covered home bar inset dropped, 798', () => {
    const m = measureArena({
      ...phone(393),
      vv: { width: 852, height: 342, offsetLeft: 0, offsetTop: 0 },
    });
    expect(m.area.insets.bottom).toBe(0);
    expect(m.availH).toBe(342);
    expect(m.wantedW).toBe(798);
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

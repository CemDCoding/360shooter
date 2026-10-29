import { describe, expect, it } from 'vitest';
import { ArenaWidthController, hostBoxFor, measureArena } from '../../src/platform/arenaLayout';

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
  it('desktop window and aspect ratios stay within 640..800', () => {
    const cases: [number, number, number][] = [
      [1280, 720, 640],
      [1920, 1080, 640],
      [1000, 500, 720],
      [900, 400, 800],
      [800, 600, 640],
      [1600, 400, 800],
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

describe('ArenaWidthController', () => {
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

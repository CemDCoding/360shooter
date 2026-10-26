import { describe, expect, it } from 'vitest';
import {
  BASE_HUD_FONT,
  clampedArea,
  fitArena,
  hudScale,
  MIN_HUD_FONT_CSS,
  RELAYOUT_DELAYS_MS,
  visibleArea,
} from '../../src/platform/layout';

const none = { top: 0, right: 0, bottom: 0, left: 0 };

describe('fitArena', () => {
  it('landscape with notch: fully visible, centred in safe area', () => {
    const f = fitArena(844, 390, { top: 0, right: 0, bottom: 0, left: 47 }, 640, 360);
    expect(f.offsetX).toBeGreaterThanOrEqual(47);
    expect(f.offsetX + f.width).toBeLessThanOrEqual(844 + 0.001);
    expect(f.offsetY).toBeGreaterThanOrEqual(0);
    expect(f.offsetY + f.height).toBeLessThanOrEqual(390 + 0.001);
    expect(Math.abs(f.offsetX + f.width / 2 - (47 + (844 - 47) / 2))).toBeLessThanOrEqual(1);
    expect(Math.abs(f.offsetY + f.height / 2 - 195)).toBeLessThanOrEqual(1);
  });
  it('portrait gives a valid scale', () => {
    const f = fitArena(390, 844, none, 640, 360);
    expect(f.scale).toBeGreaterThan(0);
    expect(f.width).toBeCloseTo(390);
    expect(f.offsetY).toBeGreaterThan(0);
  });
  it('desktop 1280x720 is exact 2x without offset', () => {
    const f = fitArena(1280, 720, none, 640, 360);
    expect(f).toMatchObject({ scale: 2, offsetX: 0, offsetY: 0 });
  });
  it('survives degenerate input', () => {
    const f = fitArena(0, NaN, { top: 99, right: 99, bottom: 99, left: 99 }, 640, 360);
    expect(Number.isFinite(f.scale) && f.scale > 0).toBe(true);
  });
});

describe('hudScale', () => {
  it('keeps font >= minimum on phone screens', () => {
    for (const h of [320, 390, 430, 600]) {
      const px = BASE_HUD_FONT * hudScale(h) * (h / 360);
      expect(px).toBeGreaterThanOrEqual(MIN_HUD_FONT_CSS - 1e-9);
    }
  });
  it('is 1 on desktop (unchanged look)', () => {
    expect(hudScale(720)).toBe(1);
    expect(hudScale(1080)).toBe(1);
  });
  it('never below 1 and finite', () => {
    expect(hudScale(0)).toBeGreaterThanOrEqual(1);
    expect(Number.isFinite(hudScale(NaN))).toBe(true);
  });
});

describe('visibleArea + fitArena on iPhone landscape sizes', () => {
  const phones: [number, number, number][] = [
    [844, 390, 47],
    [932, 430, 59],
    [667, 375, 0],
  ];
  for (const [w, h, notch] of phones) {
    for (const visH of [h, h - 50]) {
      it(`${w}x${h} notch ${notch}, visible height ${visH}: arena inside safe area, centred`, () => {
        const probeInsets = { top: 0, right: notch, bottom: notch ? 21 : 0, left: notch };
        const vv = { width: w, height: visH, offsetLeft: 0, offsetTop: 0 };
        const a = visibleArea(w, h, probeInsets, vv);
        const f = fitArena(a.width, a.height, a.insets, 640, 360);
        const left = a.x + f.offsetX;
        const top = a.y + f.offsetY;
        const areaL = a.x + a.insets.left;
        const areaR = a.x + a.width - a.insets.right;
        const areaT = a.y + a.insets.top;
        const areaB = a.y + a.height - a.insets.bottom;
        expect(left).toBeGreaterThanOrEqual(areaL - 1e-6);
        expect(left + f.width).toBeLessThanOrEqual(areaR + 1e-6);
        expect(top).toBeGreaterThanOrEqual(areaT - 1e-6);
        expect(top + f.height).toBeLessThanOrEqual(areaB + 1e-6);
        expect(Math.abs(left + f.width / 2 - (areaL + areaR) / 2)).toBeLessThanOrEqual(1);
        expect(Math.abs(top + f.height / 2 - (areaT + areaB) / 2)).toBeLessThanOrEqual(1);
        expect(top + f.height).toBeLessThanOrEqual(visH + 1e-6);
      });
    }
  }
  it('without visualViewport the probe size is used unchanged', () => {
    const ins = { top: 0, right: 47, bottom: 21, left: 47 };
    expect(visibleArea(844, 390, ins, null)).toEqual({
      x: 0,
      y: 0,
      width: 844,
      height: 390,
      insets: ins,
    });
  });
  it('a hidden home bar inset is dropped when the toolbar covers the bottom', () => {
    const a = visibleArea(
      844,
      390,
      { top: 0, right: 0, bottom: 21, left: 0 },
      { width: 844, height: 340, offsetLeft: 0, offsetTop: 0 },
    );
    expect(a.insets.bottom).toBe(0);
    expect(a.height).toBe(340);
  });
  it('portrait and degenerate input do not crash', () => {
    const a = visibleArea(
      390,
      844,
      { top: 47, right: 0, bottom: 34, left: 0 },
      { width: NaN, height: 0, offsetLeft: -5, offsetTop: NaN },
    );
    expect(a.width).toBe(390);
    expect(fitArena(a.width, a.height, a.insets, 640, 360).scale).toBeGreaterThan(0);
  });
  it('desktop stays identical to the plain fit', () => {
    for (const [w, h] of [
      [1280, 720],
      [1920, 1080],
    ]) {
      const a = visibleArea(w, h, none, { width: w, height: h, offsetLeft: 0, offsetTop: 0 });
      expect(fitArena(a.width, a.height, a.insets, 640, 360)).toEqual(
        fitArena(w, h, none, 640, 360),
      );
    }
  });
});

describe('clampedArea (AP-63, stale start values)', () => {
  // Insets are assumptions (not measured): left/right 47 (59 for iPhone 15), bottom 21.
  const cases = [
    {
      name: '844x390',
      win: [844, 390],
      stale: [932, 430],
      ins: { top: 0, right: 47, bottom: 21, left: 47 },
    },
    {
      name: '667x375',
      win: [667, 375],
      stale: [736, 414],
      ins: { top: 0, right: 44, bottom: 21, left: 44 },
    },
    {
      name: '852x393 iPhone 15',
      win: [852, 393],
      stale: [932, 430],
      ins: { top: 0, right: 59, bottom: 21, left: 59 },
    },
  ];
  for (const c of cases) {
    it(`${c.name}: arena inside safe area and centred despite a stale probe`, () => {
      const [ww, wh] = c.win as [number, number];
      const a = clampedArea(c.stale[0]!, c.stale[1]!, c.ins, null, { width: ww, height: wh });
      const f = fitArena(a.width, a.height, a.insets, 640, 360);
      const x = a.x + f.offsetX;
      const y = a.y + f.offsetY;
      expect(x).toBeGreaterThanOrEqual(c.ins.left - 0.001);
      expect(x + f.width).toBeLessThanOrEqual(ww - c.ins.right + 0.001);
      expect(y).toBeGreaterThanOrEqual(c.ins.top - 0.001);
      expect(y + f.height).toBeLessThanOrEqual(wh - c.ins.bottom + 0.001);
      const cx = c.ins.left + (ww - c.ins.left - c.ins.right) / 2;
      const cy = c.ins.top + (wh - c.ins.top - c.ins.bottom) / 2;
      expect(Math.abs(x + f.width / 2 - cx)).toBeLessThanOrEqual(1);
      expect(Math.abs(y + f.height / 2 - cy)).toBeLessThanOrEqual(1);
    });
  }
  it('ignores missing or invalid window sizes', () => {
    const a = clampedArea(844, 390, none, null, { width: NaN, height: 0 });
    expect(a).toMatchObject({ width: 844, height: 390 });
    expect(clampedArea(844, 390, none, null, null)).toMatchObject({ width: 844, height: 390 });
  });
  it('desktop is unchanged when window equals probe', () => {
    for (const [w, h] of [
      [1280, 720],
      [1920, 1080],
    ] as const) {
      const a = clampedArea(w, h, none, null, { width: w, height: h });
      expect(fitArena(a.width, a.height, a.insets, 640, 360)).toEqual(
        fitArena(w, h, none, 640, 360),
      );
    }
  });
});

describe('RELAYOUT_DELAYS_MS', () => {
  it('is finite, positive and strictly ascending', () => {
    expect(RELAYOUT_DELAYS_MS.length).toBeGreaterThan(0);
    RELAYOUT_DELAYS_MS.forEach((d, i) => {
      expect(Number.isFinite(d) && d > 0).toBe(true);
      if (i > 0) expect(d).toBeGreaterThan(RELAYOUT_DELAYS_MS[i - 1]!);
    });
  });
});

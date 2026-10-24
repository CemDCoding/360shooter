import { describe, expect, it } from 'vitest';
import { BASE_HUD_FONT, fitArena, hudScale, MIN_HUD_FONT_CSS } from '../../src/platform/layout';

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

import { describe, expect, it } from 'vitest';
import { angleFromCenter, normalizeAngle } from '../../src/platform/angle';

describe('angleFromCenter', () => {
  it('covers all four quadrants (y down)', () => {
    expect(angleFromCenter(10, 0, 0, 0)).toBeCloseTo(0);
    expect(angleFromCenter(1, 1, 0, 0)).toBeCloseTo(Math.PI / 4);
    expect(angleFromCenter(-1, 1, 0, 0)).toBeCloseTo((3 * Math.PI) / 4);
    expect(angleFromCenter(-1, -1, 0, 0)).toBeCloseTo((-3 * Math.PI) / 4);
    expect(angleFromCenter(1, -1, 0, 0)).toBeCloseTo(-Math.PI / 4);
  });
  it('respects the center', () => {
    expect(angleFromCenter(100, 50, 100, 100)).toBeCloseTo(-Math.PI / 2);
  });
});

describe('normalizeAngle', () => {
  it('wraps into (-PI, PI]', () => {
    expect(normalizeAngle(3 * Math.PI)).toBeCloseTo(Math.PI);
    expect(normalizeAngle(-3 * Math.PI)).toBeCloseTo(Math.PI);
    expect(normalizeAngle(Math.PI * 2.5)).toBeCloseTo(Math.PI / 2);
    expect(normalizeAngle(-Math.PI * 2.5)).toBeCloseTo(-Math.PI / 2);
    expect(normalizeAngle(0.5)).toBe(0.5);
  });
  it('handles non-finite input', () => {
    expect(normalizeAngle(NaN)).toBe(0);
  });
});

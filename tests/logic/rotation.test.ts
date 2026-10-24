import { describe, expect, it } from 'vitest';
import { normalizeDeg, stepRotation } from '../../src/logic/rotation';

describe('normalizeDeg', () => {
  it('wraps into (-180, 180]', () => {
    expect(normalizeDeg(190)).toBe(-170);
    expect(normalizeDeg(-190)).toBe(170);
    expect(normalizeDeg(-180)).toBe(180);
    expect(normalizeDeg(720)).toBe(0);
    expect(normalizeDeg(Number.NaN)).toBe(0);
  });
});

describe('stepRotation', () => {
  it('limits the step', () => {
    expect(stepRotation(0, 90, 100, 100)).toBeCloseTo(10);
  });
  it('does not overshoot', () => {
    expect(stepRotation(0, 5, 270, 1000)).toBe(5);
  });
  it('crosses the 0/360 boundary upward (350 to 10 goes via 0)', () => {
    expect(stepRotation(350, 10, 100, 50)).toBeCloseTo(-5); // 350 -> 355 == -5
    expect(stepRotation(350, 10, 100, 250)).toBeCloseTo(10);
    expect(stepRotation(-10, 10, 100, 50)).toBeCloseTo(-5);
  });
  it('crosses the boundary downward (10 to 350 goes via 0)', () => {
    expect(stepRotation(10, 350, 100, 50)).toBeCloseTo(5);
    expect(stepRotation(10, 350, 100, 1000)).toBeCloseTo(-10);
  });
  it('takes the shorter way across 180', () => {
    expect(stepRotation(170, -170, 100, 50)).toBeCloseTo(175);
    expect(stepRotation(-170, 170, 100, 50)).toBeCloseTo(-175);
  });
  it('handles zero speed and zero dt', () => {
    expect(stepRotation(10, 90, 0, 100)).toBe(10);
    expect(stepRotation(10, 90, 100, 0)).toBe(10);
    expect(stepRotation(10, 90, -5, -5)).toBe(10);
  });
});

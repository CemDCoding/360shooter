import { describe, expect, it } from 'vitest';
import {
  STICK_ON_DESKTOP,
  stickAngleRad,
  stickVector,
  stickVisible,
} from '../../src/platform/stick';

const R = 70;
const DZ = 0.15;
const deg = (v: { x: number; y: number }) => (stickAngleRad(v) * 180) / Math.PI;

describe('stickVector / stickAngleRad', () => {
  it('gives the cardinal angles (screen coordinates, y down)', () => {
    expect(deg(stickVector(50, 0, R, DZ))).toBeCloseTo(0);
    expect(deg(stickVector(0, 50, R, DZ))).toBeCloseTo(90);
    expect(Math.abs(deg(stickVector(-50, 0, R, DZ)))).toBeCloseTo(180);
    expect(deg(stickVector(0, -50, R, DZ))).toBeCloseTo(-90); // 270 deg
    expect(deg(stickVector(30, 30, R, DZ))).toBeCloseTo(45);
  });
  it('is inactive in the dead zone', () => {
    expect(stickVector(5, 5, R, DZ).active).toBe(false);
    expect(stickVector(0, 0, R, DZ).active).toBe(false);
    expect(stickVector(R * DZ, 0, R, DZ).active).toBe(false);
    expect(stickVector(R * DZ + 1, 0, R, DZ).active).toBe(true);
  });
  it('limits the deflection to 1', () => {
    const v = stickVector(500, 500, R, DZ);
    expect(Math.hypot(v.x, v.y)).toBeCloseTo(1);
    expect(v.active).toBe(true);
    expect(deg(v)).toBeCloseTo(45);
  });
  it('handles invalid input', () => {
    expect(stickVector(NaN, 1, R, DZ).active).toBe(false);
    expect(stickVector(1, 1, 0, DZ).active).toBe(false);
  });
});

describe('stickVisible', () => {
  it('covers the four cases', () => {
    expect(stickVisible(false, true)).toBe(true);
    expect(stickVisible(false, false)).toBe(false);
    expect(stickVisible(true, true)).toBe(true);
    expect(stickVisible(true, false)).toBe(true);
  });
  it('hides the stick on desktop (PE-77)', () => {
    expect(STICK_ON_DESKTOP).toBe(false);
    expect(stickVisible(false, STICK_ON_DESKTOP)).toBe(false);
  });
});

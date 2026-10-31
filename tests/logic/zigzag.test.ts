import { describe, expect, it } from 'vitest';
import { zigzagLateralSpeed, zigzagOffset, zigzagVelocity } from '../../src/logic/zigzag';

describe('zigzagOffset', () => {
  it('is a sine of amplitude', () => {
    expect(zigzagOffset(0, 10, 1000)).toBeCloseTo(0);
    expect(zigzagOffset(250, 10, 1000)).toBeCloseTo(10);
    expect(zigzagOffset(750, 10, 1000)).toBeCloseTo(-10);
    expect(zigzagOffset(1000, 10, 1000)).toBeCloseTo(0);
  });
  it('is 0 for an invalid period', () => {
    expect(zigzagOffset(100, 10, 0)).toBe(0);
    expect(zigzagLateralSpeed(100, 10, -5)).toBe(0);
  });
});

describe('zigzagLateralSpeed', () => {
  it('is the derivative of the offset', () => {
    const t = 130;
    const h = 0.001;
    const num = ((zigzagOffset(t + h, 12, 900) - zigzagOffset(t - h, 12, 900)) / (2 * h)) * 1000;
    expect(zigzagLateralSpeed(t, 12, 900)).toBeCloseTo(num, 3);
  });
});

describe('zigzagVelocity', () => {
  const from = { x: 0, y: 0 };
  const to = { x: 100, y: 0 };
  it('keeps the forward speed exactly at every time', () => {
    for (const t of [0, 100, 333, 500, 777, 1234]) {
      const v = zigzagVelocity(from, to, 60, t, 20, 800);
      expect(v.x).toBeCloseTo(60);
    }
  });
  it('adds the lateral part perpendicular to the direction', () => {
    const v = zigzagVelocity(from, { x: 0, y: 50 }, 60, 0, 20, 800);
    expect(v.y).toBeCloseTo(60);
    expect(v.x).toBeCloseTo(-zigzagLateralSpeed(0, 20, 800));
  });
  it('net progress toward the player equals a straight runner over a full period', () => {
    let x = 0;
    let y = 0;
    for (let i = 0; i < 80; i++) {
      const v = zigzagVelocity({ x, y }, { x: 1000, y: 0 }, 50, i * 10, 15, 800);
      x += v.x * 0.01;
      y += v.y * 0.01;
    }
    expect(x).toBeCloseTo(40, 1);
    expect(Math.abs(y)).toBeLessThan(0.5);
  });
  it('is zero at the target or for no speed', () => {
    expect(zigzagVelocity(from, from, 60, 10, 20, 800)).toEqual({ x: 0, y: 0 });
    expect(zigzagVelocity(from, to, 0, 10, 20, 800)).toEqual({ x: 0, y: 0 });
  });
});

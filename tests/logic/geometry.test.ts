import { describe, expect, it } from 'vitest';
import { circlesOverlap, distance, pointOnRing } from '../../src/logic/geometry';

describe('geometry', () => {
  it('distance', () => expect(distance(0, 0, 3, 4)).toBe(5));
  it('circlesOverlap', () => {
    expect(circlesOverlap(0, 0, 1, 1.5, 0, 1)).toBe(true);
    expect(circlesOverlap(0, 0, 1, 2, 0, 1)).toBe(true);
    expect(circlesOverlap(0, 0, 1, 2.1, 0, 1)).toBe(false);
  });
  it('pointOnRing', () => {
    const p = pointOnRing(Math.PI / 2, 10, 5, 5);
    expect(p.x).toBeCloseTo(5);
    expect(p.y).toBeCloseTo(15);
    expect(pointOnRing(0, 10, 0, 0)).toEqual({ x: 10, y: 0 });
  });
});

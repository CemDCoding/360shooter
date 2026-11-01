import { describe, expect, it } from 'vitest';
import { ARENA, BASE_SPAWN_RADIUS, spawnRadiusFor } from '../../src/config';

describe('arena config', () => {
  it('BASE_SPAWN_RADIUS is about 391.2', () => {
    expect(BASE_SPAWN_RADIUS).toBeCloseTo(391.2, 1);
  });

  it('spawnRadiusFor the base arena equals BASE_SPAWN_RADIUS', () => {
    expect(spawnRadiusFor({ width: 640, height: 360 })).toBe(BASE_SPAWN_RADIUS);
  });

  it('a wider arena has a larger spawn radius', () => {
    expect(spawnRadiusFor({ width: 900, height: 360 })).toBeGreaterThan(BASE_SPAWN_RADIUS);
  });

  it('at 780x360 (iPhone 15, PE-142) the spawn ring lies outside the visible corner (+24)', () => {
    const halfDiagonal = Math.hypot(780 / 2, 360 / 2);
    const r = spawnRadiusFor({ width: 780, height: 360 });
    expect(r).toBeGreaterThanOrEqual(halfDiagonal + 24 - 1e-6);
    expect(r).toBeGreaterThan(spawnRadiusFor({ width: 640, height: 360 }));
  });

  it('widths are ordered', () => {
    expect(ARENA.minWidth).toBeLessThanOrEqual(ARENA.baseWidth);
    expect(ARENA.baseWidth).toBeLessThanOrEqual(ARENA.maxWidth);
  });
});

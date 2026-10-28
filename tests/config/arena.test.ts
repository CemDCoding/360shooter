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
    expect(spawnRadiusFor({ width: 800, height: 360 })).toBeGreaterThan(BASE_SPAWN_RADIUS);
  });

  it('widths are ordered', () => {
    expect(ARENA.minWidth).toBeLessThanOrEqual(ARENA.baseWidth);
    expect(ARENA.baseWidth).toBeLessThanOrEqual(ARENA.maxWidth);
  });
});

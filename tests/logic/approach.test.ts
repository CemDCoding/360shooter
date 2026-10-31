import { describe, expect, it } from 'vitest';
import { ARENA, BASE_SPAWN_RADIUS, spawnRadiusFor } from '../../src/config/arena';
import { ENEMIES } from '../../src/config/enemies';
import { approachSpeedFactor, contactTimeSec } from '../../src/logic/approach';

const CONTACT_RADIUS = 16;
const F = ARENA.offscreenSpeedFactor;

describe('approachSpeedFactor', () => {
  it('applies the factor only outside the base ring', () => {
    expect(approachSpeedFactor(BASE_SPAWN_RADIUS + 1, BASE_SPAWN_RADIUS, F)).toBe(F);
    expect(approachSpeedFactor(BASE_SPAWN_RADIUS, BASE_SPAWN_RADIUS, F)).toBe(1);
    expect(approachSpeedFactor(100, BASE_SPAWN_RADIUS, F)).toBe(1);
  });
});

describe('contactTimeSec', () => {
  const speeds = Object.values(ENEMIES).map((e) => e.speed);
  const slowest = Math.min(...speeds);
  const fastest = Math.max(...speeds);
  const time = (width: number, speed: number) =>
    contactTimeSec(
      spawnRadiusFor({ width, height: ARENA.height }),
      CONTACT_RADIUS,
      speed,
      BASE_SPAWN_RADIUS,
      F,
    );

  it('factor is never active at 640 (spawn ring equals base ring)', () => {
    for (const s of [slowest, fastest]) {
      expect(time(640, s)).toBeCloseTo((BASE_SPAWN_RADIUS - CONTACT_RADIUS) / s, 6);
    }
  });

  it.each([734, 800, 850, 900])('contact time at width %i is within 5%% of 640', (w) => {
    for (const s of [slowest, fastest]) {
      expect(Math.abs(time(w, s) / time(640, s) - 1)).toBeLessThanOrEqual(0.05);
    }
  });
});

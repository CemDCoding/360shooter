import { describe, expect, it } from 'vitest';
import { PARRY_RULES } from '../../src/config/parry';
import { createRng } from '../../src/logic/rng';
import {
  expireCircles,
  gradeTap,
  hitCircle,
  planCircles,
  resolveParry,
  tapCircle,
} from '../../src/logic/parry';

const c = { index: 0, angleDeg: 0, hitAtMs: 1000 };

describe('planCircles', () => {
  it('is deterministic for a fixed seed', () => {
    expect(planCircles(3, 1200, createRng(7))).toEqual(planCircles(3, 1200, createRng(7)));
  });
  it('returns no circles for count 0', () => {
    expect(planCircles(0, 1200, createRng(1))).toEqual([]);
  });
  it('keeps order, gap, last window and spread angles', () => {
    for (let seed = 1; seed <= 50; seed++) {
      for (const n of [1, 2, 3]) {
        const cs = planCircles(n, 1200, createRng(seed));
        expect(cs).toHaveLength(n);
        for (let i = 1; i < n; i++) {
          expect(cs[i].hitAtMs - cs[i - 1].hitAtMs).toBeGreaterThanOrEqual(PARRY_RULES.minGapMs);
          const da = Math.abs(cs[i].angleDeg - cs[i - 1].angleDeg) % 360;
          expect(Math.min(da, 360 - da)).toBeGreaterThan(40);
        }
        expect(cs[n - 1].hitAtMs).toBeLessThanOrEqual(1200 - PARRY_RULES.goodWindowMs);
        expect(cs[0].hitAtMs).toBeGreaterThan(0);
        expect(cs.every((x) => x.result === null)).toBe(true);
      }
    }
  });
});

describe('gradeTap', () => {
  it.each([
    [80, 'perfect'],
    [81, 'good'],
    [160, 'good'],
    [161, 'miss'],
  ])('offset %i ms -> %s', (d, grade) => {
    expect(gradeTap(c, c.hitAtMs + d)).toBe(grade);
    expect(gradeTap(c, c.hitAtMs - d)).toBe(grade);
  });
});

describe('hitCircle', () => {
  const center = { x: 100, y: 100 };
  const circles = [{ ...c, result: null }];
  const d = PARRY_RULES.distanceFromPlayerPx;
  it('hits inside radius plus tolerance', () => {
    expect(hitCircle(circles, { x: 100 + d + 25, y: 100 }, center)).not.toBeNull();
  });
  it('misses outside', () => {
    expect(hitCircle(circles, { x: 100 + d + 40, y: 100 }, center)).toBeNull();
  });
  it('ignores resolved circles', () => {
    expect(hitCircle([{ ...c, result: 'miss' }], { x: 100 + d, y: 100 }, center)).toBeNull();
  });
});

describe('tap and expire', () => {
  const open = [{ ...c, result: null }];
  it('grades only once', () => {
    const a = tapCircle(open, 0, 1000);
    expect(a[0].result).toBe('perfect');
    expect(tapCircle(a, 0, 1150)[0].result).toBe('perfect');
  });
  it('expires after hitAtMs + goodWindowMs', () => {
    expect(expireCircles(open, 1160)[0].result).toBeNull();
    expect(expireCircles(open, 1161)[0].result).toBe('miss');
  });
  it('does not overwrite graded circles', () => {
    expect(expireCircles(tapCircle(open, 0, 1000), 5000)[0].result).toBe('perfect');
  });
});

describe('resolveParry', () => {
  it('all hit', () => {
    expect(resolveParry(['perfect', 'good', 'perfect'])).toEqual({
      blocked: true,
      damageFactor: 0,
      perfectCount: 2,
    });
  });
  it('none hit', () => {
    expect(resolveParry(['miss', null, 'miss'])).toEqual({
      blocked: false,
      damageFactor: 1,
      perfectCount: 0,
    });
  });
  it('thirds', () => {
    expect(resolveParry(['good', 'miss', 'perfect']).damageFactor).toBeCloseTo(1 / 3);
    expect(resolveParry(['good', null, 'miss']).damageFactor).toBeCloseTo(2 / 3);
  });
});

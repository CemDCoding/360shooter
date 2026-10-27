import { describe, expect, it } from 'vitest';
import { BOSS_TUNING } from '../../src/config/bosses';
import {
  clampToArena,
  flightTimeMs,
  fragmentPositions,
  ringSpikeAngles,
  sproutDamage,
  sproutHitsLeft,
  stepToward,
  treePositions,
} from '../../src/entities/bosses/bossGeometry';

import { ARENA } from '../../src/config/arena';
import { rimRadii } from '../../src/entities/bosses/rim';

// Every arena test runs for the base width and the widest arena (PE-101).
const WIDTHS = [ARENA.baseWidth, ARENA.maxWidth];
const arenaOf = (width: number) => ({
  width,
  height: ARENA.height,
  margin: BOSS_TUNING.arena.margin,
});
const inArenaOf =
  (a: { width: number; height: number; margin: number }) =>
  (p: { x: number; y: number }): boolean =>
    p.x >= a.margin && p.x <= a.width - a.margin && p.y >= a.margin && p.y <= a.height - a.margin;
const TURN = Math.PI * 2;

describe('stepToward', () => {
  it('moves by speed x dt', () => {
    const r = stepToward({ x: 0, y: 0 }, { x: 100, y: 0 }, 100, 500);
    expect(r.x).toBeCloseTo(50);
    expect(r.arrived).toBe(false);
  });
  it('never overshoots, even with a huge dt', () => {
    for (const dt of [16, 1000, 60_000, 1e9]) {
      const r = stepToward({ x: 10, y: 10 }, { x: 40, y: 50 }, 300, dt);
      expect(Math.hypot(r.x - 10, r.y - 10)).toBeLessThanOrEqual(50 + 1e-9);
      if (dt >= 1000) expect(r).toEqual({ x: 40, y: 50, arrived: true });
    }
  });
  it('arrives when already on the target', () => {
    expect(stepToward({ x: 5, y: 5 }, { x: 5, y: 5 }, 10, 16).arrived).toBe(true);
  });
});

describe.each(WIDTHS)('clampToArena at width %i', (w) => {
  it('keeps every point inside the margin', () => {
    const a = arenaOf(w);
    const pts = [
      { x: -50, y: -50 },
      { x: 9999, y: 9999 },
      { x: w / 2, y: 180 },
      { x: 0, y: 400 },
    ];
    for (const p of pts) expect(inArenaOf(a)(clampToArena(p, a))).toBe(true);
  });
});

describe('rimRadii', () => {
  const rim = BOSS_TUNING.giantStone.rim;
  it('is unchanged for the base arena', () => {
    expect(rimRadii(rim, arenaOf(ARENA.baseWidth))).toEqual(rim);
  });
  it.each(WIDTHS)('keeps the rim as far from the edge as before at width %i', (w) => {
    const r = rimRadii(rim, arenaOf(w));
    expect(w / 2 - r.rx).toBeCloseTo(ARENA.baseWidth / 2 - rim.rx);
    expect(ARENA.height / 2 - r.ry).toBeCloseTo(ARENA.height / 2 - rim.ry);
  });
});

describe('ringSpikeAngles', () => {
  const count = 12;
  const gap = 1.2;
  const all = Array.from({ length: count }, (_, i) => (i * TURN) / count);
  const rel = (a: number, start: number): number => (((a - start) % TURN) + TURN) % TURN;

  it('omits exactly the angles inside the gap', () => {
    for (const start of [0, 1, 3, 6]) {
      const angles = ringSpikeAngles(count, start, gap);
      const inside = all.filter((a) => rel(a, start) < gap);
      expect(angles.length).toBe(count - inside.length);
      for (const a of angles) expect(rel(a, start)).toBeGreaterThanOrEqual(gap);
    }
  });
  it('handles a gap that wraps over 0', () => {
    const angles = ringSpikeAngles(count, 6, gap); // gap from 6 rad over 2 pi to about 0.92 rad
    expect(angles).not.toContain(0);
    expect(angles.length).toBeLessThan(count);
  });
});

describe.each(WIDTHS)('treePositions at width %i', (w) => {
  it('stays inside the arena even next to the edge', () => {
    const a = arenaOf(w);
    for (const origin of [
      { x: w / 2, y: 180 },
      { x: 0, y: 0 },
      { x: w, y: 360 },
      { x: w - 40, y: 20 },
    ]) {
      for (const base of [0, 1, 2.5, 5]) {
        const out = treePositions(origin, 5, base, 56, a);
        expect(out).toHaveLength(5);
        out.forEach((p) => expect(inArenaOf(a)(p)).toBe(true));
      }
    }
  });
});

describe.each(WIDTHS)('fragmentPositions at width %i', (w) => {
  const { fragmentOffset: off, fragmentMinCenterDist: min } = BOSS_TUNING.giantStone;
  const a = arenaOf(w);
  const c = { x: w / 2, y: 180 };
  it('keeps the distance to the centre and the arena, also on the centre', () => {
    const origins = [
      c,
      { x: c.x + 10, y: 190 },
      { x: c.x - 150, y: 180 },
      { x: c.x, y: 65 },
      { x: w - 40, y: 340 },
    ];
    for (const o of origins) {
      for (const p of fragmentPositions(o, c, off, min, a)) {
        expect(Math.hypot(p.x - c.x, p.y - c.y)).toBeGreaterThanOrEqual(min - 1e-6);
        expect(inArenaOf(a)(p)).toBe(true);
      }
    }
  });
  it('spreads the two fragments apart', () => {
    const [p, q] = fragmentPositions({ x: c.x - 150, y: 180 }, c, off, min, a);
    expect(Math.hypot(p.x - q.x, p.y - q.y)).toBeGreaterThan(10);
  });
});

describe('flightTimeMs', () => {
  it('is distance / speed in ms', () => {
    expect(flightTimeMs(90, 90)).toBeCloseTo(1000);
    expect(flightTimeMs(10, 0)).toBe(Infinity);
  });
});

describe('root bud damage', () => {
  const { hits } = BOSS_TUNING.rootMonster.sprout;
  it('is harmless after all hits', () => {
    expect(sproutDamage(15, hits, sproutHitsLeft(hits, hits))).toBe(0);
    expect(sproutDamage(15, hits, sproutHitsLeft(hits, hits + 5))).toBe(0);
  });
  it('is damage x (hits - k) / hits', () => {
    for (let k = 0; k <= hits; k++) {
      expect(sproutDamage(15, hits, sproutHitsLeft(hits, k))).toBeCloseTo((15 * (hits - k)) / hits);
    }
  });
  it('is full without hits', () => {
    expect(sproutDamage(15, hits, hits)).toBe(15);
  });
});

import { describe, expect, it } from 'vitest';
import { MIN_TELEGRAPH_MS } from '../../src/config/bosses';
import type { EnemyBurrowDef } from '../../src/contracts/enemy';
import { BurrowState, effectiveEmergeMs, keepAwayFrom } from '../../src/logic/burrow';

const def: EnemyBurrowDef = {
  underMs: 2000,
  surfaceMs: 1500,
  surfaceDistance: 120,
  telegraphMs: 800,
};
const P = { x: 0, y: 0 };

describe('effectiveEmergeMs', () => {
  it('never goes below 700 ms', () => {
    expect(effectiveEmergeMs({ telegraphMs: 200 })).toBe(MIN_TELEGRAPH_MS);
    expect(effectiveEmergeMs({ telegraphMs: Number.NaN })).toBe(MIN_TELEGRAPH_MS);
    expect(effectiveEmergeMs({ telegraphMs: 1000 })).toBe(1000);
  });
});

describe('keepAwayFrom', () => {
  it('keeps points that are far enough', () => {
    expect(keepAwayFrom({ x: 200, y: 0 }, P, 120)).toEqual({ x: 200, y: 0 });
    expect(keepAwayFrom({ x: 120, y: 0 }, P, 120)).toEqual({ x: 120, y: 0 });
  });
  it('pushes near points radially out', () => {
    const r = keepAwayFrom({ x: 0, y: 30 }, P, 120);
    expect(r.x).toBeCloseTo(0);
    expect(r.y).toBeCloseTo(120);
  });
  it('handles a point exactly on the player', () => {
    expect(keepAwayFrom(P, P, 120)).toEqual({ x: 120, y: 0 });
  });
});

describe('BurrowState', () => {
  it('starts surfaced and vulnerable', () => {
    const b = new BurrowState(def, { x: 500, y: 0 });
    expect(b.phase).toBe('surface');
    expect(b.invulnerable).toBe(false);
  });
  it('dives after surfaceMs exactly and is invulnerable under the sand', () => {
    const b = new BurrowState(def, { x: 500, y: 0 });
    b.update(1499, P, 100);
    expect(b.phase).toBe('surface');
    b.update(1, P, 100);
    expect(b.phase).toBe('under');
    expect(b.invulnerable).toBe(true);
  });
  it('the hill walks toward the player but not closer than surfaceDistance', () => {
    const b = new BurrowState(def, { x: 500, y: 0 });
    b.update(1500, P, 100);
    b.update(1000, P, 100);
    expect(b.position.x).toBeCloseTo(400);
    b.update(1000, P, 10000);
    expect(b.phase).toBe('emerge');
    expect(Math.hypot(b.position.x, b.position.y)).toBeGreaterThanOrEqual(120 - 1e-9);
  });
  it('announces at least 700 ms, stays invulnerable, then surfaces', () => {
    const b = new BurrowState({ ...def, telegraphMs: 100 }, { x: 500, y: 0 });
    b.update(1500 + 2000, P, 0);
    expect(b.phase).toBe('emerge');
    expect(b.emergeLeftMs).toBeGreaterThan(MIN_TELEGRAPH_MS - 5);
    b.update(MIN_TELEGRAPH_MS - 1, P, 0);
    expect(b.phase).toBe('emerge');
    expect(b.invulnerable).toBe(true);
    b.update(1, P, 0);
    expect(b.phase).toBe('surface');
    expect(b.invulnerable).toBe(false);
    expect(b.emergeLeftMs).toBe(0);
  });
  it('never surfaces on the player, even if she walks onto the marker', () => {
    const b = new BurrowState(def, { x: 300, y: 0 });
    b.update(1500 + 2000, P, 0);
    const marker = { ...b.position };
    b.update(800, marker, 0);
    expect(b.phase).toBe('surface');
    const d = Math.hypot(b.position.x - marker.x, b.position.y - marker.y);
    expect(d).toBeGreaterThanOrEqual(120 - 1e-9);
  });
  it('a huge dt runs through a full cycle and respects the distance', () => {
    const b = new BurrowState(def, { x: 50, y: 50 });
    b.update(1500 + 2000 + 800, P, 80);
    expect(b.phase).toBe('surface');
    expect(Math.hypot(b.position.x, b.position.y)).toBeGreaterThanOrEqual(120 - 1e-9);
    b.update(1e7, P, 80);
    expect(['surface', 'under', 'emerge']).toContain(b.phase);
  });
  it('sync follows the surfaced enemy only', () => {
    const b = new BurrowState(def, { x: 500, y: 0 });
    b.sync({ x: 400, y: 10 });
    expect(b.position).toEqual({ x: 400, y: 10 });
    b.update(1500, P, 0);
    b.sync({ x: 1, y: 1 });
    expect(b.position).toEqual({ x: 400, y: 10 });
  });
  it('ignores negative and NaN dt', () => {
    const b = new BurrowState(def, { x: 500, y: 0 });
    b.update(-10, P, 100);
    b.update(Number.NaN, P, 100);
    expect(b.phase).toBe('surface');
  });
});

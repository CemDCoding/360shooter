import { describe, expect, it } from 'vitest';
import { MIN_TELEGRAPH_MS } from '../../src/config/bosses';
import type { EnemyChargeDef } from '../../src/contracts/enemy';
import { ChargeState, effectiveTelegraphMs } from '../../src/logic/charge';

const def: EnemyChargeDef = {
  telegraphMs: 800,
  dashSpeed: 400,
  dashMs: 500,
  cooldownMs: 1000,
  dashDamageFactor: 0.5,
};
const P = { x: 300, y: 0 };
const O = { x: 0, y: 0 };

describe('effectiveTelegraphMs', () => {
  it('never goes below 700 ms', () => {
    expect(effectiveTelegraphMs({ telegraphMs: 100 })).toBe(MIN_TELEGRAPH_MS);
    expect(effectiveTelegraphMs({ telegraphMs: Number.NaN })).toBe(MIN_TELEGRAPH_MS);
    expect(effectiveTelegraphMs({ telegraphMs: 900 })).toBe(900);
  });
});

describe('ChargeState', () => {
  it('approaches slowly until the trigger distance', () => {
    const c = new ChargeState(def, 100);
    const s = c.update(1000, O, P, 50);
    expect(s.dx).toBeCloseTo(50);
    expect(c.phase).toBe('approach');
  });
  it('stops at the trigger distance and starts the announcement', () => {
    const c = new ChargeState(def, 100);
    const s = c.update(5000, O, P, 50);
    expect(s.dx).toBeCloseTo(200);
    expect(c.phase).toBe('telegraph');
  });
  it('stands still during the announcement and dashes only after it', () => {
    const c = new ChargeState({ ...def, telegraphMs: 100 }, 400);
    c.update(1, O, P, 50);
    expect(c.phase).toBe('telegraph');
    expect(c.telegraphLeftMs).toBeGreaterThan(MIN_TELEGRAPH_MS - 5);
    const s = c.update(MIN_TELEGRAPH_MS - 10, O, P, 50);
    expect(s).toEqual({ dx: 0, dy: 0 });
    expect(c.phase).toBe('telegraph');
    c.update(10, O, P, 50);
    expect(c.phase).toBe('dash');
    expect(c.damageFactor()).toBe(0.5);
  });
  it('dashes in a straight line to the point at the start, even if the player moves', () => {
    const c = new ChargeState(def, 400);
    c.update(1, O, { x: 100, y: 0 }, 0);
    c.update(799, O, { x: 100, y: 0 }, 0);
    expect(c.phase).toBe('dash');
    const s = c.update(250, O, { x: 0, y: 500 }, 0);
    expect(s.dx).toBeCloseTo(100);
    expect(s.dy).toBeCloseTo(0);
    expect(c.dashTarget).toEqual({ x: 100, y: 0 });
  });
  it('dash ends exactly after dashMs, then recovers, then approaches again', () => {
    const c = new ChargeState(def, 400);
    c.update(1, O, P, 0);
    c.update(799, O, P, 0);
    const s = c.update(500, O, P, 0);
    expect(s.dx).toBeCloseTo(200);
    expect(c.phase).toBe('recover');
    expect(c.damageFactor()).toBe(1);
    expect(c.update(999, O, P, 50)).toEqual({ dx: 0, dy: 0 });
    expect(c.phase).toBe('recover');
    c.update(1, O, P, 50);
    expect(c.phase).toBe('telegraph'); // still within range: announces again at once
  });
  it('a huge dt is split over all phases and never overshoots the dash length', () => {
    const c = new ChargeState({ ...def, cooldownMs: 100 }, 400);
    const s = c.update(1300, O, P, 0);
    expect(s.dx).toBeCloseTo(200);
    expect(c.phase).toBe('recover');
  });
  it('ignores negative and NaN dt; handles the player on top of the enemy', () => {
    const c = new ChargeState(def, 100);
    expect(c.update(-5, O, P, 50)).toEqual({ dx: 0, dy: 0 });
    expect(c.update(Number.NaN, O, P, 50)).toEqual({ dx: 0, dy: 0 });
    const d = new ChargeState({ ...def, cooldownMs: 100 }, 100);
    expect(d.update(2000, { x: 5, y: 5 }, { x: 5, y: 5 }, 50)).toEqual({ dx: 0, dy: 0 });
  });
  it('telegraphLeftMs is 0 outside of telegraph', () => {
    expect(new ChargeState(def, 10).telegraphLeftMs).toBe(0);
  });
});

import { describe, expect, it } from 'vitest';
import { RAPID_FIRE_MAX_PER_SEC } from '../../src/config';
import {
  absorbDamage,
  effectiveFireRate,
  emptyPowers,
  shotPattern,
  tickPowers,
} from '../../src/logic/powers';

describe('absorbDamage', () => {
  it('uses the shield limit exactly', () => {
    const s = { ...emptyPowers(), shieldLeft: 60 };
    const a = absorbDamage(s, 25);
    expect(a.remainingDamage).toBe(0);
    expect(a.state.shieldLeft).toBe(35);
    const b = absorbDamage(a.state, 35);
    expect(b.remainingDamage).toBe(0);
    expect(b.state.shieldLeft).toBe(0);
  });
  it('broken shield passes remaining damage on', () => {
    const r = absorbDamage({ ...emptyPowers(), shieldLeft: 10 }, 30);
    expect(r.state.shieldLeft).toBe(0);
    expect(r.remainingDamage).toBe(20);
  });
  it('without shield all damage passes, input is not mutated', () => {
    const s = emptyPowers();
    expect(absorbDamage(s, 7).remainingDamage).toBe(7);
    const t = { ...s, shieldLeft: 5 };
    absorbDamage(t, 3);
    expect(t.shieldLeft).toBe(5);
  });
});

describe('tickPowers', () => {
  it('rapid fire ends after its duration of game time; dt 0 (pause) does not count', () => {
    const DURATION_MS = 5000;
    let s = { ...emptyPowers(), rapidFireMsLeft: DURATION_MS };
    for (let i = 0; i < 100; i++) s = tickPowers(s, 0);
    expect(s.rapidFireMsLeft).toBe(DURATION_MS);
    for (let i = 0; i < 299; i++) s = tickPowers(s, 1000 / 60);
    expect(s.rapidFireMsLeft).toBeGreaterThan(0);
    s = tickPowers(s, 1000 / 60);
    s = tickPowers(s, 1000 / 60);
    expect(s.rapidFireMsLeft).toBe(0);
  });
});

describe('shotPattern', () => {
  it('stage 0 to 2', () => {
    expect(shotPattern(0)).toEqual([{ offsetPx: 0, angleDeg: 0 }]);
    expect(shotPattern(1)).toEqual([
      { offsetPx: -4, angleDeg: 0 },
      { offsetPx: 4, angleDeg: 0 },
    ]);
    expect(shotPattern(2).map((p) => p.angleDeg)).toEqual([-8, 0, 8]);
  });
  it('clamps out-of-range stages', () => {
    expect(shotPattern(-1)).toHaveLength(1);
    expect(shotPattern(5)).toHaveLength(3);
  });
});

describe('effectiveFireRate', () => {
  it('raises to the cap only while active, never lowers', () => {
    expect(effectiveFireRate(2, false)).toBe(2);
    expect(effectiveFireRate(2, true)).toBe(RAPID_FIRE_MAX_PER_SEC);
    expect(effectiveFireRate(RAPID_FIRE_MAX_PER_SEC + 5, true)).toBe(RAPID_FIRE_MAX_PER_SEC + 5);
  });
});

import { describe, expect, it } from 'vitest';
import { PlayerStatusState } from '../../src/logic/status';

describe('PlayerStatusState poison', () => {
  it('deals dps over the duration and ends exactly at 0', () => {
    const s = new PlayerStatusState();
    s.apply({ poison: { dps: 2, durationMs: 1000 } });
    expect(s.tick(500)).toBeCloseTo(1);
    expect(s.tick(500)).toBeCloseTo(1);
    expect(s.active()).toEqual([]);
    expect(s.tick(500)).toBe(0);
  });
  it('a huge dt only deals the remaining time', () => {
    const s = new PlayerStatusState();
    s.apply({ poison: { dps: 3, durationMs: 2000 } });
    expect(s.tick(60000)).toBeCloseTo(6);
    expect(s.active()).toEqual([]);
  });
  it('refreshes the duration without stacking the damage', () => {
    const s = new PlayerStatusState();
    s.apply({ poison: { dps: 2, durationMs: 1000 } });
    s.tick(800);
    s.apply({ poison: { dps: 2, durationMs: 1000 } });
    expect(s.active()).toEqual([{ kind: 'poison', remainingMs: 1000 }]);
    s.apply({ poison: { dps: 2, durationMs: 1000 } });
    s.apply({ poison: { dps: 2, durationMs: 1000 } });
    expect(s.tick(1000)).toBeCloseTo(2);
  });
  it('a weaker or shorter hit does not shorten or weaken', () => {
    const s = new PlayerStatusState();
    s.apply({ poison: { dps: 4, durationMs: 2000 } });
    s.apply({ poison: { dps: 1, durationMs: 500 } });
    expect(s.tick(1000)).toBeCloseTo(4);
    expect(s.active()[0].remainingMs).toBe(1000);
  });
  it('a stronger hit raises the dps', () => {
    const s = new PlayerStatusState();
    s.apply({ poison: { dps: 1, durationMs: 1000 } });
    s.apply({ poison: { dps: 5, durationMs: 1000 } });
    expect(s.tick(1000)).toBeCloseTo(5);
  });
  it('ignores invalid input', () => {
    const s = new PlayerStatusState();
    s.apply({
      poison: { dps: Number.NaN, durationMs: 1000 },
      slow: { turnFactor: 0.5, durationMs: -1 },
    });
    expect(s.active()).toEqual([]);
    expect(s.tick(Number.NaN)).toBe(0);
    expect(s.tick(-5)).toBe(0);
  });
});

describe('PlayerStatusState slow', () => {
  it('is 1 without effect', () => {
    expect(new PlayerStatusState().turnFactor()).toBe(1);
  });
  it('applies the factor and ends exactly at 0', () => {
    const s = new PlayerStatusState();
    s.apply({ slow: { turnFactor: 0.5, durationMs: 1000 } });
    expect(s.turnFactor()).toBe(0.5);
    s.tick(999);
    expect(s.turnFactor()).toBe(0.5);
    s.tick(1);
    expect(s.turnFactor()).toBe(1);
    expect(s.active()).toEqual([]);
  });
  it('takes the strongest, never multiplies', () => {
    const s = new PlayerStatusState();
    s.apply({ slow: { turnFactor: 0.5, durationMs: 1000 } });
    s.apply({ slow: { turnFactor: 0.7, durationMs: 3000 } });
    expect(s.turnFactor()).toBe(0.5);
    s.apply({ slow: { turnFactor: 0.3, durationMs: 500 } });
    expect(s.turnFactor()).toBe(0.3);
    expect(s.active()).toEqual([{ kind: 'slow', remainingMs: 3000 }]);
  });
  it('clamps the factor to 0..1', () => {
    const s = new PlayerStatusState();
    s.apply({ slow: { turnFactor: 2, durationMs: 100 } });
    expect(s.turnFactor()).toBe(1);
    s.apply({ slow: { turnFactor: -1, durationMs: 100 } });
    expect(s.turnFactor()).toBe(0);
  });
});

describe('PlayerStatusState misc', () => {
  it('lists both effects and clear removes them', () => {
    const s = new PlayerStatusState();
    s.apply({ poison: { dps: 1, durationMs: 1000 }, slow: { turnFactor: 0.6, durationMs: 2000 } });
    expect(s.active()).toEqual([
      { kind: 'poison', remainingMs: 1000 },
      { kind: 'slow', remainingMs: 2000 },
    ]);
    s.clear();
    expect(s.active()).toEqual([]);
    expect(s.turnFactor()).toBe(1);
  });
});

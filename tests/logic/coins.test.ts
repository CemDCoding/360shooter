import { describe, expect, it } from 'vitest';
import { COIN_MAGNET_EASE, COIN_RULES } from '../../src/config/coins';
import { coinMagnetStep, coinSizeFor, magnetSpeed, rollCoinDrop } from '../../src/logic/coins';
import { createRng } from '../../src/logic/rng';

describe('rollCoinDrop', () => {
  it('drops about 8 percent with a fixed seed', () => {
    const rng = createRng(1234);
    let n = 0;
    const total = 20000;
    for (let i = 0; i < total; i++) if (rollCoinDrop(rng, COIN_RULES)) n++;
    expect(n / total).toBeGreaterThan(0.07);
    expect(n / total).toBeLessThan(0.09);
  });
  it('respects extreme chances', () => {
    const rng = createRng(1);
    expect(rollCoinDrop(rng, { ...COIN_RULES, dropChance: 0 })).toBe(false);
    expect(rollCoinDrop(rng, { ...COIN_RULES, dropChance: 1 })).toBe(true);
  });
});

describe('coinSizeFor', () => {
  it('switches to big from value 5', () => {
    expect(coinSizeFor(1)).toBe('small');
    expect(coinSizeFor(4)).toBe('small');
    expect(coinSizeFor(5)).toBe('big');
    expect(coinSizeFor(20)).toBe('big');
  });
});

describe('coinMagnetStep', () => {
  const player = { x: 0, y: 0 };
  it('stays outside the magnet radius', () => {
    const r = coinMagnetStep({ x: 1000, y: 0 }, player, 16, COIN_RULES);
    expect(r).toEqual({ x: 1000, y: 0, collected: false, pullMs: 0 });
  });
  it('moves toward the player inside the radius', () => {
    const r = coinMagnetStep({ x: 300, y: 0 }, player, 100, COIN_RULES);
    expect(r.collected).toBe(false);
    expect(r.x).toBeCloseTo(300 - 32);
    expect(r.y).toBeCloseTo(0);
  });
  it('collects within the collect radius', () => {
    expect(coinMagnetStep({ x: 5, y: 0 }, player, 16, COIN_RULES).collected).toBe(true);
  });
  it('does not overshoot with a large step', () => {
    const r = coinMagnetStep({ x: 100, y: 0 }, player, 10000, COIN_RULES);
    expect(r).toMatchObject({ x: 0, y: 0, collected: true });
  });
  it('reaches the player in finite time', () => {
    let c = { x: 250, y: 250 };
    let done = false;
    for (let i = 0; i < 1000 && !done; i++) {
      const r = coinMagnetStep(c, player, 16, COIN_RULES);
      c = { x: r.x, y: r.y };
      done = r.collected;
    }
    expect(done).toBe(true);
  });
  it('does not move with dt 0', () => {
    expect(coinMagnetStep({ x: 200, y: 0 }, player, 0, COIN_RULES).x).toBe(200);
  });
  it('first eased step is smaller than the old constant step', () => {
    const old = coinMagnetStep({ x: 300, y: 0 }, player, 16, COIN_RULES);
    const eased = coinMagnetStep({ x: 300, y: 0 }, player, 16, COIN_RULES, 0);
    expect(300 - eased.x).toBeLessThan(300 - old.x);
    expect(eased.pullMs).toBe(16);
  });
  it('pullMs does not grow outside the magnet radius', () => {
    expect(coinMagnetStep({ x: 1000, y: 0 }, player, 16, COIN_RULES, 50).pullMs).toBe(50);
  });
  it('never overshoots and arrives within 1.3 s from 250 px with ease', () => {
    let c = { x: 250, y: 0 };
    let pull = 0;
    let t = 0;
    let done = false;
    while (!done && t < 5000) {
      const r = coinMagnetStep(c, player, 16, COIN_RULES, pull);
      expect(r.x).toBeGreaterThanOrEqual(0);
      c = { x: r.x, y: r.y };
      pull = r.pullMs;
      done = r.collected;
      t += 16;
    }
    expect(done).toBe(true);
    expect(t).toBeLessThanOrEqual(1300);
  });
});

describe('magnetSpeed', () => {
  const rules = COIN_RULES;
  const ease = COIN_MAGNET_EASE;
  it('starts at the start speed and ends at the max speed', () => {
    expect(magnetSpeed(0, rules, ease)).toBe(ease.startSpeedPxPerSec);
    expect(magnetSpeed(ease.rampMs, rules, ease)).toBe(rules.magnetSpeedPxPerSec);
    expect(magnetSpeed(ease.rampMs * 10, rules, ease)).toBe(rules.magnetSpeedPxPerSec);
  });
  it('rises monotonically and never exceeds the max', () => {
    let prev = 0;
    for (let ms = 0; ms <= ease.rampMs + 100; ms += 10) {
      const v = magnetSpeed(ms, rules, ease);
      expect(v).toBeGreaterThanOrEqual(prev);
      expect(v).toBeLessThanOrEqual(rules.magnetSpeedPxPerSec);
      prev = v;
    }
  });
  it('treats invalid input as start speed', () => {
    for (const bad of [NaN, Infinity, -5]) {
      expect(magnetSpeed(bad, rules, ease)).toBe(ease.startSpeedPxPerSec);
    }
  });
});

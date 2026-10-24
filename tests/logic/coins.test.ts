import { describe, expect, it } from 'vitest';
import { COIN_RULES } from '../../src/config/coins';
import { coinMagnetStep, coinSizeFor, rollCoinDrop } from '../../src/logic/coins';
import { createRng } from '../../src/logic/rng';

describe('rollCoinDrop', () => {
  it('drops about 5 percent with a fixed seed', () => {
    const rng = createRng(1234);
    let n = 0;
    const total = 20000;
    for (let i = 0; i < total; i++) if (rollCoinDrop(rng, COIN_RULES)) n++;
    expect(n / total).toBeGreaterThan(0.04);
    expect(n / total).toBeLessThan(0.06);
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
    expect(r).toEqual({ x: 1000, y: 0, collected: false });
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
    expect(r).toEqual({ x: 0, y: 0, collected: true });
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
});

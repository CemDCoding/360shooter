import { describe, expect, it } from 'vitest';
import {
  BIG_COIN_MIN_VALUE,
  COIN_MAGNET_EASE,
  COIN_RULES,
  GOLD_KEEP_ON_LOSS,
  GOLD_KEEP_ON_WIN,
} from '../../src/config';

describe('coins', () => {
  it('values are positive and drop chance is a probability', () => {
    expect(COIN_RULES.dropChance).toBeGreaterThan(0);
    expect(COIN_RULES.dropChance).toBeLessThan(1);
    expect(COIN_RULES.dropChance).toBe(0.045);
    expect(COIN_RULES.magnetRadiusPx).toBeGreaterThan(0);
    expect(COIN_RULES.collectRadiusPx).toBeGreaterThan(0);
    expect(COIN_RULES.magnetSpeedPxPerSec).toBeGreaterThan(0);
    expect(BIG_COIN_MIN_VALUE).toBe(5);
  });

  it('magnet ease constants are sane', () => {
    const e = COIN_MAGNET_EASE;
    expect(Number.isFinite(e.startSpeedPxPerSec)).toBe(true);
    expect(e.startSpeedPxPerSec).toBeGreaterThan(0);
    expect(e.startSpeedPxPerSec).toBeLessThan(COIN_RULES.magnetSpeedPxPerSec);
    expect(Number.isFinite(e.rampMs)).toBe(true);
    expect(e.rampMs).toBeGreaterThan(0);
  });

  it('gold keep factors', () => {
    expect(GOLD_KEEP_ON_WIN).toBe(1);
    expect(GOLD_KEEP_ON_LOSS).toBe(0.5);
  });
});

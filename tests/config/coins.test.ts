import { describe, expect, it } from 'vitest';
import {
  BIG_COIN_MIN_VALUE,
  COIN_MAGNET_EASE,
  COIN_RULES,
  COIN_VISUAL,
  GOLD_KEEP_ON_LOSS,
  GOLD_KEEP_ON_WIN,
} from '../../src/config';
import { THEME } from '../../src/config/theme';

describe('coins', () => {
  it('values are positive and drop chance is a probability', () => {
    expect(COIN_RULES.dropChance).toBeGreaterThan(0);
    expect(COIN_RULES.dropChance).toBeLessThan(1);
    expect(COIN_RULES.dropChance).toBe(0.08);
    expect(COIN_RULES.magnetRadiusPx).toBeGreaterThan(0);
    expect(COIN_RULES.collectRadiusPx).toBeGreaterThan(0);
    expect(COIN_RULES.magnetSpeedPxPerSec).toBeGreaterThan(0);
    expect(BIG_COIN_MIN_VALUE).toBe(4);
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

  it('visual constants are finite and in range (AP-70)', () => {
    const v = COIN_VISUAL;
    for (const n of [v.smallDisplayScale, v.bigDisplayScale, v.depth, v.outlinePx]) {
      expect(Number.isFinite(n)).toBe(true);
    }
    expect(v.smallDisplayScale).toBeGreaterThanOrEqual(1);
    expect(v.bigDisplayScale).toBeGreaterThanOrEqual(1);
    expect(v.depth).toBeGreaterThan(1); // above enemies and telegraphs
    expect(v.depth).toBeLessThan(2); // below boss hazards
    for (const n of [v.smallDisplayScale, v.bigDisplayScale, v.outlinePx]) {
      expect(Number.isInteger(n)).toBe(true); // one pixel grid
    }
    expect(v.outlinePx).toBeGreaterThan(0);
    expect(v.outlineColorToken in THEME.colors).toBe(true);
  });
});

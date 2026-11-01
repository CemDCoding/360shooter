import { describe, expect, it } from 'vitest';
import { PARRY_RULES } from '../../src/config';

describe('PARRY_RULES (AP-126, PE-157, PE-158)', () => {
  it('has the agreed windows, good wider than perfect', () => {
    expect(PARRY_RULES.perfectWindowMs).toBe(80);
    expect(PARRY_RULES.goodWindowMs).toBe(160);
    expect(PARRY_RULES.goodWindowMs).toBeGreaterThan(PARRY_RULES.perfectWindowMs);
  });

  it('keeps tappable sizes and gaps', () => {
    expect(PARRY_RULES.circleRadiusPx).toBeGreaterThanOrEqual(18);
    expect(PARRY_RULES.minGapMs).toBeGreaterThanOrEqual(250);
    expect(PARRY_RULES.ringStartScale).toBeGreaterThan(1);
    expect(PARRY_RULES.distanceFromPlayerPx).toBeGreaterThan(PARRY_RULES.circleRadiusPx);
  });
});

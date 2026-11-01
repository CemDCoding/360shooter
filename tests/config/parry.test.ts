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

  it('matches the approved design H-33', () => {
    expect(PARRY_RULES.distanceFromPlayerPx).toBe(56);
    expect(PARRY_RULES.approachMs).toBe(800);
    expect(PARRY_RULES.touchSlackPx).toBe(4);
    expect(PARRY_RULES.circleRadiusPx).toBe(20);
    expect(PARRY_RULES.ringStartScale).toBe(2.5);
  });
});

describe('PARRY_RULES M9 (AP-148, RS-03.1)', () => {
  it('has the agreed building block values', () => {
    expect(PARRY_RULES.holdMinMs).toBe(300);
    expect(PARRY_RULES.holdMaxMs).toBe(600);
    expect(PARRY_RULES.beatMs).toBe(400);
    expect(PARRY_RULES.previewStepMs).toBe(300);
    expect(PARRY_RULES.dragTargetRadiusPx).toBe(24);
    expect(PARRY_RULES.dragTargetDistancePx).toBe(56);
    expect(PARRY_RULES.twoTapMaxGapMs).toBe(700);
    expect(PARRY_RULES.seqTelegraphMinMs).toBe(1800);
  });

  it('keeps the drag target at least as large as the circle', () => {
    expect(PARRY_RULES.dragTargetRadiusPx).toBeGreaterThanOrEqual(PARRY_RULES.circleRadiusPx);
    expect(PARRY_RULES.holdMaxMs).toBeGreaterThan(PARRY_RULES.holdMinMs);
  });
});

import { describe, expect, it } from 'vitest';
import { PARRY_RULES } from '../../src/config/parry';
import { THEME } from '../../src/config/theme';

// AP-133: the quicktime rules and the design tokens of brief H-33 must not drift apart.
describe('PARRY_RULES match the design tokens (H-33)', () => {
  it('circle radius, distance and touch slack equal size.parry-*', () => {
    expect(PARRY_RULES.circleRadiusPx).toBe(THEME.sizePx['size.parry-radius']);
    expect(PARRY_RULES.distanceFromPlayerPx).toBe(THEME.sizePx['size.parry-distance']);
    expect(PARRY_RULES.touchSlackPx).toBe(THEME.sizePx['size.parry-touch-slack']);
  });

  it('ring start scale equals size.parry-ring-start', () => {
    expect(PARRY_RULES.ringStartScale).toBe(THEME.sizeCount['size.parry-ring-start']);
  });

  it('ring lead time equals motion.parry-approach', () => {
    expect(PARRY_RULES.approachMs).toBe(THEME.motionMs['motion.parry-approach']);
  });

  it('M9 (AP-151): drag target radius, hold steps and beat time match the tokens', () => {
    expect(THEME.sizePx['size.parry-target-radius']).toBe(PARRY_RULES.dragTargetRadiusPx);
    expect(PARRY_RULES.dragTargetRadiusPx).toBe(24);
    expect(THEME.sizePx['size.parry-target-radius'] - THEME.sizePx['size.parry-target-step']).toBe(
      PARRY_RULES.circleRadiusPx,
    );
    expect(THEME.sizeCount['size.parry-hold-segments']).toBe(8);
    expect(THEME.sizePx['size.parry-hold-r']).toBeLessThan(PARRY_RULES.circleRadiusPx);
    expect(THEME.sizePx['size.parry-hint-y']).toBe(102);
    expect(THEME.sizeCount['size.parry-hint-scale']).toBe(2);
    expect(THEME.sizePx['size.parry-motif']).toBe(16);
    expect(THEME.sizePx['size.parry-symbol']).toBe(14);
  });

  it('M9 (AP-151): the short steps fit inside the rhythm of the rules', () => {
    expect(THEME.motionMs['motion.parry-target-step']).toBeLessThan(PARRY_RULES.goodWindowMs);
    expect(THEME.motionMs['motion.parry-sleep']).toBeLessThanOrEqual(
      THEME.motionMs['motion.parry-feedback'],
    );
    expect(THEME.motionMs['motion.parry-tilt']).toBeLessThan(PARRY_RULES.seqTelegraphMinMs);
  });

  it('feedback and burst durations are positive, the burst outlasts the grade word', () => {
    expect(THEME.motionMs['motion.parry-feedback']).toBeGreaterThan(0);
    expect(THEME.motionMs['motion.parry-burst']).toBeGreaterThan(
      THEME.motionMs['motion.parry-feedback'],
    );
  });
});

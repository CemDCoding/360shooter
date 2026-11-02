import { describe, expect, it } from 'vitest';
import { TIER_RULES } from '../../src/config';

describe('TIER_RULES (AP-126, PE-155, PE-161)', () => {
  it('has the agreed values', () => {
    expect(TIER_RULES).toEqual({
      hpPerStage: 0.08,
      hpPerStageByBatch: { forest: 0.05 },
      damagePerStage: 0.05,
      scalePerStage: 0.03,
      maxScaleBonus: 0.15,
      tintSteps: 4,
    });
  });

  it('has positive factors and a size cap above one stage', () => {
    expect(TIER_RULES.hpPerStage).toBeGreaterThan(0);
    expect(TIER_RULES.damagePerStage).toBeGreaterThan(0);
    expect(TIER_RULES.maxScaleBonus).toBeGreaterThanOrEqual(TIER_RULES.scalePerStage);
    expect(Number.isInteger(TIER_RULES.tintSteps)).toBe(true);
  });
});

/**
 * Enemy tiers (M7, PE-155, PE-161). The bonus per stage is additive:
 * stage 10 means +80 % HP (1 + 10 * 0.08), not compounded.
 */
export const TIER_RULES = {
  hpPerStage: 0.08,
  damagePerStage: 0.05,
  scalePerStage: 0.03,
  maxScaleBonus: 0.15,
  tintSteps: 4,
} as const;

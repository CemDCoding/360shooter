import type { BatchId } from '../contracts';

/**
 * Enemy tiers (M7, PE-155, PE-161). The bonus per stage is additive:
 * stage 10 means +80 % HP (1 + 10 * 0.08), not compounded.
 */
export const TIER_RULES = {
  hpPerStage: 0.08,
  /** HP bonus per stage of single batches instead of `hpPerStage` (AP-168, PE-209, RS-05.2: forest +5 %). */
  hpPerStageByBatch: { forest: 0.05 } as Readonly<Partial<Record<BatchId, number>>>,
  damagePerStage: 0.05,
  scalePerStage: 0.03,
  maxScaleBonus: 0.15,
  tintSteps: 4,
} as const;

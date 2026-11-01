// Enemy tiers inside a batch (M7, AP-128, PE-155, PE-161): pure, no Phaser. Values live in config/tiers.ts.
import { BATCH_STARTS, LEVEL_COUNT } from '../config/levels';
import { TIER_RULES } from '../config/tiers';
import type { EnemyTier } from '../contracts/tier';

/** Index of a level inside its batch, derived from the level data (0 for unknown ids). */
export function tierStage(levelId: number): number {
  if (!Number.isInteger(levelId) || levelId < 0 || levelId >= LEVEL_COUNT) return 0;
  let first = 0;
  for (const s of BATCH_STARTS) if (levelId >= s.first) first = s.first;
  return levelId - first;
}

/** Tier of the enemies of a level. Stage 0 returns the unchanged factors (1). Bonuses are additive. */
export function tierFor(levelId: number): EnemyTier {
  const stage = tierStage(levelId);
  const step = Math.min(stage, TIER_RULES.tintSteps - 1);
  return {
    stage,
    hpFactor: 1 + stage * TIER_RULES.hpPerStage,
    damageFactor: 1 + stage * TIER_RULES.damagePerStage,
    scale: 1 + Math.min(stage * TIER_RULES.scalePerStage, TIER_RULES.maxScaleBonus),
    tintStep: step as EnemyTier['tintStep'],
  };
}

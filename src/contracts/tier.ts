/** Strength level of an enemy inside its batch (M7, PE-155, PE-161). */
export interface EnemyTier {
  /** Level index inside the batch, starting with 0. */
  stage: number;
  hpFactor: number;
  damageFactor: number;
  /** Size factor, 1 = unchanged. */
  scale: number;
  tintStep: 0 | 1 | 2 | 3;
}

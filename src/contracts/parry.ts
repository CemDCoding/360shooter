/** Grade of one quicktime tap (M7, PE-157, PE-158). */
export type ParryGrade = 'perfect' | 'good' | 'miss';

/** One quicktime circle of a boss attack. */
export interface ParryCircle {
  index: number;
  /** Angle around the player in degrees. */
  angleDeg: number;
  /** Moment of the hit, in ms relative to the start of the announcement. */
  hitAtMs: number;
}

export interface ParryRules {
  /** Tap within this distance (ms) of hitAtMs counts as perfect. */
  perfectWindowMs: number;
  /** Tap within this distance (ms) of hitAtMs counts as good. */
  goodWindowMs: number;
  /** Tap radius of a circle in arena units. */
  circleRadiusPx: number;
  /** Start scale of the closing ring around a circle. */
  ringStartScale: number;
  /** Distance of the circles from the player in arena units. */
  distanceFromPlayerPx: number;
  /** Lead time of the closing ring before the hit, in ms (ring shrinks over this time). */
  approachMs: number;
  /** Touch allowance added to circleRadiusPx for the tap reach, in arena units. */
  touchSlackPx: number;
  /** Minimum gap between two circles in ms. */
  minGapMs: number;
}

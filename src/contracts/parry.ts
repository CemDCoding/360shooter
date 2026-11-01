/** Grade of one quicktime tap (M7, PE-157, PE-158). */
export type ParryGrade = 'perfect' | 'good' | 'miss';

/** Kind of a quicktime circle (M9, RS-03.1, PE-188). A missing kind means 'tap'. */
export type ParryKind = 'tap' | 'hold' | 'decoy' | 'sequence' | 'drag' | 'choice' | 'beat';

/** Registry key of the "easy parry" switch (M9, PE-189). */
export const EASY_PARRY_KEY = 'easyParry';

/** One quicktime circle of a boss attack. */
export interface ParryCircle {
  index: number;
  /** Angle around the player in degrees. */
  angleDeg: number;
  /** Moment of the hit, in ms relative to the start of the announcement. */
  hitAtMs: number;
  /** Kind of the circle, missing = 'tap' (M9, RS-03.1). */
  kind?: ParryKind;
  /** hold: moment of the release, in ms relative to the start of the announcement. */
  releaseAtMs?: number;
  /** sequence: tap order, starting with 1. */
  order?: number;
  /** sequence: moment the circle lights up during the announcement, in ms. */
  previewAtMs?: number;
  /** drag: where the circle has to be dragged to, relative to the player. */
  target?: { angleDeg: number; distancePx: number };
  /** choice: true for the one right circle of a round. */
  correct?: boolean;
  /** Key of the symbol drawn on the circle, e.g. 'rose', 'pebble', 'heart' (final names after H-37). */
  symbol?: string;
}

/** One step of an attack pattern (M9, RS-03.1). */
export interface ParryStepDef {
  kind: ParryKind;
  symbol?: string;
  /** hold: hold duration in ms. */
  holdMs?: number;
  /** choice: true for the right circle of its group. */
  correct?: boolean;
  /** choice: steps with the same group form one round. */
  group?: number;
}

/** Pattern of the quicktime circles of one attack (M9, RS-03.1). */
export interface ParryPatternDef {
  steps: ParryStepDef[];
  /** sequence: time between two lit-up circles in the announcement, in ms. */
  previewStepMs?: number;
  /** beat: time between two beats, in ms. */
  beatMs?: number;
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
  /** hold: shortest and longest hold time in ms (M9). */
  holdMinMs: number;
  holdMaxMs: number;
  /** beat: default time between two beats in ms (M9). */
  beatMs: number;
  /** sequence: default time between two lit-up circles in ms (M9). */
  previewStepMs: number;
  /** drag: radius of the drag target in arena units (circle radius plus touch allowance). */
  dragTargetRadiusPx: number;
  /** drag: distance of the target from the circle in arena units. */
  dragTargetDistancePx: number;
  /** Replacement for hold: the two taps may be at most this far apart in ms. */
  twoTapMaxGapMs: number;
  /** Minimum announcement time of attacks with sequence or choice in ms. */
  seqTelegraphMinMs: number;
}

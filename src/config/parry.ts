import type { ParryRules } from '../contracts';

/**
 * Quicktime values (M7, PE-157, PE-158). Starting values, tuned in the manual test.
 * circleRadiusPx: at least 18 so the circle is easy to tap on a phone.
 * distanceFromPlayerPx: far enough that the stick thumb does not cover the circle.
 * Values match the design tokens size.parry-radius, -distance, -touch-slack, -ring-start and
 * motion.duration.parry-approach (H-33).
 * minGapMs: circles of one attack are at least this far apart in time.
 */
export const PARRY_RULES: ParryRules = {
  perfectWindowMs: 80,
  goodWindowMs: 160,
  circleRadiusPx: 20,
  ringStartScale: 2.5,
  distanceFromPlayerPx: 56,
  approachMs: 800,
  touchSlackPx: 4,
  minGapMs: 300,
};

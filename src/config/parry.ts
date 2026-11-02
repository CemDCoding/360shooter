import type { ParryRules } from '../contracts';
import { OPACITY, THEME } from './theme';

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
  // M9 (RS-03.1, PE-188): starting values, manual test H-38.
  holdMinMs: 300,
  holdMaxMs: 600,
  beatMs: 400,
  previewStepMs: 300,
  dragTargetRadiusPx: 24,
  dragTargetDistancePx: 56,
  twoTapMaxGapMs: 700,
  seqTelegraphMinMs: 1800,
};

/** Number of steps of a CSS `steps(n)` easing token (motion.pixel), at least 1. */
function easingSteps(easing: string): number {
  const n = Number(/steps\((\d+)\)/.exec(easing)?.[1]);
  return Number.isInteger(n) && n > 0 ? n : 1;
}

/**
 * Quicktime focus (M11, AP-173, brief H-41, PE-214): only references to the design tokens, no own numbers.
 * nearPx: radius around the astronaut where rank 4 effects drop furthest; inMs/outMs: dimming transition,
 * steps: its steps (motion.pixel); holdMs: the focus stays on between circles that follow within this time;
 * dim: opacity of the ink layer over the floor; low*: opacity of rank 4 effects (near, far, reduced effects).
 */
export const PARRY_FOCUS = {
  nearPx: THEME.sizePx['size.focus-near'],
  inMs: THEME.motionMs['motion.focus-in'],
  outMs: THEME.motionMs['motion.focus-out'],
  holdMs: THEME.motionMs['motion.focus-hold'],
  steps: easingSteps(THEME.motionEasing['motion.pixel']),
  dimColor: 'game.focus-dim',
  dim: OPACITY['focus-dim'],
  lowNear: OPACITY['focus-low-near'],
  lowFar: OPACITY['focus-low-far'],
  lowReduced: OPACITY['focus-low-reduced'],
} as const;

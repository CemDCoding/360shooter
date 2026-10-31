import type { ArenaSize } from '../contracts';

/**
 * Arena dimensions (PE-99, PE-100). Height is fixed; the width is derived from the screen aspect
 * and limited to minWidth..maxWidth. baseWidth is the former fixed width (balance reference).
 */
export const ARENA = {
  height: 360,
  minWidth: 640,
  maxWidth: 900,
  baseWidth: 640,
  /** Distance outside the visible arena at which enemies spawn (px). */
  spawnMarginPx: 24,
  /** Speed multiplier while an enemy is still off-screen (PE-100). */
  offscreenSpeedFactor: 7,
} as const;

/** Spawn ring radius for an arena: half diagonal plus the spawn margin. */
export function spawnRadiusFor(size: ArenaSize): number {
  return Math.hypot(size.width, size.height) / 2 + ARENA.spawnMarginPx;
}

/** Spawn ring radius of the base arena (640 x 360), approx. 391.2. */
export const BASE_SPAWN_RADIUS = spawnRadiusFor({
  width: ARENA.baseWidth,
  height: ARENA.height,
});

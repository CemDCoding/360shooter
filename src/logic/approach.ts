/**
 * Enemy approach on wide arenas (PE-100). Pure functions, no Phaser.
 * Outside the base spawn ring enemies run faster so the time to contact stays close to the 640 arena.
 */

/** Speed factor for an enemy at distanceToCenter: `factor` outside baseRadius, otherwise 1. */
export function approachSpeedFactor(
  distanceToCenter: number,
  baseRadius: number,
  factor: number,
): number {
  return distanceToCenter > baseRadius ? factor : 1;
}

/** Seconds from the spawn ring until the enemy is within contactRadius of the center. */
export function contactTimeSec(
  spawnRadius: number,
  contactRadius: number,
  speed: number,
  baseRadius: number,
  factor: number,
): number {
  if (speed <= 0) return Infinity;
  const outside = Math.max(0, spawnRadius - Math.max(baseRadius, contactRadius));
  const inside = Math.max(0, Math.min(spawnRadius, baseRadius) - contactRadius);
  return outside / (speed * factor) + inside / speed;
}

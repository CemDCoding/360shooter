/** Normalizes degrees to the range (-180, 180]. */
export function normalizeDeg(deg: number): number {
  if (!Number.isFinite(deg)) return 0;
  let a = deg % 360;
  if (a > 180) a -= 360;
  else if (a <= -180) a += 360;
  return a;
}

/**
 * Turns `current` towards `target` (degrees) along the shorter way, by at most
 * maxDegPerSec * dt. Never overshoots; result is normalized to (-180, 180].
 */
export function stepRotation(
  current: number,
  target: number,
  maxDegPerSec: number,
  dtMs: number,
): number {
  const diff = normalizeDeg(target - current);
  const maxStep = (Math.max(0, maxDegPerSec) * Math.max(0, dtMs)) / 1000;
  if (Math.abs(diff) <= maxStep) return normalizeDeg(target);
  return normalizeDeg(current + Math.sign(diff) * maxStep);
}

/**
 * Zigzag path (fairy, PE-127). Pure logic, no Phaser.
 * The lateral offset is a sine; the forward speed toward the player stays the plain speed,
 * so the time to contact equals a straight runner (fairness, AP-83).
 */

export interface Vec2 {
  x: number;
  y: number;
}

/** Sideways offset (pixels) at timeMs. */
export function zigzagOffset(timeMs: number, amplitude: number, periodMs: number): number {
  if (!(periodMs > 0)) return 0;
  return amplitude * Math.sin((2 * Math.PI * timeMs) / periodMs);
}

/** Sideways velocity (pixels per second) at timeMs, the derivative of zigzagOffset. */
export function zigzagLateralSpeed(timeMs: number, amplitude: number, periodMs: number): number {
  if (!(periodMs > 0)) return 0;
  const omega = (2 * Math.PI) / (periodMs / 1000);
  return amplitude * omega * Math.cos((2 * Math.PI * timeMs) / periodMs);
}

/**
 * Velocity (pixels per second) toward `to`: forward part exactly `speed`,
 * plus the lateral zigzag part perpendicular to it. At the target the velocity is zero.
 */
export function zigzagVelocity(
  from: Vec2,
  to: Vec2,
  speed: number,
  timeMs: number,
  amplitude: number,
  periodMs: number,
): Vec2 {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const len = Math.hypot(dx, dy);
  if (len === 0 || !(speed > 0)) return { x: 0, y: 0 };
  const fx = dx / len;
  const fy = dy / len;
  const lateral = zigzagLateralSpeed(timeMs, amplitude, periodMs);
  return { x: fx * speed - fy * lateral, y: fy * speed + fx * lateral };
}

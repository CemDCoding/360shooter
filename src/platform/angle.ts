const TWO_PI = Math.PI * 2;

/** Normalizes an angle in radians to the range (-PI, PI]. */
export function normalizeAngle(angle: number): number {
  if (!Number.isFinite(angle)) return 0;
  let a = angle % TWO_PI;
  if (a > Math.PI) a -= TWO_PI;
  else if (a <= -Math.PI) a += TWO_PI;
  return a;
}

/** Angle in radians from center (cx, cy) to point (px, py); screen coordinates (y down). */
export function angleFromCenter(px: number, py: number, cx: number, cy: number): number {
  return Math.atan2(py - cy, px - cx);
}

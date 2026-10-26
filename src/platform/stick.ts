/** Pure virtual-stick math (no Phaser). Screen coordinates, y down. */

export interface StickVector {
  /** Deflection in -1..1 (length limited to 1). */
  x: number;
  y: number;
  /** False inside the dead zone. */
  active: boolean;
}

/** Limits the deflection (dxPx, dyPx) to the radius; inside the dead zone `active` is false. */
export function stickVector(
  dxPx: number,
  dyPx: number,
  radiusPx: number,
  deadZoneRatio: number,
): StickVector {
  if (!Number.isFinite(dxPx) || !Number.isFinite(dyPx) || !(radiusPx > 0)) {
    return { x: 0, y: 0, active: false };
  }
  const len = Math.hypot(dxPx, dyPx);
  const ratio = len / radiusPx;
  const dead = Number.isFinite(deadZoneRatio) ? Math.max(0, deadZoneRatio) : 0;
  if (len === 0 || ratio <= dead) return { x: 0, y: 0, active: false };
  const k = ratio > 1 ? 1 / len : 1 / radiusPx;
  return { x: dxPx * k, y: dyPx * k, active: true };
}

/** Angle in radians (atan2, same format as AimInput.targetAngle: 0 = right, PI/2 = down). */
export function stickAngleRad(vector: { x: number; y: number }): number {
  return Math.atan2(vector.y, vector.x);
}

/** PE-77: off on desktop (user finding M3-DEP). Touch devices always show the stick. */
export const STICK_ON_DESKTOP = false;

/** True if the stick is shown: always on touch devices, on desktop only with the switch on. */
export function stickVisible(hasTouch: boolean, onDesktop: boolean): boolean {
  return hasTouch || onDesktop;
}

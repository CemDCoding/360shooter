export interface Point {
  x: number;
  y: number;
}

export function distance(ax: number, ay: number, bx: number, by: number): number {
  return Math.hypot(bx - ax, by - ay);
}

/** True if two circles overlap (touching counts as overlap). */
export function circlesOverlap(
  ax: number,
  ay: number,
  ar: number,
  bx: number,
  by: number,
  br: number,
): boolean {
  const r = ar + br;
  const dx = bx - ax;
  const dy = by - ay;
  return dx * dx + dy * dy <= r * r;
}

/** Point on a ring around (cx, cy); angle in radians, screen coordinates (y down). */
export function pointOnRing(angle: number, radius: number, cx: number, cy: number): Point {
  return { x: cx + Math.cos(angle) * radius, y: cy + Math.sin(angle) * radius };
}

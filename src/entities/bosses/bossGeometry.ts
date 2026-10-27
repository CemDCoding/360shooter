// Pure geometry and fairness helpers of the bosses (AP-67). No Phaser import, fully testable.

export interface Point {
  x: number;
  y: number;
}

export interface ArenaRect {
  width: number;
  height: number;
  margin: number;
}

const FULL_TURN = Math.PI * 2;

/** Keeps a point inside the arena (minus the margin). */
export function clampToArena(p: Point, arena: ArenaRect): Point {
  return {
    x: Math.min(arena.width - arena.margin, Math.max(arena.margin, p.x)),
    y: Math.min(arena.height - arena.margin, Math.max(arena.margin, p.y)),
  };
}

export interface StepResult extends Point {
  arrived: boolean;
}

/** Moves toward a target. Never overshoots: if the frame path covers the rest, the target is returned. */
export function stepToward(
  from: Point,
  to: Point,
  speedPxPerSec: number,
  dtMs: number,
): StepResult {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const dist = Math.hypot(dx, dy);
  const stepLen = Math.max(0, (speedPxPerSec * dtMs) / 1000);
  if (dist <= 0 || stepLen >= dist) return { x: to.x, y: to.y, arrived: true };
  const k = stepLen / dist;
  return { x: from.x + dx * k, y: from.y + dy * k, arrived: false };
}

/** Angles of `count` evenly spaced ring roots, without those inside the gap [gapStart, gapStart + gapSize). */
export function ringSpikeAngles(count: number, gapStart: number, gapSize: number): number[] {
  const out: number[] = [];
  if (count <= 0) return out;
  const step = FULL_TURN / count;
  for (let i = 0; i < count; i++) {
    const angle = i * step;
    const rel = (((angle - gapStart) % FULL_TURN) + FULL_TURN) % FULL_TURN;
    if (rel < gapSize) continue;
    out.push(angle);
  }
  return out;
}

/** Positions of the called trees around the origin, clamped into the arena. */
export function treePositions(
  origin: Point,
  count: number,
  baseAngle: number,
  distance: number,
  arena: ArenaRect,
): Point[] {
  const out: Point[] = [];
  for (let i = 0; i < count; i++) {
    const a = baseAngle + (i / count) * FULL_TURN;
    out.push(
      clampToArena(
        { x: origin.x + Math.cos(a) * distance, y: origin.y + Math.sin(a) * distance },
        arena,
      ),
    );
  }
  return out;
}

/**
 * Two fragment positions across the line origin -> center, at least minCenterDist from the centre
 * and inside the arena (also if the original stands on the centre).
 */
export function fragmentPositions(
  origin: Point,
  center: Point,
  offset: number,
  minCenterDist: number,
  arena: ArenaRect,
): [Point, Point] {
  const dx = center.x - origin.x;
  const dy = center.y - origin.y;
  const len = Math.hypot(dx, dy);
  // Perpendicular to the line to the centre (any direction if the origin is on the centre).
  const px = len > 1e-6 ? -dy / len : 0;
  const py = len > 1e-6 ? dx / len : 1;
  const make = (sign: number): Point => {
    let p = { x: origin.x + px * offset * sign, y: origin.y + py * offset * sign };
    let rx = p.x - center.x;
    let ry = p.y - center.y;
    let d = Math.hypot(rx, ry);
    if (d < minCenterDist) {
      if (d < 1e-6) {
        rx = px * sign;
        ry = py * sign;
        d = 1;
      }
      p = { x: center.x + (rx / d) * minCenterDist, y: center.y + (ry / d) * minCenterDist };
    }
    return clampToArena(p, arena);
  };
  return [make(-1), make(1)];
}

/** Flight time in ms of a threat that covers distancePx at the given speed. */
export function flightTimeMs(distancePx: number, speedPxPerSec: number): number {
  if (!(speedPxPerSec > 0)) return Infinity;
  return (Math.max(0, distancePx) / speedPxPerSec) * 1000;
}

/** Hits left of the root bud after `lasers` laser hits. */
export function sproutHitsLeft(hits: number, lasers: number): number {
  return Math.max(0, Math.floor(hits) - Math.max(0, Math.floor(lasers)));
}

/** Damage of the root bud: damage x (hits - k) / hits. */
export function sproutDamage(damage: number, hits: number, hitsLeft: number): number {
  if (!(hits > 0) || !(damage > 0)) return 0;
  const left = Math.min(hits, Math.max(0, hitsLeft));
  return (damage * left) / hits;
}

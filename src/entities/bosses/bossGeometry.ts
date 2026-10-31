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

// --- Riesen-Sand-Wurm (AP-100) ---

/** Point on an ellipse around the centre (angle in radians). */
export function ellipsePoint(
  center: Point,
  radii: { rx: number; ry: number },
  angle: number,
): Point {
  return { x: center.x + Math.cos(angle) * radii.rx, y: center.y + Math.sin(angle) * radii.ry };
}

/** Ellipse angle of a point (inverse of ellipsePoint for points on the ellipse). */
export function ellipseAngle(center: Point, radii: { rx: number; ry: number }, p: Point): number {
  return Math.atan2((p.y - center.y) / radii.ry, (p.x - center.x) / radii.rx);
}

/**
 * Body chain that follows the head: every link keeps at most `spacing` to the one before it
 * (head first). A link closer than `spacing` stays where it is.
 */
export function followChain(chain: readonly Point[], head: Point, spacing: number): Point[] {
  const out: Point[] = [];
  let prev = head;
  for (const p of chain) {
    const dx = p.x - prev.x;
    const dy = p.y - prev.y;
    const d = Math.hypot(dx, dy);
    const next =
      d > spacing && d > 0
        ? { x: prev.x + (dx / d) * spacing, y: prev.y + (dy / d) * spacing }
        : { x: p.x, y: p.y };
    out.push(next);
    prev = next;
  }
  return out;
}

/** Links laid out in a straight line from `start` in direction `angle` (first link one spacing away). */
export function straightChain(
  start: Point,
  angle: number,
  count: number,
  spacing: number,
): Point[] {
  const out: Point[] = [];
  for (let i = 1; i <= count; i++) {
    out.push({
      x: start.x + Math.cos(angle) * spacing * i,
      y: start.y + Math.sin(angle) * spacing * i,
    });
  }
  return out;
}

/**
 * Break-out point of the burrow: beside the player at `distance`, on the side the worm dived from
 * (so the sand trail never crosses the player).
 */
export function emergePoint(center: Point, from: Point, distance: number): Point {
  const dx = from.x - center.x;
  const dy = from.y - center.y;
  const d = Math.hypot(dx, dy);
  const ux = d > 1e-6 ? dx / d : 0;
  const uy = d > 1e-6 ? dy / d : -1;
  return { x: center.x + ux * distance, y: center.y + uy * distance };
}

/**
 * Angles of the coil: the head sits at one edge of the gap, the links spread over the rest of the ring,
 * the last link (tail) at the other edge. No link lies inside the gap [gapStart, gapStart + gapSize).
 */
export function coilAngles(
  count: number,
  gapStart: number,
  gapSize: number,
): { head: number; links: number[] } {
  const head = gapStart + gapSize;
  const arc = FULL_TURN - gapSize;
  const links: number[] = [];
  for (let i = 1; i <= count; i++) links.push(head + (arc * i) / count);
  return { head, links };
}

/** Radius of the squeezing coil after `elapsedMs`, never below `stopRadius`. */
export function coilRadius(
  startRadius: number,
  speedPxPerSec: number,
  elapsedMs: number,
  stopRadius: number,
): number {
  return Math.max(
    stopRadius,
    startRadius - (Math.max(0, speedPxPerSec) * Math.max(0, elapsedMs)) / 1000,
  );
}

/**
 * Speed of the skin spikes: at most `maxSpeed`, slower when the worm is close, so a spike needs at least
 * `minReactionMs` to the player's hit circle. Never below `minSpeed`.
 */
export function volleySpeed(
  distance: number,
  maxSpeed: number,
  minSpeed: number,
  reachRadius: number,
  minReactionMs: number,
): number {
  const fair = (Math.max(0, distance - reachRadius) * 1000) / Math.max(1, minReactionMs);
  return Math.max(minSpeed, Math.min(maxSpeed, fair));
}

/** Damage share left after `hits` of `maxHits` (1 without hits, 0 after all hits). */
export function weakenedShare(hits: number, maxHits: number): number {
  if (!(maxHits > 0)) return 1;
  return Math.max(0, 1 - Math.max(0, hits) / maxHits);
}

// --- Antiker Wächter-Hund (AP-103) ---

/** `count` points evenly spaced on a circle around `center`, the first at `baseAngle`. */
export function ringPositions(
  center: Point,
  count: number,
  baseAngle: number,
  radius: number,
): Point[] {
  const out: Point[] = [];
  for (let i = 0; i < count; i++) {
    const a = baseAngle + (i / count) * FULL_TURN;
    out.push({ x: center.x + Math.cos(a) * radius, y: center.y + Math.sin(a) * radius });
  }
  return out;
}

/**
 * Point where the ray from `center` in direction `angle` leaves the arena (minus the margin). Used to mark
 * at the visible edge where summoned enemies come in from outside the screen.
 */
export function edgePoint(center: Point, angle: number, arena: ArenaRect): Point {
  const dx = Math.cos(angle);
  const dy = Math.sin(angle);
  const lo = arena.margin;
  const hiX = arena.width - arena.margin;
  const hiY = arena.height - arena.margin;
  let t = Infinity;
  if (dx > 1e-9) t = Math.min(t, (hiX - center.x) / dx);
  if (dx < -1e-9) t = Math.min(t, (lo - center.x) / dx);
  if (dy > 1e-9) t = Math.min(t, (hiY - center.y) / dy);
  if (dy < -1e-9) t = Math.min(t, (lo - center.y) / dy);
  if (!Number.isFinite(t)) t = 0;
  return clampToArena(
    { x: center.x + dx * Math.max(0, t), y: center.y + dy * Math.max(0, t) },
    arena,
  );
}

/**
 * Arcs of the bark shock wave: the ring without the gap [gapStart, gapStart + gapSize), split into `count`
 * equal arcs. Each arc starts at `start` and covers `size` radians; together they leave exactly the gap open.
 */
export function waveArcs(
  count: number,
  gapStart: number,
  gapSize: number,
): { start: number; size: number }[] {
  const out: { start: number; size: number }[] = [];
  if (count <= 0) return out;
  const gap = Math.min(FULL_TURN, Math.max(0, gapSize));
  const size = (FULL_TURN - gap) / count;
  for (let i = 0; i < count; i++) out.push({ start: gapStart + gap + i * size, size });
  return out;
}

// --- Pharao (AP-104) ---

/**
 * Arm angles of the gold curse spiral after `elapsedMs`: `arms` evenly spaced arms that turn with
 * `spinRadPerSec` (sign = direction). The space between two arms is the gap of the spiral.
 */
export function spiralAngles(
  arms: number,
  baseAngle: number,
  spinRadPerSec: number,
  elapsedMs: number,
): number[] {
  const out: number[] = [];
  if (arms <= 0) return out;
  const turn = baseAngle + (spinRadPerSec * Math.max(0, elapsedMs)) / 1000;
  for (let i = 0; i < arms; i++) out.push(turn + (i / arms) * FULL_TURN);
  return out;
}

/**
 * Start angle of the spiral so that arm 0 points at `targetAngle` in the middle of the burst
 * (the player first sits in a gap, the arm sweeps across her halfway through).
 */
export function spiralBaseAngle(
  targetAngle: number,
  spinRadPerSec: number,
  burstMs: number,
): number {
  return targetAngle - (spinRadPerSec * Math.max(0, burstMs)) / 2000;
}

/**
 * Path angle where the pharaoh reappears after the sarcophagus: between a quarter and three quarters
 * of a turn away from `current` (r in [0, 1)), so it never reappears where it vanished.
 */
export function reappearAngle(current: number, r: number): number {
  const k = Math.min(1, Math.max(0, r));
  return current + Math.PI / 2 + k * Math.PI;
}

/** Linear fade 0..1 over fadeMs; with reduced motion it switches at once (no fading, no flicker). */
export function fadeLevel(elapsedMs: number, fadeMs: number, reduced: boolean): number {
  if (reduced || !(fadeMs > 0)) return elapsedMs >= 0 ? 1 : 0;
  return Math.min(1, Math.max(0, elapsedMs / fadeMs));
}

/**
 * Alpha of the edge darkening bands, outermost first: the outer band has `strength` (map vignette),
 * every band further in a bit less, the last one still above 0.
 */
export function bandAlphas(bands: number, strength: number): number[] {
  const out: number[] = [];
  const s = Math.min(1, Math.max(0, strength));
  for (let i = 0; i < bands; i++) out.push((s * (bands - i)) / bands);
  return out;
}

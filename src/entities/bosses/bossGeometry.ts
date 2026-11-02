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

// --- Fairy-tale quicktimes (AP-154, RS-03.5, RS-03.6): anchors of circles and drag targets. ---
// Angles in degrees like ParryCircle.angleDeg (0 = right, clockwise on screen because y points down).

/** A circle the target boxes must stay clear of (stick catch area, quicktime circles). */
export interface AvoidCircle extends Point {
  r: number;
}

/** Where drag targets may lie: inside the rectangle, outside every avoid circle. */
export interface SafeZone {
  left: number;
  top: number;
  right: number;
  bottom: number;
  avoid: readonly AvoidCircle[];
}

/** Circle angle and drag target of one quicktime circle (same shape as ParryAnchor). */
export interface DragAnchor {
  angleDeg: number;
  target: { angleDeg: number; distancePx: number };
}

/** Angle in [0, 360). */
export function normDeg(a: number): number {
  return ((a % 360) + 360) % 360;
}

/** Signed shortest turn from `from` to `to` in degrees, in (-180, 180]. */
export function deltaDeg(from: number, to: number): number {
  const d = normDeg(to - from);
  return d > 180 ? d - 360 : d;
}

/** Direction from `center` to `p` in degrees [0, 360). */
export function angleDegOf(center: Point, p: Point): number {
  return normDeg((Math.atan2(p.y - center.y, p.x - center.x) * 180) / Math.PI);
}

/** Point at `distance` from `center` in direction `deg`. */
export function polarPoint(center: Point, deg: number, distance: number): Point {
  const rad = (deg * Math.PI) / 180;
  return { x: center.x + Math.cos(rad) * distance, y: center.y + Math.sin(rad) * distance };
}

/** Smallest angle between two circles at `distancePx` whose tap areas (`reachPx`) must not overlap. */
export function spacingDeg(reachPx: number, distancePx: number): number {
  const ratio = Math.min(1, Math.max(0, reachPx) / Math.max(1, distancePx));
  return (2 * Math.asin(ratio) * 180) / Math.PI;
}

/** `count` angles centred on `centerDeg`, `stepDeg` apart (burrow: the side where the sand trail arrives). */
export function sideAngles(centerDeg: number, count: number, stepDeg: number): number[] {
  const out: number[] = [];
  for (let i = 0; i < count; i++) out.push(normDeg(centerDeg + (i - (count - 1) / 2) * stepDeg));
  return out;
}

/**
 * `count` angles centred on `centerDeg` that spread over +-`halfSpreadDeg`, but never closer than `minStepDeg`
 * (then they spread wider: no overlapping tap areas).
 */
export function spreadAngles(
  centerDeg: number,
  count: number,
  halfSpreadDeg: number,
  minStepDeg: number,
): number[] {
  const step = count > 1 ? Math.max((2 * halfSpreadDeg) / (count - 1), minStepDeg) : 0;
  return sideAngles(centerDeg, count, step);
}

/** Safe zone of the arena: minus the margin, below `topPx` (HUD), outside the avoid circles (stick). */
export function safeZone(arena: ArenaRect, topPx: number, avoid: readonly AvoidCircle[]): SafeZone {
  return {
    left: arena.margin,
    top: Math.max(arena.margin, topPx),
    right: arena.width - arena.margin,
    bottom: arena.height - arena.margin,
    avoid,
  };
}

/** Distance from `p` to the square box with centre `c` and half size `half` (0 inside). */
export function boxDistance(p: Point, c: Point, half: number): number {
  const dx = Math.max(0, Math.abs(p.x - c.x) - half);
  const dy = Math.max(0, Math.abs(p.y - c.y) - half);
  return Math.hypot(dx, dy);
}

/** true if the square box (centre `p`, half size `half`) lies inside the zone and clear of every avoid circle. */
export function boxFits(p: Point, half: number, zone: SafeZone): boolean {
  if (p.x - half < zone.left || p.x + half > zone.right) return false;
  if (p.y - half < zone.top || p.y + half > zone.bottom) return false;
  return zone.avoid.every((a) => boxDistance(a, p, half) >= a.r);
}

/**
 * Largest distance from `wantedPx` down to `minPx` (1 px steps) at which a target box in direction `deg` fits
 * the zone; null if none fits.
 */
export function fitDistance(
  center: Point,
  deg: number,
  wantedPx: number,
  minPx: number,
  half: number,
  zone: SafeZone,
): number | null {
  for (let d = Math.floor(wantedPx); d >= Math.ceil(minPx); d--) {
    if (boxFits(polarPoint(center, deg, d), half, zone)) return d;
  }
  return null;
}

/**
 * Distance from the player where two stones of `radius` rolling in on lanes `gapDeg` apart touch each other,
 * never below `minDist` (so they bounce off each other before they reach the player).
 */
export function clashDistance(gapDeg: number, radius: number, minDist: number): number {
  const halfGap = (Math.min(180, Math.abs(gapDeg)) * Math.PI) / 360;
  const s = Math.sin(halfGap);
  const d = s > 1e-6 ? Math.max(0, radius) / s : Infinity;
  return Math.max(minDist, d);
}

export interface DragAnchorOptions {
  /** Distance of the quicktime circles from the player. */
  circleDist: number;
  /** Turn of each circle away from its target direction. */
  sideDeg: number;
  /** Tap reach of a circle; target boxes keep at least this far from every circle centre. */
  circleReach: number;
  /** Smallest angle between two circles (spacingDeg). */
  minSpacingDeg: number;
  /** Half size of a target box. */
  half: number;
  zone: SafeZone;
}

/** Target box as an avoid circle for the next box (circumscribed, so two boxes never overlap). */
function boxAvoid(p: Point, half: number): AvoidCircle {
  return { x: p.x, y: p.y, r: half * Math.SQRT2 };
}

/**
 * Riesenzank: one drag circle per stone, its target on the lane of that stone (direction `lanes[i]` from the
 * player, as far as `targetDist` and at least `minTargetDist`). Each circle turns `sideDeg` away from the other
 * lane, so the two circles keep at least 2 * sideDeg apart. null: the targets do not fit (the quarrel is skipped).
 */
export function quarrelAnchors(
  center: Point,
  lanes: readonly [number, number],
  targetDist: number,
  minTargetDist: number,
  o: DragAnchorOptions,
): [DragAnchor, DragAnchor] | null {
  const [a, b] = lanes;
  const s = deltaDeg(a, b) >= 0 ? 1 : -1;
  const circles = [normDeg(a - s * o.sideDeg), normDeg(b + s * o.sideDeg)];
  if (Math.abs(deltaDeg(circles[0], circles[1])) < o.minSpacingDeg) return null;
  const circleAvoid = circles.map((deg) => ({
    ...polarPoint(center, deg, o.circleDist),
    r: o.circleReach,
  }));
  const zoneA: SafeZone = { ...o.zone, avoid: [...o.zone.avoid, ...circleAvoid] };
  const dA = fitDistance(center, a, targetDist, minTargetDist, o.half, zoneA);
  if (dA === null) return null;
  const zoneB: SafeZone = {
    ...zoneA,
    avoid: [...zoneA.avoid, boxAvoid(polarPoint(center, a, dA), o.half)],
  };
  const dB = fitDistance(center, b, targetDist, minTargetDist, o.half, zoneB);
  if (dB === null) return null;
  return [
    { angleDeg: circles[0], target: { angleDeg: normDeg(a), distancePx: dA } },
    { angleDeg: circles[1], target: { angleDeg: normDeg(b), distancePx: dB } },
  ];
}

/**
 * Fessel der Göttinnen: `count` drag circles whose targets lie on links of the coil (`linkDegs` at `linkDist`).
 * Links are tried in order from `startIndex`; each circle sits `sideDeg` beside its link (first +, then -). A
 * pick is kept only if its box fits the zone, the circle keeps minSpacingDeg to the circles before and no box
 * comes closer than the circle reach to any circle. null: not enough links fit.
 */
export function coilAnchors(
  center: Point,
  linkDegs: readonly number[],
  linkDist: number,
  count: number,
  startIndex: number,
  o: DragAnchorOptions,
): DragAnchor[] | null {
  const out: DragAnchor[] = [];
  const circles: Point[] = [];
  const boxes: Point[] = [];
  const n = linkDegs.length;
  for (let k = 0; k < n && out.length < count; k++) {
    const link = normDeg(linkDegs[(((startIndex + k) % n) + n) % n]);
    const box = polarPoint(center, link, linkDist);
    for (const side of [1, -1]) {
      const deg = normDeg(link + side * o.sideDeg);
      const circle = polarPoint(center, deg, o.circleDist);
      const spaced = out.every((x) => Math.abs(deltaDeg(x.angleDeg, deg)) >= o.minSpacingDeg);
      const clearOfBoxes = boxes.every((b) => boxDistance(circle, b, o.half) >= o.circleReach);
      const avoid: AvoidCircle[] = [
        ...o.zone.avoid,
        ...[...circles, circle].map((c) => ({ ...c, r: o.circleReach })),
        ...boxes.map((b) => boxAvoid(b, o.half)),
      ];
      if (!spaced || !clearOfBoxes || !boxFits(box, o.half, { ...o.zone, avoid })) continue;
      out.push({ angleDeg: deg, target: { angleDeg: link, distancePx: linkDist } });
      circles.push(circle);
      boxes.push(box);
      break;
    }
  }
  return out.length === count ? out : null;
}

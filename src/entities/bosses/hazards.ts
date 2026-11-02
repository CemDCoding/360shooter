// Generic boss hazards (AP-100, PE-134): projectiles and danger zones of every boss reach the scene through
// one interface (BossBase.getHazards()), so GameScene needs no `instanceof` per boss. No Phaser import, testable.
// Also holds the quicktime state of boss attacks (AP-133, ParryTracker): the parry share scales the damage of
// exactly the attack it belongs to, so it lives next to the hazards that carry that damage.
import { PARRY_RULES } from '../../config/parry';
import type { ParryCircle, ParryGrade, ParryRules, StatusOnHit } from '../../contracts';
import {
  circleKind,
  circlePosition,
  dropCircle,
  expireCircles,
  hitCircle,
  hitTarget,
  planCircles,
  pressCircle,
  releaseCircle,
  resolveParry,
  targetPosition,
  type ParryCircleState,
  type ParryPlanSource,
} from '../../logic/parry';
import type { Rng } from '../../logic/rng';
import type { ParryNote } from '../parry/look';

export interface HitCircle {
  x: number;
  y: number;
  radius: number;
}

export interface HitRect {
  left: number;
  top: number;
  right: number;
  bottom: number;
}

/**
 * Hit shape of a hazard: circle, line (capsule of the given width) or area (axis aligned rectangle or a ring
 * band with an optional gap). The tests follow the Arcade rules (circle vs circle, circle vs rectangle,
 * rectangle vs rectangle), so a shape taken from a physics body (bodyShape) hits exactly like an overlap.
 */
export type HazardShape =
  | { kind: 'circle'; x: number; y: number; radius: number }
  | { kind: 'rect'; left: number; top: number; right: number; bottom: number }
  | { kind: 'line'; x1: number; y1: number; x2: number; y2: number; width: number }
  | {
      kind: 'ring';
      x: number;
      y: number;
      inner: number;
      outer: number;
      /** Optional gap (radians): no hit from gapStart over gapSize. */
      gapStart?: number;
      gapSize?: number;
    };

/** A player laser as seen by a hazard: its body rectangle and its circle (centre, half width). */
export interface LaserProbe {
  rect: HitRect;
  circle: HitCircle;
}

export interface BossHazard {
  /** false: the hazard is gone (read live, a hazard can vanish during the check). */
  readonly active: boolean;
  readonly shape: HazardShape;
  /** Lasers can hit it (shoot down, weaken or bounce off). false: lasers pass through. */
  readonly shootable: boolean;
  /** Status effect for the player on a hit (AP-102 applies it). */
  readonly onHit?: StatusOnHit;
  /** A laser touches the hazard. Returns true if the laser is used up. */
  laserHit(laser: LaserProbe): boolean;
  /** The hazard touches the player. Returns the damage to apply now (0 = nothing, e.g. already used). */
  playerHit(): number;
}

/** Physics body fields that bodyShape() needs (Arcade body). */
export interface BodyLike {
  isCircle: boolean;
  center: { x: number; y: number };
  halfWidth: number;
  left: number;
  top: number;
  right: number;
  bottom: number;
}

const FULL_TURN = Math.PI * 2;

/** Shape of an Arcade body: its circle or its rectangle. */
export function bodyShape(body: BodyLike): HazardShape {
  if (body.isCircle) {
    return { kind: 'circle', x: body.center.x, y: body.center.y, radius: body.halfWidth };
  }
  return { kind: 'rect', left: body.left, top: body.top, right: body.right, bottom: body.bottom };
}

/** Circle of an Arcade body (centre and half width), e.g. the player or the laser. */
export function bodyCircle(body: BodyLike): HitCircle {
  return { x: body.center.x, y: body.center.y, radius: body.halfWidth };
}

function clamp(v: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, v));
}

function circleHitsRect(c: HitCircle, r: HitRect): boolean {
  const x = clamp(c.x, r.left, r.right);
  const y = clamp(c.y, r.top, r.bottom);
  return (c.x - x) ** 2 + (c.y - y) ** 2 <= c.radius * c.radius;
}

/** Distance of a point to the segment a-b. */
export function distanceToSegment(
  px: number,
  py: number,
  ax: number,
  ay: number,
  bx: number,
  by: number,
): number {
  const dx = bx - ax;
  const dy = by - ay;
  const len2 = dx * dx + dy * dy;
  const t = len2 > 0 ? clamp(((px - ax) * dx + (py - ay) * dy) / len2, 0, 1) : 0;
  return Math.hypot(px - (ax + dx * t), py - (ay + dy * t));
}

/** true if `angle` lies in the gap [start, start + size). */
export function angleInGap(angle: number, start: number, size: number): boolean {
  if (!(size > 0)) return false;
  const rel = (((angle - start) % FULL_TURN) + FULL_TURN) % FULL_TURN;
  return rel < size;
}

/** Circle (player or laser) against a hazard shape. Touching counts, like Arcade. */
export function circleHitsShape(c: HitCircle, s: HazardShape): boolean {
  switch (s.kind) {
    case 'circle':
      return Math.hypot(c.x - s.x, c.y - s.y) <= c.radius + s.radius;
    case 'rect':
      return circleHitsRect(c, s);
    case 'line':
      return distanceToSegment(c.x, c.y, s.x1, s.y1, s.x2, s.y2) <= c.radius + s.width / 2;
    case 'ring': {
      const d = Math.hypot(c.x - s.x, c.y - s.y);
      if (d + c.radius < s.inner || d - c.radius > s.outer) return false;
      return !angleInGap(Math.atan2(c.y - s.y, c.x - s.x), s.gapStart ?? 0, s.gapSize ?? 0);
    }
  }
}

/**
 * Laser against a hazard shape. Circle and rectangle use the laser body rectangle (Arcade overlap rules),
 * line and ring use the laser circle.
 */
export function laserHitsShape(laser: LaserProbe, s: HazardShape): boolean {
  if (s.kind === 'circle') return circleHitsRect(s, laser.rect);
  if (s.kind === 'rect') {
    const r = laser.rect;
    return !(r.right <= s.left || r.bottom <= s.top || r.left >= s.right || r.top >= s.bottom);
  }
  return circleHitsShape(laser.circle, s);
}

/** A laser for resolveHazardHits: `active` is read live (a released laser is skipped). */
export interface HazardLaser {
  readonly active: boolean;
  readonly probe: LaserProbe;
}

export interface HazardHooks<L extends HazardLaser> {
  /** The laser was used up by a hazard: return it to the pool. */
  releaseLaser(laser: L): void;
  /** Feedback for a used-up laser (sound). */
  onLaserUsed?(hazard: BossHazard): void;
  /** The player is hit: damage goes through Player.takeDamage (shield first), onHit is passed on. */
  hitPlayer(damage: number, onHit: StatusOnHit | undefined): void;
}

/**
 * The single hit path for boss hazards (PE-134). First lasers (one laser hits at most one hazard), then the
 * player. Works for any object with hazards, no boss class checks.
 */
export function resolveHazardHits<L extends HazardLaser>(
  hazards: readonly BossHazard[],
  lasers: readonly L[],
  player: HitCircle,
  hooks: HazardHooks<L>,
): void {
  if (hazards.length === 0) return;
  for (const laser of lasers) {
    for (const h of hazards) {
      if (!laser.active) break;
      if (!h.shootable || !h.active) continue;
      if (!laserHitsShape(laser.probe, h.shape)) continue;
      if (h.laserHit(laser.probe)) {
        hooks.releaseLaser(laser);
        hooks.onLaserUsed?.(h);
        break;
      }
    }
  }
  for (const h of hazards) {
    if (!h.active || !circleHitsShape(player, h.shape)) continue;
    const damage = h.playerHit();
    if (damage > 0) hooks.hitPlayer(damage, h.onHit);
  }
}

// ---------- Quicktime (AP-133, F-29, PE-157, PE-158) ----------

/** The quicktime circles of exactly one announced boss attack. */
export interface ParryGroup {
  /** Unique over all bosses of the round (overlapping announcements, stone fragments). */
  readonly id: number;
  readonly attackId: string;
  /** Circles with their results; hitAtMs runs on the clock of elapsedMs. */
  circles: ParryCircleState[];
  /** Play time since the start of the announcement (stands still while the game is paused). */
  elapsedMs: number;
  /** Why a circle failed (M9 words "ZU FRÜH" / "FALSCH"), by circle index; missing = plain miss. */
  notes?: Record<number, ParryNote>;
  /** drag: pointer position of a circle that is being dragged right now (world coordinates), by index. */
  drags?: Record<number, { x: number; y: number }>;
}

/** Where a boss puts a circle (M9 hook BossBase.parryAnchor): angle around the player and the drag target. */
export interface ParryAnchor {
  angleDeg: number;
  target?: { angleDeg: number; distancePx: number };
}

/** Result of a group at the impact of its attack. */
export interface ParryOutcome {
  group: ParryGroup;
  /** All circles hit: the attack does no damage. */
  blocked: boolean;
  /** Share of the damage that still hits (misses / circles). */
  damageFactor: number;
  perfectCount: number;
}

/** A press that hit an open circle (or the target of a selected drag circle). */
export interface ParryTap {
  group: ParryGroup;
  index: number;
  /** Grade after the press; null while the task goes on (hold started, drag circle picked up). */
  grade: ParryGrade | null;
}

/** A pointer that holds or drags a circle (M9). */
interface Grab {
  groupId: number;
  index: number;
}

let nextGroupId = 1;

/**
 * Moment a circle appears: hitAtMs - approachMs, at the earliest the start of the announcement. A sequence
 * circle shows already when it lights up in the announcement (previewAtMs, PE-188 B4).
 */
export function circleAppearsAtMs(
  circle: Pick<ParryCircle, 'hitAtMs'> & Partial<Pick<ParryCircle, 'kind' | 'previewAtMs'>>,
  rules: ParryRules = PARRY_RULES,
): number {
  const appear = Math.max(0, circle.hitAtMs - rules.approachMs);
  if (circle.kind === 'sequence' && circle.previewAtMs !== undefined)
    return Math.max(0, Math.min(appear, circle.previewAtMs));
  return appear;
}

/** true while a circle is open and on screen. A circle that is not shown yet never takes a tap. */
export function isCircleTappable(
  circle: ParryCircleState,
  elapsedMs: number,
  rules: ParryRules = PARRY_RULES,
): boolean {
  return circle.result === null && elapsedMs >= circleAppearsAtMs(circle, rules);
}

/** Damage of an attack after the parry share (0 = blocked). An invalid factor counts as "not parried". */
export function parriedDamage(damage: number, factor: number): number {
  const f = Number.isFinite(factor) ? Math.min(1, Math.max(0, factor)) : 1;
  return damage * f;
}

/**
 * Quicktime state of one boss (AP-133, M9 AP-151). open() at the start of an announcement, tick() every frame
 * with the play time, press() / move() / release() for the pointers (each tracked by its pointerId, so a second
 * finger can hold or drag next to the stick), resolve() at the impact (removes the group; open circles count as
 * missed), clear() when the boss leaves. Several groups can be open at the same time. All grading uses the play
 * time of the group (elapsedMs), so a pause freezes holding and dragging.
 */
export class ParryTracker {
  private readonly list: ParryGroup[] = [];
  private readonly grabs = new Map<number, Grab>();

  constructor(private readonly rules: ParryRules = PARRY_RULES) {}

  get groups(): readonly ParryGroup[] {
    return this.list;
  }

  /**
   * Plans the circles of one attack: `source` is the M7 circle count or the attack with its pattern (M9).
   * `easy` turns every task into a plain tap (PE-189). `anchor` may move circles and drag targets (boss hook).
   */
  open(
    attackId: string,
    source: number | ParryPlanSource,
    telegraphMs: number,
    rng: Rng,
    easy = false,
    anchor?: (circle: ParryCircleState) => ParryAnchor | null | undefined,
  ): ParryGroup | null {
    let circles = planCircles(source, telegraphMs, rng, this.rules, easy);
    if (circles.length === 0) return null;
    if (anchor) circles = circles.map((c) => withAnchor(c, anchor(c)));
    const group: ParryGroup = { id: nextGroupId++, attackId, circles, elapsedMs: 0 };
    this.list.push(group);
    return group;
  }

  tick(dtMs: number): void {
    if (!Number.isFinite(dtMs) || dtMs <= 0) return;
    for (const g of this.list) {
      g.elapsedMs += dtMs;
      g.circles = expireCircles(g.circles, g.elapsedMs, this.rules);
      dropFinishedDrags(g);
    }
  }

  /** M7 name: a press without a pointer to follow (no hold or drag afterwards). */
  tap(point: { x: number; y: number }, center: { x: number; y: number }): ParryTap | null {
    return this.press(point, center);
  }

  /**
   * A press at `point` (oldest group first). First the target of a selected drag circle (replacement "tap circle,
   * then tap target"), then the open, visible circle under the point. With a `pointerId`, a hold or drag circle
   * stays with that pointer until release(). null: the press hit nothing (it may aim).
   */
  press(
    point: { x: number; y: number },
    center: { x: number; y: number },
    pointerId?: number,
  ): ParryTap | null {
    for (const g of this.list) {
      const open = g.circles.filter((c) => c.result === null);
      const target = hitTarget(open, point, center, this.rules);
      if (target) {
        g.circles = dropCircle(g.circles, target.index, point, center, g.elapsedMs, this.rules);
        if (g.drags) delete g.drags[target.index];
        return { group: g, index: target.index, grade: resultOf(g, target.index) };
      }
      const shown = g.circles.filter((c) => isCircleTappable(c, g.elapsedMs, this.rules));
      const hit = hitCircle(shown, point, center, this.rules);
      if (!hit) continue;
      const wrongOrder = isOutOfOrder(g.circles, hit);
      g.circles = pressCircle(g.circles, hit.index, g.elapsedMs, this.rules);
      const after = g.circles.find((c) => c.index === hit.index) ?? hit;
      const kind = circleKind(after);
      if (kind === 'sequence' && wrongOrder) note(g, hit.index, 'wrong');
      if (kind === 'choice' && after.correct !== true) note(g, hit.index, 'wrong');
      if (kind === 'hold' && hit.pressedAtMs !== undefined) {
        // Second of two taps (replacement for the release): only "too early" if it came before the window.
        const release = after.releaseAtMs ?? after.hitAtMs;
        if (g.notes) delete g.notes[hit.index];
        if (after.result === 'miss' && g.elapsedMs < release - this.rules.goodWindowMs)
          note(g, hit.index, 'early');
      }
      if (
        pointerId !== undefined &&
        after.result === null &&
        (kind === 'drag' || (kind === 'hold' && after.holding === true))
      ) {
        this.grabs.set(pointerId, { groupId: g.id, index: hit.index });
        // A drag circle is "grabbed" from the press on (at the press point), not "selected by tap": no second
        // ring, no bracket step and no flicker before the first move (brief H-37 5a). A release without a move
        // still selects it (tap replacement), see release().
        if (kind === 'drag')
          g.drags = { ...(g.drags ?? {}), [hit.index]: { x: point.x, y: point.y } };
      }
      return { group: g, index: hit.index, grade: after.result };
    }
    return null;
  }

  /** true if this pointer holds or drags a circle of this tracker. */
  holds(pointerId: number): boolean {
    return this.grabs.has(pointerId);
  }

  /** Pointer move: a dragged circle follows the pointer (display only; graded on release). */
  move(pointerId: number, point: { x: number; y: number }): void {
    const found = this.grabbed(pointerId);
    if (!found) return;
    const { g, c } = found;
    if (circleKind(c) !== 'drag') return;
    g.drags = { ...(g.drags ?? {}), [c.index]: { x: point.x, y: point.y } };
  }

  /**
   * Pointer up. hold: releaseCircle (an early release waits for the second tap, noted as "too early").
   * drag: inside the target radius the drop is graded; still on the circle it counts as a tap that selects the
   * circle (replacement); anywhere else the circle goes back.
   */
  release(
    pointerId: number,
    point: { x: number; y: number },
    center: { x: number; y: number },
  ): void {
    const found = this.grabbed(pointerId);
    this.grabs.delete(pointerId);
    if (!found) return;
    const { g, c } = found;
    if (g.drags) delete g.drags[c.index];
    if (circleKind(c) === 'hold') {
      g.circles = releaseCircle(g.circles, c.index, g.elapsedMs, this.rules);
      const after = g.circles.find((x) => x.index === c.index);
      if (after && after.result === null && after.holding === false) note(g, c.index, 'early');
      return;
    }
    if (circleKind(c) !== 'drag') return;
    const target = targetPosition(c, center);
    const onTarget =
      target !== null &&
      Math.hypot(point.x - target.x, point.y - target.y) <= this.rules.dragTargetRadiusPx;
    const home = circlePosition(c, center, this.rules);
    const onCircle =
      Math.hypot(point.x - home.x, point.y - home.y) <=
      this.rules.circleRadiusPx + this.rules.touchSlackPx;
    if (onTarget || !onCircle)
      g.circles = dropCircle(g.circles, c.index, point, center, g.elapsedMs, this.rules);
  }

  /**
   * The pointer went up while the game was paused: that release does not count. The pointer lets go of its
   * circle without a grade; a held circle can still be finished by a tap (two-tap replacement), a dragged
   * circle goes back and stays selected (tap its target).
   */
  cancel(pointerId: number): void {
    const found = this.grabbed(pointerId);
    this.grabs.delete(pointerId);
    if (found?.g.drags) delete found.g.drags[found.c.index];
  }

  /** The attack `attackId` hits now: removes its oldest group and returns the result (null: no circles). */
  resolve(attackId: string): ParryOutcome | null {
    const i = this.list.findIndex((g) => g.attackId === attackId);
    if (i < 0) return null;
    const [group] = this.list.splice(i, 1);
    // Open circles miss; an untouched decoy counts as avoided (no penalty, PE-188).
    group.circles = group.circles.map((c) => {
      if (c.result !== null) return c;
      if (circleKind(c) === 'decoy') return { ...c, result: 'perfect' as const };
      return { ...c, holding: false, result: 'miss' as const };
    });
    delete group.drags;
    for (const [id, grab] of this.grabs) if (grab.groupId === group.id) this.grabs.delete(id);
    const r = resolveParry(group.circles);
    return { group, ...r };
  }

  clear(): void {
    this.list.length = 0;
    this.grabs.clear();
  }

  private grabbed(pointerId: number): { g: ParryGroup; c: ParryCircleState } | null {
    const grab = this.grabs.get(pointerId);
    if (!grab) return null;
    const g = this.list.find((x) => x.id === grab.groupId);
    const c = g?.circles.find((x) => x.index === grab.index);
    if (!g || !c || c.result !== null) return null;
    return { g, c };
  }
}

function withAnchor(c: ParryCircleState, a: ParryAnchor | null | undefined): ParryCircleState {
  if (!a || !Number.isFinite(a.angleDeg)) return c;
  const next: ParryCircleState = { ...c, angleDeg: a.angleDeg };
  if (
    a.target &&
    Number.isFinite(a.target.angleDeg) &&
    Number.isFinite(a.target.distancePx) &&
    circleKind(c) === 'drag'
  ) {
    next.target = { angleDeg: a.target.angleDeg, distancePx: a.target.distancePx };
  }
  return next;
}

function resultOf(g: ParryGroup, index: number): ParryGrade | null {
  return g.circles.find((c) => c.index === index)?.result ?? null;
}

function note(g: ParryGroup, index: number, why: ParryNote): void {
  g.notes = { ...(g.notes ?? {}), [index]: why };
}

/** sequence: an open circle with a lower order exists (the press is in the wrong order). */
function isOutOfOrder(circles: readonly ParryCircleState[], c: ParryCircleState): boolean {
  if (circleKind(c) !== 'sequence' || c.order === undefined) return false;
  const order = c.order;
  return circles.some(
    (x) =>
      x.result === null && circleKind(x) === 'sequence' && x.order !== undefined && x.order < order,
  );
}

/** Graded circles no longer follow a pointer. */
function dropFinishedDrags(g: ParryGroup): void {
  if (!g.drags) return;
  for (const key of Object.keys(g.drags)) {
    const index = Number(key);
    if (g.circles.find((c) => c.index === index)?.result !== null) delete g.drags[index];
  }
}

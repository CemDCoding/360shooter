// Generic boss hazards (AP-100, PE-134): projectiles and danger zones of every boss reach the scene through
// one interface (BossBase.getHazards()), so GameScene needs no `instanceof` per boss. No Phaser import, testable.
import type { StatusOnHit } from '../../contracts';

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

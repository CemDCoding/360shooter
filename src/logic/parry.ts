import { PARRY_RULES } from '../config/parry';
import type { ParryCircle, ParryGrade, ParryRules } from '../contracts';
import type { Rng } from './rng';

/** A circle with its result; `null` means still open. */
export interface ParryCircleState extends ParryCircle {
  result: ParryGrade | null;
}

/** Share of the announcement after which circles may hit at the earliest. */
const EARLIEST_SHARE = 0.4;

/**
 * Plans the circles of one boss attack. Angles are spread evenly with jitter,
 * hit times rise with at least `minGapMs` and the last one lies at the latest at
 * telegraphMs - goodWindowMs, so a late tap before the impact still counts.
 */
export function planCircles(
  count: number,
  telegraphMs: number,
  rng: Rng,
  rules: ParryRules = PARRY_RULES,
): ParryCircleState[] {
  const n = Math.max(0, Math.floor(count));
  if (n === 0) return [];
  const latest = telegraphMs - rules.goodWindowMs;
  const lastHit = latest - rng.next() * 0.1 * rules.minGapMs;
  const available = lastHit - telegraphMs * EARLIEST_SHARE;
  let gap = rules.minGapMs;
  if (n > 1) {
    const wanted = rules.minGapMs * (1 + 0.5 * rng.next());
    gap = Math.max(rules.minGapMs, Math.min(wanted, available / (n - 1)));
  }
  const step = 360 / n;
  const base = rng.next() * 360;
  const circles: ParryCircleState[] = [];
  for (let i = 0; i < n; i++) {
    const jitter = n > 1 ? (rng.next() - 0.5) * step * 0.4 : 0;
    circles.push({
      index: i,
      angleDeg: (((base + i * step + jitter) % 360) + 360) % 360,
      hitAtMs: lastHit - (n - 1 - i) * gap,
      result: null,
    });
  }
  return circles;
}

/** Grades a tap by its distance in time to the hit moment. */
export function gradeTap(
  circle: ParryCircle,
  tapAtMs: number,
  rules: ParryRules = PARRY_RULES,
): ParryGrade {
  const d = Math.abs(tapAtMs - circle.hitAtMs);
  if (d <= rules.perfectWindowMs) return 'perfect';
  if (d <= rules.goodWindowMs) return 'good';
  return 'miss';
}

/** Returns the open circle under the tap (the nearest one) or null. */
export function hitCircle(
  circles: readonly ParryCircleState[],
  tapPoint: { x: number; y: number },
  center: { x: number; y: number },
  rules: ParryRules = PARRY_RULES,
): ParryCircleState | null {
  const reach = rules.circleRadiusPx + rules.touchSlackPx;
  let best: ParryCircleState | null = null;
  let bestDist = Infinity;
  for (const c of circles) {
    if (c.result !== null) continue;
    const rad = (c.angleDeg * Math.PI) / 180;
    const cx = center.x + Math.cos(rad) * rules.distanceFromPlayerPx;
    const cy = center.y + Math.sin(rad) * rules.distanceFromPlayerPx;
    const dist = Math.hypot(tapPoint.x - cx, tapPoint.y - cy);
    if (dist <= reach && dist < bestDist) {
      best = c;
      bestDist = dist;
    }
  }
  return best;
}

/**
 * Closing ring of a circle at `nowMs` (same clock as hitAtMs). Appears at
 * max(0, hitAtMs - approachMs), starts at ringStartScale and shrinks linearly to 1 at hitAtMs.
 * Before the appearance and after the hit it is not visible.
 */
export function ringState(
  circle: ParryCircle,
  nowMs: number,
  rules: ParryRules = PARRY_RULES,
): { visible: boolean; scale: number } {
  const start = Math.max(0, circle.hitAtMs - rules.approachMs);
  if (nowMs < start || nowMs > circle.hitAtMs)
    return { visible: false, scale: rules.ringStartScale };
  const span = circle.hitAtMs - start;
  const t = span > 0 ? (nowMs - start) / span : 1;
  return { visible: true, scale: rules.ringStartScale + (1 - rules.ringStartScale) * t };
}

/** Grades the tap on one open circle; already graded circles stay unchanged. */
export function tapCircle(
  circles: readonly ParryCircleState[],
  index: number,
  tapAtMs: number,
  rules: ParryRules = PARRY_RULES,
): ParryCircleState[] {
  return circles.map((c) =>
    c.index === index && c.result === null ? { ...c, result: gradeTap(c, tapAtMs, rules) } : c,
  );
}

/** Marks open circles as missed once hitAtMs + goodWindowMs has passed. */
export function expireCircles(
  circles: readonly ParryCircleState[],
  nowMs: number,
  rules: ParryRules = PARRY_RULES,
): ParryCircleState[] {
  return circles.map((c) =>
    c.result === null && nowMs > c.hitAtMs + rules.goodWindowMs
      ? { ...c, result: 'miss' as const }
      : c,
  );
}

/** Final result; open (null) entries count as missed. */
export function resolveParry(results: readonly (ParryGrade | null)[]): {
  blocked: boolean;
  damageFactor: number;
  perfectCount: number;
} {
  const total = results.length;
  if (total === 0) return { blocked: true, damageFactor: 0, perfectCount: 0 };
  const misses = results.filter((r) => r === null || r === 'miss').length;
  return {
    blocked: misses === 0,
    damageFactor: misses / total,
    perfectCount: results.filter((r) => r === 'perfect').length,
  };
}

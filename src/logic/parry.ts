import { PARRY_RULES } from '../config/parry';
import type {
  ParryCircle,
  ParryGrade,
  ParryKind,
  ParryPatternDef,
  ParryRules,
  ParryStepDef,
} from '../contracts';
import type { Rng } from './rng';

/**
 * A circle with its result; `null` means still open. The optional fields carry the input state of the
 * M9 building blocks (RS-03.1, PE-188). All times are play time in ms relative to the start of the
 * announcement (same clock as hitAtMs), never wall clock.
 */
export interface ParryCircleState extends ParryCircle {
  result: ParryGrade | null;
  /** choice: round the circle belongs to; all circles of one round share hitAtMs. */
  group?: number;
  /** hold: moment of the press; drag: moment the circle was picked up or selected. */
  pressedAtMs?: number;
  /** hold: grade of the press (the final result is the worse of press and release). */
  pressGrade?: ParryGrade;
  /** hold: true while the pointer is still down. false after an early release (waits for a second tap). */
  holding?: boolean;
  /** decoy/choice: the player touched this circle. A touched decoy costs damage / circle count. */
  tapped?: boolean;
}

/** What planCircles needs from a boss attack: real circle count and the optional pattern (M9). */
export interface ParryPlanSource {
  parryCircles: number;
  parryPattern?: ParryPatternDef;
}

/** Result of one attack (PE-158, PE-188). */
export interface ParryResolution {
  blocked: boolean;
  damageFactor: number;
  perfectCount: number;
}

/** Share of the announcement after which circles may hit at the earliest. */
const EARLIEST_SHARE = 0.4;

/** Choice steps without a group number form one round whose right circle is picked at random. */
const UNGROUPED = 0;

/** Kind of a circle; a missing kind means 'tap' (backwards compatible with M7). */
export function circleKind(circle: ParryCircle): ParryKind {
  return circle.kind ?? 'tap';
}

/** true for circles that count towards the circle count (not decoys, not the wrong choices). */
export function isRealCircle(circle: ParryCircle): boolean {
  const kind = circleKind(circle);
  if (kind === 'decoy') return false;
  if (kind === 'choice') return circle.correct === true;
  return true;
}

function shuffle<T>(items: T[], rng: Rng): T[] {
  for (let i = items.length - 1; i > 0; i--) {
    const j = Math.min(i, Math.floor(rng.next() * (i + 1)));
    [items[i], items[j]] = [items[j], items[i]];
  }
  return items;
}

/** One planned step with its resolved choice round. */
interface PlannedStep extends ParryStepDef {
  roundKey?: number;
}

/**
 * Turns the source into the list of steps: no pattern = parryCircles x tap. Choice rounds are shuffled;
 * an ungrouped round (goldCurse riddle) gets exactly one random right circle. Easy parry (PE-189): every
 * kind becomes 'tap', decoys and wrong choices are dropped, the count of real circles stays.
 */
function resolveSteps(source: number | ParryPlanSource, rng: Rng, easy: boolean): PlannedStep[][] {
  const pattern = typeof source === 'number' ? undefined : source.parryPattern;
  const count = typeof source === 'number' ? source : source.parryCircles;
  const steps: PlannedStep[] =
    pattern && pattern.steps.length > 0
      ? pattern.steps.map((s) => ({ ...s }))
      : Array.from({ length: Math.max(0, Math.floor(count)) }, () => ({ kind: 'tap' as const }));

  // Group choice steps into rounds, in order of their first appearance.
  const rounds = new Map<number, PlannedStep[]>();
  for (const s of steps) {
    if (s.kind !== 'choice') continue;
    const key = s.group ?? UNGROUPED;
    s.roundKey = key;
    const round = rounds.get(key);
    if (round) round.push(s);
    else rounds.set(key, [s]);
  }
  for (const [key, round] of rounds) {
    if (key === UNGROUPED) {
      const pick = Math.min(round.length - 1, Math.floor(rng.next() * round.length));
      round.forEach((s, i) => (s.correct = i === pick));
    } else {
      round.forEach((s) => (s.correct = s.correct === true));
    }
    shuffle(round, rng);
  }

  // Slots: every step is one slot, except the circles of one choice round which share a slot.
  const slots: PlannedStep[][] = [];
  const seenRounds = new Set<number>();
  for (const s of steps) {
    if (s.kind === 'choice' && s.roundKey !== undefined) {
      if (seenRounds.has(s.roundKey)) continue;
      seenRounds.add(s.roundKey);
      slots.push(rounds.get(s.roundKey) ?? [s]);
    } else {
      slots.push([s]);
    }
  }
  if (!easy) return slots;

  return slots
    .map((slot) =>
      slot
        .filter((s) => s.kind !== 'decoy' && (s.kind !== 'choice' || s.correct === true))
        .map((s): PlannedStep =>
          s.symbol === undefined ? { kind: 'tap' } : { kind: 'tap', symbol: s.symbol },
        ),
    )
    .filter((slot) => slot.length > 0);
}

/** Hold time of a step, clamped to holdMinMs..holdMaxMs (missing = middle of the range). */
function holdTime(step: ParryStepDef, rules: ParryRules): number {
  const wanted = step.holdMs ?? (rules.holdMinMs + rules.holdMaxMs) / 2;
  return Math.min(rules.holdMaxMs, Math.max(rules.holdMinMs, wanted));
}

/**
 * Hit times of the slots. Gaps are measured hit to hit like in M7: at least minGapMs, exactly beatMs
 * between two beats and exactly minGapMs inside a sequence. A hold runs in parallel to the following
 * slots (second finger or two taps). The latest end (hit, or release of a hold) lies at
 * telegraphMs - goodWindowMs at the latest, so every task can be solved before the impact. If the plan
 * starts earlier than EARLIEST_SHARE of the announcement, hold times shrink towards holdMinMs.
 */
function planTimes(
  slots: PlannedStep[][],
  telegraphMs: number,
  rng: Rng,
  pattern: ParryPatternDef | undefined,
  rules: ParryRules,
): { hits: number[]; holds: number[] } {
  const n = slots.length;
  const kinds = slots.map((slot) => slot[0].kind);
  const holds = slots.map((slot) => (slot[0].kind === 'hold' ? holdTime(slot[0], rules) : 0));
  const beatMs = pattern?.beatMs ?? rules.beatMs;
  const fixed: (number | null)[] = [];
  for (let i = 0; i < n - 1; i++) {
    if (kinds[i] === 'beat' && kinds[i + 1] === 'beat') fixed.push(beatMs);
    else if (kinds[i] === 'sequence' && kinds[i + 1] === 'sequence') fixed.push(rules.minGapMs);
    else fixed.push(null);
  }
  const latestEnd = telegraphMs - rules.goodWindowMs - rng.next() * 0.1 * rules.minGapMs;
  const earliest = telegraphMs * EARLIEST_SHARE;
  const extraRoll = rng.next();

  const span = (gaps: number[], h: number[]): number => {
    let off = 0;
    let end = h[0] ?? 0;
    for (let i = 1; i < n; i++) {
      off += gaps[i - 1];
      end = Math.max(end, off + h[i]);
    }
    return Math.max(end, off);
  };

  const gaps = fixed.map((g) => g ?? rules.minGapMs);
  let end = span(gaps, holds);
  const shortBy = end - (latestEnd - earliest);
  if (shortBy > 0) {
    for (let i = 0; i < n; i++) {
      if (holds[i] > 0) holds[i] = Math.max(rules.holdMinMs, holds[i] - shortBy);
    }
    end = span(gaps, holds);
  }
  const free = fixed.filter((g) => g === null).length;
  const slack = latestEnd - earliest - end;
  if (free > 0 && slack > 0) {
    const extra = Math.min(0.5 * rules.minGapMs * extraRoll, slack / free);
    for (let i = 0; i < n - 1; i++) if (fixed[i] === null) gaps[i] += extra;
    end = span(gaps, holds);
  }
  const start = Math.max(0, latestEnd - end);
  const hits: number[] = [];
  let off = 0;
  for (let i = 0; i < n; i++) {
    if (i > 0) off += gaps[i - 1];
    hits.push(start + off);
  }
  return { hits, holds };
}

/**
 * Random angles with a minimum distance so that no two tap areas (circleRadiusPx + touchSlackPx) overlap
 * at distanceFromPlayerPx. The free space is split randomly, then the angles are shuffled.
 */
function planAngles(n: number, rng: Rng, rules: ParryRules): number[] {
  const reach = rules.circleRadiusPx + rules.touchSlackPx;
  const ratio = Math.min(1, reach / Math.max(1, rules.distanceFromPlayerPx));
  const minDeg = (2 * Math.asin(ratio) * 180) / Math.PI;
  const base = rng.next() * 360;
  if (n <= 1) return n === 1 ? [base] : [];
  const free = Math.max(0, 360 - n * minDeg);
  const weights = Array.from({ length: n }, () => rng.next());
  const sum = weights.reduce((a, b) => a + b, 0);
  const step = n * minDeg > 360 ? 360 / n : minDeg;
  const angles: number[] = [];
  let a = base;
  for (let i = 0; i < n; i++) {
    angles.push(((a % 360) + 360) % 360);
    a += step + (sum > 0 ? (free * weights[i]) / sum : free / n);
  }
  return shuffle(angles, rng);
}

/**
 * Plans the circles of one boss attack (M7, M9 RS-03.1). `source` is the real circle count (all 'tap', as
 * in M7) or the attack with its optional pattern (missing pattern = parryCircles x tap). Angles are random
 * with a minimum distance, hit times rise with at least minGapMs and the last task ends at the latest at
 * telegraphMs - goodWindowMs, so a late input before the impact still counts. Per kind: hold gets
 * releaseAtMs, sequence gets order and previewAtMs, drag gets a target, choice gets group and correct
 * (one round shares hitAtMs), decoy gets a hit time like a real circle (display only). `easy` maps every
 * kind to 'tap' and drops decoys and wrong choices (PE-189).
 */
export function planCircles(
  source: number | ParryPlanSource,
  telegraphMs: number,
  rng: Rng,
  rules: ParryRules = PARRY_RULES,
  easy = false,
): ParryCircleState[] {
  const pattern = typeof source === 'number' ? undefined : source.parryPattern;
  const slots = resolveSteps(source, rng, easy);
  if (slots.length === 0) return [];
  const { hits, holds } = planTimes(slots, telegraphMs, rng, pattern, rules);
  const total = slots.reduce((a, slot) => a + slot.length, 0);
  const angles = planAngles(total, rng, rules);
  const previewStepMs = pattern?.previewStepMs ?? rules.previewStepMs;

  const circles: ParryCircleState[] = [];
  let order = 0;
  slots.forEach((slot, i) => {
    for (const step of slot) {
      const index = circles.length;
      const c: ParryCircleState = {
        index,
        angleDeg: angles[index],
        hitAtMs: hits[i],
        kind: step.kind,
        result: null,
      };
      if (step.symbol !== undefined) c.symbol = step.symbol;
      switch (step.kind) {
        case 'hold':
          c.releaseAtMs = hits[i] + holds[i];
          break;
        case 'sequence':
          order += 1;
          c.order = order;
          c.previewAtMs = (order - 1) * previewStepMs;
          break;
        case 'drag':
          c.target = {
            angleDeg: c.angleDeg,
            distancePx: rules.distanceFromPlayerPx + rules.dragTargetDistancePx,
          };
          break;
        case 'choice':
          c.group = step.roundKey ?? UNGROUPED;
          c.correct = step.correct === true;
          break;
        default:
          break;
      }
      circles.push(c);
    }
  });
  return circles;
}

/** Grades a tap by its distance in time to the hit moment. */
export function gradeTap(
  circle: Pick<ParryCircle, 'hitAtMs'>,
  tapAtMs: number,
  rules: ParryRules = PARRY_RULES,
): ParryGrade {
  const d = Math.abs(tapAtMs - circle.hitAtMs);
  if (d <= rules.perfectWindowMs) return 'perfect';
  if (d <= rules.goodWindowMs) return 'good';
  return 'miss';
}

/** drag: a drop until hitAtMs + perfectWindowMs is perfect, until + goodWindowMs good, later missed. */
export function gradeDrop(
  circle: Pick<ParryCircle, 'hitAtMs'>,
  dropAtMs: number,
  rules: ParryRules = PARRY_RULES,
): ParryGrade {
  if (dropAtMs <= circle.hitAtMs + rules.perfectWindowMs) return 'perfect';
  if (dropAtMs <= circle.hitAtMs + rules.goodWindowMs) return 'good';
  return 'miss';
}

const GRADE_RANK: Record<ParryGrade, number> = { miss: 0, good: 1, perfect: 2 };

function worse(a: ParryGrade, b: ParryGrade): ParryGrade {
  return GRADE_RANK[a] <= GRADE_RANK[b] ? a : b;
}

function polar(
  center: { x: number; y: number },
  angleDeg: number,
  distancePx: number,
): { x: number; y: number } {
  const rad = (angleDeg * Math.PI) / 180;
  return { x: center.x + Math.cos(rad) * distancePx, y: center.y + Math.sin(rad) * distancePx };
}

/** Centre of a circle around the player. */
export function circlePosition(
  circle: Pick<ParryCircle, 'angleDeg'>,
  center: { x: number; y: number },
  rules: ParryRules = PARRY_RULES,
): { x: number; y: number } {
  return polar(center, circle.angleDeg, rules.distanceFromPlayerPx);
}

/** Centre of the drag target of a circle, or null if it has none. */
export function targetPosition(
  circle: Pick<ParryCircle, 'target'>,
  center: { x: number; y: number },
): { x: number; y: number } | null {
  return circle.target ? polar(center, circle.target.angleDeg, circle.target.distancePx) : null;
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
    const p = circlePosition(c, center, rules);
    const dist = Math.hypot(tapPoint.x - p.x, tapPoint.y - p.y);
    if (dist <= reach && dist < bestDist) {
      best = c;
      bestDist = dist;
    }
  }
  return best;
}

/** Returns the open, picked-up drag circle whose target lies under the point (nearest one) or null. */
export function hitTarget(
  circles: readonly ParryCircleState[],
  point: { x: number; y: number },
  center: { x: number; y: number },
  rules: ParryRules = PARRY_RULES,
): ParryCircleState | null {
  let best: ParryCircleState | null = null;
  let bestDist = Infinity;
  for (const c of circles) {
    if (c.result !== null || circleKind(c) !== 'drag' || c.pressedAtMs === undefined) continue;
    const p = targetPosition(c, center);
    if (!p) continue;
    const dist = Math.hypot(point.x - p.x, point.y - p.y);
    if (dist <= rules.dragTargetRadiusPx && dist < bestDist) {
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

function finishHold(c: ParryCircleState, atMs: number, rules: ParryRules): ParryCircleState {
  const release = gradeTap({ hitAtMs: c.releaseAtMs ?? c.hitAtMs }, atMs, rules);
  return { ...c, holding: false, result: worse(c.pressGrade ?? 'miss', release) };
}

/**
 * Press (pointer down or tap) on one open circle at play time `atMs`. Already graded circles stay
 * unchanged. Per kind:
 * - tap, beat: graded like M7 (±perfectWindowMs / ±goodWindowMs around hitAtMs).
 * - hold: the first press starts the hold (a missed press misses the circle); a second press within
 *   twoTapMaxGapMs of the first counts as the release (replacement with two taps, PE-189).
 * - drag: picks the circle up (or selects it for "tap circle, then tap target"); graded on the drop.
 * - sequence: if an open circle with a lower order exists, this circle is missed (wrong order).
 * - choice: the right circle is graded by time; a wrong one misses the round. The round closes either way,
 *   all its circles get the same result.
 * - decoy: penalty, the circle disappears (result 'miss', tapped).
 */
export function pressCircle(
  circles: readonly ParryCircleState[],
  index: number,
  atMs: number,
  rules: ParryRules = PARRY_RULES,
): ParryCircleState[] {
  const c = circles.find((x) => x.index === index);
  if (!c || c.result !== null) return circles.slice();
  const replace = (next: ParryCircleState): ParryCircleState[] =>
    circles.map((x) => (x.index === index ? next : x));

  switch (circleKind(c)) {
    case 'decoy':
      return replace({ ...c, result: 'miss', tapped: true });
    case 'hold': {
      if (c.pressedAtMs === undefined) {
        const press = gradeTap(c, atMs, rules);
        return replace(
          press === 'miss'
            ? { ...c, pressedAtMs: atMs, pressGrade: press, holding: false, result: 'miss' }
            : { ...c, pressedAtMs: atMs, pressGrade: press, holding: true },
        );
      }
      if (atMs - c.pressedAtMs <= rules.twoTapMaxGapMs) return replace(finishHold(c, atMs, rules));
      return replace({ ...c, holding: false, result: 'miss' });
    }
    case 'drag':
      return replace({ ...c, pressedAtMs: atMs });
    case 'choice': {
      const grade: ParryGrade = c.correct === true ? gradeTap(c, atMs, rules) : 'miss';
      return circles.map((x) => {
        if (x.index === index) return { ...x, result: grade, tapped: true };
        if (circleKind(x) === 'choice' && x.group === c.group && x.result === null)
          return { ...x, result: grade };
        return x;
      });
    }
    case 'sequence': {
      const order = c.order ?? 0;
      const skipped = circles.some(
        (x) =>
          x.result === null &&
          circleKind(x) === 'sequence' &&
          x.order !== undefined &&
          x.order < order,
      );
      return replace({ ...c, result: skipped ? 'miss' : gradeTap(c, atMs, rules) });
    }
    default:
      return replace({ ...c, result: gradeTap(c, atMs, rules) });
  }
}

/**
 * Grades the tap on one open circle (M7 name, kept for AP-133 code). Same as pressCircle; for plain tap
 * circles it grades exactly like before.
 */
export function tapCircle(
  circles: readonly ParryCircleState[],
  index: number,
  tapAtMs: number,
  rules: ParryRules = PARRY_RULES,
): ParryCircleState[] {
  return pressCircle(circles, index, tapAtMs, rules);
}

/**
 * Pointer up on a held circle. hold: the result is the worse of the press and the release grade, both
 * against ±perfectWindowMs / ±goodWindowMs (release against releaseAtMs). A release earlier than
 * releaseAtMs - goodWindowMs counts as the first of two taps: the circle stays open and waits for the
 * second tap (pressCircle); without it, it expires as missed (hold too short). Other kinds: unchanged.
 */
export function releaseCircle(
  circles: readonly ParryCircleState[],
  index: number,
  atMs: number,
  rules: ParryRules = PARRY_RULES,
): ParryCircleState[] {
  return circles.map((c) => {
    if (c.index !== index || c.result !== null || circleKind(c) !== 'hold' || c.holding !== true)
      return c;
    const release = c.releaseAtMs ?? c.hitAtMs;
    if (atMs < release - rules.goodWindowMs) return { ...c, holding: false };
    return finishHold(c, atMs, rules);
  });
}

/**
 * Drop of a dragged circle at `point`. Inside the target radius (dragTargetRadiusPx) it is graded by
 * gradeDrop. Outside, the circle goes back and stays open (pick-up cleared) until it expires.
 */
export function dropCircle(
  circles: readonly ParryCircleState[],
  index: number,
  point: { x: number; y: number },
  center: { x: number; y: number },
  atMs: number,
  rules: ParryRules = PARRY_RULES,
): ParryCircleState[] {
  return circles.map((c) => {
    if (c.index !== index || c.result !== null || circleKind(c) !== 'drag') return c;
    const p = targetPosition(c, center);
    const inside =
      p !== null && Math.hypot(point.x - p.x, point.y - p.y) <= rules.dragTargetRadiusPx;
    if (inside) return { ...c, result: gradeDrop(c, atMs, rules) };
    const back = { ...c };
    delete back.pressedAtMs;
    return back;
  });
}

/**
 * Replacement for dragging (PE-189): after a tap on a drag circle (pressCircle), a tap on its target
 * counts as the drop. A tap that hits no target of a picked-up circle changes nothing.
 */
export function tapTarget(
  circles: readonly ParryCircleState[],
  point: { x: number; y: number },
  center: { x: number; y: number },
  atMs: number,
  rules: ParryRules = PARRY_RULES,
): ParryCircleState[] {
  const hit = hitTarget(circles, point, center, rules);
  if (!hit) return circles.slice();
  return dropCircle(circles, hit.index, point, center, atMs, rules);
}

/** Last play time at which an open circle can still be solved. */
function deadlineOf(c: ParryCircleState, rules: ParryRules): number {
  if (circleKind(c) === 'hold' && c.pressedAtMs !== undefined) {
    const release = (c.releaseAtMs ?? c.hitAtMs) + rules.goodWindowMs;
    return c.holding === true ? release : Math.min(release, c.pressedAtMs + rules.twoTapMaxGapMs);
  }
  return c.hitAtMs + rules.goodWindowMs;
}

/**
 * Closes open circles whose deadline has passed: missed, except an untouched decoy, which counts as
 * avoided ('perfect', not tapped). hold: after releaseAtMs + goodWindowMs (or the two-tap gap).
 */
export function expireCircles(
  circles: readonly ParryCircleState[],
  nowMs: number,
  rules: ParryRules = PARRY_RULES,
): ParryCircleState[] {
  return circles.map((c) => {
    if (c.result !== null || nowMs <= deadlineOf(c, rules)) return c;
    if (circleKind(c) === 'decoy') return { ...c, result: 'perfect' as const };
    if (circleKind(c) === 'hold') return { ...c, holding: false, result: 'miss' as const };
    return { ...c, result: 'miss' as const };
  });
}

function isCircleList(
  input: readonly (ParryGrade | null)[] | readonly ParryCircleState[],
): input is readonly ParryCircleState[] {
  return input.length > 0 && typeof input[0] === 'object' && input[0] !== null;
}

/**
 * Final result of one attack. Accepts the M7 list of grades (all real tap circles) or the circles.
 * damageFactor = min(1, (missed real circles + tapped decoys) / real circle count); open real circles
 * count as missed. blocked only if every real circle was hit and no decoy was tapped (PE-158, PE-188).
 */
export function resolveParry(
  input: readonly (ParryGrade | null)[] | readonly ParryCircleState[],
): ParryResolution {
  let results: (ParryGrade | null)[];
  let decoyHits = 0;
  if (isCircleList(input)) {
    results = input.filter(isRealCircle).map((c) => c.result);
    decoyHits = input.filter((c) => circleKind(c) === 'decoy' && c.tapped === true).length;
  } else {
    results = [...input];
  }
  const total = results.length;
  const misses = results.filter((r) => r === null || r === 'miss').length;
  const perfectCount = results.filter((r) => r === 'perfect').length;
  if (total === 0) {
    return { blocked: decoyHits === 0, damageFactor: decoyHits > 0 ? 1 : 0, perfectCount };
  }
  return {
    blocked: misses === 0 && decoyHits === 0,
    damageFactor: Math.min(1, (misses + decoyHits) / total),
    perfectCount,
  };
}

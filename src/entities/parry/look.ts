// Look of the M9 building blocks (AP-151, brief H-37 "Bausteine"): hold ring, words, drag target, beat dots.
// Pure functions on play time, no Phaser import; ParryOverlay draws what they return.
import { PARRY_RULES } from '../../config/parry';
import { THEME } from '../../config/theme';
import type { ParryGrade, ParryRules } from '../../contracts';
import type { ParryCircleState } from '../../logic/parry';

export const HOLD_SEGMENTS = THEME.sizeCount['size.parry-hold-segments'];
/** Outer radius of the inner hold ring (2 px, r 13-15). */
export const HOLD_R = THEME.sizePx['size.parry-hold-r'];
export const TARGET_R = THEME.sizePx['size.parry-target-radius'];
export const TARGET_BRACKET = THEME.sizePx['size.parry-target-bracket'];
export const TARGET_STEP = THEME.sizePx['size.parry-target-step'];
export const LINK_DOT_STEP = THEME.sizePx['size.parry-link-dot'];
export const FLAG = THEME.sizePx['size.parry-flag'];
export const BEAT_DOT = THEME.sizePx['size.parry-beat-dot'];
const TARGET_STEP_MS = THEME.motionMs['motion.parry-target-step'];
const SLEEP_MS = THEME.motionMs['motion.parry-sleep'];
const FADE_MS = THEME.motionMs['motion.base'];

/** Flag box of a sequence circle relative to its centre (brief: -24/-24 to -14/-14). */
export const FLAG_OFFSET = -24;
/** Selected drag circle: second 1 px ring at r 23 (brief H-37). */
export const SELECT_RING_R = 23;
/** The dotted link starts 3 px outside the circle edge and ends 2 px before the bracket box. */
export const LINK_START_GAP = 3;
export const LINK_END_GAP = 2;
/** Beat dots: centre 24 px below the astronaut, gap = dot size. */
export const BEAT_DOTS_BELOW = 24;
/** "z" of the sleeping head: offset from the circle centre, rises 6 px. */
export const SLEEP_Z_OFFSET = { x: 14, y: -30 } as const;
export const SLEEP_Z_RISE = 6;

/** Words of the M9 tasks (brief H-37 10a): red warning colour only together with a shape (X, broken edge). */
export type ParryWord = 'PERFEKT' | 'GUT' | 'VERFEHLT' | 'TRUG!' | 'FALSCH' | 'ZU FRÜH' | 'LOS!';

/** Why a circle failed, noted by the tracker: hold released too early, wrong order or wrong choice. */
export type ParryNote = 'early' | 'wrong';

const GRADE_WORD: Record<ParryGrade, ParryWord> = {
  perfect: 'PERFEKT',
  good: 'GUT',
  miss: 'VERFEHLT',
};

/**
 * Word of a graded circle, or null if it goes away silently (an avoided decoy, the other circles of a choice
 * round). `round` holds the circles of the same attack (choice rounds are read from it).
 */
export function resultWord(
  c: ParryCircleState,
  round: readonly ParryCircleState[],
  note: ParryNote | undefined,
): ParryWord | null {
  if (c.result === null) return null;
  const kind = c.kind ?? 'tap';
  if (kind === 'decoy') return c.tapped === true ? 'TRUG!' : null;
  if (kind === 'choice') {
    if (c.tapped === true) return c.correct === true ? GRADE_WORD[c.result] : 'FALSCH';
    const roundTapped = round.some(
      (x) => (x.kind ?? 'tap') === 'choice' && x.group === c.group && x.tapped === true,
    );
    return c.correct === true && !roundTapped ? GRADE_WORD[c.result] : null;
  }
  if (c.result === 'miss' && note === 'wrong') return 'FALSCH';
  if (c.result === 'miss' && note === 'early' && kind === 'hold') return 'ZU FRÜH';
  return GRADE_WORD[c.result];
}

/** hold: hold time of a circle in ms (release - hit), at least 1. */
function holdMs(c: ParryCircleState): number {
  return Math.max(1, (c.releaseAtMs ?? c.hitAtMs) - c.hitAtMs);
}

/**
 * Filled steps of the hold ring at `nowMs`: fills linearly over the hold time from the press, also after an
 * early release while the circle waits for the second tap (same display). null: no ring (not pressed, graded or
 * not a hold circle).
 */
export function holdFilled(
  c: ParryCircleState,
  nowMs: number,
  segments = HOLD_SEGMENTS,
): number | null {
  if ((c.kind ?? 'tap') !== 'hold' || c.result !== null || c.pressedAtMs === undefined) return null;
  const t = (nowMs - c.pressedAtMs) / holdMs(c);
  return Math.max(0, Math.min(segments, Math.floor(t * segments)));
}

/** Start and end angle (radians, clockwise from the top) of hold ring step `i` with a 1 px gap at radius r. */
export function holdSegmentArc(
  i: number,
  segments = HOLD_SEGMENTS,
  r = HOLD_R - 1,
): { start: number; end: number } {
  const step = (Math.PI * 2) / segments;
  const gap = 1 / Math.max(1, r);
  const start = -Math.PI / 2 + i * step + gap / 2;
  return { start, end: start + step - gap };
}

/** Half size of the bracket box of a drag target: 24, after the circle was selected by tap 4 less (80 ms). */
export function targetBoxR(selectedMs: number | null, reduced: boolean): number {
  if (selectedMs === null || selectedMs < 0) return TARGET_R;
  if (reduced || selectedMs >= TARGET_STEP_MS) return TARGET_R - TARGET_STEP;
  return TARGET_R - TARGET_STEP * (selectedMs / TARGET_STEP_MS);
}

/** Rectangles (x, y, w, h) of the four L brackets of a target box with half size r around (cx, cy). */
/** Width of the ink keylines on both sides of every circle part (brief H-41 3a, PE-226). */
export const KEYLINE = THEME.sizePx['size.parry-keyline'];

/**
 * Keylines of a ring stroke `line` px wide whose outer side lies on `outerR`: centre radii of the two
 * `key` px ink strokes directly outside and directly inside it (brief H-41: ink, phosphor, ink).
 */
export function ringKeylines(
  outerR: number,
  line: number,
  key = KEYLINE,
): { outer: number; inner: number } {
  return { outer: outerR + key / 2, inner: outerR - line - key / 2 };
}

/** Ink rectangle behind a filled rectangle (x, y, w, h): `key` px larger on every side. */
export function keylineRect(
  [x, y, w, h]: readonly [number, number, number, number],
  key = KEYLINE,
): [number, number, number, number] {
  return [x - key, y - key, w + 2 * key, h + 2 * key];
}

/**
 * Whole-pixel offsets of the ink copies behind a sprite edge (wavy decoy edge): shifted by `key` px in the four
 * directions they give the edge an ink line outside and inside, like the coin outline (AP-70).
 */
export function keylineOffsets(key = KEYLINE): [number, number][] {
  return [
    [-key, 0],
    [key, 0],
    [0, -key],
    [0, key],
  ];
}

export function bracketRects(
  cx: number,
  cy: number,
  r: number,
  arm = TARGET_BRACKET,
  line = 2,
): [number, number, number, number][] {
  const x0 = Math.round(cx - r);
  const y0 = Math.round(cy - r);
  const x1 = Math.round(cx + r);
  const y1 = Math.round(cy + r);
  return [
    [x0, y0, arm, line],
    [x0, y0, line, arm],
    [x1 - arm, y0, arm, line],
    [x1 - line, y0, line, arm],
    [x0, y1 - line, arm, line],
    [x0, y1 - arm, line, arm],
    [x1 - arm, y1 - line, arm, line],
    [x1 - line, y1 - arm, line, arm],
  ];
}

/**
 * Centres of the 2x2 dots of the link from the circle (edge + 3) to the target box (box half size + 2), one
 * every LINK_DOT_STEP px. Empty if circle and target are too close.
 */
export function linkDots(
  from: { x: number; y: number },
  to: { x: number; y: number },
  boxR: number,
  circleR = PARRY_RULES.circleRadiusPx,
): { x: number; y: number }[] {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const d = Math.hypot(dx, dy);
  if (!(d > 0)) return [];
  const ux = dx / d;
  const uy = dy / d;
  const a = {
    x: from.x + ux * (circleR + LINK_START_GAP),
    y: from.y + uy * (circleR + LINK_START_GAP),
  };
  const b = { x: to.x - ux * (boxR + LINK_END_GAP), y: to.y - uy * (boxR + LINK_END_GAP) };
  const len = Math.hypot(b.x - a.x, b.y - a.y);
  if ((b.x - a.x) * ux + (b.y - a.y) * uy <= 0) return [];
  const n = Math.floor(len / LINK_DOT_STEP);
  if (n === 0) return [{ x: Math.round(a.x), y: Math.round(a.y) }];
  const dots: { x: number; y: number }[] = [];
  for (let i = 0; i <= n; i++) {
    dots.push({
      x: Math.round(a.x + ((b.x - a.x) * i) / n),
      y: Math.round(a.y + ((b.y - a.y) * i) / n),
    });
  }
  return dots;
}

/** Number of beat dots that are filled at `nowMs`: one per beat circle whose hit time has come. */
export function beatsDone(circles: readonly ParryCircleState[], nowMs: number): number {
  return circles.filter((c) => c.kind === 'beat' && nowMs >= c.hitAtMs).length;
}

/** Top-left corners of `count` beat dots centred BEAT_DOTS_BELOW px under the astronaut. */
export function beatDotRects(
  player: { x: number; y: number },
  count: number,
): { x: number; y: number; size: number }[] {
  const w = count * BEAT_DOT + Math.max(0, count - 1) * BEAT_DOT;
  const x0 = Math.round(player.x - w / 2);
  const y0 = Math.round(player.y + BEAT_DOTS_BELOW - BEAT_DOT / 2);
  return Array.from({ length: count }, (_, i) => ({
    x: x0 + i * 2 * BEAT_DOT,
    y: y0,
    size: BEAT_DOT,
  }));
}

/** sequence: the flag shows from the light-up until the circle is graded. */
export function flagShown(c: ParryCircleState, nowMs: number): boolean {
  return (
    (c.kind ?? 'tap') === 'sequence' &&
    c.order !== undefined &&
    c.previewAtMs !== undefined &&
    c.result === null &&
    nowMs >= c.previewAtMs
  );
}

/** sequence: the symbol is lit (game.parry-hold) for previewStepMs after the light-up. */
export function symbolLit(
  c: ParryCircleState,
  nowMs: number,
  rules: ParryRules = PARRY_RULES,
): boolean {
  if ((c.kind ?? 'tap') !== 'sequence' || c.previewAtMs === undefined) return false;
  return nowMs >= c.previewAtMs && nowMs < c.previewAtMs + rules.previewStepMs;
}

/** Alpha of an avoided decoy `ms` after its grade: fades out over motion.base; reduced motion: gone at once. */
export function decoyFade(ms: number, reduced: boolean): number {
  if (reduced) return 0;
  return Math.max(0, 1 - ms / FADE_MS);
}

/** Rise of the "z" `ms` after the head fell asleep (0..SLEEP_Z_RISE); reduced motion: still. */
export function sleepRise(ms: number, reduced: boolean): number {
  if (reduced) return 0;
  return Math.round(SLEEP_Z_RISE * Math.min(1, Math.max(0, ms / SLEEP_MS)));
}

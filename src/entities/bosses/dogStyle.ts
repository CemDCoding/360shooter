// Colours of the guardian dog effects (AP-103, PE-133). Only tokens, no colour literals.
import { PARRY_RULES } from '../../config/parry';
import { OPACITY, THEME } from '../../config/theme';
import { HUD_MAX_K, hintBoardRect, hintBoardSize, hudTimerBottom } from '../parry/hintBoard';

/** `game.ward`: shield area, dotted shield ring and the runes. */
export const WARD_COLOR = THEME.colors['game.ward'].num;
/** Fill alpha of the shield area (brief: `game.ward` with OPACITY.aura). */
export const WARD_ALPHA = OPACITY.aura;
/** Runes while they are still announced (not yet shootable). */
export const ANNOUNCE_ALPHA = OPACITY.dim;
/** Bark shock wave: solid ring in `hud.danger` (solid, so it never looks like the dotted shield ring). */
export const BARK_COLOR = THEME.colors['hud.danger'].num;
/** Outline of the drawn runes and the wave (shape readable on every ground). */
export const OUTLINE_COLOR = THEME.colors['sprite.outline'].num;
/** Spark when a laser bounces off the shield (no flash of the boss). */
export const SPARK_COLOR = THEME.colors['sprite.muzzle-flash'].num;

// --- Quicktime anchors (M9, AP-155, brief H-37): where the circles of the dog sit around the player ---

/** Angle gap between two heads: wider than the tap areas of two circles, so none overlap (PARRY_RULES). */
export const HEAD_SPREAD_DEG = 55;

function wrapDeg(deg: number): number {
  return ((deg % 360) + 360) % 360;
}

/**
 * guardBark: the three heads of the dog as angles around the player. `dogAngleDeg` is the direction from the
 * player to the dog; the heads fan out left, middle, right of it. The beats go from head to head (index 0..2).
 */
export function headAngle(dogAngleDeg: number, beatIndex: number): number {
  const i = Math.min(2, Math.max(0, Math.floor(Number.isFinite(beatIndex) ? beatIndex : 0)));
  return wrapDeg(dogAngleDeg + (i - 1) * HEAD_SPREAD_DEG);
}

/**
 * heartScale: pans of the two scale rounds around the player (screen angles, 0 = right, 90 = down). The heart pan
 * hangs left, the feather pan right like in the hint picture. Lower half like the mockup (the hint board hangs above
 * the astronaut); the four circles are at least 50.8 degrees apart (PARRY_RULES), round 1 outside, round 2 inside.
 */
export const SCALE_PANS: readonly Readonly<Record<'heart' | 'feather', number>>[] = [
  { heart: 175, feather: 5 },
  { heart: 117, feather: 58 },
];

/** Hint board sheets the circles must keep clear of (names as in hintBoard.ts). */
export type PlaceSheet = 'parry-scale' | 'parry-riddle';

export interface Placement {
  /** The astronaut (circle centre of all angles). */
  player: { x: number; y: number };
  /** Visible play field. */
  arena: { width: number; height: number };
  sheet: PlaceSheet;
}

function violations(angles: readonly number[], p: Placement): number {
  const R = PARRY_RULES.distanceFromPlayerPx;
  const r = PARRY_RULES.circleRadiusPx + PARRY_RULES.touchSlackPx;
  // Worst case of the HUD factor, so the board is never assumed higher than it can be.
  const board = hintBoardRect(
    p.player,
    hintBoardSize(p.sheet),
    hudTimerBottom(HUD_MAX_K, 0),
    p.arena.width,
  );
  let n = 0;
  for (const a of angles) {
    const x = p.player.x + R * Math.cos((a * Math.PI) / 180);
    const y = p.player.y + R * Math.sin((a * Math.PI) / 180);
    // Leaving the screen is worse than touching the board (the circle could not be tapped at all).
    if (x < r || x > p.arena.width - r || y < r || y > p.arena.height - r) n += 3;
    const dx = Math.max(board.x - x, 0, x - (board.x + board.w));
    const dy = Math.max(board.y - y, 0, y - (board.y + board.h));
    // The drawn circle must not touch the board (the extra touch slack may).
    if (Math.hypot(dx, dy) < PARRY_RULES.circleRadiusPx) n += 1;
  }
  return n;
}

/** Moves one angle so that its circle centre stays at least `r` inside the field (same side, same distance). */
function clampAngle(a: number, p: Placement): number {
  const R = PARRY_RULES.distanceFromPlayerPx;
  const r = PARRY_RULES.circleRadiusPx + PARRY_RULES.touchSlackPx;
  const lim = (lo: number, hi: number, v: number): number => Math.min(hi, Math.max(lo, v));
  let c = Math.cos((a * Math.PI) / 180);
  let s = Math.sin((a * Math.PI) / 180);
  const ts = lim(-1, 1, lim((r - p.player.y) / R, (p.arena.height - r - p.player.y) / R, s));
  if (ts !== s) {
    s = ts;
    c = (c < 0 ? -1 : 1) * Math.sqrt(1 - s * s);
  }
  const tc = lim(-1, 1, lim((r - p.player.x) / R, (p.arena.width - r - p.player.x) / R, c));
  if (tc !== c) {
    c = tc;
    s = (s < 0 ? -1 : 1) * Math.sqrt(1 - c * c);
  }
  return wrapDeg((Math.atan2(s, c) * 180) / Math.PI);
}

/**
 * Fits the nominal circle angles of one attack (`all`, kept apart by PARRY_RULES) to the astronaut's place: if
 * a circle would touch the hint board or leave the screen, the whole set is mirrored (a -> 360 - a); the variant
 * with fewer violations wins (the nominal one on a tie). What still leaves the field is clamped to its edge.
 * Mirroring keeps all gaps; the board size comes from hintBoard.ts (worst-case HUD factor).
 */
export function placeAngles(all: readonly number[], p: Placement): number[] {
  const nominal = all.map(wrapDeg);
  const mirrored = nominal.map((a) => wrapDeg(360 - a));
  const best = violations(mirrored, p) < violations(nominal, p) ? mirrored : nominal;
  return best.map((a) => clampAngle(a, p));
}

/** One nominal angle `deg` of the set `all`, fitted as a whole (see placeAngles). */
export function placeAngle(deg: number, all: readonly number[], p: Placement): number {
  const i = all.indexOf(deg);
  return i < 0 ? deg : placeAngles(all, p)[i];
}

/**
 * Angle of a scale circle by symbol and round (1 or 2). Easy parry leaves only the feather as a plain tap without
 * a round number: then the round is the order of the circle. Returns null for anything else (default angle).
 */
export function scaleAngle(
  symbol: string | undefined,
  group: number | undefined,
  index: number,
): number | null {
  if (symbol !== 'heart' && symbol !== 'feather') return null;
  const round = Math.floor(group !== undefined && group > 0 ? group : index + 1);
  return SCALE_PANS[Math.min(SCALE_PANS.length, Math.max(1, round)) - 1][symbol];
}

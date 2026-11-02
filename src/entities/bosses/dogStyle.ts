// Colours of the guardian dog effects (AP-103, PE-133). Only tokens, no colour literals.
import { OPACITY, THEME } from '../../config/theme';

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
 * hangs left, the feather pan right like in the hint picture; round 2 sits lower so that no circle of the two
 * rounds touches another one.
 */
export const SCALE_PANS: readonly Readonly<Record<'heart' | 'feather', number>>[] = [
  { heart: 225, feather: 315 },
  { heart: 165, feather: 15 },
];

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

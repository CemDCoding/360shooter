// Look of the pharaoh effects (AP-104, PE-133). Only tokens and map values, no colour literals.
import { batchOf } from '../../config/levels';
import { MAPS } from '../../config/maps';
import { OPACITY } from '../../config/theme';

/** sarcophagus: the pharaoh fades to OPACITY.ghost while it is gone (plus ring warning and boss bar IMMUN). */
export const HIDDEN_ALPHA = OPACITY.ghost;

/**
 * sandstorm edge darkening (brief gap, PE-133): the ground token of the running map in the strength of the
 * map vignette. No new colour; the HUD lives in its own scene above and keeps its contrast.
 */
export function stormStyle(levelId: number): { color: number; strength: number } {
  const map = MAPS[batchOf(levelId)];
  return { color: map.baseColor, strength: map.vignette };
}

// --- Quicktime anchors (M9, AP-155, brief H-37) ---

/**
 * Riddle circles by the leg count symbol: fixed places in the lower half like the mockup (the board hangs above
 * the astronaut), 60 degrees apart (no overlap). Mirrored and clamped by placeAngles() near the screen top.
 */
export const RIDDLE_DEG: Readonly<Record<string, number>> = { legs4: 150, legs2: 90, legs3: 30 };

/** goldCurse: angle of a riddle circle by its symbol, or null (default angle). */
export function riddleAngle(symbol: string | undefined): number | null {
  if (symbol === undefined || !Object.prototype.hasOwnProperty.call(RIDDLE_DEG, symbol))
    return null;
  return RIDDLE_DEG[symbol];
}

/** The sand decoy sits this far beside the tap circle (wider than the tap areas of two circles). */
export const DECOY_OFFSET_DEG = 75;

/** sandstorm: angle of the sand decoy next to the tap circle at `tapDeg`. */
export function sandDecoyAngle(tapDeg: number): number {
  return (((tapDeg + DECOY_OFFSET_DEG) % 360) + 360) % 360;
}

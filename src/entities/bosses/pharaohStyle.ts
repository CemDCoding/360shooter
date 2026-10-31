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

// Pure timing of the finisher scene (M10 AP-160, reduced to what the choreographies use in AP-191):
// cinema bars, title scale, shake rhythm, cut-in slide and the placeholder sounds. No Phaser import.
import { THEME } from '../../config/theme';

const M = THEME.motionMs;

/** Visible height of a cinema bar: it slides in within `motion.finisher-bars` in 3 whole steps. */
export function letterboxVisible(t: number, barH: number): number {
  if (t < 0) return 0;
  const steps = 3;
  const k = Math.min(steps, Math.floor((t * steps) / M['motion.finisher-bars']));
  return Math.round((barH * k) / steps);
}

/** Title scale: first `final + 2` (x6 -> x4, brief), after `motion.finisher-title` the final scale; no fade. */
export function titleScaleAt(t: number, finalScale: number): number {
  return t < M['motion.finisher-title'] ? finalScale + 2 : finalScale;
}

/** Time of one shake direction step (four directions per halving). */
export const SHAKE_STEP_MS = M['motion.rig-shake-step'];
/** The shake amplitude halves every this many ms (brief: 6 px, halves every 80 ms). */
export const SHAKE_HALF_MS = M['motion.rig-shake-half'];

/** Cut-in: slides in for 120 ms, holds, slides out to the right for 120 ms (brief H-39). */
export const CUTIN_MOVE_MS = 120;

/** x offset of the cut-in band; `travel` = distance from off screen to rest. */
export function cutInOffset(t: number, durationMs: number, travel: number): number {
  const move = Math.min(CUTIN_MOVE_MS, Math.max(0, durationMs / 2));
  if (t <= 0) return -travel;
  if (t < move) return Math.round(-travel * (1 - t / move));
  const outAt = durationMs - move;
  if (t < outAt) return 0;
  if (t >= durationMs) return travel;
  return Math.round(travel * ((t - outAt) / move));
}

/** Placeholder sounds (PE-237): the charge with the cut-in, the main hit. */
export const SOUND_CHARGE = 'sfx-finisher-charge';
export const SOUND_HIT = 'sfx-finisher-hit';

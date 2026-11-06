// Pure timing of the finisher scene (M10, AP-160): step animations, beam window and sound cues.
// All times are sequence time in ms (Timeline elapsed); no Phaser import.
import type { FinisherPlan, FinisherStep } from '../../contracts';
import { THEME } from '../../config/theme';
import { frameHolds } from '../../logic/finisher';

const M = THEME.motionMs;

/** Texture of the stage hit image (a `frames` block with one picture, AP-159). */
export const HIT_TEXTURE = 'finisher-hit';

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
const SHAKE_DIRS = [
  { x: 1, y: 0 },
  { x: -1, y: 1 },
  { x: 0, y: -1 },
  { x: -1, y: 0 },
];

/** Whole-pixel shake offset at effect time `t` since the shake started (decaying, deterministic). */
export function shakeOffset(t: number, amplitude: number): { x: number; y: number } {
  if (t < 0) return { x: 0, y: 0 };
  const a = Math.round(amplitude * 0.5 ** Math.floor(t / SHAKE_HALF_MS));
  if (a <= 0) return { x: 0, y: 0 };
  const d = SHAKE_DIRS[Math.floor(t / SHAKE_STEP_MS) % SHAKE_DIRS.length];
  return { x: d.x * a, y: d.y * a };
}

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

/** Index of the picture shown at `t` after the block start; -1 before or after. Holds of 0 are skipped. */
export function frameAt(holds: readonly number[], t: number): number {
  if (t < 0) return -1;
  let end = 0;
  for (let i = 0; i < holds.length; i++) {
    end += holds[i];
    if (holds[i] > 0 && t < end) return i;
  }
  return -1;
}

/** Panels appear one after another, 120 ms apart (brief). */
export const PANEL_STEP_MS = 120;
export const PANEL_COUNT = 3;

export function panelsVisible(t: number): number {
  if (t < 0) return 0;
  return Math.min(PANEL_COUNT, Math.floor(t / PANEL_STEP_MS) + 1);
}

/** Impact frame pair: 0 = light half (paper), 1 = dark half (ink). */
export function impactPhase(t: number, durationMs: number): 0 | 1 {
  return t < durationMs / 2 ? 0 : 1;
}

function covers(s: FinisherStep, t: number): boolean {
  return t >= s.atMs && t < s.atMs + s.durationMs;
}

/** Rate of the effect clock: 0 in a hitstop, the slow motion strength in a slowmo, else 1. */
export function effectRate(steps: readonly FinisherStep[], t: number): number {
  let rate = 1;
  for (const s of steps) {
    if (!covers(s, t)) continue;
    if (s.block === 'hitstop') return 0;
    if (s.block === 'slowmo') rate = Math.min(rate, clamp01(s.strength ?? 1));
  }
  return rate;
}

function clamp01(v: number): number {
  return Number.isFinite(v) ? Math.min(1, Math.max(0, v)) : 1;
}

/** Steps of one kind, in time order. */
export function stepsOf(plan: FinisherPlan, block: FinisherStep['block']): FinisherStep[] {
  return plan.steps.filter((s) => s.block === block).sort((a, b) => a.atMs - b.atMs);
}

/** True when a `frames` step is the stage hit image (not a finale picture sequence). */
export function isHitImage(step: FinisherStep): boolean {
  return step.block === 'frames' && step.texture === HIT_TEXTURE;
}

/** True while a stage hit image is shown at sequence time `t`. */
export function hitImageAt(plan: FinisherPlan, t: number): boolean {
  return plan.steps.some((s) => isHitImage(s) && covers(s, t));
}

/** Growth of the beam from the astronaut across the picture, in 3 whole steps of 20 ms (sequence time). */
export const BEAM_GROW_MS = 60;

export function beamProgress(t: number): number {
  if (t < 0) return 0;
  return Math.min(3, Math.floor((t * 3) / BEAM_GROW_MS) + 1) / 3;
}

/**
 * Beam of the astronaut over the colour background (stages 3 to 6 only, user decision for AP-160):
 * stage 3 from the start of `bgColor` to the hit image (120..520 ms), stages 4 to 6 from the end of
 * the cut-in to the hit image (800..1100 ms); the impact frame pair (900..1100) lies above it.
 * One beam per sequence, it grows in 3 steps and never blinks, so it is no flash: a 20 px band
 * (under 6 % of the arena height) that changes once. It is not a plan step, `isFlashSafe` is unchanged.
 */
export function beamWindow(plan: FinisherPlan): { atMs: number; durationMs: number } | null {
  if (plan.isFinale) return null;
  const bg = stepsOf(plan, 'bgColor')[0];
  if (!bg) return null;
  const cutIn = stepsOf(plan, 'cutIn')[0];
  const hit = plan.steps.filter(isHitImage).sort((a, b) => a.atMs - b.atMs)[0];
  const atMs = cutIn ? cutIn.atMs + cutIn.durationMs : bg.atMs;
  const end = hit ? hit.atMs : atMs + BEAM_GROW_MS * 5;
  if (end <= atMs) return null;
  return { atMs, durationMs: end - atMs };
}

export const SOUND_CHARGE = 'sfx-finisher-charge';
export const SOUND_HIT = 'sfx-finisher-hit';
export const SOUND_SIGNAL = 'sfx-finisher-signal';
export const SOUND_DAWN = 'sfx-finisher-dawn';

export interface SoundCue {
  key: string;
  atMs: number;
}

/** Pictures (global index over all picture blocks of a finale) that carry a sound; see `soundCues`. */
interface FinaleCues {
  charge: readonly number[];
  hit: readonly number[];
  dawn: readonly number[];
}
const FINALE_CUES_DEFAULT: FinaleCues = { charge: [1], hit: [5], dawn: [] };
const FINALE_CUES: Readonly<Record<string, FinaleCues>> = {
  // Level 40: "Strahler laedt" 3 and "Zweites Aufladen" 11, "Strahl 1" 7 and "Strahl 2" 12,
  // "Sand, erstes Licht" 16 (the sunrise starts, "BEZWUNGEN!" follows at 17 with the signal).
  'finale-40': { charge: [3, 11], hit: [7, 12], dawn: [16] },
};

/** Start times of all pictures of a finale (dropped pictures with hold 0 give null). */
export function pictureStarts(plan: FinisherPlan): (number | null)[] {
  const blocks = plan.steps
    .filter((s) => s.block === 'frames' && !isHitImage(s))
    .sort((a, b) => a.atMs - b.atMs);
  const out: (number | null)[] = [];
  for (const b of blocks) {
    let t = b.atMs;
    for (const h of frameHolds(b, plan.reduced)) {
      out.push(h > 0 ? t : null);
      t += h;
    }
  }
  return out;
}

/**
 * When the four finisher sounds play (user decision for AP-160, hand test H-40):
 * - stages: charge with the cut-in (astronaut's eye strip, stage 4 to 6), hit with the first impact
 *   frame, without one with the hit image, signal with "BEZWUNGEN!";
 * - finales: charge with picture 1 ("Strahler laedt"), hit with picture 5 (beam and name), signal
 *   with "BEZWUNGEN!"; level 40 see `FINALE_CUES`; dawn only in level 40.
 * Sound is never the only information: every cue has a picture.
 */
export function soundCues(plan: FinisherPlan): SoundCue[] {
  const cues: SoundCue[] = [];
  const title = plan.steps.find((s) => s.block === 'title' && (s.titleKind ?? 'title') === 'title');
  if (plan.isFinale) {
    const starts = pictureStarts(plan);
    const table = FINALE_CUES[plan.variantId] ?? FINALE_CUES_DEFAULT;
    const add = (key: string, pics: readonly number[]): void => {
      for (const p of pics) {
        const at = starts[p];
        if (at !== null && at !== undefined) cues.push({ key, atMs: at });
      }
    };
    add(SOUND_CHARGE, table.charge);
    add(SOUND_HIT, table.hit);
    add(SOUND_DAWN, table.dawn);
  } else {
    const cutIn = stepsOf(plan, 'cutIn')[0];
    if (cutIn) cues.push({ key: SOUND_CHARGE, atMs: cutIn.atMs });
    const impact = stepsOf(plan, 'impactFrame')[0];
    const hit = plan.steps.filter(isHitImage).sort((a, b) => a.atMs - b.atMs)[0];
    const hitAt = impact?.atMs ?? hit?.atMs;
    if (hitAt !== undefined) cues.push({ key: SOUND_HIT, atMs: hitAt });
  }
  if (title) cues.push({ key: SOUND_SIGNAL, atMs: title.atMs });
  return cues.filter((c) => c.atMs >= 0 && c.atMs < plan.totalMs).sort((a, b) => a.atMs - b.atMs);
}

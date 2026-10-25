/** Pure helpers for the HUD indicators (no Phaser). */
import type { ActiveArmour } from '../../contracts';

/** Energy at or below this share of the maximum counts as low (warning state). */
export const ENERGY_LOW_RATIO = 0.25;
/** Timer below this many seconds is shown as a warning. */
export const TIMER_WARN_SEC = 10;

/** Whole seconds left, rounded up; 0 for invalid or non-positive input. */
export function secondsLeft(ms: number): number {
  return Number.isFinite(ms) && ms > 0 ? Math.ceil(ms / 1000) : 0;
}

/** Fill ratio 0..1 of the shield bar (shieldLeft is capped at maxStacks * perStack). */
export function shieldRatio(shieldLeft: number, perStack: number, maxStacks: number): number {
  const cap = perStack * maxStacks;
  if (!(cap > 0) || !Number.isFinite(shieldLeft)) return 0;
  return Math.min(1, Math.max(0, shieldLeft / cap));
}

export type ArmourPhase = 'hidden' | 'active' | 'cooldown';

/** What the armour indicator shows: active time, then cooldown, then nothing. */
export function armourDisplay(a: ActiveArmour): { phase: ArmourPhase; sec: number } {
  if (a.id === null) return { phase: 'hidden', sec: 0 };
  if (a.activeMsLeft > 0) return { phase: 'active', sec: secondsLeft(a.activeMsLeft) };
  if (a.cooldownMsLeft > 0) return { phase: 'cooldown', sec: secondsLeft(a.cooldownMsLeft) };
  return { phase: 'hidden', sec: 0 };
}

/** Formats seconds as m:ss. */
export function formatTime(totalSec: number): string {
  const s = Math.max(0, Math.ceil(Number.isFinite(totalSec) ? totalSec : 0));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

/** Energy ratio 0..1; 0 for invalid input. */
export function energyRatio(hp: number, maxHp: number): number {
  if (!(maxHp > 0) || !Number.isFinite(hp)) return 0;
  return Math.min(1, Math.max(0, hp / maxHp));
}

/** True at 25 % energy or less (and not already empty-invalid input). */
export function isEnergyLow(ratio: number): boolean {
  return ratio <= ENERGY_LOW_RATIO;
}

/** True while the round timer is in the warning range (0 < sec < 10). */
export function isTimerWarning(sec: number): boolean {
  return Number.isFinite(sec) && sec > 0 && sec < TIMER_WARN_SEC;
}

export type SegmentState = 'full' | 'half' | 'off';

/** State of each energy segment: full, partly filled (half) or empty. */
export function energySegments(ratio: number, count: number): SegmentState[] {
  const r = Number.isFinite(ratio) ? Math.min(1, Math.max(0, ratio)) : 0;
  const out: SegmentState[] = [];
  for (let i = 0; i < count; i++) {
    const f = r * count - i;
    out.push(f >= 1 - 1e-9 ? 'full' : f > 1e-9 ? 'half' : 'off');
  }
  return out;
}

/** Seconds text with the small "s": 4 -> "4s". */
export function secondsText(sec: number): string {
  return `${Math.max(0, Math.floor(Number.isFinite(sec) ? sec : 0))}s`;
}

/**
 * Prepares text for the bitmap fonts (upper case only): everything is upper case
 * except the "s" right after a digit (Astro Funk has a small s for seconds).
 */
export function funkCase(text: string): string {
  return text
    .toUpperCase()
    .replace(/(\d)S(?![A-ZÄÖÜ])/g, '$1s')
    .replace(/ß/g, 'SS');
}

/** Left edges of chips laid out in a row; hidden entries (null width) take no space. */
export function layoutRow(widths: readonly (number | null)[], gap: number, startX = 0): (number | null)[] {
  let x = startX;
  return widths.map((w) => {
    if (w === null) return null;
    const left = x;
    x += w + gap;
    return left;
  });
}

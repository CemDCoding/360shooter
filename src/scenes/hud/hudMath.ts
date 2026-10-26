/** Pure helpers for the HUD indicators (no Phaser). */
import type { ActiveArmour, ActivePowers } from '../../contracts';

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

/** Catch area diameter of the virtual stick in px (finger start zone, independent of the drawn size). */
export const STICK_CATCH_DIAMETER = 126;

/** Axis-aligned rectangle in arena px (top-left corner, width, height). */
export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

/** True if two rectangles share area (touching edges do not count). */
export function rectsOverlap(a: Rect, b: Rect): boolean {
  return a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;
}

/** True if the rectangle lies completely inside the arena (0..width, 0..height). */
export function rectInArena(r: Rect, width: number, height: number): boolean {
  return r.x >= 0 && r.y >= 0 && r.x + r.w <= width && r.y + r.h <= height;
}

/** Base sizes of the power slots at k = 1 (tokens size.hud-slot, size.hud-slot-gap, margin 8). */
export interface SlotMetrics {
  size: number;
  gap: number;
  margin: number;
}

/**
 * Power slots bottom left (H-14): `count` square slots side by side, order = index
 * (STORABLE_POWERS). Size, gap and the left and bottom margin scale with the HUD factor k.
 */
export function powerSlotRects(count: number, k: number, arenaH: number, base: SlotMetrics): Rect[] {
  const f = Number.isFinite(k) && k > 0 ? k : 1;
  const size = Math.round(base.size * f);
  const gap = Math.round(base.gap * f);
  const m = Math.round(base.margin * f);
  const y = arenaH - m - size;
  const n = Math.max(0, Math.floor(Number.isFinite(count) ? count : 0));
  return Array.from({ length: n }, (_, i) => ({ x: m + i * (size + gap), y, w: size, h: size }));
}

/**
 * Integer icon scale for a slot: at most `maxScale` (token size.hud-slot-icon-scale) and small
 * enough that the sprite keeps a 4 px inset inside the slot (one pixel grid, Grundsatz 3).
 */
export function slotIconScale(slotPx: number, spritePx: number, maxScale: number): number {
  if (!(spritePx > 0) || !(slotPx > 0)) return 1;
  const fit = Math.floor((slotPx - 8) / spritePx);
  return Math.max(1, Math.min(Math.floor(maxScale) || 1, fit));
}

/** Boss bar track at the bottom centre (without the name line above it). */
export function bossBarRect(arenaW: number, arenaH: number, k: number, barW: number, barH: number, margin: number): Rect {
  const w = Math.round(barW * k);
  const h = Math.round(barH * k);
  const m = Math.round(margin * k);
  return { x: Math.round(arenaW / 2 - w / 2), y: arenaH - m - h, w, h };
}

/** Lock state of a stored power: the same power is running or the armour cools down. */
export interface PowerBlock {
  blocked: boolean;
  /** Seconds of the lock (remaining run time or cooldown), 0 if not blocked. */
  sec: number;
}

/**
 * Whether a storable power is blocked right now. Armour: any armour active or cooling down
 * (activateArmour refuses then). Items: rapid fire still running (the only timed item today).
 */
export function powerBlock(
  def: { id: string; kind: 'item' | 'armour' },
  powers: ActivePowers,
  armour: ActiveArmour,
): PowerBlock {
  if (def.kind === 'armour') {
    if (armour.id !== null && armour.activeMsLeft > 0) {
      return { blocked: true, sec: secondsLeft(armour.activeMsLeft) };
    }
    if (armour.cooldownMsLeft > 0) return { blocked: true, sec: secondsLeft(armour.cooldownMsLeft) };
    return { blocked: armour.id !== null, sec: 0 };
  }
  if (def.id === 'rapidFire' && powers.rapidFireMsLeft > 0) {
    return { blocked: true, sec: secondsLeft(powers.rapidFireMsLeft) };
  }
  return { blocked: false, sec: 0 };
}

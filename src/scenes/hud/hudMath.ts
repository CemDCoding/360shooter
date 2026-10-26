/** Pure helpers for the HUD indicators (no Phaser). */
import { BOSSES } from '../../config/bosses';
import { ITEMS } from '../../config/items';
import type { ColorName } from '../../config/theme';
import type { ActiveArmour, ActivePowers, BossId } from '../../contracts';
import type { SlotStatus } from '../../logic/powerStore';
import type { PanelStyle } from './FunkPanel';

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
 * All values are whole pixels; the size is rounded to an even number so the slot centre
 * (icon, seconds) is a whole pixel too, also for an odd k like 1.125 (V-14 c).
 */
export function powerSlotRects(count: number, k: number, arenaH: number, base: SlotMetrics): Rect[] {
  const f = Number.isFinite(k) && k > 0 ? k : 1;
  const size = 2 * Math.round((base.size * f) / 2);
  const gap = Math.round(base.gap * f);
  const m = Math.round(base.margin * f);
  const y = Math.round(arenaH) - m - size;
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
 * Remaining run time (ms) of a timed item power, read from the power state: the item's effect
 * names the field `<effect>MsLeft` in ActivePowers (rapidFire -> rapidFireMsLeft). 0 if the item
 * is unknown or has no timed field.
 */
export function itemMsLeft(itemId: string, powers: ActivePowers): number {
  const effect = ITEMS.find((i) => i.id === itemId)?.effect;
  if (!effect) return 0;
  const value = (powers as unknown as Record<string, unknown>)[`${effect}MsLeft`];
  return typeof value === 'number' && Number.isFinite(value) && value > 0 ? value : 0;
}

/**
 * Whether a storable power is blocked right now. Armour: any armour active or cooling down
 * (activateArmour refuses then). Items: the same power is still running (from its state, V-14 e).
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
  const ms = itemMsLeft(def.id, powers);
  return ms > 0 ? { blocked: true, sec: secondsLeft(ms) } : { blocked: false, sec: 0 };
}

/** Visual state of a power slot frame (V-14 b). */
export interface SlotLookState {
  look: SlotStatus;
  /** Just tapped (motion.fast). */
  pressed: boolean;
  /** Lights up after storing (motion.store-flash). */
  flashing: boolean;
}

/**
 * Frame style of a power slot. Order: pressed, empty, blocked, store flash, ready.
 * Blocked beats the store flash: the brief only lets a slot light up on its way to "ready".
 */
export function slotPanelStyle(s: SlotLookState): PanelStyle {
  if (s.pressed) return { line: 'hud.accent', fill: 'hud.accent' };
  if (s.look === 'empty') return { line: 'hud.line', dotted: true };
  if (s.look === 'blocked') return { line: 'hud.line-dim' };
  if (s.flashing) return { line: 'hud.accent', glow: true, fill: 'hud.flash' };
  return { line: 'hud.accent', glow: true };
}

/** Display name of a boss (from the boss config); "Boss" for an unknown id. */
export function bossDisplayName(id: unknown): string {
  return typeof id === 'string' && Object.hasOwn(BOSSES, id) ? BOSSES[id as BossId].name : 'Boss';
}

/** Boss HP at or below this share counts as critical ("SCHWACH!"). */
export const BOSS_CRITICAL_RATIO = 0.25;

export type BossBarState = 'normal' | 'critical' | 'immune';

/** State of the boss bar: invulnerable wins, then critical (<= 25 %), else normal. */
export function bossBarState(hp: number, maxHp: number, invulnerable: boolean): BossBarState {
  if (invulnerable === true) return 'immune';
  return energyRatio(hp, maxHp) <= BOSS_CRITICAL_RATIO ? 'critical' : 'normal';
}

/** Look of the boss bar per state (H-14, 7a). */
export interface BossBarLook {
  tag: string;
  tagColor: ColorName;
  fill: ColorName;
  dotted: boolean;
  lock: boolean;
}

export function bossBarLook(state: BossBarState): BossBarLook {
  if (state === 'immune') {
    return { tag: 'IMMUN', tagColor: 'hud.text-muted', fill: 'hud.danger-dim', dotted: true, lock: true };
  }
  if (state === 'critical') {
    return { tag: 'SCHWACH!', tagColor: 'hud.accent', fill: 'hud.danger', dotted: false, lock: false };
  }
  return { tag: 'BOSS', tagColor: 'hud.danger', fill: 'hud.danger', dotted: false, lock: false };
}

/**
 * Top of the trail piece after an HP change (ratios 0..1): on a loss the piece reaches from the
 * new fill up to the old fill (or the still visible trail top, whichever is higher).
 * null: no loss (no new hit; a still running trail stays as it is).
 */
export function bossTrailTop(prevRatio: number, nextRatio: number, currentTop: number | null): number | null {
  if (!(nextRatio < prevRatio - 1e-9)) return null;
  return Math.max(prevRatio, currentTop ?? 0);
}

/** Boss HP left in whole percent, rounded up (any rest shows at least 1 %). */
export function bossPercentLeft(hp: number, maxHp: number): number {
  const r = energyRatio(hp, maxHp);
  return Math.min(100, Math.max(0, Math.ceil(r * 100 - 1e-9)));
}

/** Blink plan for the boss banner: `count` full blinks (Phaser yoyo + repeat), none with reduced motion. */
export interface BlinkPlan {
  /** Phaser tween repeat (count - 1: the first run is not a repeat). */
  repeat: number;
  /** Duration of one half blink (fade out or in). */
  durationMs: number;
}

export function bannerBlink(count: number, blinkMs: number, reducedMotion: boolean): BlinkPlan | null {
  const n = Number.isFinite(count) ? Math.floor(count) : 0;
  if (reducedMotion || n <= 0 || !(blinkMs > 0)) return null;
  return { repeat: n - 1, durationMs: blinkMs };
}

/** Pixel patterns ('#' = pixel) for small symbols drawn with Graphics (no sprite at 1x). */
export const PIXEL_LOCK: readonly string[] = [' ### ', '#   #', '#   #', '#####', '## ##', '## ##', '#####'];
export const PIXEL_STAR: readonly string[] = [
  '   #   ',
  '   #   ',
  '#######',
  ' ##### ',
  '  ###  ',
  ' ## ## ',
  ' #   # ',
];

/** Cells of a pixel pattern as [column, row] pairs. */
export function patternCells(rows: readonly string[]): [number, number][] {
  const out: [number, number][] = [];
  rows.forEach((row, y) => {
    for (let x = 0; x < row.length; x++) if (row[x] === '#') out.push([x, y]);
  });
  return out;
}

/** Width of a pixel pattern in cells. */
export function patternWidth(rows: readonly string[]): number {
  return rows.reduce((w, r) => Math.max(w, r.length), 0);
}

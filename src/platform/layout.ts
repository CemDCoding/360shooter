/** Pure layout helpers (no Phaser): fit the arena into the safe area, scale the HUD. */

export interface Insets {
  top: number;
  right: number;
  bottom: number;
  left: number;
}

export interface ArenaFit {
  /** CSS pixels per arena unit. */
  scale: number;
  /** Fitted size in CSS pixels. */
  width: number;
  height: number;
  /** Top-left position in viewport CSS pixels. */
  offsetX: number;
  offsetY: number;
}

/** Smallest readable HUD font in CSS pixels. */
export const MIN_HUD_FONT_CSS = 14;
/** Base HUD font in arena units (desktop look). */
export const BASE_HUD_FONT = 10;
const MAX_HUD_SCALE = 2.5;
const ARENA_H = 360;

function safe(n: number): number {
  return Number.isFinite(n) && n > 0 ? n : 0;
}

/** Fits the arena (aspect kept) into the viewport minus insets, centred in that safe area. */
export function fitArena(
  viewportW: number,
  viewportH: number,
  insets: Insets,
  arenaW: number,
  arenaH: number,
): ArenaFit {
  const left = safe(insets.left);
  const top = safe(insets.top);
  const availW = Math.max(1, safe(viewportW) - left - safe(insets.right));
  const availH = Math.max(1, safe(viewportH) - top - safe(insets.bottom));
  const scale = Math.min(availW / Math.max(1, arenaW), availH / Math.max(1, arenaH));
  const width = arenaW * scale;
  const height = arenaH * scale;
  return {
    scale,
    width,
    height,
    offsetX: left + (availW - width) / 2,
    offsetY: top + (availH - height) / 2,
  };
}

/** Multiplier (>= 1) for HUD sizes in arena units so text stays >= MIN_HUD_FONT_CSS on screen. */
export function hudScale(viewportH: number): number {
  const s = Math.max(0.1, safe(viewportH) / ARENA_H);
  const m = MIN_HUD_FONT_CSS / (BASE_HUD_FONT * s);
  return Math.min(MAX_HUD_SCALE, Math.max(1, m));
}

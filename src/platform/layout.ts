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

/** The visual viewport as reported by `window.visualViewport` (all values in CSS pixels). */
export interface VisualBox {
  width: number;
  height: number;
  offsetLeft: number;
  offsetTop: number;
}

export interface VisibleArea {
  /** Origin and size of the area that is really visible, in layout-viewport CSS pixels. */
  x: number;
  y: number;
  width: number;
  height: number;
  /** Insets that still lie inside the visible area (a hidden home bar or notch no longer counts). */
  insets: Insets;
}

/**
 * Combines the layout viewport (probe size, 100dvh) with the visual viewport. On iOS the two differ
 * while the Safari toolbar is shown or right after a rotation; the visible area is the smaller one.
 * Safe-area insets are reduced by the part of the layout viewport that is not visible anyway.
 */
export function visibleArea(
  probeW: number,
  probeH: number,
  insets: Insets,
  vv: VisualBox | null | undefined,
): VisibleArea {
  const pw = safe(probeW);
  const ph = safe(probeH);
  const i = {
    top: safe(insets.top),
    right: safe(insets.right),
    bottom: safe(insets.bottom),
    left: safe(insets.left),
  };
  if (!vv || !(safe(vv.width) > 0) || !(safe(vv.height) > 0)) {
    return { x: 0, y: 0, width: pw, height: ph, insets: i };
  }
  const x = Math.min(safe(vv.offsetLeft), pw);
  const y = Math.min(safe(vv.offsetTop), ph);
  const w = Math.min(safe(vv.width), Math.max(0, pw - x));
  const h = Math.min(safe(vv.height), Math.max(0, ph - y));
  return {
    x,
    y,
    width: w,
    height: h,
    insets: {
      left: Math.max(0, i.left - x),
      top: Math.max(0, i.top - y),
      right: Math.max(0, i.right - Math.max(0, pw - (x + w))),
      bottom: Math.max(0, i.bottom - Math.max(0, ph - (y + h))),
    },
  };
}

// Pure layout of the finisher scene (M10 AP-160, design brief H-39, mockup m10-boss-finisher.html; M10 picture helpers removed in AP-191).
// Functions of arena width, height 360 and SafeInsets; no Phaser import.
import type { SafeInsets } from '../../contracts';
import { THEME, themeColor, type ColorName } from '../../config/theme';

type ThemeColor = ReturnType<typeof themeColor>;

/** Colour of a step: its token key when it is a known `finisher.*` token, else the fallback token. */
export function tokenColor(key: string | undefined, fallback: ColorName): ThemeColor {
  if (key && key.startsWith('finisher.') && key in THEME.colors) {
    return themeColor(key as ColorName);
  }
  return themeColor(fallback);
}

export interface Point {
  x: number;
  y: number;
}

export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

const S = THEME.sizePx;

/** Height of one cinema bar (`size.finisher-letterbox`). */
export const BAR_H = S['size.finisher-letterbox'];
/** Gap between the top bar and the title (brief H-39, assumptions: 12 px under the top bar). */
export const TITLE_GAP = 12;
/** Edge of the cut-in band (brief: 2 px in coral, above and below the band). */
export const CUTIN_EDGE = 2;
/** Scale of the visor portrait in the cut-in strip (one source for pictures.ts and the boss effects). */
export const PORTRAIT_SCALE = 2;
/** Skip hint: padding, gap and the arrow (5 x 7 cells at 2x), as in the mockup. */
export const HINT_PAD_X = 6;
export const HINT_PAD_Y = 4;
export const HINT_GAP = 6;
export const ARROW_SCALE = 2;
export const ARROW_CELLS: readonly Rect[] = [
  { x: 0, y: 0, w: 1, h: 7 },
  { x: 1, y: 1, w: 1, h: 5 },
  { x: 2, y: 2, w: 1, h: 3 },
  { x: 3, y: 3, w: 1, h: 1 },
];
export const ARROW_W = 5 * ARROW_SCALE;
export const ARROW_H = 7 * ARROW_SCALE;

export interface FinisherLayout {
  width: number;
  height: number;
  center: Point;
  /** Top edge of the title and of the name, and the x it is centred on (inside the insets). */
  titleY: number;
  titleCenterX: number;
  /** Right and bottom edge of the skip hint box. */
  hintRight: number;
  hintBottom: number;
  /** Cut-in band: top of the inner band, its height and the slant of its ends. */
  cutInTop: number;
  cutInH: number;
  cutInSlant: number;
}

function inset(v: number): number {
  return Number.isFinite(v) && v > 0 ? v : 0;
}

/**
 * Layout of one arena. `hasBars`: the plan has a letterbox; without bars the hint sits 8 px above
 * the bottom edge (mockup stage 1), the title stays at the same place in every stage (mockup).
 */
export function finisherLayout(
  width: number,
  height: number,
  insets: SafeInsets,
  hasBars: boolean,
): FinisherLayout {
  const top = inset(insets.top);
  const right = inset(insets.right);
  const bottom = inset(insets.bottom);
  const left = inset(insets.left);
  const skipInset = S['size.finisher-skip-inset'];
  const cutInH = S['size.finisher-portrait-h'];
  return {
    width,
    height,
    center: { x: Math.round(width / 2), y: Math.round(height / 2) },
    titleY: Math.max(BAR_H + TITLE_GAP, top + TITLE_GAP),
    titleCenterX: Math.round((left + width - right) / 2),
    hintRight: width - right - skipInset,
    hintBottom: Math.min(height - (hasBars ? BAR_H : 0) - skipInset, height - bottom - skipInset),
    cutInTop: Math.round(height / 2 - cutInH / 2),
    cutInH,
    cutInSlant: cutInH + 2 * CUTIN_EDGE,
  };
}

export interface HintBox {
  box: Rect;
  textX: number;
  textY: number;
  arrowX: number;
  arrowY: number;
}

/** Box of the skip hint "TIPPEN: WEITER" plus arrow, anchored bottom right. */
export function hintBox(layout: FinisherLayout, textW: number, textH: number): HintBox {
  const innerH = Math.max(textH, ARROW_H);
  const w = HINT_PAD_X * 2 + textW + HINT_GAP + ARROW_W;
  const h = HINT_PAD_Y * 2 + innerH;
  const x = layout.hintRight - w;
  const y = layout.hintBottom - h;
  return {
    box: { x, y, w, h },
    textX: x + HINT_PAD_X,
    textY: y + HINT_PAD_Y + Math.round((innerH - textH) / 2),
    arrowX: x + HINT_PAD_X + textW + HINT_GAP,
    arrowY: y + HINT_PAD_Y + Math.round((innerH - ARROW_H) / 2),
  };
}

/** Left x of a text of width `w` centred on `cx`, whole pixels. */
export function centredX(cx: number, w: number): number {
  return Math.round(cx - w / 2);
}

/** Deterministic random numbers 0..1 (mulberry32), so a sequence looks the same every time. */
export function seededRandom(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Distance of the speedlines' inner end to the hit point (brief: 1 px wide from 48 px). */
export const SPEEDLINE_R0 = 48;
/** Random extra start distance per line (mockup: up to 40 px). */
export const SPEEDLINE_R0_SPREAD = 40;

/**
 * Radial speedlines as quads: 1 px wide at the inner end, 2 px at the far end, which lies beyond
 * the farthest arena corner (brief H-39, decision 7a). No gradients.
 */
export function speedlineWedges(
  cx: number,
  cy: number,
  width: number,
  height: number,
  count: number,
  seed: number,
): Point[][] {
  const rnd = seededRandom(seed);
  const far =
    Math.ceil(
      Math.max(
        Math.hypot(cx, cy),
        Math.hypot(width - cx, cy),
        Math.hypot(cx, height - cy),
        Math.hypot(width - cx, height - cy),
      ),
    ) + 8;
  const out: Point[][] = [];
  for (let i = 0; i < count; i++) {
    const a = ((i + rnd() * 0.7) / count) * Math.PI * 2;
    const c = Math.cos(a);
    const s = Math.sin(a);
    const r0 = SPEEDLINE_R0 + rnd() * SPEEDLINE_R0_SPREAD;
    const w0 = 0.5;
    const w1 = 1;
    out.push([
      { x: cx + c * r0 - s * w0, y: cy + s * r0 + c * w0 },
      { x: cx + c * r0 + s * w0, y: cy + s * r0 - c * w0 },
      { x: cx + c * far + s * w1, y: cy + s * far - c * w1 },
      { x: cx + c * far - s * w1, y: cy + s * far + c * w1 },
    ]);
  }
  return out;
}

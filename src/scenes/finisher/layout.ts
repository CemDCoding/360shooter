// Pure layout of the finisher scene (M10, AP-160, design brief H-39, mockup m10-boss-finisher.html).
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

/** Colour background per stage (finales fill the sides of a wide arena with it). */
export const STAGE_BG: readonly ColorName[] = [
  'finisher.bg-forest',
  'finisher.bg-night',
  'finisher.bg-elf',
  'finisher.bg-desert',
  'finisher.bg-pyramid',
  'finisher.bg-oasis',
];

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
const C = THEME.sizeCount;

/** Height of one cinema bar (`size.finisher-letterbox`). */
export const BAR_H = S['size.finisher-letterbox'];
/** Gap between the top bar and the title (brief H-39, assumptions: 12 px under the top bar). */
export const TITLE_GAP = 12;
/** Frame size of a picture sheet and of the hit image (sprite sheets, AP-159). */
export const PICTURE_W = 320;
export const PICTURE_H = 180;
export const HIT_IMAGE_SIZE = 96;
/** Darkening of the scene under the hit image in stage 1 and 2 (brief: 85 % ink). */
export const HIT_SCRIM_ALPHA = 0.85;
/** Edge of the cut-in band (brief: 2 px in coral, above and below the band). */
export const CUTIN_EDGE = 2;
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
  /** The 640 x 360 picture (sheet frame at 2x), centred; wider arenas have room left and right. */
  picture: Rect;
  barTop: Rect;
  barBottom: Rect;
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
  const pw = PICTURE_W * C['size.finisher-frame-scale'];
  const ph = PICTURE_H * C['size.finisher-frame-scale'];
  const skipInset = S['size.finisher-skip-inset'];
  const cutInH = S['size.finisher-portrait-h'];
  return {
    width,
    height,
    center: { x: Math.round(width / 2), y: Math.round(height / 2) },
    picture: { x: Math.round((width - pw) / 2), y: Math.round((height - ph) / 2), w: pw, h: ph },
    barTop: { x: 0, y: 0, w: width, h: BAR_H },
    barBottom: { x: 0, y: height - BAR_H, w: width, h: BAR_H },
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

function clampHalf(v: number, half: number, size: number): number {
  return half * 2 >= size ? size / 2 : Math.min(size - half, Math.max(half, v));
}

/**
 * Screen position of an actor copy with the camera zoomed on the hit point, kept inside the arena.
 * Writes into `out` when given (the scene reuses one object per frame).
 */
export function actorScreen(
  actor: Point,
  hit: Point,
  zoom: number,
  width: number,
  height: number,
  halfW: number,
  halfH: number,
  out?: Point,
): Point {
  const p = out ?? { x: 0, y: 0 };
  p.x = Math.round(clampHalf(hit.x + (actor.x - hit.x) * zoom, halfW, width));
  p.y = Math.round(clampHalf(hit.y + (actor.y - hit.y) * zoom, halfH, height));
  return p;
}

/** Hit point (boss position) inside the arena. */
export function hitPoint(boss: Point, width: number, height: number): Point {
  const ok = (v: number, size: number): number =>
    Number.isFinite(v) ? Math.min(size, Math.max(0, Math.round(v))) : Math.round(size / 2);
  return { x: ok(boss.x, width), y: ok(boss.y, height) };
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

/** Beam of the final blow (decision 10a): white core, 3 px coral rim per side, 50 % dithered outer band. */
export const BEAM_CORE_H = 6;
export const BEAM_RIM_H = 3;
export const BEAM_GLOW_H = 4;
export const BEAM_TOTAL_H = BEAM_CORE_H + 2 * BEAM_RIM_H + 2 * BEAM_GLOW_H;

export interface BeamBands {
  glowTop: Rect;
  rimTop: Rect;
  core: Rect;
  rimBottom: Rect;
  glowBottom: Rect;
}

/** Bands of the beam across x..x+w, centred on `cy`. */
export function beamBands(cy: number, x: number, w: number): BeamBands {
  const top = Math.round(cy - BEAM_TOTAL_H / 2);
  const band = (y: number, h: number): Rect => ({ x, y, w, h });
  return {
    glowTop: band(top, BEAM_GLOW_H),
    rimTop: band(top + BEAM_GLOW_H, BEAM_RIM_H),
    core: band(top + BEAM_GLOW_H + BEAM_RIM_H, BEAM_CORE_H),
    rimBottom: band(top + BEAM_GLOW_H + BEAM_RIM_H + BEAM_CORE_H, BEAM_RIM_H),
    glowBottom: band(top + BEAM_GLOW_H + 2 * BEAM_RIM_H + BEAM_CORE_H, BEAM_GLOW_H),
  };
}

/**
 * Horizontal span of the growing beam: it starts at the side of the astronaut and crosses the
 * whole picture; `progress` 0..1.
 */
export function beamSpan(
  fromLeft: boolean,
  width: number,
  progress: number,
): { x: number; w: number } {
  const p = Math.min(1, Math.max(0, progress));
  const w = Math.round(width * p);
  return { x: fromLeft ? 0 : width - w, w };
}

export interface PanelDef {
  /** Outline of the panel (slanted field). */
  points: Point[];
  /** Anchor of its content. */
  anchor: Point;
}

export interface PanelLayout {
  /** Portrait panel (top left), hit image panel (top right), beam panel (bottom). */
  portrait: PanelDef;
  hit: PanelDef;
  beam: PanelDef;
  /** In the beam panel: beam y, its start and end x, astronaut top left and boss centre. */
  beamY: number;
  beamFromX: number;
  beamToX: number;
  astronaut: Point;
  boss: Point;
}

/** Three slanted panels (mockup view 5, base 640, x scaled with the arena width). */
export function panelLayout(width: number, insets: SafeInsets): PanelLayout {
  const k = width / 640;
  const x = (v: number): number => Math.round(v * k);
  const portraitX = Math.max(4, inset(insets.left) + 4);
  return {
    portrait: {
      points: [
        { x: 0, y: 0 },
        { x: x(330), y: 0 },
        { x: x(300), y: 170 },
        { x: 0, y: 170 },
      ],
      anchor: { x: portraitX, y: 65 },
    },
    hit: {
      points: [
        { x: x(340), y: 0 },
        { x: width, y: 0 },
        { x: width, y: 170 },
        { x: x(310), y: 170 },
      ],
      anchor: { x: x(480), y: 85 },
    },
    beam: {
      points: [
        { x: 0, y: 180 },
        { x: width, y: 180 },
        { x: width, y: 360 },
        { x: 0, y: 360 },
      ],
      anchor: { x: x(470), y: 270 },
    },
    beamY: 270,
    beamFromX: x(120),
    beamToX: x(470),
    astronaut: { x: Math.max(x(40), inset(insets.left) + 4), y: 230 },
    boss: { x: x(500), y: 270 },
  };
}

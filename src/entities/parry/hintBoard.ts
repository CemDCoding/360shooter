// Hint board of the choice building block (AP-151, brief H-37 "choice", decision 8a): a glass board above the
// astronaut (not above the boss) with the scale or the riddle picture. Pure functions, no Phaser import.
import { THEME } from '../../config/theme';
import type { ParryCircle } from '../../contracts';
import { FUNK_GLYPH_H } from '../../scenes/hud/FunkPanel';

export const SCALE_SHEET = 'parry-scale';
export const RIDDLE_SHEET = 'parry-riddle';

/** Picture size in sprite pixels (before size.parry-hint-scale). */
const SHEET_SIZE: Readonly<Record<string, { w: number; h: number }>> = {
  [SCALE_SHEET]: { w: 32, h: 24 },
  [RIDDLE_SHEET]: { w: 24, h: 24 },
};

/** Riddle picture by the leg count of the right circle: crawling child, upright human, old man with stick. */
export const RIDDLE_FRAME: Readonly<Record<string, number>> = { legs4: 0, legs2: 1, legs3: 2 };
/** Symbols that make the board show the scale (heart pan left sinks, feather pan right rises). */
const SCALE_SYMBOLS = new Set(['heart', 'feather']);
/** Last frame of the scale (strongly tilted). */
export const SCALE_END_FRAME = 2;

export const HINT_SCALE = THEME.sizeCount['size.parry-hint-scale'];
/** Board centre above the astronaut. */
export const HINT_RISE = THEME.sizePx['size.parry-hint-y'];
/** 2 px inner padding and the 1 px frame (brief H-37). */
export const HINT_PAD = 2;
const HINT_BORDER = THEME.borderPx['border.hud'];
/** The board keeps at least this distance below the HUD timer. */
export const HINT_TIMER_GAP = 4;
const TILT_MS = THEME.motionMs['motion.parry-tilt'];

/**
 * Mirror of the HUD timer panel (HudScene.createTimer, owned by the HUD): the margin and the inner padding are
 * 8 arena units times k, the number has glyph scale 3, k is capped at 1.4. Kept here as numbers so the board can
 * stay clear of the timer without reading the HUD scene.
 */
const HUD_MARGIN = 8;
const HUD_TIMER_PAD = 8;
const HUD_NUMBER_SCALE = 3;
export const HUD_MAX_K = 1.4;

export interface Box {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface HintContent {
  sheet: string;
  /** Frame for the riddle; the scale frame follows the time (scaleFrame). */
  frame: number;
}

/**
 * What the board shows for the choice circles of one attack, or null (no choice circles, e.g. easy parry where
 * every circle is a plain tap). Scale if a circle shows a heart or a feather, else the riddle picture of the
 * right circle (legs4 / legs2 / legs3).
 */
export function hintContent(circles: readonly ParryCircle[]): HintContent | null {
  const choices = circles.filter((c) => c.kind === 'choice');
  if (choices.length === 0) return null;
  if (choices.some((c) => c.symbol !== undefined && SCALE_SYMBOLS.has(c.symbol)))
    return { sheet: SCALE_SHEET, frame: 0 };
  const right = choices.find((c) => c.correct === true);
  const sym = right?.symbol;
  if (sym !== undefined && Object.prototype.hasOwnProperty.call(RIDDLE_FRAME, sym))
    return { sheet: RIDDLE_SHEET, frame: RIDDLE_FRAME[sym] };
  return null;
}

/** Scale frame `ms` after the start of the announcement: 0 -> 1 -> 2 over motion.parry-tilt; reduced: 2 at once. */
export function scaleFrame(ms: number, reduced: boolean): number {
  if (reduced || !(ms < TILT_MS)) return SCALE_END_FRAME;
  return ms < TILT_MS / 2 ? 0 : 1;
}

/** Outer size of the board for a sheet (picture in HINT_SCALE, padding and frame). */
export function hintBoardSize(sheet: string): { w: number; h: number } {
  const s = SHEET_SIZE[sheet] ?? SHEET_SIZE[RIDDLE_SHEET];
  const extra = 2 * (HINT_PAD + HINT_BORDER);
  return { w: s.w * HINT_SCALE + extra, h: s.h * HINT_SCALE + extra };
}

/** Bottom edge of the HUD timer panel for the HUD factor k (capped) and the safe top inset, in arena units. */
export function hudTimerBottom(k: number, safeTop = 0): number {
  const kk = Math.min(HUD_MAX_K, Math.max(1, Number.isFinite(k) ? k : 1));
  const margin = Math.round(HUD_MARGIN * kk);
  const top = Math.max(margin, Number.isFinite(safeTop) && safeTop > 0 ? safeTop : 0);
  return top + FUNK_GLYPH_H * HUD_NUMBER_SCALE + 2 * Math.round(HUD_TIMER_PAD * kk);
}

/**
 * Box of the board: centre HINT_RISE above the astronaut; if its top edge would come closer than
 * HINT_TIMER_GAP to the timer, it moves down. Horizontally it stays inside the arena.
 */
export function hintBoardRect(
  player: { x: number; y: number },
  size: { w: number; h: number },
  timerBottom: number,
  arenaWidth: number,
): Box {
  let x = Math.round(player.x - size.w / 2);
  x = Math.max(0, Math.min(x, Math.max(0, arenaWidth - size.w)));
  const wantY = Math.round(player.y - HINT_RISE - size.h / 2);
  const y = Math.max(wantY, timerBottom + HINT_TIMER_GAP);
  return { x, y, w: size.w, h: size.h };
}

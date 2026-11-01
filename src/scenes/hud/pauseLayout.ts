// Pure layout of the pause overlay (H-33, view 6): title, info line, two buttons, hint. No Phaser.
import type { SafeInsets } from '../../contracts';
import type { Rect } from './hudMath';

/** Vertical gaps in arena units (mockup: title 12 info 20 buttons 14 hint) and the button gap. */
export const PAUSE_GAP_TITLE = 12;
export const PAUSE_GAP_INFO = 20;
export const PAUSE_GAP_HINT = 14;
export const PAUSE_BUTTON_GAP = 12;
/** Top of the group at k = 1 in a 360 high arena (mockup: y = 112). */
const PAUSE_TOP = 112 / 360;

export interface PauseLayoutInput {
  width: number;
  height: number;
  /** HUD factor. */
  k: number;
  /** Distance of the HUD to each canvas edge (max of design margin and inset). */
  edges: SafeInsets;
  titleH: number;
  infoH: number;
  hintH: number;
  /** Widths of the two buttons: [continue, main menu]. */
  buttonW: [number, number];
}

export interface PauseLayout {
  /** Top edges of the text lines; they are centred on the canvas. */
  titleY: number;
  infoY: number;
  hintY: number;
  /** Button rectangles (top left corner). */
  buttons: [Rect, Rect];
}

/** Button height: round(32k). */
export function pauseButtonHeight(k: number): number {
  return Math.round(32 * (Number.isFinite(k) && k > 0 ? k : 1));
}

/**
 * Places the group top-down: title, 12, info, 20, buttons, 14, hint. The group starts at 112/360 of the
 * arena height and moves up only if it would reach into the bottom edge. The button pair is centred
 * and moved inward if it would reach into an inset.
 */
export function pauseLayout(i: PauseLayoutInput): PauseLayout {
  const bh = pauseButtonHeight(i.k);
  const total =
    i.titleH + PAUSE_GAP_TITLE + i.infoH + PAUSE_GAP_INFO + bh + PAUSE_GAP_HINT + i.hintH;
  const wanted = Math.round(i.height * PAUSE_TOP);
  const lowest = i.height - i.edges.bottom - total;
  const top = Math.max(i.edges.top, Math.min(wanted, lowest));
  const titleY = top;
  const infoY = titleY + i.titleH + PAUSE_GAP_TITLE;
  const btnY = infoY + i.infoH + PAUSE_GAP_INFO;
  const hintY = btnY + bh + PAUSE_GAP_HINT;
  const [w1, w2] = i.buttonW;
  const pairW = w1 + PAUSE_BUTTON_GAP + w2;
  const wantX = Math.round((i.width - pairW) / 2);
  const minX = i.edges.left;
  const maxX = i.width - i.edges.right - pairW;
  const x = Math.max(minX, Math.min(wantX, maxX));
  return {
    titleY,
    infoY,
    hintY,
    buttons: [
      { x, y: btnY, w: w1, h: bh },
      { x: x + w1 + PAUSE_BUTTON_GAP, y: btnY, w: w2, h: bh },
    ],
  };
}

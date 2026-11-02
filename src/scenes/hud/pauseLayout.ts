// Pure layout of the pause overlay (H-33 view 6, H-37 view 12): title, info line, two buttons, easy parry
// switch, its note and the hint. No Phaser.
import type { SafeInsets } from '../../contracts';
import type { Rect } from './hudMath';

/** Vertical gaps in arena units (mockup: title 12 info 20 buttons 14 hint) and the button gap. */
export const PAUSE_GAP_TITLE = 12;
export const PAUSE_GAP_INFO = 20;
export const PAUSE_GAP_HINT = 14;
export const PAUSE_BUTTON_GAP = 12;
/** Gap between the button row and the switch, and between the switch and its note (H-37 view 12). */
export const PAUSE_SWITCH_GAP = 8;
export const PAUSE_NOTE_GAP = 6;
/** Top of the group at k = 1 in a 360 high arena (mockup view 12: y = 92). */
const PAUSE_TOP = 92 / 360;

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
  /** Height of the note line under the switch. */
  noteH: number;
  /** Widths of the two buttons: [continue, main menu]. */
  buttonW: [number, number];
  /** Least width the switch content needs (box, gap, label, padding). */
  switchMinW: number;
}

export interface PauseLayout {
  /** Top edges of the text lines; they are centred on the canvas. */
  titleY: number;
  infoY: number;
  noteY: number;
  /** Top of the note under the second switch (reduce effects, AP-162). */
  note2Y: number;
  hintY: number;
  /** Button rectangles (top left corner). */
  buttons: [Rect, Rect];
  /** The easy parry switch: the full group width (button pair, or wider if its content needs it). */
  toggle: Rect;
  /** The reduce effects switch: same size, below the note of the first switch. */
  toggle2: Rect;
}

/** Button height: round(32k). */
export function pauseButtonHeight(k: number): number {
  return Math.round(32 * (Number.isFinite(k) && k > 0 ? k : 1));
}

/**
 * Places the group top-down: title, 12, info, 20, buttons, 8, switch, 6, note, 8, switch 2, 6, note 2, 14, hint. The group starts
 * at 92/360 of the arena height and moves up only if it would reach into the bottom edge. The button
 * pair and the switch share one centred group width and move inward if they would reach into an inset.
 */
export function pauseLayout(i: PauseLayoutInput): PauseLayout {
  const bh = pauseButtonHeight(i.k);
  const total =
    i.titleH +
    PAUSE_GAP_TITLE +
    i.infoH +
    PAUSE_GAP_INFO +
    bh +
    PAUSE_SWITCH_GAP +
    bh +
    PAUSE_NOTE_GAP +
    i.noteH +
    PAUSE_SWITCH_GAP +
    bh +
    PAUSE_NOTE_GAP +
    i.noteH +
    PAUSE_GAP_HINT +
    i.hintH;
  const wanted = Math.round(i.height * PAUSE_TOP);
  const lowest = i.height - i.edges.bottom - total;
  const top = Math.max(i.edges.top, Math.min(wanted, lowest));
  const titleY = top;
  const infoY = titleY + i.titleH + PAUSE_GAP_TITLE;
  const btnY = infoY + i.infoH + PAUSE_GAP_INFO;
  const toggleY = btnY + bh + PAUSE_SWITCH_GAP;
  const noteY = toggleY + bh + PAUSE_NOTE_GAP;
  const toggle2Y = noteY + i.noteH + PAUSE_SWITCH_GAP;
  const note2Y = toggle2Y + bh + PAUSE_NOTE_GAP;
  const hintY = note2Y + i.noteH + PAUSE_GAP_HINT;
  const [w1, w2] = i.buttonW;
  const pairW = w1 + PAUSE_BUTTON_GAP + w2;
  const groupW = Math.max(pairW, i.switchMinW);
  const wantX = Math.round((i.width - groupW) / 2);
  const minX = i.edges.left;
  const maxX = i.width - i.edges.right - groupW;
  const gx = Math.max(minX, Math.min(wantX, maxX));
  const x = gx + Math.round((groupW - pairW) / 2);
  return {
    titleY,
    infoY,
    noteY,
    note2Y,
    hintY,
    buttons: [
      { x, y: btnY, w: w1, h: bh },
      { x: x + w1 + PAUSE_BUTTON_GAP, y: btnY, w: w2, h: bh },
    ],
    toggle: { x: gx, y: toggleY, w: groupW, h: bh },
    toggle2: { x: gx, y: toggle2Y, w: groupW, h: bh },
  };
}

/** Focus order of the pause menu (H-37 view 12): continue, main menu, easy parry, reduce effects. Wraps around. */
export const PAUSE_FOCUS_COUNT = 4;
export function nextPauseFocus(current: number, step: 1 | -1): number {
  const c = Number.isInteger(current) && current >= 0 && current < PAUSE_FOCUS_COUNT ? current : 0;
  return (c + step + PAUSE_FOCUS_COUNT) % PAUSE_FOCUS_COUNT;
}

export type PauseMenuAction = 'next' | 'prev' | 'tab' | 'tabBack' | 'press' | null;

/** Maps a key of the pause menu to an action. Auto-repeat is ignored (no flicker, no save per repeat). */
export function pauseMenuKey(key: unknown, repeat: boolean, shift: boolean): PauseMenuAction {
  if (repeat) return null;
  switch (key) {
    case 'ArrowDown':
    case 'ArrowRight':
      return 'next';
    case 'ArrowUp':
    case 'ArrowLeft':
      return 'prev';
    case 'Tab':
      return shift ? 'tabBack' : 'tab';
    case 'Enter':
    case ' ':
      return 'press';
    default:
      return null;
  }
}

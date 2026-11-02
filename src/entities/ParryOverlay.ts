import Phaser from 'phaser';
import { PARRY_RULES } from '../config/parry';
import { OPACITY, THEME, themeColor, type ColorName } from '../config/theme';
import type { ParryGrade, ParryRules } from '../contracts';
import { ringState, targetPosition, type ParryCircleState } from '../logic/parry';
import { hudScale } from '../platform/layout';
import { prefersReducedMotion } from '../platform/motion';
import { FUNK_FONT, FUNK_GLYPH_H, measureFunk } from '../scenes/hud/FunkPanel';
import { funkCase } from '../scenes/hud/hudMath';
import { readSafeInsets } from '../scenes/safeInsets';
import { circleAppearsAtMs, type ParryGroup, type ParryOutcome } from './bosses/hazards';
import {
  HINT_SCALE,
  HUD_MAX_K,
  SCALE_SHEET,
  hintBoardRect,
  hintBoardSize,
  hintContent,
  hudTimerBottom,
  scaleFrame,
} from './parry/hintBoard';
import {
  BEAT_DOT,
  FLAG,
  FLAG_OFFSET,
  HOLD_SEGMENTS,
  SELECT_RING_R,
  SLEEP_Z_OFFSET,
  beatDotRects,
  beatsDone,
  bracketRects,
  decoyFade,
  flagShown,
  holdFilled,
  holdSegmentArc,
  linkDots,
  resultWord,
  sleepRise,
  symbolLit,
  targetBoxR,
  type ParryNote,
  type ParryWord,
} from './parry/look';
import { MOTIF_GAP, MOTIF_SHEET, motifFrame } from './parry/motifs';
import {
  DECOY_BROKEN_FRAME,
  DECOY_EDGE_FRAME,
  DECOY_EDGE_SHEET,
  SLEEP_Z_FRAME,
  SYMBOL_SHEET,
  UI_ICONS_M9_SHEET,
  hitFrame,
  holdSymbolFrame,
  symbolFrame,
  targetFrame,
} from './parry/symbols';

// Quicktime circles around the astronaut (AP-133, design brief H-33 "Quicktime-Kreis", mockup
// m7-quicktime-und-stufen.html views 1-3b), extended by the M9 building blocks (AP-151, brief H-37
// "Bausteine", mockup m9-maerchen-quicktimes.html views 1-11 and 13). World object: does not scale with the HUD
// factor k.

/** Over enemies, boss projectiles (2), the player (10) and the fire ring (15), under the stick (50/51, created in GameScene) and the pause layer (HudScene, 100); circles sit far from the stick. */
export const PARRY_DEPTH = 20;
/** The shield ring of "PARRY!" lies under the astronaut, like in the mockup. */
const BURST_RING_DEPTH = 9.5;
/** The choice hint board lies under the circles (brief H-37: circles above the board in depth). */
const BOARD_DEPTH = PARRY_DEPTH - 0.5;
const SPRITE_DEPTH = PARRY_DEPTH + 0.05;

const RADIUS = THEME.sizePx['size.parry-radius'];
const LINE = THEME.sizePx['size.parry-line'];
const BORDER = THEME.borderPx['border.hud'];
const FEEDBACK_MS = THEME.motionMs['motion.parry-feedback'];
const BURST_MS = THEME.motionMs['motion.parry-burst'];
const MOTIF_PX = THEME.sizePx['size.parry-motif'];
/** Short pop of the words (one font step bigger) unless motion is reduced. */
const POP_MS = THEME.motionMs['motion.fast'];

/** Brief H-33: word centre 34 px from the circle centre, radially away from the astronaut. */
export const WORD_OFFSET = 34;
/** Brief H-33: "PARRY!" 62 px above the centre of the astronaut. */
export const PARRY_LABEL_RISE = 62;
/** Brief H-33: the shield ring grows from the circle radius (20) to twice that (40), area 15 %. */
export const BURST_START_R = RADIUS;
export const BURST_END_R = RADIUS * 2;
const BURST_FILL_ALPHA = 0.15;
/** Glass label padding from the mockup (.lbl 3 px / 4 px; "PARRY!" 5 px / 6 px), vertical then horizontal. */
const WORD_PAD = { x: 4, y: 3 } as const;
const PARRY_PAD = { x: 6, y: 5 } as const;
/** Dashes of the "missed" circle edge (half of each step is drawn). */
const MISS_DASHES = 16;
const ICON_SCALE = 2;
const WORD_SCALE = 2;
const NUMBER_SCALE = 2;
const PARRY_SCALE = 3;
/** The sleep "z" (8x8 sprite) shows at twice its size (brief H-37). */
const Z_SCALE = 2;

/** 7x7 pixel shapes from the mockup (view 3), '#' = pixel. */
export const CHECK_PIXELS = [
  '......#',
  '.....##',
  '#...##.',
  '##.##..',
  '.###...',
  '..#....',
  '.......',
] as const;
export const CROSS_PIXELS = [
  '#.....#',
  '##...##',
  '.##.##.',
  '..###..',
  '.##.##.',
  '##...##',
  '#.....#',
] as const;
/** 8x8 star of the design pixel set: 's' fill (parry-perfect), 'o' outline (hud.screen). */
export const STAR_PIXELS = [
  '...oo...',
  '..osso..',
  'oossssoo',
  'osssssso',
  '.osssso.',
  '.osooso.',
  'oso..oso',
  'oo....oo',
] as const;

/** Colour and word per grade: word and shape, never colour alone. */
export const GRADE_STYLE: Record<ParryGrade, { color: ColorName; word: string }> = {
  perfect: { color: 'game.parry-perfect', word: 'PERFEKT' },
  good: { color: 'game.parry-good', word: 'GUT' },
  miss: { color: 'game.parry-miss', word: 'VERFEHLT' },
};

/** Colour of every word (brief H-37 10a): error words in warning red, always next to a shape. */
export const WORD_COLOR: Record<ParryWord, ColorName> = {
  PERFEKT: 'game.parry-perfect',
  GUT: 'game.parry-good',
  VERFEHLT: 'game.parry-miss',
  'TRUG!': 'game.parry-miss',
  FALSCH: 'game.parry-miss',
  'ZU FRÜH': 'game.parry-miss',
  'LOS!': 'hud.text',
};

export interface Point {
  x: number;
  y: number;
}

/** Centre of a circle at `angleDeg` around the player. */
export function circleCenter(
  player: Point,
  angleDeg: number,
  rules: ParryRules = PARRY_RULES,
): Point {
  const rad = (angleDeg * Math.PI) / 180;
  return {
    x: player.x + Math.cos(rad) * rules.distanceFromPlayerPx,
    y: player.y + Math.sin(rad) * rules.distanceFromPlayerPx,
  };
}

/**
 * Centre of the glass label of a word: WORD_OFFSET from the circle centre, away from the astronaut, then
 * shifted so the whole label (w x h) stays inside the arena.
 */
export function wordCenter(
  player: Point,
  angleDeg: number,
  size: { w: number; h: number },
  arena: { width: number; height: number },
  rules: ParryRules = PARRY_RULES,
): Point {
  const rad = (angleDeg * Math.PI) / 180;
  const c = circleCenter(player, angleDeg, rules);
  return clampBox(
    { x: c.x + Math.cos(rad) * WORD_OFFSET, y: c.y + Math.sin(rad) * WORD_OFFSET },
    size,
    arena,
  );
}

/** Moves the centre of a w x h box so the box lies inside the arena (if it fits). */
export function clampBox(
  p: Point,
  size: { w: number; h: number },
  arena: { width: number; height: number },
): Point {
  const hw = size.w / 2;
  const hh = size.h / 2;
  return {
    x: Math.min(Math.max(p.x, hw), Math.max(hw, arena.width - hw)),
    y: Math.min(Math.max(p.y, hh), Math.max(hh, arena.height - hh)),
  };
}

/** Radius of the PARRY shield ring after `ms`: grows linearly 20 -> 40; reduced motion: stays at 40. */
export function burstRadius(ms: number, reduced: boolean): number {
  if (reduced) return BURST_END_R;
  const t = Math.min(1, Math.max(0, ms / BURST_MS));
  return BURST_START_R + (BURST_END_R - BURST_START_R) * t;
}

/**
 * drag: the circle was selected by tap (replacement): second ring and smaller target box. A circle that a
 * pointer holds (it has a drag position from the press on) is "grabbed", not selected (brief H-37 5a).
 */
export function isDragSelected(
  c: Pick<ParryCircleState, 'index' | 'pressedAtMs'>,
  drags: Readonly<Record<number, Point>> | undefined,
): boolean {
  return c.pressedAtMs !== undefined && drags?.[c.index] === undefined;
}

/**
 * Glyph scale of a word label `shownMs` after its grade: 2x, one step bigger for a short pop at the start unless
 * motion is reduced. null: no pop (a lasting word like "LOS!"), so the lasting size is the same in both modes.
 */
export function wordScale(shownMs: number | null, reduced: boolean): number {
  const pop = shownMs !== null && !reduced && shownMs < POP_MS ? 1 : 0;
  return WORD_SCALE + pop;
}

/** One circle as the overlay shows it. */
export interface CircleView {
  index: number;
  angleDeg: number;
  hitAtMs: number;
  grade: ParryGrade | null;
  /** Time since the grade (feedback runs FEEDBACK_MS, then circle and word disappear). */
  shownMs: number;
  /** Latest state of the circle from the boss (M9 kind, symbol, hold and drag state). Missing = plain tap. */
  circle?: ParryCircleState;
  /** Word shown with the grade (M9); null = the circle goes away silently. Missing = word of the grade. */
  word?: ParryWord | null;
}

/** Sound cue of the overlay for the scene (M9): a pebble lights up, a beat comes. Never the only information. */
export type ParryCue = 'pebble' | 'beat';

interface Entry {
  id: number;
  attackId: string;
  elapsedMs: number;
  /** The attack hit: the boss no longer lists the group, the overlay finishes the feedback alone. */
  finished: boolean;
  views: CircleView[];
  /** Latest circles of the group (choice rounds, hint board, beat dots). */
  circles: ParryCircleState[];
  notes: Record<number, ParryNote>;
  drags: Record<number, Point>;
  /** Play time up to which sound cues were given. */
  cuedMs: number;
}

function viewOf(c: ParryCircleState): CircleView {
  return {
    index: c.index,
    angleDeg: c.angleDeg,
    hitAtMs: c.hitAtMs,
    grade: null,
    shownMs: 0,
    circle: c,
  };
}

/**
 * Display state of all groups (no Phaser): which circles are open, which show a grade and for how long, the
 * "PARRY!" effect with its motif and the sound cues. Runs on play time (advance), so it stands still while
 * paused.
 */
export class ParryViewState {
  readonly entries = new Map<number, Entry>();
  /** Running "PARRY!" effects (ms since start). */
  bursts: number[] = [];
  /** Motif frame of each burst (same order as bursts), null without a motif. */
  burstMotifs: (number | null)[] = [];
  private cues: ParryCue[] = [];

  /** Takes over the open groups of the bosses. Groups that vanished without an impact (boss gone) go away. */
  sync(groups: readonly ParryGroup[]): void {
    const seen = new Set<number>();
    for (const g of groups) {
      seen.add(g.id);
      let e = this.entries.get(g.id);
      if (!e) {
        e = {
          id: g.id,
          attackId: g.attackId,
          elapsedMs: 0,
          finished: false,
          views: g.circles.map(viewOf),
          circles: g.circles,
          notes: {},
          drags: {},
          cuedMs: -1,
        };
        this.entries.set(g.id, e);
      }
      this.take(e, g);
      this.cue(e);
      for (const c of g.circles) this.grade(e, c.index, c.result);
    }
    for (const [id, e] of this.entries) if (!e.finished && !seen.has(id)) this.entries.delete(id);
  }

  /** The attack of a group hit: final grades (open circles = missed); `blocked` starts "PARRY!". */
  finish(outcome: ParryOutcome): void {
    const g = outcome.group;
    const e: Entry = this.entries.get(g.id) ?? {
      id: g.id,
      attackId: g.attackId,
      elapsedMs: g.elapsedMs,
      finished: true,
      views: g.circles.map(viewOf),
      circles: g.circles,
      notes: {},
      drags: {},
      cuedMs: g.elapsedMs,
    };
    e.finished = true;
    this.take(e, g);
    e.drags = {};
    for (const c of g.circles) this.grade(e, c.index, c.result ?? 'miss');
    this.entries.set(g.id, e);
    if (outcome.blocked) {
      this.bursts.push(0);
      this.burstMotifs.push(motifFrame(g.attackId));
    }
  }

  /** Ages grades and effects; removes what has run out. */
  advance(dtMs: number): void {
    if (!Number.isFinite(dtMs) || dtMs <= 0) return;
    for (const [id, e] of this.entries) {
      for (const v of e.views) if (v.grade !== null) v.shownMs += dtMs;
      e.views = e.views.filter((v) => v.grade === null || v.shownMs < FEEDBACK_MS);
      if (e.finished && e.views.length === 0) this.entries.delete(id);
    }
    const keep = this.bursts.map((ms) => ms + dtMs < BURST_MS);
    this.bursts = this.bursts.map((ms) => ms + dtMs).filter((_, i) => keep[i]);
    this.burstMotifs = this.burstMotifs.filter((_, i) => keep[i]);
  }

  /** Sound cues since the last call (and forgets them). */
  takeCues(): ParryCue[] {
    const out = this.cues;
    this.cues = [];
    return out;
  }

  clear(): void {
    this.entries.clear();
    this.bursts = [];
    this.burstMotifs = [];
    this.cues = [];
  }

  get isEmpty(): boolean {
    return this.entries.size === 0 && this.bursts.length === 0;
  }

  private take(e: Entry, g: ParryGroup): void {
    e.elapsedMs = g.elapsedMs;
    e.circles = g.circles;
    e.notes = { ...(g.notes ?? {}) };
    e.drags = { ...(g.drags ?? {}) };
    for (const c of g.circles) {
      const v = e.views.find((x) => x.index === c.index);
      if (v && v.grade === null) {
        v.circle = c;
        v.angleDeg = c.angleDeg;
      }
    }
  }

  /** Pebble light-ups and beats whose moment passed since the last sync (only while the attack runs). */
  private cue(e: Entry): void {
    if (e.finished) return;
    const from = e.cuedMs;
    const to = e.elapsedMs;
    if (!(to > from)) return;
    for (const c of e.circles) {
      if (
        c.kind === 'sequence' &&
        c.previewAtMs !== undefined &&
        c.previewAtMs > from &&
        c.previewAtMs <= to
      )
        this.cues.push('pebble');
      if (c.kind === 'beat' && c.hitAtMs > from && c.hitAtMs <= to) this.cues.push('beat');
    }
    e.cuedMs = to;
  }

  private grade(e: Entry, index: number, result: ParryGrade | null): void {
    if (result === null) return;
    const v = e.views.find((x) => x.index === index);
    if (v && v.grade === null) {
      const c = e.circles.find((x) => x.index === index);
      const graded: ParryCircleState | undefined = c ? { ...c, result } : undefined;
      if (graded) v.circle = graded;
      v.grade = result;
      v.shownMs = 0;
      v.word = graded
        ? resultWord(graded, e.circles, e.notes[index])
        : (GRADE_STYLE[result].word as ParryWord);
    }
  }
}

/** Visible state of an open circle: hidden before it appears; ring scale from ringState (AP-135). */
export function openCircleLook(
  v: CircleView,
  elapsedMs: number,
  rules: ParryRules = PARRY_RULES,
): { shown: boolean; ringScale: number | null } {
  const c = v.circle ?? v;
  if (elapsedMs < circleAppearsAtMs(c, rules)) return { shown: false, ringScale: null };
  // A decoy has no closing ring (brief H-37 2a): it never asks for a tap.
  if (v.circle?.kind === 'decoy') return { shown: true, ringScale: null };
  const ring = ringState(v, elapsedMs, rules);
  return { shown: true, ringScale: ring.visible ? ring.scale : null };
}

interface ImageOpts {
  tint?: ColorName | null;
  scale?: number;
  alpha?: number;
  depth?: number;
}

/**
 * Draws the quicktime circles (Graphics for discs, rings and shapes, sprites for the M9 symbols) plus the words,
 * the drag targets, the beat dots, the choice hint board and "PARRY!" with its motif. The scene calls update()
 * once per frame with the open groups of the boss (it returns the sound cues), finish() at an impact and clear()
 * when the boss dies or the round ends; destroy() in the scene cleanup.
 */
export class ParryOverlay {
  private readonly state = new ParryViewState();
  private readonly gfx: Phaser.GameObjects.Graphics;
  private readonly labels: Phaser.GameObjects.Graphics;
  private readonly burstGfx: Phaser.GameObjects.Graphics;
  private readonly boardGfx: Phaser.GameObjects.Graphics;
  private readonly texts = new Map<string, Phaser.GameObjects.BitmapText>();
  private readonly images = new Map<string, Phaser.GameObjects.Image>();
  private readonly reduced = prefersReducedMotion();
  /** Bottom of the HUD timer (the hint board keeps clear of it), from the same k as the HUD. */
  private readonly timerBottom: number;

  constructor(private readonly scene: Phaser.Scene) {
    this.burstGfx = scene.add.graphics().setDepth(BURST_RING_DEPTH);
    this.boardGfx = scene.add.graphics().setDepth(BOARD_DEPTH);
    this.gfx = scene.add.graphics().setDepth(PARRY_DEPTH);
    this.labels = scene.add.graphics().setDepth(PARRY_DEPTH + 0.2);
    const viewH = scene.game.canvas.getBoundingClientRect().height || window.innerHeight;
    const k = Math.min(HUD_MAX_K, hudScale(viewH));
    this.timerBottom = hudTimerBottom(k, readSafeInsets(scene.registry).top);
  }

  /** The attack of a group hit (BossContext.onParryResolved). */
  finish(outcome: ParryOutcome): void {
    this.state.finish(outcome);
  }

  /** Removes all circles, words and effects at once (boss death, round end). */
  clear(): void {
    this.state.clear();
    this.redraw({ x: 0, y: 0 });
  }

  /** One frame on play time; returns the sound cues (pebble light-up, beat) for the scene to play. */
  update(dtMs: number, groups: readonly ParryGroup[], player: Point): ParryCue[] {
    this.state.advance(dtMs);
    this.state.sync(groups);
    this.redraw(player);
    return this.state.takeCues();
  }

  destroy(): void {
    for (const t of this.texts.values()) t.destroy();
    this.texts.clear();
    for (const i of this.images.values()) i.destroy();
    this.images.clear();
    this.gfx.destroy();
    this.labels.destroy();
    this.burstGfx.destroy();
    this.boardGfx.destroy();
  }

  private redraw(player: Point): void {
    this.gfx.clear();
    this.labels.clear();
    this.burstGfx.clear();
    this.boardGfx.clear();
    const used = new Set<string>();
    for (const e of this.state.entries.values()) {
      this.drawBoard(e, player, used);
      this.drawBeats(e, player);
      for (const v of e.views) this.drawCircle(e, v, player, used);
    }
    this.state.bursts.forEach((ms, i) =>
      this.drawBurst(ms, this.state.burstMotifs[i] ?? null, player, used),
    );
    for (const [key, t] of this.texts) {
      if (used.has(key)) continue;
      t.destroy();
      this.texts.delete(key);
    }
    for (const [key, img] of this.images) {
      if (used.has(key)) continue;
      img.destroy();
      this.images.delete(key);
    }
  }

  private drawCircle(e: Entry, v: CircleView, player: Point, used: Set<string>): void {
    const c = v.circle;
    const drag = e.drags[v.index];
    const home = circleCenter(player, v.angleDeg);
    const cx = Math.round(drag ? drag.x : home.x);
    const cy = Math.round(drag ? drag.y : home.y);
    const key = `${e.id}:${v.index}`;
    if (v.grade === null) this.drawOpen(e, v, c, { x: cx, y: cy }, player, key, used);
    else this.drawGraded(v, c, { x: cx, y: cy }, player, key, used);
  }

  private drawOpen(
    e: Entry,
    v: CircleView,
    c: ParryCircleState | undefined,
    at: Point,
    player: Point,
    key: string,
    used: Set<string>,
  ): void {
    const look = openCircleLook(v, e.elapsedMs);
    if (!look.shown) return;
    const g = this.gfx;
    const { x: cx, y: cy } = at;
    const kind = c?.kind ?? 'tap';
    const now = e.elapsedMs;

    if (kind === 'decoy') {
      // Wavy edge, no glass, no ring (brief H-37 2a).
      this.image(`${key}:edge`, used, DECOY_EDGE_SHEET, DECOY_EDGE_FRAME, cx, cy, {
        tint: 'game.parry-decoy',
      });
      this.symbol(key, used, symbolFrame(c?.symbol), cx, cy, 'game.parry-decoy', v);
      return;
    }

    if (kind === 'drag' && c) this.drawTarget(e, c, at, player, key, used);

    this.disc(cx, cy, 'game.parry-circle', true);
    if (look.ringScale !== null) {
      g.lineStyle(LINE, themeColor('game.parry-approach').num, 1);
      g.strokeCircle(cx, cy, RADIUS * look.ringScale - LINE / 2);
    }

    if (kind === 'hold' && c) {
      const filled = holdFilled(c, now);
      if (filled !== null) this.holdRing(cx, cy, filled);
      const frame = holdSymbolFrame(c.symbol, filled ?? 0, HOLD_SEGMENTS, this.reduced);
      this.symbol(key, used, frame, cx, cy, 'game.parry-symbol', v);
      if (filled !== null && filled >= HOLD_SEGMENTS)
        // "LOS!" stays 2x as long as the ring is full: no pop (brief H-37, mockup 9a).
        this.word(`${key}:w`, used, 'LOS!', v, player, null);
      return;
    }

    if (kind === 'drag' && c && isDragSelected(c, e.drags)) {
      // Selected by tap (replacement): second 1 px ring.
      g.lineStyle(BORDER, themeColor('game.parry-circle').num, 1);
      g.strokeCircle(cx, cy, SELECT_RING_R - BORDER / 2);
    }

    if (kind === 'sequence' && c && flagShown(c, now)) {
      g.fillStyle(themeColor('game.parry-flag').num, 1);
      g.fillRect(cx + FLAG_OFFSET, cy + FLAG_OFFSET, FLAG, FLAG);
      this.text(
        `${key}:f`,
        used,
        String(c.order ?? ''),
        1,
        'hud.screen',
        cx + FLAG_OFFSET + FLAG / 2,
        cy + FLAG_OFFSET + FLAG / 2,
      );
    }
    const lit = c !== undefined && symbolLit(c, now);
    this.symbol(
      key,
      used,
      symbolFrame(c?.symbol),
      cx,
      cy,
      lit ? 'game.parry-hold' : 'game.parry-symbol',
      v,
    );
  }

  private drawGraded(
    v: CircleView,
    c: ParryCircleState | undefined,
    at: Point,
    player: Point,
    key: string,
    used: Set<string>,
  ): void {
    const grade = v.grade;
    if (grade === null) return;
    const { x: cx, y: cy } = at;
    const kind = c?.kind ?? 'tap';
    const word = v.word === undefined ? (GRADE_STYLE[grade].word as ParryWord) : v.word;

    if (kind === 'decoy') {
      if (c?.tapped === true) {
        // Touched: the edge breaks, the symbol goes, "TRUG!" (brief H-37 10a).
        this.image(`${key}:edge`, used, DECOY_EDGE_SHEET, DECOY_BROKEN_FRAME, cx, cy, {
          tint: 'game.parry-miss',
        });
        if (word) this.word(`${key}:w`, used, word, v, player, v.shownMs);
        return;
      }
      // Avoided: fades out silently in motion.base (reduced motion: gone at once).
      const alpha = decoyFade(v.shownMs, this.reduced);
      if (alpha <= 0) return;
      this.image(`${key}:edge`, used, DECOY_EDGE_SHEET, DECOY_EDGE_FRAME, cx, cy, {
        tint: 'game.parry-decoy',
        alpha,
      });
      const f = symbolFrame(c?.symbol);
      if (f !== null)
        this.image(`${key}:s`, used, SYMBOL_SHEET, f, cx, cy, { tint: 'game.parry-decoy', alpha });
      return;
    }
    // The other circles of a choice round go away silently.
    if (word === null) return;

    const g = this.gfx;
    const style = GRADE_STYLE[grade];
    if (grade === 'miss') {
      this.dashedEdge(cx, cy, style.color);
      this.pixels(CROSS_PIXELS, cx, cy, { '#': style.color });
    } else {
      this.disc(cx, cy, style.color, true);
      if (grade === 'perfect' && !this.reduced) {
        g.lineStyle(LINE, themeColor(style.color).num, OPACITY.ghost);
        g.strokeCircle(cx, cy, RADIUS + LINE / 2);
        g.lineStyle(LINE, themeColor(style.color).num, OPACITY.aura);
        g.strokeCircle(cx, cy, RADIUS + LINE * 1.5);
      }
      const asleep = hitFrame(c?.symbol);
      if (asleep !== null && this.hasTexture(SYMBOL_SHEET)) {
        // Beat head: eyes close in the grade colour instead of star or check, a "z" rises.
        this.image(`${key}:s`, used, SYMBOL_SHEET, asleep, cx, cy, { tint: style.color });
        const rise = sleepRise(v.shownMs, this.reduced);
        this.image(
          `${key}:z`,
          used,
          UI_ICONS_M9_SHEET,
          SLEEP_Z_FRAME,
          cx + SLEEP_Z_OFFSET.x,
          cy + SLEEP_Z_OFFSET.y - rise,
          { tint: 'hud.text', scale: Z_SCALE },
        );
      } else if (grade === 'perfect') {
        this.pixels(STAR_PIXELS, cx, cy, { s: style.color, o: 'hud.screen' });
      } else {
        this.pixels(CHECK_PIXELS, cx, cy, { '#': style.color });
      }
    }
    this.word(`${key}:w`, used, word, v, player, v.shownMs);
  }

  /** drag: four L brackets, the target symbol and the dotted link from the circle (brief H-37 5a). */
  private drawTarget(
    e: Entry,
    c: ParryCircleState,
    at: Point,
    player: Point,
    key: string,
    used: Set<string>,
  ): void {
    const t = targetPosition(c, player);
    if (!t) return;
    const tx = Math.round(t.x);
    const ty = Math.round(t.y);
    const selected = isDragSelected(c, e.drags);
    const boxR = targetBoxR(selected ? e.elapsedMs - (c.pressedAtMs ?? 0) : null, this.reduced);
    const g = this.gfx;
    g.fillStyle(themeColor('game.parry-link').num, 1);
    for (const d of linkDots(at, { x: tx, y: ty }, boxR)) g.fillRect(d.x - 1, d.y - 1, 2, 2);
    g.fillStyle(themeColor('game.parry-target').num, 1);
    for (const [x, y, w, h] of bracketRects(tx, ty, Math.round(boxR), undefined, LINE))
      g.fillRect(x, y, w, h);
    const f = targetFrame(c.kind, c.symbol);
    if (f !== null)
      this.image(`${key}:t`, used, SYMBOL_SHEET, f, tx, ty, { tint: 'game.parry-target' });
  }

  /** hold: inner ring with 8 steps clockwise from the top, filled steps in game.parry-hold. */
  private holdRing(cx: number, cy: number, filled: number): void {
    const g = this.gfx;
    for (let i = 0; i < HOLD_SEGMENTS; i++) {
      const arc = holdSegmentArc(i);
      g.lineStyle(
        LINE,
        themeColor(i < filled ? 'game.parry-hold' : 'game.parry-hold-track').num,
        1,
      );
      g.beginPath();
      g.arc(cx, cy, THEME.sizePx['size.parry-hold-r'] - LINE / 2, arc.start, arc.end);
      g.strokePath();
    }
  }

  /** beat: three dots under the astronaut, filled from each beat on, regardless of the hits (brief H-37 7a). */
  private drawBeats(e: Entry, player: Point): void {
    if (e.finished) return;
    const beats = e.circles.filter((c) => c.kind === 'beat');
    if (beats.length === 0) return;
    const done = beatsDone(beats, e.elapsedMs);
    const g = this.gfx;
    const frame = themeColor('game.parry-beat').num;
    const screen = themeColor('hud.screen').num;
    beatDotRects(player, beats.length).forEach((r, i) => {
      if (i < done) g.fillStyle(frame, 1).fillRect(r.x, r.y, BEAT_DOT, BEAT_DOT);
      else g.fillStyle(screen, OPACITY.ghost).fillRect(r.x, r.y, BEAT_DOT, BEAT_DOT);
      g.lineStyle(BORDER, frame, 1).strokeRect(
        r.x + BORDER / 2,
        r.y + BORDER / 2,
        BEAT_DOT - BORDER,
        BEAT_DOT - BORDER,
      );
    });
  }

  /** choice: hint board above the astronaut from the start of the announcement until the last choice grade. */
  private drawBoard(e: Entry, player: Point, used: Set<string>): void {
    if (e.finished) return;
    if (!e.circles.some((c) => c.kind === 'choice' && c.result === null)) return;
    const content = hintContent(e.circles);
    if (!content || !this.hasTexture(content.sheet)) return;
    const size = hintBoardSize(content.sheet);
    const box = hintBoardRect(player, size, this.timerBottom, this.scene.scale.width);
    const b = this.boardGfx;
    const glass = themeColor('hud.glass');
    b.fillStyle(glass.num, glass.alpha ?? 1).fillRect(box.x, box.y, box.w, box.h);
    b.lineStyle(BORDER, themeColor('hud.line').num, 1);
    b.strokeRect(box.x + BORDER / 2, box.y + BORDER / 2, box.w - BORDER, box.h - BORDER);
    const frame =
      content.sheet === SCALE_SHEET ? scaleFrame(e.elapsedMs, this.reduced) : content.frame;
    this.image(`${e.id}:hint`, used, content.sheet, frame, box.x + box.w / 2, box.y + box.h / 2, {
      tint: 'hud.text',
      scale: HINT_SCALE,
      depth: BOARD_DEPTH + 0.1,
    });
  }

  private drawBurst(ms: number, motif: number | null, player: Point, used: Set<string>): void {
    const color = themeColor('game.parry-burst').num;
    const r = burstRadius(ms, this.reduced);
    const b = this.burstGfx;
    b.fillStyle(color, BURST_FILL_ALPHA).fillCircle(player.x, player.y, r);
    b.lineStyle(LINE, color, 1).strokeCircle(player.x, player.y, r - LINE / 2);
    const pop = !this.reduced && ms < POP_MS ? 1 : 0;
    const scale = PARRY_SCALE + pop;
    const withMotif = motif !== null && this.hasTexture(MOTIF_SHEET);
    const extra = withMotif ? MOTIF_PX + MOTIF_GAP : 0;
    const base = this.labelSize('PARRY!', scale, PARRY_PAD);
    const size = { w: base.w + extra, h: Math.max(base.h, MOTIF_PX + 2 * (PARRY_PAD.y + BORDER)) };
    const at = clampBox({ x: player.x, y: player.y - PARRY_LABEL_RISE }, size, this.scene.scale);
    this.labelBox(at, size, 'game.parry-burst');
    const left = Math.round(at.x - size.w / 2) + BORDER + PARRY_PAD.x;
    if (withMotif && motif !== null) {
      this.image('parry:motif', used, MOTIF_SHEET, motif, left + MOTIF_PX / 2, Math.round(at.y), {
        tint: null,
        depth: PARRY_DEPTH + 0.3,
      });
    }
    const textW = measureFunk(this.scene, 'PARRY!', scale);
    this.text(
      'parry',
      used,
      'PARRY!',
      scale,
      'hud.text',
      left + extra + textW / 2,
      at.y,
      PARRY_DEPTH + 0.3,
    );
  }

  /** Symbol sprite on a circle, or the number (M7) if it has no symbol or the sheet is missing. */
  private symbol(
    key: string,
    used: Set<string>,
    frame: number | null,
    cx: number,
    cy: number,
    tint: ColorName,
    v: CircleView,
  ): void {
    if (frame !== null && this.hasTexture(SYMBOL_SHEET)) {
      this.image(`${key}:s`, used, SYMBOL_SHEET, frame, cx, cy, { tint });
      return;
    }
    this.text(`${key}:n`, used, String(v.index + 1), NUMBER_SCALE, 'game.parry-circle', cx, cy);
  }

  /** Word label radially outside the circle (H-33), in its colour; pops unless motion is reduced. */
  private word(
    key: string,
    used: Set<string>,
    word: ParryWord,
    v: CircleView,
    player: Point,
    shownMs: number | null,
  ): void {
    const color = WORD_COLOR[word];
    const scale = wordScale(shownMs, this.reduced);
    const size = this.labelSize(word, scale, WORD_PAD);
    const at = wordCenter(player, v.angleDeg, size, this.scene.scale);
    this.label(key, used, word, scale, color, color, at, size);
  }

  /** Glass disc with a 2 px edge whose outer side lies on the radius. */
  private disc(cx: number, cy: number, edge: ColorName, filled: boolean): void {
    const g = this.gfx;
    if (filled) {
      const fill = themeColor('game.parry-fill');
      g.fillStyle(fill.num, fill.alpha ?? 1).fillCircle(cx, cy, RADIUS);
    }
    g.lineStyle(LINE, themeColor(edge).num, 1).strokeCircle(cx, cy, RADIUS - LINE / 2);
  }

  /** "Missed": dashed edge, no fill. */
  private dashedEdge(cx: number, cy: number, color: ColorName): void {
    const g = this.gfx;
    const step = (Math.PI * 2) / MISS_DASHES;
    g.lineStyle(LINE, themeColor(color).num, 1);
    for (let i = 0; i < MISS_DASHES; i++) {
      g.beginPath();
      g.arc(cx, cy, RADIUS - LINE / 2, i * step, i * step + step / 2);
      g.strokePath();
    }
  }

  /** Pixel shape (rows of characters) centred on (cx, cy) at ICON_SCALE, one colour per character. */
  private pixels(
    rows: readonly string[],
    cx: number,
    cy: number,
    colors: Record<string, ColorName>,
  ): void {
    const g = this.gfx;
    const w = rows[0].length * ICON_SCALE;
    const h = rows.length * ICON_SCALE;
    const x0 = Math.round(cx - w / 2);
    const y0 = Math.round(cy - h / 2);
    rows.forEach((row, y) => {
      [...row].forEach((ch, x) => {
        const name = colors[ch];
        if (!name) return;
        g.fillStyle(themeColor(name).num, 1);
        g.fillRect(x0 + x * ICON_SCALE, y0 + y * ICON_SCALE, ICON_SCALE, ICON_SCALE);
      });
    });
  }

  private labelSize(text: string, scale: number, pad: { x: number; y: number }) {
    return {
      w: measureFunk(this.scene, text, scale) + 2 * (pad.x + BORDER),
      h: FUNK_GLYPH_H * scale + 2 * (pad.y + BORDER),
    };
  }

  /** Glass box (hud.glass, 1 px frame). */
  private labelBox(at: Point, size: { w: number; h: number }, frame: ColorName): void {
    const l = this.labels;
    const glass = themeColor('hud.glass');
    const x = Math.round(at.x - size.w / 2);
    const y = Math.round(at.y - size.h / 2);
    l.fillStyle(glass.num, glass.alpha ?? 1).fillRect(x, y, size.w, size.h);
    l.lineStyle(BORDER, themeColor(frame).num, 1);
    l.strokeRect(x + BORDER / 2, y + BORDER / 2, size.w - BORDER, size.h - BORDER);
  }

  /** Glass label (hud.glass, 1 px frame) with a centred Funk text. */
  private label(
    key: string,
    used: Set<string>,
    text: string,
    scale: number,
    textColor: ColorName,
    frame: ColorName,
    at: Point,
    size: { w: number; h: number },
  ): void {
    this.labelBox(at, size, frame);
    const x = Math.round(at.x - size.w / 2);
    const y = Math.round(at.y - size.h / 2);
    this.text(key, used, text, scale, textColor, x + size.w / 2, y + size.h / 2, PARRY_DEPTH + 0.3);
  }

  private hasTexture(sheet: string): boolean {
    return this.scene.textures?.exists(sheet) === true;
  }

  /** Keeps one sprite per key alive while it is drawn, centred on (x, y) on whole pixels; unused ones go. */
  private image(
    key: string,
    used: Set<string>,
    sheet: string,
    frame: number,
    x: number,
    y: number,
    opts: ImageOpts = {},
  ): void {
    if (!this.hasTexture(sheet)) return;
    used.add(key);
    let img = this.images.get(key);
    if (!img) {
      img = this.scene.add.image(0, 0, sheet, frame).setOrigin(0, 0);
      this.images.set(key, img);
    }
    if (img.texture.key !== sheet) img.setTexture(sheet, frame);
    else img.setFrame(frame);
    const scale = opts.scale ?? 1;
    img.setScale(scale);
    img.setDepth(opts.depth ?? SPRITE_DEPTH);
    img.setAlpha(opts.alpha ?? 1);
    if (opts.tint) img.setTint(themeColor(opts.tint).num);
    else img.clearTint();
    img.setPosition(
      Math.round(x - (img.width * scale) / 2),
      Math.round(y - (img.height * scale) / 2),
    );
  }

  /** Keeps one bitmap text per key alive while it is drawn; unused ones are removed in redraw. */
  private text(
    key: string,
    used: Set<string>,
    text: string,
    scale: number,
    color: ColorName,
    x: number,
    y: number,
    depth = PARRY_DEPTH + 0.1,
  ): void {
    used.add(key);
    let t = this.texts.get(key);
    if (!t) {
      t = this.scene.add.bitmapText(0, 0, FUNK_FONT, '', FUNK_GLYPH_H * scale);
      t.setDepth(depth);
      this.texts.set(key, t);
    }
    t.setText(funkCase(text));
    t.setFontSize(FUNK_GLYPH_H * scale);
    t.setTint(themeColor(color).num);
    // Whole pixels for the pixel font: centre via the top left corner.
    t.setPosition(Math.round(x - t.width / 2), Math.round(y - t.height / 2));
  }
}

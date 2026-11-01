import Phaser from 'phaser';
import { PARRY_RULES } from '../config/parry';
import { OPACITY, THEME, themeColor, type ColorName } from '../config/theme';
import type { ParryGrade, ParryRules } from '../contracts';
import { ringState } from '../logic/parry';
import { prefersReducedMotion } from '../platform/motion';
import { FUNK_FONT, FUNK_GLYPH_H, measureFunk } from '../scenes/hud/FunkPanel';
import { funkCase } from '../scenes/hud/hudMath';
import { circleAppearsAtMs, type ParryGroup, type ParryOutcome } from './bosses/hazards';

// Quicktime circles around the astronaut (AP-133, design brief H-33 "Quicktime-Kreis", mockup
// m7-quicktime-und-stufen.html views 1-3b). World object: does not scale with the HUD factor k.

/** Over enemies, boss projectiles (2) and the player (10), under the stick (50) and the HUD scene. */
export const PARRY_DEPTH = 20;
/** The shield ring of "PARRY!" lies under the astronaut, like in the mockup. */
const BURST_RING_DEPTH = 9.5;

const RADIUS = THEME.sizePx['size.parry-radius'];
const LINE = THEME.sizePx['size.parry-line'];
const BORDER = THEME.borderPx['border.hud'];
const FEEDBACK_MS = THEME.motionMs['motion.parry-feedback'];
const BURST_MS = THEME.motionMs['motion.parry-burst'];
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

/** One circle as the overlay shows it. */
export interface CircleView {
  index: number;
  angleDeg: number;
  hitAtMs: number;
  grade: ParryGrade | null;
  /** Time since the grade (feedback runs FEEDBACK_MS, then circle and word disappear). */
  shownMs: number;
}

interface Entry {
  id: number;
  elapsedMs: number;
  /** The attack hit: the boss no longer lists the group, the overlay finishes the feedback alone. */
  finished: boolean;
  views: CircleView[];
}

/**
 * Display state of all groups (no Phaser): which circles are open, which show a grade and for how long, and
 * the "PARRY!" effect. Runs on play time (advance), so it stands still while paused.
 */
export class ParryViewState {
  readonly entries = new Map<number, Entry>();
  /** Running "PARRY!" effects (ms since start). */
  bursts: number[] = [];

  /** Takes over the open groups of the bosses. Groups that vanished without an impact (boss gone) go away. */
  sync(groups: readonly ParryGroup[]): void {
    const seen = new Set<number>();
    for (const g of groups) {
      seen.add(g.id);
      let e = this.entries.get(g.id);
      if (!e) {
        e = { id: g.id, elapsedMs: 0, finished: false, views: [] };
        e.views = g.circles.map((c) => ({
          index: c.index,
          angleDeg: c.angleDeg,
          hitAtMs: c.hitAtMs,
          grade: null,
          shownMs: 0,
        }));
        this.entries.set(g.id, e);
      }
      e.elapsedMs = g.elapsedMs;
      for (const c of g.circles) this.grade(e, c.index, c.result);
    }
    for (const [id, e] of this.entries) if (!e.finished && !seen.has(id)) this.entries.delete(id);
  }

  /** The attack of a group hit: final grades (open circles = missed); `blocked` starts "PARRY!". */
  finish(outcome: ParryOutcome): void {
    const g = outcome.group;
    const e: Entry = this.entries.get(g.id) ?? {
      id: g.id,
      elapsedMs: g.elapsedMs,
      finished: true,
      views: g.circles.map((c) => ({
        index: c.index,
        angleDeg: c.angleDeg,
        hitAtMs: c.hitAtMs,
        grade: null,
        shownMs: 0,
      })),
    };
    e.finished = true;
    e.elapsedMs = g.elapsedMs;
    for (const c of g.circles) this.grade(e, c.index, c.result ?? 'miss');
    this.entries.set(g.id, e);
    if (outcome.blocked) this.bursts.push(0);
  }

  /** Ages grades and effects; removes what has run out. */
  advance(dtMs: number): void {
    if (!Number.isFinite(dtMs) || dtMs <= 0) return;
    for (const [id, e] of this.entries) {
      for (const v of e.views) if (v.grade !== null) v.shownMs += dtMs;
      e.views = e.views.filter((v) => v.grade === null || v.shownMs < FEEDBACK_MS);
      if (e.finished && e.views.length === 0) this.entries.delete(id);
    }
    this.bursts = this.bursts.map((ms) => ms + dtMs).filter((ms) => ms < BURST_MS);
  }

  clear(): void {
    this.entries.clear();
    this.bursts = [];
  }

  get isEmpty(): boolean {
    return this.entries.size === 0 && this.bursts.length === 0;
  }

  private grade(e: Entry, index: number, result: ParryGrade | null): void {
    if (result === null) return;
    const v = e.views.find((x) => x.index === index);
    if (v && v.grade === null) {
      v.grade = result;
      v.shownMs = 0;
    }
  }
}

/** Visible state of an open circle: hidden before it appears; ring scale from ringState (AP-135). */
export function openCircleLook(
  v: CircleView,
  elapsedMs: number,
  rules: ParryRules = PARRY_RULES,
): { shown: boolean; ringScale: number | null } {
  if (elapsedMs < circleAppearsAtMs(v, rules)) return { shown: false, ringScale: null };
  const ring = ringState(v, elapsedMs, rules);
  return { shown: true, ringScale: ring.visible ? ring.scale : null };
}

/**
 * Draws the quicktime circles (Graphics rectangles and arcs, no sprites) plus the grade words and "PARRY!".
 * The scene calls update() once per frame with the open groups of the boss, finish() at an impact and
 * clear() when the boss dies or the round ends; destroy() in the scene cleanup.
 */
export class ParryOverlay {
  private readonly state = new ParryViewState();
  private readonly gfx: Phaser.GameObjects.Graphics;
  private readonly labels: Phaser.GameObjects.Graphics;
  private readonly burstGfx: Phaser.GameObjects.Graphics;
  private readonly texts = new Map<string, Phaser.GameObjects.BitmapText>();
  private readonly reduced = prefersReducedMotion();

  constructor(private readonly scene: Phaser.Scene) {
    this.burstGfx = scene.add.graphics().setDepth(BURST_RING_DEPTH);
    this.gfx = scene.add.graphics().setDepth(PARRY_DEPTH);
    this.labels = scene.add.graphics().setDepth(PARRY_DEPTH + 0.2);
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

  update(dtMs: number, groups: readonly ParryGroup[], player: Point): void {
    this.state.advance(dtMs);
    this.state.sync(groups);
    this.redraw(player);
  }

  destroy(): void {
    for (const t of this.texts.values()) t.destroy();
    this.texts.clear();
    this.gfx.destroy();
    this.labels.destroy();
    this.burstGfx.destroy();
  }

  private redraw(player: Point): void {
    const g = this.gfx;
    g.clear();
    this.labels.clear();
    this.burstGfx.clear();
    const used = new Set<string>();
    for (const e of this.state.entries.values()) {
      for (const v of e.views) this.drawCircle(e, v, player, used);
    }
    for (const ms of this.state.bursts) this.drawBurst(ms, player, used);
    for (const [key, t] of this.texts) {
      if (used.has(key)) continue;
      t.destroy();
      this.texts.delete(key);
    }
  }

  private drawCircle(e: Entry, v: CircleView, player: Point, used: Set<string>): void {
    const g = this.gfx;
    const c = circleCenter(player, v.angleDeg);
    const cx = Math.round(c.x);
    const cy = Math.round(c.y);
    const key = `${e.id}:${v.index}`;
    if (v.grade === null) {
      const look = openCircleLook(v, e.elapsedMs);
      if (!look.shown) return;
      this.disc(cx, cy, 'game.parry-circle', true);
      if (look.ringScale !== null) {
        g.lineStyle(LINE, themeColor('game.parry-approach').num, 1);
        g.strokeCircle(cx, cy, RADIUS * look.ringScale - LINE / 2);
      }
      this.text(`${key}:n`, used, String(v.index + 1), NUMBER_SCALE, 'game.parry-circle', cx, cy);
      return;
    }
    const style = GRADE_STYLE[v.grade];
    if (v.grade === 'miss') {
      this.dashedEdge(cx, cy, style.color);
      this.pixels(CROSS_PIXELS, cx, cy, { '#': style.color });
    } else {
      this.disc(cx, cy, style.color, true);
      if (v.grade === 'perfect') {
        if (!this.reduced) {
          g.lineStyle(LINE, themeColor(style.color).num, OPACITY.ghost);
          g.strokeCircle(cx, cy, RADIUS + LINE / 2);
          g.lineStyle(LINE, themeColor(style.color).num, OPACITY.aura);
          g.strokeCircle(cx, cy, RADIUS + LINE * 1.5);
        }
        this.pixels(STAR_PIXELS, cx, cy, { s: style.color, o: 'hud.screen' });
      } else {
        this.pixels(CHECK_PIXELS, cx, cy, { '#': style.color });
      }
    }
    const pop = !this.reduced && v.shownMs < POP_MS ? 1 : 0;
    const scale = WORD_SCALE + pop;
    const size = this.labelSize(style.word, scale, WORD_PAD);
    const at = wordCenter(player, v.angleDeg, size, this.scene.scale);
    this.label(`${key}:w`, used, style.word, scale, style.color, style.color, at, size);
  }

  private drawBurst(ms: number, player: Point, used: Set<string>): void {
    const color = themeColor('game.parry-burst').num;
    const r = burstRadius(ms, this.reduced);
    const b = this.burstGfx;
    b.fillStyle(color, BURST_FILL_ALPHA).fillCircle(player.x, player.y, r);
    b.lineStyle(LINE, color, 1).strokeCircle(player.x, player.y, r - LINE / 2);
    const pop = !this.reduced && ms < POP_MS ? 1 : 0;
    const scale = PARRY_SCALE + pop;
    const size = this.labelSize('PARRY!', scale, PARRY_PAD);
    const at = clampBox({ x: player.x, y: player.y - PARRY_LABEL_RISE }, size, this.scene.scale);
    this.label('parry', used, 'PARRY!', scale, 'hud.text', 'game.parry-burst', at, size);
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
    const l = this.labels;
    const glass = themeColor('hud.glass');
    const x = Math.round(at.x - size.w / 2);
    const y = Math.round(at.y - size.h / 2);
    l.fillStyle(glass.num, glass.alpha ?? 1).fillRect(x, y, size.w, size.h);
    l.lineStyle(BORDER, themeColor(frame).num, 1);
    l.strokeRect(x + BORDER / 2, y + BORDER / 2, size.w - BORDER, size.h - BORDER);
    this.text(key, used, text, scale, textColor, x + size.w / 2, y + size.h / 2, PARRY_DEPTH + 0.3);
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

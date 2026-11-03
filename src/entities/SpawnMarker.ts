import Phaser from 'phaser';
import { THEME, themeColor } from '../config/theme';
import type { SafeInsets, SpawnEventKind } from '../contracts';
import { FUNK_FONT, FUNK_GLYPH_H, measureFunk } from '../scenes/hud/FunkPanel';
import { funkCase } from '../scenes/hud/hudMath';

// Edge markers of the spawn events (AP-177, brief H-43 decision 4a, table "Rand-Marker", mockup
// m11-m12-fokus-und-wellen.html views 4 to 7). Swarm: wedge sprite at the edge in the direction of the group, ring:
// dots along the whole marker frame, pincer: double arrow on both opposite edges. Word in Funk 1x with 3 pips below.
// No blinking, no pulsing, no flash: the marker slides 4 px inward in 3 steps and then stands still (at once with
// reduced motion); it goes with the spawn. The layout functions are pure (no Phaser objects).

/** Sprite sheet of the swarm and pincer markers, drawn for the top edge (pointing down = inward). */
export const MARKER_SHEET = 'event-markers';
export const MARKER_FRAME: Readonly<Record<'swarm' | 'pincer', number>> = { swarm: 0, pincer: 1 };
/** Words of the markers (brief H-43). */
export const MARKER_WORD: Readonly<Record<SpawnEventKind, string>> = {
  swarm: 'SCHWARM',
  ring: 'RING',
  pincer: 'ZANGE',
};
/** Rank 0 (brief H-41): over enemies and the quicktime circles (20), under the stick (50) and the HUD scene. */
export const MARKER_DEPTH = 40;
/** Number of pips under the word; one goes out per third of `announceMs`. */
export const PIP_COUNT = 3;
/** Word 1x (brief H-43: Funk 1x). */
const WORD_SCALE = 1;
/** Steps of the slide (brief: `event-slide` in 3 steps, motion.pixel). */
const SLIDE_STEPS = 3;
/** Ring word: centre 14 px under the top of the marker frame (brief H-43 table). */
export const RING_WORD_DROP = 14;

const INSET = THEME.sizePx['size.event-inset'];
const TOP = THEME.sizePx['size.event-top'];
const BOTTOM = THEME.sizePx['size.event-bottom'];
const CORNER = THEME.sizePx['size.event-corner'];
const WEDGE = THEME.sizePx['size.event-wedge'];
const DOT = THEME.sizePx['size.event-dot'];
const WORD_GAP = THEME.sizePx['size.event-word-gap'];
const PIP = THEME.sizePx['size.event-pip'];
const SLIDE = THEME.sizePx['size.event-slide'];
const SLIDE_MS = THEME.motionMs['motion.event-slide'];
const BORDER = THEME.borderPx['border.hud'];
/** Dot pitch of the ring marker: a 2 px dot every 6 px (brief H-43). */
const DOT_PITCH = 6;
/** Glass tag from the mockup (.tag: padding 3/4/2 px, 2 px gap, pips 2 px high, 2 px apart). */
const TAG_PAD = { x: 4, top: 3, bottom: 2 } as const;
const TAG_GAP = 2;
const PIP_H = 2;
const PIP_GAP = 2;

/** Marker frame in arena px: the line the markers sit on, always inside the safe area (PE-140). */
export interface MarkerFrame {
  left: number;
  right: number;
  top: number;
  bottom: number;
}

export type Edge = 'top' | 'right' | 'bottom' | 'left';

/** Rotation of the top-edge sprite per edge, 90 degree steps only (crisp pixels). */
export const EDGE_ROTATION: Readonly<Record<Edge, number>> = {
  top: 0,
  right: 90,
  bottom: 180,
  left: 270,
};
/** Inward direction per edge. */
const INWARD: Readonly<Record<Edge, { x: number; y: number }>> = {
  top: { x: 0, y: 1 },
  right: { x: -1, y: 0 },
  bottom: { x: 0, y: -1 },
  left: { x: 1, y: 0 },
};

/** Marker frame from `event-top/bottom/inset` inside the safe insets of the arena. */
export function markerFrame(width: number, height: number, insets: SafeInsets): MarkerFrame {
  return {
    left: Math.round(insets.left + INSET),
    right: Math.round(width - insets.right - INSET),
    top: Math.round(insets.top + TOP),
    bottom: Math.round(height - insets.bottom - BOTTOM),
  };
}

/**
 * Where the ray from the centre in direction `angle` (rad) meets the marker frame, kept `event-corner` away from the
 * corners (brief H-43: a swarm up right sits on the top edge where its centre ray crosses the frame).
 */
export function edgePoint(
  frame: MarkerFrame,
  cx: number,
  cy: number,
  angle: number,
): { x: number; y: number; edge: Edge } {
  const dx = Math.cos(angle);
  const dy = Math.sin(angle);
  const tx =
    Math.abs(dx) < 1e-9
      ? Number.POSITIVE_INFINITY
      : ((dx > 0 ? frame.right : frame.left) - cx) / dx;
  const ty =
    Math.abs(dy) < 1e-9
      ? Number.POSITIVE_INFINITY
      : ((dy > 0 ? frame.bottom : frame.top) - cy) / dy;
  const t = Math.min(tx, ty);
  const edge: Edge = tx <= ty ? (dx > 0 ? 'right' : 'left') : dy > 0 ? 'bottom' : 'top';
  const clampX = (x: number): number =>
    Math.min(Math.max(x, frame.left + CORNER), frame.right - CORNER);
  const clampY = (y: number): number =>
    Math.min(Math.max(y, frame.top + CORNER), frame.bottom - CORNER);
  const x = cx + dx * t;
  const y = cy + dy * t;
  if (edge === 'left') return { x: frame.left, y: Math.round(clampY(y)), edge };
  if (edge === 'right') return { x: frame.right, y: Math.round(clampY(y)), edge };
  if (edge === 'top') return { x: Math.round(clampX(x)), y: frame.top, edge };
  return { x: Math.round(clampX(x)), y: frame.bottom, edge };
}

/** Px the marker still has to slide inward after `elapsedMs` (4, 3, 1, 0 in 3 steps); 0 at once with reduced motion. */
export function slideLeft(elapsedMs: number, reducedMotion: boolean): number {
  if (reducedMotion || !(elapsedMs < SLIDE_MS)) return 0;
  const step = Math.max(0, Math.floor((elapsedMs / SLIDE_MS) * SLIDE_STEPS));
  return Math.round(SLIDE * (1 - step / SLIDE_STEPS));
}

/** Pips still lit after `elapsedMs` of `announceMs` (3, 2, 1, then 0 at the spawn). */
export function pipsLeft(elapsedMs: number, announceMs: number): number {
  if (!(announceMs > 0)) return 0;
  const gone = Math.floor((Math.max(0, elapsedMs) / announceMs) * PIP_COUNT);
  return Math.max(0, Math.min(PIP_COUNT, PIP_COUNT - gone));
}

/** Size of the glass tag for a word width (px). */
export function tagSize(wordW: number): { w: number; h: number } {
  return {
    w: wordW + 2 * (TAG_PAD.x + BORDER),
    h: TAG_PAD.top + FUNK_GLYPH_H * WORD_SCALE + TAG_GAP + PIP_H + TAG_PAD.bottom + 2 * BORDER,
  };
}

/** Sprite centre, rotation and tag centre of one swarm or pincer marker. */
export interface MarkerPlace {
  x: number;
  y: number;
  rotation: number;
  tagX: number;
  tagY: number;
}

/**
 * Layout of one edge marker: the sprite's outer side lies on the frame (after the slide), the tag lies
 * `event-word-gap` further inward. The tag stays inside the frame.
 */
export function markerPlace(
  frame: MarkerFrame,
  cx: number,
  cy: number,
  angle: number,
  slide: number,
  tag: { w: number; h: number },
): MarkerPlace {
  const p = edgePoint(frame, cx, cy, angle);
  const inward = INWARD[p.edge];
  const half = WEDGE / 2;
  const x = p.x + inward.x * (half - slide);
  const y = p.y + inward.y * (half - slide);
  const tagX = x + inward.x * (half + WORD_GAP + tag.w / 2);
  const tagY = y + inward.y * (half + WORD_GAP + tag.h / 2);
  return {
    x,
    y,
    rotation: EDGE_ROTATION[p.edge],
    tagX: Math.min(Math.max(tagX, frame.left + tag.w / 2), frame.right - tag.w / 2),
    tagY: Math.min(Math.max(tagY, frame.top + tag.h / 2), frame.bottom - tag.h / 2),
  };
}

/** Top left corners of the ring dots (2x2 every 6 px) along the whole marker frame. */
export function ringDots(frame: MarkerFrame): { x: number; y: number }[] {
  const out: { x: number; y: number }[] = [];
  for (let x = frame.left; x + DOT <= frame.right; x += DOT_PITCH) {
    out.push({ x, y: frame.top }, { x, y: frame.bottom - DOT });
  }
  for (let y = frame.top + DOT_PITCH; y + DOT <= frame.bottom - DOT_PITCH; y += DOT_PITCH) {
    out.push({ x: frame.left, y }, { x: frame.right - DOT, y });
  }
  return out;
}

/** What a marker needs from the announcement of the spawn director. */
export interface MarkerSpec {
  eventId: number;
  kind: SpawnEventKind;
  angles: readonly number[];
  announceMs: number;
}

interface Part {
  angle: number;
  sprite?: Phaser.GameObjects.Image;
  text: Phaser.GameObjects.BitmapText;
}

/**
 * One edge marker of one event. Runs on play time (stands still while paused), redraws only when the slide or the
 * pips change. `destroy()` at the spawn, at the boss phase and at the end of the round.
 */
export class SpawnMarker {
  readonly eventId: number;
  private elapsedMs = 0;
  private lastSlide = -1;
  private lastPips = -1;
  private readonly parts: Part[] = [];
  private readonly tags: Phaser.GameObjects.Graphics;
  private dots?: Phaser.GameObjects.Graphics;
  private readonly tag: { w: number; h: number };

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly spec: MarkerSpec,
    private readonly frame: MarkerFrame,
    private readonly center: { x: number; y: number },
    private readonly reducedMotion: boolean,
  ) {
    this.eventId = spec.eventId;
    const word = MARKER_WORD[spec.kind];
    this.tag = tagSize(measureFunk(scene, word, WORD_SCALE));
    this.tags = scene.add.graphics().setDepth(MARKER_DEPTH);
    if (spec.kind === 'ring') {
      this.dots = scene.add.graphics().setDepth(MARKER_DEPTH);
      this.drawDots(this.dots);
      this.parts.push({ angle: 0, text: this.word(word) });
    } else {
      const sheet = scene.textures?.exists(MARKER_SHEET) === true;
      for (const angle of spec.angles) {
        const sprite = sheet
          ? scene.add
              .image(0, 0, MARKER_SHEET, MARKER_FRAME[spec.kind])
              .setDepth(MARKER_DEPTH)
              .setTint(themeColor('game.event-marker').num)
          : undefined;
        this.parts.push({ angle, sprite, text: this.word(word) });
      }
    }
    this.update(0);
  }

  /** Advances the marker by `dt` ms of play time. */
  update(dt: number): void {
    if (Number.isFinite(dt) && dt > 0) this.elapsedMs += dt;
    const slide = this.spec.kind === 'ring' ? 0 : slideLeft(this.elapsedMs, this.reducedMotion);
    const pips = pipsLeft(this.elapsedMs, this.spec.announceMs);
    if (slide === this.lastSlide && pips === this.lastPips) return;
    this.lastSlide = slide;
    this.lastPips = pips;
    this.tags.clear();
    for (const part of this.parts) {
      let tx: number;
      let ty: number;
      if (this.spec.kind === 'ring') {
        tx = this.center.x;
        ty = this.frame.top + RING_WORD_DROP;
      } else {
        const p = markerPlace(
          this.frame,
          this.center.x,
          this.center.y,
          part.angle,
          slide,
          this.tag,
        );
        part.sprite?.setPosition(p.x, p.y).setAngle(p.rotation);
        tx = p.tagX;
        ty = p.tagY;
      }
      this.drawTag(tx, ty, pips, part.text);
    }
  }

  destroy(): void {
    for (const part of this.parts) {
      part.sprite?.destroy();
      part.text.destroy();
    }
    this.parts.length = 0;
    this.tags.destroy();
    this.dots?.destroy();
    this.dots = undefined;
  }

  private word(word: string): Phaser.GameObjects.BitmapText {
    return this.scene.add
      .bitmapText(0, 0, FUNK_FONT, funkCase(word), FUNK_GLYPH_H * WORD_SCALE)
      .setDepth(MARKER_DEPTH + 0.1)
      .setTint(themeColor('game.event-marker').num);
  }

  /** Glass tag (hud.glass, 1 px `event-marker` frame, ink outline outside), word and pips. */
  private drawTag(cx: number, cy: number, pips: number, text: Phaser.GameObjects.BitmapText): void {
    const g = this.tags;
    const { w, h } = this.tag;
    const x = Math.round(cx - w / 2);
    const y = Math.round(cy - h / 2);
    const glass = themeColor('hud.glass');
    g.lineStyle(BORDER, themeColor('game.event-marker-edge').num, 1);
    g.strokeRect(x - BORDER / 2, y - BORDER / 2, w + BORDER, h + BORDER);
    g.fillStyle(glass.num, glass.alpha ?? 1).fillRect(x, y, w, h);
    g.lineStyle(BORDER, themeColor('game.event-marker').num, 1);
    g.strokeRect(x + BORDER / 2, y + BORDER / 2, w - BORDER, h - BORDER);
    const wordY = y + BORDER + TAG_PAD.top;
    text.setPosition(Math.round(x + w / 2 - text.width / 2), wordY);
    const rowW = PIP_COUNT * PIP + (PIP_COUNT - 1) * PIP_GAP;
    const px = Math.round(x + w / 2 - rowW / 2);
    const py = wordY + FUNK_GLYPH_H * WORD_SCALE + TAG_GAP;
    for (let i = 0; i < PIP_COUNT; i++) {
      // A pip that went out shows as an ink slot: no flash, nothing appears.
      const color = i < pips ? 'game.event-pip' : 'game.event-marker-edge';
      g.fillStyle(themeColor(color).num, 1).fillRect(px + i * (PIP + PIP_GAP), py, PIP, PIP_H);
    }
  }

  /** Ring: 2x2 dots with an ink edge along the whole frame, drawn once. */
  private drawDots(g: Phaser.GameObjects.Graphics): void {
    const edge = themeColor('game.event-marker-edge').num;
    const dot = themeColor('game.event-marker').num;
    const dots = ringDots(this.frame);
    g.fillStyle(edge, 1);
    for (const d of dots)
      g.fillRect(d.x - BORDER, d.y - BORDER, DOT + 2 * BORDER, DOT + 2 * BORDER);
    g.fillStyle(dot, 1);
    for (const d of dots) g.fillRect(d.x, d.y, DOT, DOT);
  }
}

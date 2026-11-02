// Screen blocks of the finisher (AP-160, brief H-39): letterbox, bgColor, speedlines, the beam,
// flash and impactFrame. Graphics, rectangles and canvas textures only, so all of it works without WebGL.
import type Phaser from 'phaser';
import type { FinisherStep } from '../../contracts';
import { THEME, themeColor, type ColorName } from '../../config/theme';
import { DEPTH, type BlockEffect, type FinisherContext } from './context';
import {
  BAR_H,
  beamBands,
  beamSpan,
  speedlineWedges,
  tokenColor,
  type Point,
  type Rect,
} from './layout';
import { beamProgress, hitImageAt, impactPhase, letterboxVisible } from './timing';

const SPEEDLINES = THEME.sizeCount['size.finisher-speedlines'];
/** Extra size of shaken full-screen fills, so no edge shows while shaking. */
const SHAKE_PAD = THEME.sizePx['size.finisher-shake'];

/** Order inside the shaken back container. */
const BACK_RANK = { bg: 1, speedlines: 2, beam: 3 } as const;

function addBack(ctx: FinisherContext, obj: Phaser.GameObjects.GameObject, rank: number): void {
  (obj as unknown as { depth: number }).depth = rank;
  ctx.back.add(obj);
  ctx.back.sort('depth');
}

/** Full-arena fill in the back container (also used for the sides of a finale picture). */
export function addBackFill(
  ctx: FinisherContext,
  color: ColorName | string | undefined,
): Phaser.GameObjects.Rectangle {
  const { width, height } = ctx.layout;
  const c = tokenColor(color, 'finisher.ink');
  const r = ctx.scene.add
    .rectangle(-SHAKE_PAD, -SHAKE_PAD, width + 2 * SHAKE_PAD, height + 2 * SHAKE_PAD, c.num)
    .setOrigin(0, 0);
  addBack(ctx, r, BACK_RANK.bg);
  return r;
}

/** Draws radial speedlines into `g` (filled quads, no gradient). */
export function drawSpeedlines(
  g: Phaser.GameObjects.Graphics,
  center: Point,
  width: number,
  height: number,
  colorNum: number,
  seed: number,
  count = SPEEDLINES,
): void {
  g.fillStyle(colorNum, 1);
  for (const quad of speedlineWedges(center.x, center.y, width, height, count, seed)) {
    g.fillPoints(quad, true);
  }
}

/** Speedlines in the back container around `center`. */
export function addBackSpeedlines(
  ctx: FinisherContext,
  center: Point,
  color: string | undefined,
  seed: number,
): Phaser.GameObjects.Graphics {
  const g = ctx.scene.add.graphics();
  drawSpeedlines(
    g,
    center,
    ctx.layout.width,
    ctx.layout.height,
    tokenColor(color, 'finisher.speedline').num,
    seed,
  );
  addBack(ctx, g, BACK_RANK.speedlines);
  return g;
}

export function letterbox(ctx: FinisherContext, step: FinisherStep): BlockEffect {
  const { width, height } = ctx.layout;
  const c = tokenColor(step.color, 'finisher.letterbox');
  const top = ctx.scene.add
    .rectangle(0, -BAR_H, width, BAR_H, c.num)
    .setOrigin(0, 0)
    .setDepth(DEPTH.bars);
  const bottom = ctx.scene.add
    .rectangle(0, height, width, BAR_H, c.num)
    .setOrigin(0, 0)
    .setDepth(DEPTH.bars);
  return {
    update(seqMs) {
      const v = letterboxVisible(seqMs, BAR_H);
      top.y = v - BAR_H;
      bottom.y = height - v;
    },
    destroy() {
      top.destroy();
      bottom.destroy();
    },
  };
}

export function bgColor(ctx: FinisherContext, step: FinisherStep): BlockEffect {
  const fill = addBackFill(ctx, step.color ?? undefined);
  ctx.actors.setPlayerShown(true);
  return {
    update() {},
    destroy() {
      fill.destroy();
      ctx.actors.setPlayerShown(false);
    },
  };
}

/**
 * Speedlines of the plan, centred on the hit point. While the hit image is shown they step aside:
 * the hit image draws its own speedlines onto the picture centre (see `frames`).
 */
export function speedlines(ctx: FinisherContext, step: FinisherStep): BlockEffect {
  const g = addBackSpeedlines(ctx, ctx.hit, step.color, step.atMs + 1);
  return {
    update(seqMs) {
      g.setVisible(!hitImageAt(ctx.plan, step.atMs + seqMs));
    },
    destroy() {
      g.destroy();
    },
  };
}

/**
 * The beam of the final blow (decision 10a): white core, coral rim, dithered outer band, across
 * the picture from the astronaut's side. Not a plan block: the scene starts it in the beam window.
 */
export function beam(ctx: FinisherContext): BlockEffect {
  const scene = ctx.scene;
  // The beam leaves the astronaut, so it runs at her height (her copy on screen, zoom included).
  const y = ctx.actors.playerScreen().y;
  const fromLeft = ctx.data.player.x <= ctx.data.boss.x;
  const glowKey = ctx.textures.dither(themeColor('finisher.beam-glow').css);
  const rim = themeColor('finisher.beam-rim').num;
  const core = themeColor('finisher.beam-core').num;
  const glows: Phaser.GameObjects.TileSprite[] = [];
  if (glowKey) {
    for (let i = 0; i < 2; i++)
      glows.push(scene.add.tileSprite(0, 0, 1, 1, glowKey).setOrigin(0, 0));
  }
  const rims = [0, 1].map(() => scene.add.rectangle(0, 0, 1, 1, rim).setOrigin(0, 0));
  const coreRect = scene.add.rectangle(0, 0, 1, 1, core).setOrigin(0, 0);
  const all: Phaser.GameObjects.GameObject[] = [...glows, ...rims, coreRect];
  for (const o of all) addBack(ctx, o, BACK_RANK.beam);
  const place = (
    o: Phaser.GameObjects.TileSprite | Phaser.GameObjects.Rectangle,
    r: Rect,
  ): void => {
    o.setPosition(r.x, r.y);
    o.setSize(Math.max(1, r.w), r.h);
    o.setVisible(r.w > 0);
  };
  let lastW = -1;
  return {
    update(seqMs) {
      // Growth in sequence time: a slow motion (stage 4 to 6 from 800 ms) must not hold it short.
      const span = beamSpan(fromLeft, ctx.layout.width, beamProgress(seqMs));
      // Sizes change only on the 3 growth steps (a TileSprite redraws its canvas on every resize).
      if (span.w === lastW) return;
      lastW = span.w;
      const b = beamBands(y, span.x, span.w);
      if (glows[0]) place(glows[0], b.glowTop);
      if (glows[1]) place(glows[1], b.glowBottom);
      place(rims[0], b.rimTop);
      place(rims[1], b.rimBottom);
      place(coreRect, b.core);
    },
    destroy() {
      for (const o of all) o.destroy();
    },
  };
}

/** The boss copy turns white for the step (brief: like the hit flash in the game). */
export function flash(ctx: FinisherContext, step: FinisherStep): BlockEffect {
  const boss = ctx.actors.boss;
  const key = ctx.textures.silhouette(
    ctx.data.boss.texture,
    ctx.data.boss.frame,
    tokenColor(step.color, 'finisher.paper').css,
  );
  if (key) boss.setTexture(key);
  return {
    update() {},
    destroy() {
      if (key && boss.active) boss.setTexture(ctx.data.boss.texture, ctx.data.boss.frame ?? 0);
    },
  };
}

/**
 * One impact frame pair (decision 7a): first half paper with ink silhouettes and ink speedlines,
 * second half inverted. Exactly the one light-dark pair of the plan step, no extra flashes.
 */
export function impactFrame(ctx: FinisherContext, step: FinisherStep): BlockEffect {
  const scene = ctx.scene;
  const { width, height } = ctx.layout;
  const ink = themeColor('finisher.ink');
  const paper = themeColor('finisher.paper');
  const fill = scene.add
    .rectangle(0, 0, width, height, paper.num)
    .setOrigin(0, 0)
    .setDepth(DEPTH.impact);
  const lines = scene.add.graphics().setDepth(DEPTH.impact);
  const sil = (texture: string, frame: string | number | undefined, css: string): string | null =>
    ctx.textures.silhouette(texture, frame, css);
  const keys = {
    boss: [
      sil(ctx.data.boss.texture, ctx.data.boss.frame, ink.css),
      sil(ctx.data.boss.texture, ctx.data.boss.frame, paper.css),
    ],
    player: [
      sil(ctx.data.player.texture, ctx.data.player.frame, ink.css),
      sil(ctx.data.player.texture, ctx.data.player.frame, paper.css),
    ],
  };
  const make = (k: string | null, at: { x: number; y: number; scale: number }, flipX: boolean) =>
    k
      ? scene.add.image(at.x, at.y, k).setScale(at.scale).setFlipX(flipX).setDepth(DEPTH.impact)
      : null;
  const bossImg = make(keys.boss[0], ctx.actors.bossScreen(), ctx.data.boss.flipX === true);
  const playerImg = make(keys.player[0], ctx.actors.playerScreen(), ctx.data.player.flipX === true);
  let phase = -1;
  const draw = (p: 0 | 1): void => {
    phase = p;
    const bg = p === 0 ? paper : ink;
    const fg = p === 0 ? ink : paper;
    fill.setFillStyle(bg.num, 1);
    lines.clear();
    drawSpeedlines(lines, ctx.hit, width, height, fg.num, step.atMs + 7);
    if (bossImg && keys.boss[p]) bossImg.setTexture(keys.boss[p] as string);
    if (playerImg && keys.player[p]) playerImg.setTexture(keys.player[p] as string);
  };
  draw(0);
  return {
    update(seqMs) {
      const p = impactPhase(seqMs, step.durationMs);
      if (p !== phase) draw(p);
    },
    destroy() {
      fill.destroy();
      lines.destroy();
      bossImg?.destroy();
      playerImg?.destroy();
    },
  };
}

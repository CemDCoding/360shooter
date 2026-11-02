// Picture blocks of the finisher (AP-160, brief H-39): cutIn, panels, frames (hit image and finale
// pictures), title and the skip hint. Only theme tokens; works with the Canvas renderer.
import type Phaser from 'phaser';
import type { FinisherStep } from '../../contracts';
import { THEME, themeColor } from '../../config/theme';
import { frameHolds } from '../../logic/finisher';
import { FONT_KEY } from '../menu/kassette';
import { FUNK_FONT, FUNK_GLYPH_H, funkText } from '../hud/FunkPanel';
import { DEPTH, type BlockEffect, type FinisherContext } from './context';
import { addBackFill, addBackSpeedlines, drawSpeedlines } from './overlays';
import {
  ARROW_CELLS,
  ARROW_SCALE,
  BEAM_CORE_H,
  BEAM_RIM_H,
  CUTIN_EDGE,
  HIT_SCRIM_ALPHA,
  STAGE_BG,
  centredX,
  hintBox,
  panelLayout,
  tokenColor,
  type Point,
} from './layout';
import { cutInOffset, frameAt, isHitImage, panelsVisible, titleScaleAt } from './timing';

const S = THEME.sizePx;
const C = THEME.sizeCount;
const PICTURE_SCALE = C['size.finisher-frame-scale'];
const PORTRAIT_SCALE = 2;
const PORTRAIT_KEY = 'finisher-portrait';
const HIT_KEY = 'finisher-hit';

function hasFrame(scene: Phaser.Scene, texture: string, frame: number): boolean {
  return scene.textures.exists(texture) && scene.textures.get(texture).has(String(frame));
}

const NOOP: BlockEffect = { update() {}, destroy() {} };

/** Portrait strip (decision 5a): ink band with coral edges, slides in, holds, slides out to the right. */
export function cutIn(ctx: FinisherContext, step: FinisherStep): BlockEffect {
  const scene = ctx.scene;
  const { width, cutInTop: top, cutInH: h, cutInSlant: slant } = ctx.layout;
  const bottom = top + h;
  const e = CUTIN_EDGE;
  const xLeft = (y: number): number => (-slant * (y - (top - e))) / (h + 2 * e);
  const g = scene.add.graphics();
  g.fillStyle(themeColor('finisher.cutin-edge').num, 1).fillPoints(
    [
      { x: 0, y: top - e },
      { x: width + slant, y: top - e },
      { x: width, y: bottom + e },
      { x: -slant, y: bottom + e },
    ],
    true,
  );
  g.fillStyle(themeColor('finisher.cutin-band').num, 1).fillPoints(
    [
      { x: xLeft(top), y: top },
      { x: width + slant + xLeft(top), y: top },
      { x: width + slant + xLeft(bottom), y: bottom },
      { x: xLeft(bottom), y: bottom },
    ],
    true,
  );
  const children: Phaser.GameObjects.GameObject[] = [g];
  const texture = step.texture ?? PORTRAIT_KEY;
  const frame = step.firstFrame ?? ctx.bossIndex;
  if (hasFrame(scene, texture, frame)) {
    children.push(
      scene.add
        .image(Math.round(width / 2), Math.round(top + h / 2), texture, frame)
        .setScale(PORTRAIT_SCALE),
    );
  }
  const travel = width + 2 * slant;
  const box = scene.add.container(-travel, 0, children).setDepth(DEPTH.cutIn);
  return {
    update(seqMs) {
      box.x = cutInOffset(seqMs, step.durationMs, travel);
    },
    destroy() {
      box.destroy();
    },
  };
}

/** Three slanted manga panels with 2 px ink edges, one after another (brief, mockup view 5). */
export function panels(ctx: FinisherContext, step: FinisherStep): BlockEffect {
  const scene = ctx.scene;
  const pl = panelLayout(ctx.layout.width, ctx.insets);
  const edge = S['size.finisher-panel-edge'];
  const ink = themeColor('finisher.ink').num;
  const owned: Phaser.GameObjects.GameObject[] = [];
  const masks: Phaser.GameObjects.Graphics[] = [];
  const groups: Phaser.GameObjects.GameObject[][] = [];

  const panel = (
    index: number,
    points: Point[],
    bg: number,
    fill: (add: <T extends Phaser.GameObjects.GameObject>(o: T) => T) => void,
  ): void => {
    const base = DEPTH.panels + index * 0.1;
    const group: Phaser.GameObjects.GameObject[] = [];
    const maskShape = scene.make.graphics({}, false);
    // Only the shape counts for a geometry mask; the colour is not drawn.
    maskShape.fillStyle(themeColor('finisher.paper').num, 1).fillPoints(points, true);
    masks.push(maskShape);
    const mask = maskShape.createGeometryMask();
    const back = scene.add.graphics().setDepth(base);
    back.fillStyle(bg, 1).fillPoints(points, true);
    group.push(back);
    let n = 0;
    fill((o) => {
      n += 1;
      const m = o as unknown as Phaser.GameObjects.Components.Mask &
        Phaser.GameObjects.Components.Depth;
      m.setMask(mask);
      m.setDepth(base + 0.001 * n);
      group.push(o);
      return o;
    });
    const line = scene.add.graphics().setDepth(base + 0.09);
    line.lineStyle(edge, ink, 1).strokePoints(points, true, true);
    group.push(line);
    for (const o of group)
      (o as unknown as Phaser.GameObjects.Components.Visible).setVisible(false);
    owned.push(...group);
    groups.push(group);
  };

  const bi = ctx.bossIndex;
  panel(0, pl.portrait.points, themeColor('finisher.cutin-band').num, (add) => {
    if (hasFrame(scene, PORTRAIT_KEY, bi)) {
      add(
        scene.add
          .image(pl.portrait.anchor.x, pl.portrait.anchor.y, PORTRAIT_KEY, bi)
          .setOrigin(0, 0)
          .setScale(PORTRAIT_SCALE),
      );
    }
  });
  panel(1, pl.hit.points, themeColor(STAGE_BG[bi] ?? 'finisher.bg-forest').num, (add) => {
    const g = add(scene.add.graphics());
    drawSpeedlines(
      g,
      pl.hit.anchor,
      ctx.layout.width,
      ctx.layout.height,
      themeColor('finisher.speedline').num,
      step.atMs + 3,
    );
    if (hasFrame(scene, HIT_KEY, bi))
      add(scene.add.image(pl.hit.anchor.x, pl.hit.anchor.y, HIT_KEY, bi));
  });
  panel(2, pl.beam.points, ink, (add) => {
    const g = add(scene.add.graphics());
    drawSpeedlines(
      g,
      pl.beam.anchor,
      ctx.layout.width,
      ctx.layout.height,
      themeColor('finisher.beam-glow').num,
      step.atMs + 5,
    );
    const len = Math.max(1, pl.beamToX - pl.beamFromX);
    const top = pl.beamY - BEAM_CORE_H / 2 - BEAM_RIM_H;
    add(
      scene.add
        .rectangle(
          pl.beamFromX,
          top,
          len,
          BEAM_CORE_H + 2 * BEAM_RIM_H,
          themeColor('finisher.beam-rim').num,
        )
        .setOrigin(0, 0),
    );
    add(
      scene.add
        .rectangle(
          pl.beamFromX,
          top + BEAM_RIM_H,
          len,
          BEAM_CORE_H,
          themeColor('finisher.beam-core').num,
        )
        .setOrigin(0, 0),
    );
    const p = ctx.data.player;
    const b = ctx.data.boss;
    if (scene.textures.exists(p.texture)) {
      add(
        scene.add
          .image(pl.astronaut.x, pl.astronaut.y, p.texture, p.frame ?? 0)
          .setOrigin(0, 0)
          .setScale(2),
      );
    }
    if (scene.textures.exists(b.texture)) {
      add(
        scene.add
          .image(pl.boss.x, pl.boss.y, b.texture, b.frame ?? 0)
          .setScale(2)
          .setFlipX(b.flipX === true),
      );
    }
  });

  let shown = 0;
  return {
    update(seqMs) {
      const n = panelsVisible(seqMs);
      if (n === shown) return;
      shown = n;
      groups.forEach((group, i) => {
        for (const o of group)
          (o as unknown as Phaser.GameObjects.Components.Visible).setVisible(i < n);
      });
    },
    destroy() {
      for (const o of owned) o.destroy();
      for (const m of masks) m.destroy();
    },
  };
}

/** True when a bgColor step covers time `t`. */
function bgAt(ctx: FinisherContext, t: number): boolean {
  return ctx.plan.steps.some(
    (s) => s.block === 'bgColor' && s.atMs <= t && t < s.atMs + s.durationMs,
  );
}

/**
 * Picture sequence: the stage hit image (2x in the middle; on the 85 % ink scene in stage 1 and 2,
 * boss hidden) or a finale sheet (2x, centred; in a wide arena colour and speedlines fill the sides).
 */
export function frames(ctx: FinisherContext, step: FinisherStep): BlockEffect {
  const scene = ctx.scene;
  const texture = step.texture ?? '';
  if (!scene.textures.exists(texture)) return NOOP;
  const holds = frameHolds(step, ctx.plan.reduced);
  const first = step.firstFrame ?? 0;
  const { center, width, height, picture } = ctx.layout;
  const img = scene.add
    .image(center.x, center.y, texture, first)
    .setScale(PICTURE_SCALE)
    .setDepth(DEPTH.picture)
    .setVisible(false);
  const extras: Phaser.GameObjects.GameObject[] = [];
  if (isHitImage(step)) {
    ctx.actors.setBossMode('hidden');
    // Stages with speedlines (3 to 6): they run onto the picture centre for the whole hit image
    // (mockup m10-zoom-stages); the plan's speedlines around the hit point hide meanwhile.
    const lines = ctx.plan.steps.find((s) => s.block === 'speedlines');
    if (lines) extras.push(addBackSpeedlines(ctx, center, lines.color, step.atMs + 13));
    if (!bgAt(ctx, step.atMs)) {
      extras.push(
        scene.add
          .rectangle(0, 0, width, height, themeColor('finisher.ink').num, HIT_SCRIM_ALPHA)
          .setOrigin(0, 0)
          .setDepth(DEPTH.scrim),
      );
    }
  } else if (width > picture.w) {
    extras.push(addBackFill(ctx, STAGE_BG[ctx.bossIndex]));
    extras.push(addBackSpeedlines(ctx, center, 'finisher.speedline', step.atMs + 11));
  }
  let index = -2;
  return {
    update(seqMs) {
      const i = frameAt(holds, seqMs);
      if (i === index) return;
      index = i;
      const f = first + i;
      const ok = i >= 0 && hasFrame(scene, texture, f);
      if (ok) img.setFrame(f);
      img.setVisible(ok);
    },
    destroy() {
      img.destroy();
      for (const o of extras) o.destroy();
    },
  };
}

/**
 * Title "BEZWUNGEN!" (Kapsel x4) or the name of the final blow (x3): hard shadow of one font pixel,
 * two sizes (final + 2, then final) without fading. 12 px under the top bar, centred in the insets.
 */
export function title(ctx: FinisherContext, step: FinisherStep): BlockEffect {
  const scene = ctx.scene;
  if (!scene.cache.bitmapFont.exists(FONT_KEY)) return NOOP;
  const isName = step.titleKind === 'name';
  const finalScale = isName ? C['size.finisher-name-scale'] : C['size.finisher-title-scale'];
  const color = tokenColor(step.color, isName ? 'finisher.name' : 'finisher.title');
  const text = (step.text ?? '').toUpperCase();
  const label = scene.add
    .bitmapText(0, 0, FONT_KEY, text)
    .setTint(color.num)
    .setDepth(DEPTH.title + 0.1);
  // Without WebGL there is no tint: a white shadow would only thicken the text, so it is left out.
  const shadow = ctx.webgl
    ? scene.add
        .bitmapText(0, 0, FONT_KEY, text)
        .setTint(themeColor('finisher.title-shadow').num)
        .setDepth(DEPTH.title)
    : null;
  const localW = label.getTextBounds(false).local.width;
  let scale = 0;
  const place = (s: number): void => {
    scale = s;
    const x = centredX(ctx.layout.titleCenterX, localW * s);
    const y = ctx.layout.titleY;
    label.setScale(s).setPosition(x, y);
    shadow?.setScale(s).setPosition(x + s, y + s);
  };
  place(titleScaleAt(0, finalScale));
  return {
    update(seqMs) {
      const s = titleScaleAt(seqMs, finalScale);
      if (s !== scale) place(s);
    },
    destroy() {
      label.destroy();
      shadow?.destroy();
    },
  };
}

/** "TIPPEN: WEITER" (Funk x1) with arrow on glass, bottom right inside the insets; does not blink. */
export function createSkipHint(ctx: FinisherContext): Phaser.GameObjects.Container | null {
  const scene = ctx.scene;
  if (!scene.cache.bitmapFont.exists(FUNK_FONT)) return null;
  const text = funkText(scene, 0, 0, 'TIPPEN: WEITER', 1, 'finisher.skip-text');
  const hb = hintBox(ctx.layout, Math.round(text.width), FUNK_GLYPH_H);
  text.setPosition(hb.textX, hb.textY);
  const g = scene.add.graphics();
  const glass = themeColor('hud.glass');
  const line = THEME.borderPx['border.hud'];
  g.fillStyle(glass.num, glass.alpha ?? 1).fillRect(hb.box.x, hb.box.y, hb.box.w, hb.box.h);
  g.lineStyle(line, themeColor('hud.line').num, 1).strokeRect(
    hb.box.x + line / 2,
    hb.box.y + line / 2,
    hb.box.w - line,
    hb.box.h - line,
  );
  g.fillStyle(themeColor('finisher.skip-text').num, 1);
  for (const c of ARROW_CELLS) {
    g.fillRect(
      hb.arrowX + c.x * ARROW_SCALE,
      hb.arrowY + c.y * ARROW_SCALE,
      c.w * ARROW_SCALE,
      c.h * ARROW_SCALE,
    );
  }
  return scene.add.container(0, 0, [g, text]).setDepth(DEPTH.hint).setVisible(false);
}

// Shared stage of the choreographies (M13, AP-195, Q-97, PE-259, brief H-48): the world behind the figures
// (`stage-world`) and the cinema bars (`letterbox`). One building block for all six bosses, found by the
// player after the boss module (like `SLASH_FX`), so no boss module needs an entry.
//
// Use in a choreography (only `fx` events, no contract change):
//   { kind: 'fx', atMs: 0, name: 'stage-world:forestGhost-1', flash: false }
//   { kind: 'fx', atMs: 0, name: 'letterbox', flash: false }
// The part after `stage-world:` is the id of a preset in `config/choreo/stages.ts`. Rules: no tint, no FX
// (Canvas-safe, `Graphics` rectangles, pixel circles and triangles drawn once in the factory), `update`
// does nothing for the world and only moves two rectangles for the bars (no allocation), fixed seed (no
// flicker), every colour from the tokens, every size from `STAGES` or the tokens.
import type Phaser from 'phaser';
import {
  stageOf,
  STAGE_DARK_DEFAULT,
  type StageBody,
  type StageSpec,
} from '../../../config/choreo/stages';
import { THEME, themeColor, type ColorName } from '../../../config/theme';
import { CHOREO_DEPTH, type ChoreoContext } from '../context';
import { BAR_H, seededRandom } from '../layout';
import { letterboxVisible } from '../timing';
import type { BossFxModule, FxApi, FxEvent, FxFactory, FxInstance } from './index';

export const STAGE_WORLD_FX = 'stage-world';
export const LETTERBOX_FX = 'letterbox';
/** Separator between the effect name and the preset id. */
export const STAGE_SEP = ':';

const GROUND = THEME.sizePx['size.rig-ground'];
/** The world is drawn from this size around the stage (mockup: -400..1040 x -400..760), room for zoom and shake. */
const REACH = 400;
const STAGE_W = 640;
const TOP = -REACH;
const BOTTOM = 760;
/** Opacity of the silhouettes and of the sun halo (mockup `world()`). */
const SILHOUETTE_ALPHA = 0.5;
const HALO_ALPHA = 0.35;
const HALO_GROW = 10;
const STARS = { night: 40, elf: 26 } as const;

const NOOP: FxInstance = { start() {}, update() {}, stop() {}, destroy() {} };

function color(name: ColorName): number {
  return themeColor(name).num;
}

/** Filled pixel circle as one-pixel rows (hard edge, no smoothing). */
function pxCircle(g: Phaser.GameObjects.Graphics, cx: number, cy: number, r: number): void {
  for (let y = -r; y <= r; y++) {
    const hw = Math.round(Math.sqrt(Math.max(0, r * r - y * y)));
    g.fillRect(Math.round(cx - hw), Math.round(cy + y), hw * 2, 1);
  }
}

/** Upper half of an ellipse standing on `baseY` as one-pixel rows. */
function pxDune(
  g: Phaser.GameObjects.Graphics,
  cx: number,
  baseY: number,
  rx: number,
  ry: number,
): void {
  for (let dy = 0; dy < ry; dy++) {
    const hw = rx * Math.sqrt(1 - (dy / ry) ** 2);
    g.fillRect(Math.round(cx - hw), Math.round(baseY - dy - 1), Math.round(hw * 2), 1);
  }
}

function silhouettes(g: Phaser.GameObjects.Graphics, spec: StageSpec, rnd: () => number): void {
  const left = -REACH;
  switch (spec.world) {
    case 'night':
      for (let i = -4; i < 14; i++) {
        const x = i * 70 + rnd() * 30;
        const w = 10 + rnd() * 10;
        g.fillRect(Math.round(x), -200, Math.round(w), 520);
        pxCircle(g, x + w / 2, 60 + rnd() * 50, 26 + rnd() * 14);
      }
      break;
    case 'elf':
      for (let i = -4; i < 14; i++) {
        const x = i * 74 + rnd() * 30;
        const h = 120 + rnd() * 120;
        g.fillTriangle(x, GROUND, x + 14, GROUND - h, x + 28, GROUND);
      }
      break;
    case 'desert':
      for (let i = -3; i < 8; i++) {
        const cx = i * 150 + rnd() * 60;
        const rx = 110 + rnd() * 40;
        const ry = 46 + rnd() * 20;
        pxDune(g, cx, GROUND + 10, rx, ry);
      }
      break;
    case 'pyramid': {
      // Tomb wall: rows of bricks, every second row shifted by half a brick.
      let row = 0;
      for (let y = -200; y < GROUND; y += 14, row++) {
        for (let x = left + (row % 2) * 20; x < 1040; x += 40) g.fillRect(x, y, 38, 12);
      }
      break;
    }
    case 'oasis':
      for (let i = -2; i < 7; i++) {
        const x = i * 160 + rnd() * 60;
        g.fillTriangle(x - 70, GROUND, x, GROUND - 90 - rnd() * 30, x + 70, GROUND);
      }
      for (let i = -2; i < 8; i++) {
        const x = i * 120 + rnd() * 50;
        g.fillRect(Math.round(x), GROUND - 80, 4, 80);
        for (let k = 0; k < 4; k++)
          g.fillRect(Math.round(x - 18 + k * 9), GROUND - 84 + (k % 2) * 4, 12, 3);
      }
      break;
    case 'forest':
      break;
  }
}

/** Draws the whole world once, relative to the left edge of the stage. */
function drawWorld(
  g: Phaser.GameObjects.Graphics,
  spec: StageSpec,
  stageX: number,
  arenaW: number,
): void {
  const rnd = seededRandom(spec.seed);
  const left = -Math.max(REACH, stageX + 40);
  const right = Math.max(STAGE_W + REACH, arenaW - stageX + REACH);
  const w = right - left;
  const key = spec.world;
  const bg = color(`finisher.bg-${key}` as ColorName);
  const ink = color('finisher.ink');
  const title = color('finisher.title');
  const ground = color(`biome.${key}-ground` as ColorName);
  const groundHi = color(`biome.${key}-ground-hi` as ColorName);
  const groundLo = color(`biome.${key}-ground-lo` as ColorName);

  g.fillStyle(bg, 1).fillRect(left, TOP, w, BOTTOM - TOP);
  g.fillStyle(ink, spec.dark ?? STAGE_DARK_DEFAULT).fillRect(left, TOP, w, BOTTOM - TOP);

  if (key === 'night' || key === 'elf') {
    g.fillStyle(title, 1);
    for (let i = 0; i < STARS[key]; i++) {
      g.fillRect(Math.round(-300 + rnd() * 1240), Math.round(-100 + rnd() * 330), 1, 1);
    }
  }
  const moon: StageBody | undefined = spec.moon;
  if (moon) {
    g.fillStyle(title, 1);
    pxCircle(g, moon.x, moon.y, moon.r);
    g.fillStyle(bg, 1);
    pxCircle(g, moon.x + 7, moon.y - 4, moon.r - 4);
  }
  const sun: StageBody | undefined = spec.sun;
  if (sun) {
    g.fillStyle(color('gold.400'), 1);
    pxCircle(g, sun.x, sun.y, sun.r);
    g.fillStyle(color('gold.400'), HALO_ALPHA);
    pxCircle(g, sun.x, sun.y, sun.r + HALO_GROW);
  }

  g.fillStyle(ink, SILHOUETTE_ALPHA);
  silhouettes(g, spec, rnd);

  if (spec.mist) {
    g.fillStyle(title, spec.mist);
    for (let i = 0; i < 9; i++) {
      g.fillRect(
        Math.round(-300 + rnd() * 1200),
        Math.round(GROUND - 40 - rnd() * 120),
        120 + Math.round(rnd() * 200),
        6 + Math.round(rnd() * 6),
      );
    }
  }

  g.fillStyle(ground, 1).fillRect(left, GROUND, w, BOTTOM - GROUND);
  g.fillStyle(groundHi, 1).fillRect(left, GROUND, w, 2);
  g.fillStyle(groundLo, 1);
  for (let i = 0; i < 60; i++) {
    g.fillRect(
      Math.round(-300 + rnd() * 1240),
      GROUND + 6 + Math.round(rnd() * 50),
      6 + Math.round(rnd() * 14),
      2,
    );
  }
}

/** The world that is shown per scene: a new `stage-world` replaces it (hard cut, nothing stacks). */
const current = new WeakMap<ChoreoContext, { hide(): void }>();

/** `stage-world:<preset id>`: preset id of an event name, '' for other names. */
export function stageIdOf(name: string): string {
  const at = name.indexOf(STAGE_SEP);
  return at < 0 ? '' : name.slice(at + 1);
}

/**
 * The world behind boss, astronaut and ring: drawn once in the factory as one `Graphics` of the world layer
 * (zoomed and moved with the camera, like the mockup `cam()`). Unknown preset id: no stage, no error.
 */
const stageWorld: FxFactory = (api: FxApi, event: FxEvent): FxInstance => {
  const spec = stageOf(stageIdOf(event.name));
  if (!spec) return NOOP;
  const { ctx } = api;
  const g = ctx.scene.add.graphics().setDepth(CHOREO_DEPTH.stage).setVisible(false);
  g.setPosition(ctx.stageX, 0);
  ctx.addWorld(g);
  drawWorld(g, spec, ctx.stageX, ctx.layout.width);
  const me = {
    hide() {
      g.setVisible(false);
    },
  };
  return {
    start() {
      current.get(ctx)?.hide();
      current.set(ctx, me);
      g.setVisible(true);
    },
    update() {},
    stop() {
      me.hide();
      if (current.get(ctx) === me) current.delete(ctx);
    },
    destroy() {
      if (current.get(ctx) === me) current.delete(ctx);
      g.destroy();
    },
  };
};

/**
 * Two cinema bars in the screen layer, over ring, impact and flash and under the texts. They slide in with
 * `letterboxVisible` (the mechanism of the M10 letterbox); with "reduce effects" they stand at full height
 * from the first frame.
 */
const letterbox: FxFactory = (api: FxApi): FxInstance => {
  const { ctx } = api;
  const { width, height } = ctx.layout;
  const fill = color('finisher.letterbox');
  const reduced = ctx.plan.reduced;
  const make = (y: number): Phaser.GameObjects.Rectangle => {
    const r = ctx.scene.add
      .rectangle(0, y, width, BAR_H, fill)
      .setOrigin(0, 0)
      .setDepth(CHOREO_DEPTH.bars)
      .setVisible(false);
    ctx.addUi(r);
    return r;
  };
  const top = make(-BAR_H);
  const bottom = make(height);
  let shown = -1;
  const set = (v: number): void => {
    if (v === shown) return;
    shown = v;
    top.y = v - BAR_H;
    bottom.y = height - v;
  };
  return {
    start() {
      set(reduced ? BAR_H : letterboxVisible(0, BAR_H));
      top.setVisible(true);
      bottom.setVisible(true);
    },
    update(since) {
      if (!reduced) set(letterboxVisible(since, BAR_H));
    },
    stop() {
      top.setVisible(false);
      bottom.setVisible(false);
    },
    destroy() {
      top.destroy();
      bottom.destroy();
    },
  };
};

/** Effects of the stage by name (the part before the `:`). */
export const STAGE_FX: BossFxModule = {
  [STAGE_WORLD_FX]: stageWorld,
  [LETTERBOX_FX]: letterbox,
};

/** Factory for an event name: `letterbox`, `stage-world:<id>` with a known id; null otherwise. */
export function findStageFx(name: string): FxFactory | null {
  if (name === LETTERBOX_FX) return STAGE_FX[LETTERBOX_FX];
  const at = name.indexOf(STAGE_SEP);
  if (at < 0 || name.slice(0, at) !== STAGE_WORLD_FX) return null;
  return stageOf(name.slice(at + 1)) ? STAGE_FX[STAGE_WORLD_FX] : null;
}

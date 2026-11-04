// Own effects of the boss `rootMonster` for its choreographies (M13, AP-184, brief H-46): ground bulge, root
// thrust, rose hedge, falling leaves and rising petals, the cut line down into the ground, the impact pair of
// the cinematic and the portrait strip of its third shot. The player calls them by the `name` of an `fx`
// event (config/choreo/rootMonster.ts). Rules as everywhere in the finisher: every object is made in the
// factory (scene start), `update` only sets values; no tint, no FX, no Rope (Canvas-safe); time is real time.
import type Phaser from 'phaser';
import { THEME, themeColor } from '../../../config/theme';
import { CHOREO_DEPTH } from '../context';
import { CUTIN_EDGE, seededRandom } from '../layout';
import { drawSpeedlines } from '../overlays';
import { cutInOffset } from '../timing';
import type { BossFxModule, FxApi, FxFactory, FxInstance } from './index';

const GROUND = THEME.sizePx['size.rig-ground'];
const ATLAS_FX = 'rig-fx-root';
const BULGE = 'rig-fx-ground-bulge';
const HEDGE = 'rig-prop-rosehedge';
const SPIKE = 'boss-root-spike';
const PORTRAIT = 'finisher-portrait';
const PORTRAIT_SCALE = 2;
/** Particle images are drawn at this scale (8 px images). */
const PARTICLE_SCALE = 2;

/** Ground bulge: stage 0 (crack), 1 (mound), 2 (root tips) start at these times (ms since the start). */
export const BULGE_STAGE_MS: readonly number[] = [0, 150, 330];
/** Root thrust: frames 0, 1, 2 start at these times; later the thrust is half see-through (board M4). */
export const SPIKE_FRAME_MS: readonly number[] = [0, 33, 66];
export const SPIKE_FADE_MS = 200;
export const SPIKE_FADE_ALPHA = 0.6;
/** Rose hedge: stage 0 to 2 start at these times (boards M8, M9, 5b). */
export const HEDGE_STAGE_MS: readonly number[] = [0, 400, 800];
/** Cut line down into the ground: px below the ground line (board 4c). */
export const CUT_LINE_BELOW_GROUND = 20;

const NOOP: FxInstance = { start() {}, update() {}, stop() {}, destroy() {} };

/** Index of the last threshold that is <= `sinceMs` (0 before the first). */
export function stageAt(thresholds: readonly number[], sinceMs: number): number {
  let stage = 0;
  for (let i = 0; i < thresholds.length; i++) if (sinceMs >= thresholds[i]) stage = i;
  return stage;
}

function hasFrame(api: FxApi, key: string, frame: string | number): boolean {
  const textures = api.ctx.scene.textures;
  return textures.exists(key) && textures.get(key).has(String(frame));
}

/** Atlas frame `<sheet>-<index>` of the rig atlas, or null when the atlas or frame is not loaded. */
function atlasFrame(api: FxApi, sheet: string, index: number): string | null {
  const name = `${sheet}-${index}`;
  return hasFrame(api, api.atlas, name) ? name : null;
}

function figureX(api: FxApi, rigId: 'astronaut' | 'rootMonster'): number {
  const fig = api.figure(rigId);
  return fig ? fig.container.x : api.ctx.stageX + api.ctx.layout.width / 2;
}

/** Boss root effects sit on the ground depth, behind the figures. */
function groundImage(
  api: FxApi,
  texture: string,
  frame: string | number,
): Phaser.GameObjects.Image {
  const img = api.ctx.scene.add
    .image(0, 0, texture, frame)
    .setDepth(CHOREO_DEPTH.ground)
    .setScale(api.bossScale)
    .setVisible(false);
  api.ctx.addWorld(img);
  return img;
}

/** Ground bulge under the astronaut, grows from stage 0 to 2 (boards M1, M2). */
const groundBulge: FxFactory = (api) => {
  const frames = BULGE_STAGE_MS.map((_, i) => atlasFrame(api, BULGE, i));
  if (frames.some((f) => f === null)) return NOOP;
  const img = groundImage(api, api.atlas, frames[0] as string).setOrigin(0.5, 0);
  let shown = -1;
  return {
    start() {
      // Under the astronaut where she stands now; top 40 px above the ground line.
      img.setPosition(Math.round(figureX(api, 'astronaut')), GROUND - 40).setVisible(true);
      shown = -1;
    },
    update(since) {
      const stage = stageAt(BULGE_STAGE_MS, since);
      if (stage === shown) return;
      shown = stage;
      img.setFrame(frames[stage] as string);
    },
    stop() {
      img.setVisible(false);
    },
    destroy() {
      img.destroy();
    },
  };
};

/** Root thrust (sprite `boss-root-spike`, 3x) out of the ground where the astronaut stood (board M3). */
const rootSpike: FxFactory = (api) => {
  if (!hasFrame(api, SPIKE, 0)) return NOOP;
  const img = groundImage(api, SPIKE, 0).setOrigin(0.5, 1);
  let shown = -1;
  return {
    start() {
      img
        .setPosition(Math.round(figureX(api, 'astronaut')), GROUND + 2 * api.bossScale)
        .setVisible(true);
      img.setAlpha(1);
      shown = -1;
    },
    update(since) {
      const frame = stageAt(SPIKE_FRAME_MS, since);
      if (frame !== shown) {
        shown = frame;
        img.setFrame(frame).setAlpha(1);
      }
      if (since >= SPIKE_FADE_MS) img.setAlpha(SPIKE_FADE_ALPHA);
    },
    stop() {
      img.setVisible(false);
    },
    destroy() {
      img.destroy();
    },
  };
};

/** Low rose hedge where the trunk stood, bloom stage 0 to 2 (boards M8, M9, 5b). */
const roseHedge: FxFactory = (api) => {
  const frames = HEDGE_STAGE_MS.map((_, i) => atlasFrame(api, HEDGE, i));
  if (frames.some((f) => f === null)) return NOOP;
  const img = groundImage(api, api.atlas, frames[0] as string).setOrigin(0.5, 1);
  let shown = -1;
  return {
    start() {
      img
        .setPosition(Math.round(figureX(api, 'rootMonster')), GROUND + 2 * api.bossScale)
        .setVisible(true);
      shown = -1;
    },
    update(since) {
      const stage = stageAt(HEDGE_STAGE_MS, since);
      if (stage === shown) return;
      shown = stage;
      img.setFrame(frames[stage] as string);
    },
    stop() {
      img.setVisible(false);
    },
    destroy() {
      img.destroy();
    },
  };
};

// ---------------------------------------------------------------------------------------------------
// Drifting particles (leaves sink, petals rise)
// ---------------------------------------------------------------------------------------------------

interface DriftConfig {
  /** Indices in `rig-fx-root` (6 and 7 are sparks of the astronaut and never used here). */
  frames: readonly number[];
  count: number;
  /** Start box around the boss, in boss-scale units of 1 px of the 64 px boss image. */
  halfWidth: number;
  yTop: number;
  yBottom: number;
  /** Speed (px/s at boss scale 3, negative = up). */
  vyMin: number;
  vyMax: number;
  lifeMinMs: number;
  lifeMaxMs: number;
  sway: number;
  seed: number;
}

/** Leaves break off the trunk and sink slowly (boards M7, M8, 4c, 5a). */
export const LEAVES: DriftConfig = {
  frames: [3, 4, 3, 4, 5],
  count: 24,
  halfWidth: 28,
  yTop: 56,
  yBottom: 8,
  vyMin: 30,
  vyMax: 70,
  lifeMinMs: 900,
  lifeMaxMs: 1400,
  sway: 6,
  seed: 11,
};

/** Rose petals and buds rise from the blooming hedge (boards M8, M9, 5b). */
export const PETALS: DriftConfig = {
  frames: [0, 2, 2, 1],
  count: 16,
  halfWidth: 36,
  yTop: 20,
  yBottom: 2,
  vyMin: -50,
  vyMax: -20,
  lifeMinMs: 900,
  lifeMaxMs: 1300,
  sway: 5,
  seed: 23,
};

function drift(cfg: DriftConfig): FxFactory {
  return (api, event) => {
    const frames = cfg.frames.map((i) => atlasFrame(api, ATLAS_FX, i));
    if (frames.some((f) => f === null)) return NOOP;
    const rnd = seededRandom(api.ctx.data.levelId * 131 + cfg.seed);
    const scale = api.bossScale / 3;
    const window = Math.max(1, (event.durationMs ?? 1500) * 0.5);
    const n = cfg.count;
    const imgs: Phaser.GameObjects.Image[] = [];
    const x0 = new Float64Array(n);
    const y0 = new Float64Array(n);
    const vy = new Float64Array(n);
    const delay = new Float64Array(n);
    const life = new Float64Array(n);
    const phase = new Float64Array(n);
    const live = new Uint8Array(n);
    for (let i = 0; i < n; i++) {
      const img = api.ctx.scene.add
        .image(0, 0, api.atlas, frames[i % frames.length] as string)
        .setDepth(CHOREO_DEPTH.particles)
        .setScale(PARTICLE_SCALE)
        .setVisible(false);
      api.ctx.addWorld(img);
      imgs.push(img);
      // The random numbers are drawn once, here: the effect looks the same every time.
      x0[i] = (rnd() * 2 - 1) * cfg.halfWidth * api.bossScale;
      y0[i] = -(cfg.yBottom + rnd() * (cfg.yTop - cfg.yBottom)) * api.bossScale;
      vy[i] = (cfg.vyMin + rnd() * (cfg.vyMax - cfg.vyMin)) * scale;
      delay[i] = rnd() * window;
      life[i] = cfg.lifeMinMs + rnd() * (cfg.lifeMaxMs - cfg.lifeMinMs);
      phase[i] = rnd() * Math.PI * 2;
    }
    let bx = 0;
    return {
      start() {
        bx = figureX(api, 'rootMonster');
        live.fill(0);
      },
      update(since) {
        for (let i = 0; i < n; i++) {
          const age = since - delay[i];
          const on = age >= 0 && age < life[i] ? 1 : 0;
          if (on !== live[i]) {
            live[i] = on;
            imgs[i].setVisible(on === 1);
          }
          if (on === 0) continue;
          const x = bx + x0[i] + Math.sin(phase[i] + age / 220) * cfg.sway;
          const y = GROUND + y0[i] + (vy[i] * age) / 1000;
          imgs[i].setPosition(Math.round(x), Math.round(y));
        }
      },
      stop() {
        for (let i = 0; i < n; i++) imgs[i].setVisible(false);
      },
      destroy() {
        for (const img of imgs) img.destroy();
        imgs.length = 0;
      },
    };
  };
}

// ---------------------------------------------------------------------------------------------------
// Cut line, impact pair, portrait strip
// ---------------------------------------------------------------------------------------------------

/**
 * Cut line of the laser blade through the trunk down into the ground (board 4c: ground + 20 px, the built-in
 * `slash` stops at the ground line). Same band as the built-in one: `finisher.slash` with the coral rim.
 */
const cutLine: FxFactory = (api, event) => {
  const g = api.ctx.scene.add.graphics().setDepth(CHOREO_DEPTH.slash).setVisible(false);
  api.ctx.addWorld(g);
  const core = THEME.sizePx['size.rig-slash'] * api.bossScale;
  const rim = THEME.sizePx['size.rig-slash-rim'] * api.bossScale;
  const strength = event.strength ?? 1;
  return {
    start() {
      const boss = api.boss();
      if (!boss) return;
      const x = boss.container.x;
      const top = Math.round(boss.top());
      const h = Math.max(0, GROUND + CUT_LINE_BELOW_GROUND - top);
      g.clear();
      g.fillStyle(THEME.colors['finisher.slash-rim'].num, strength);
      g.fillRect(Math.round(x - core / 2 - rim), top, core + 2 * rim, h);
      g.fillStyle(THEME.colors['finisher.slash'].num, strength);
      g.fillRect(Math.round(x - core / 2), top, core, h);
      g.setVisible(true);
    },
    update() {},
    stop() {
      g.setVisible(false);
    },
    destroy() {
      g.destroy();
    },
  };
};

/**
 * The one light-dark pair of the cinematic (decision 7a, board 4b), each half half of the event time: paper
 * with ink speedlines in front of the figures, then ink with paper speedlines behind them. The figures turn
 * into white silhouettes by the `hitWhite` event of the choreography. It is the flash of the cinematic
 * (the event carries `flash: true`), so "reduce effects" removes it with the event.
 */
const impactPair: FxFactory = (api, event) => {
  const { scene, layout } = api.ctx;
  const pad = THEME.sizePx['size.finisher-shake'];
  const w = layout.width + 2 * pad;
  const h = layout.height + 2 * pad;
  const paper = themeColor('finisher.paper');
  const ink = themeColor('finisher.ink');
  const rect = (colour: number, depth: number): Phaser.GameObjects.Rectangle => {
    const r = scene.add
      .rectangle(-pad, -pad, w, h, colour)
      .setOrigin(0, 0)
      .setDepth(depth)
      .setVisible(false);
    api.ctx.addWorld(r);
    return r;
  };
  const lines = (depth: number): Phaser.GameObjects.Graphics => {
    const g = scene.add.graphics().setDepth(depth).setVisible(false);
    api.ctx.addWorld(g);
    return g;
  };
  const light = { bg: rect(paper.num, CHOREO_DEPTH.impact), lines: lines(CHOREO_DEPTH.impact + 1) };
  // Behind the figures (depth 20), in front of the ground effects (14).
  const dark = {
    bg: rect(ink.num, CHOREO_DEPTH.figure - 5),
    lines: lines(CHOREO_DEPTH.figure - 4),
  };
  const half = (event.durationMs ?? 200) / 2;
  let phase = -1;
  const show = (p: 0 | 1): void => {
    phase = p;
    light.bg.setVisible(p === 0);
    light.lines.setVisible(p === 0);
    dark.bg.setVisible(p === 1);
    dark.lines.setVisible(p === 1);
  };
  return {
    start() {
      const boss = api.boss();
      const x = boss ? boss.container.x : api.ctx.layout.center.x;
      const y = boss ? Math.round((boss.top() + boss.container.y) / 2) : api.ctx.layout.center.y;
      const centre = { x, y };
      light.lines.clear();
      dark.lines.clear();
      drawSpeedlines(light.lines, centre, layout.width, layout.height, ink.num, event.atMs + 7);
      drawSpeedlines(dark.lines, centre, layout.width, layout.height, paper.num, event.atMs + 7);
      show(0);
    },
    update(since) {
      const p = since < half ? 0 : 1;
      if (p !== phase) show(p);
    },
    stop() {
      light.bg.setVisible(false);
      light.lines.setVisible(false);
      dark.bg.setVisible(false);
      dark.lines.setVisible(false);
      phase = -1;
    },
    destroy() {
      light.bg.destroy();
      light.lines.destroy();
      dark.bg.destroy();
      dark.lines.destroy();
    },
  };
};

/**
 * Portrait strip of shot 3 (board 3a): ink band with coral edges and the visor strip `finisher-portrait`
 * frame 0 (the root monster in the visor); slides in, holds, slides out to the right as the M10 cut-in.
 */
const portrait: FxFactory = (api, event) => {
  const { scene, layout } = api.ctx;
  const { width, cutInTop: top, cutInH: h, cutInSlant: slant } = layout;
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
  if (hasFrame(api, PORTRAIT, 0)) {
    children.push(
      scene.add
        .image(Math.round(width / 2), Math.round(top + h / 2), PORTRAIT, 0)
        .setScale(PORTRAIT_SCALE),
    );
  }
  const travel = width + 2 * slant;
  const duration = event.durationMs ?? THEME.motionMs['motion.finisher-cutin'];
  const box = scene.add
    .container(-travel, 0, children)
    .setDepth(CHOREO_DEPTH.flash - 1)
    .setVisible(false);
  api.ctx.addUi(box);
  return {
    start() {
      box.setX(-travel).setVisible(true);
    },
    update(since) {
      box.setX(cutInOffset(since, duration, travel));
    },
    stop() {
      box.setVisible(false);
    },
    destroy() {
      box.destroy();
    },
  };
};

export const ROOT_MONSTER_FX: BossFxModule = {
  'ground-bulge': groundBulge,
  'root-spike': rootSpike,
  'rose-hedge': roseHedge,
  leaves: drift(LEAVES),
  petals: drift(PETALS),
  'cut-line': cutLine,
  'impact-pair': impactPair,
  portrait,
};

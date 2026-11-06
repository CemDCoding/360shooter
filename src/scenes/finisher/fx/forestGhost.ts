// Own effects of the boss `forestGhost` for its choreographies (M13, AP-186, brief H-48 part 2b): the decoys
// ("Trugbilder", pose `trug`), the shot behind her, moonlight and light points, the horizontal cut line and
// the picture shifted along the cut, the speedline ring of the main hit (AP-194) and the portrait strip of
// shot 3. The player calls them by the `name` of an `fx` event (config/choreo/forestGhost.ts). Rules as
// everywhere in the finisher: every object is made in the factory (scene start), `update` only sets values;
// no tint, no FX, no Rope (Canvas-safe); time is real time.
import type Phaser from 'phaser';
import { ASTRONAUT_ANCHORS } from '../../../config/rigs/astronaut';
import { FOREST_GHOST_RIG } from '../../../config/rigs/forestGhost';
import { THEME, themeColor } from '../../../config/theme';
import { CHOREO_DEPTH } from '../context';
import { CUTIN_EDGE, PORTRAIT_SCALE, seededRandom } from '../layout';
import { INK, WHITE, inkFrame, silhouetteFrame, type RigFigure } from '../rig';
import { cutInOffset } from '../timing';
import { FOREST_GHOST_REF_H, hitRingFx } from './hitRing';
import type { BossFxModule, FxApi, FxFactory, FxInstance } from './index';
import { ROOT_MONSTER_FX } from './rootMonster';

const GROUND = THEME.sizePx['size.rig-ground'];
/** Frames of `rig-fx-ghost`: 0 moon sparkle, 1 moon mote, 2 mist puff, 3 splinter. */
const PORTRAIT = 'finisher-portrait';
/** The visor strip of the forest ghost is image 1 (the root monster has 0, brief H-48 board 3a). */
export const PORTRAIT_FRAME = 1;
/** Particle images are drawn at this scale (8 px images). */
const PARTICLE_SCALE = 2;
/** Height of the horizontal cut through the ghost (board 4b), half length of the line (board 4c), stage px. */
export const CUT_LINE_Y = 212;
export const CUT_LINE_HALF = 110;
/** Rise of the beam from the muzzle to the ghost (board G5), stage px. */
export const BEAM_RISE = 12;

const NOOP: FxInstance = { start() {}, update() {}, stop() {}, destroy() {} };

function hasFrame(api: FxApi, key: string, frame: string | number): boolean {
  const textures = api.ctx.scene.textures;
  return textures.exists(key) && textures.get(key).has(String(frame));
}

/** Atlas frame `<sheet>-<index>` of the rig atlas, or null when the atlas or frame is not loaded. */
function atlasFrame(api: FxApi, sheet: string, index: number): string | null {
  const name = `${sheet}-${index}`;
  return hasFrame(api, api.atlas, name) ? name : null;
}

// ---------------------------------------------------------------------------------------------------
// Decoys (pose `trug` of every part, boards G2 to G4, 2a, 2b)
// ---------------------------------------------------------------------------------------------------

/** One waypoint of a decoy: `t` ms since the start of the event, foot position in stage px, alpha. */
export interface DecoyKey {
  t: number;
  x: number;
  y: number;
  alpha: number;
}

/** Decoys of the moment: they glide out of the ghost (at x 470) and circle her (G2, G3, G4). */
export const DECOY_MOMENT_1: readonly DecoyKey[] = [
  { t: 0, x: 470, y: GROUND, alpha: 0 },
  { t: 150, x: 424, y: GROUND, alpha: 0.85 },
  { t: 450, x: 390, y: GROUND, alpha: 0.85 },
  { t: 650, x: 370, y: GROUND, alpha: 0.85 },
  { t: 850, x: 370, y: GROUND, alpha: 0.85 },
];
export const DECOY_MOMENT_2: readonly DecoyKey[] = [
  { t: 0, x: 470, y: GROUND, alpha: 0 },
  { t: 150, x: 516, y: GROUND, alpha: 0.85 },
  { t: 450, x: 310, y: GROUND - 56, alpha: 0.85 },
  { t: 650, x: 300, y: GROUND - 50, alpha: 0.85 },
  { t: 850, x: 300, y: GROUND - 50, alpha: 0.85 },
];
/** Decoys of the cinematic: each steps in front of the ghost and is cut (boards 2a, 2b). */
export const DECOY_CINE_1: readonly DecoyKey[] = [
  { t: 0, x: 500, y: GROUND, alpha: 0 },
  { t: 150, x: 440, y: GROUND, alpha: 0.85 },
  { t: 400, x: 330, y: GROUND, alpha: 0.85 },
];
export const DECOY_CINE_2: readonly DecoyKey[] = [
  { t: 0, x: 500, y: GROUND, alpha: 0 },
  { t: 150, x: 440, y: GROUND, alpha: 0.6 },
  { t: 400, x: 390, y: GROUND, alpha: 0.6 },
];

/** Value of a waypoint path at `sinceMs` (linear between the waypoints, held before and after), no allocation. */
export function decoyAt(
  path: readonly DecoyKey[],
  sinceMs: number,
  out: { x: number; y: number; alpha: number },
): void {
  const last = path[path.length - 1];
  if (sinceMs >= last.t) {
    out.x = last.x;
    out.y = last.y;
    out.alpha = last.alpha;
    return;
  }
  let i = 0;
  while (i + 1 < path.length - 1 && path[i + 1].t <= sinceMs) i++;
  const a = path[i];
  const b = path[i + 1];
  const f = sinceMs <= a.t ? 0 : (sinceMs - a.t) / (b.t - a.t);
  out.x = a.x + (b.x - a.x) * f;
  out.y = a.y + (b.y - a.y) * f;
  out.alpha = a.alpha + (b.alpha - a.alpha) * f;
}

/**
 * A decoy: all seven ghost parts in their pose `trug` (outline and eyes only, dotted inside), one container
 * behind the figures. It follows `path` and is hidden when the event ends.
 */
function decoy(path: readonly DecoyKey[]): FxFactory {
  return (api) => {
    const parts = [...FOREST_GHOST_RIG.parts].sort((a, b) => a.order - b.order);
    const frames = parts.map((p) => p.poses?.trug);
    if (frames.some((f) => f === undefined || !hasFrame(api, api.atlas, f))) return NOOP;
    const { scene } = api.ctx;
    const box = scene.add
      .container(0, 0)
      .setDepth(CHOREO_DEPTH.figure - 1)
      .setScale(api.bossScale)
      .setVisible(false);
    parts.forEach((p, i) => {
      const parent = p.parent ? FOREST_GHOST_RIG.parts.find((q) => q.id === p.parent) : undefined;
      const img = scene.add
        .image((parent?.x ?? 0) + p.x, (parent?.y ?? 0) + p.y, api.atlas, frames[i] as string)
        .setOrigin(p.originX, p.originY);
      box.add(img);
    });
    api.ctx.addWorld(box);
    const at = { x: 0, y: 0, alpha: 0 };
    const place = (since: number): void => {
      decoyAt(path, since, at);
      box
        .setPosition(Math.round(api.ctx.stageX + at.x), Math.round(at.y))
        .setAlpha(Math.max(0, Math.min(1, at.alpha)));
    };
    return {
      start() {
        place(0);
        box.setVisible(true);
      },
      update(since) {
        place(since);
      },
      stop() {
        box.setVisible(false);
      },
      destroy() {
        box.destroy();
      },
    };
  };
}

// ---------------------------------------------------------------------------------------------------
// The shot behind her
// ---------------------------------------------------------------------------------------------------

/**
 * Beam from the muzzle of her raygun to the ghost (board G5). She stands turned round (mirrored), the world
 * position of the raygun gives the direction. Same band as the cut line: `finisher.slash` with the coral rim.
 */
const shotBeam: FxFactory = (api) => {
  const g = api.ctx.scene.add.graphics().setDepth(CHOREO_DEPTH.slash).setVisible(false);
  api.ctx.addWorld(g);
  const astroScale = THEME.sizeCount['size.rig-scale-astronaut'];
  const core = THEME.sizePx['size.rig-slash'] * astroScale;
  const rim = THEME.sizePx['size.rig-slash-rim'] * astroScale;
  const muzzle = ASTRONAUT_ANCHORS.muzzle.a0;
  const tmp = { x: 0, y: 0, angle: 0, scaleX: 1, scaleY: 1 };
  return {
    start() {
      const astro = api.figure('astronaut');
      const boss = api.boss();
      const gun = astro ? astro.partIndex('raygun') : -1;
      if (!astro || !boss || gun < 0) return;
      const w = astro.worldOf(gun, tmp);
      const x1 = Math.round(w.x + w.scaleX * muzzle[0]);
      const y1 = Math.round(w.y + w.scaleY * muzzle[1]);
      const x2 = Math.round(boss.container.x);
      const y2 = y1 - BEAM_RISE;
      g.clear();
      g.lineStyle(core + 2 * rim, THEME.colors['finisher.slash-rim'].num, 1);
      g.lineBetween(x1, y1, x2, y2);
      g.lineStyle(core, THEME.colors['finisher.slash'].num, 1);
      g.lineBetween(x1, y1, x2, y2);
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

// ---------------------------------------------------------------------------------------------------
// Moonlight and light points (rise from the ghost)
// ---------------------------------------------------------------------------------------------------

interface RiseConfig {
  /** Indices in `rig-fx-ghost` (0 sparkle, 1 mote). */
  frames: readonly number[];
  count: number;
  /** Start box around the ghost, in px of the 48 px ghost image (times the boss scale). */
  halfWidth: number;
  yTop: number;
  yBottom: number;
  /** Speed up (px/s at boss scale 3). */
  vyMin: number;
  vyMax: number;
  lifeMinMs: number;
  lifeMaxMs: number;
  sway: number;
  seed: number;
}

/** Moonlight flows up out of the dissolving ghost (boards G7, G8, 5a). */
export const MOONLIGHT: RiseConfig = {
  frames: [0, 1, 1],
  count: 30,
  halfWidth: 14,
  yTop: 44,
  yBottom: 4,
  vyMin: 30,
  vyMax: 80,
  lifeMinMs: 900,
  lifeMaxMs: 1400,
  sway: 5,
  seed: 31,
};

/** A few light points are left in the clear night (board 5b). */
export const LIGHTS: RiseConfig = {
  frames: [1],
  count: 8,
  halfWidth: 60,
  yTop: 30,
  yBottom: 2,
  vyMin: 20,
  vyMax: 50,
  lifeMinMs: 1000,
  lifeMaxMs: 1400,
  sway: 4,
  seed: 47,
};

function rise(cfg: RiseConfig): FxFactory {
  return (api, event) => {
    const frames = cfg.frames.map((i) => atlasFrame(api, 'rig-fx-ghost', i));
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
        const boss = api.boss();
        bx = boss ? boss.container.x : api.ctx.stageX + api.ctx.layout.width / 2;
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
          const y = GROUND + y0[i] - (vy[i] * age) / 1000;
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
// Cut line, picture shifted along the cut, portrait strip
// ---------------------------------------------------------------------------------------------------

/**
 * Horizontal cut line of the moon sickle through the ghost (board 4c). Same band as the built-in one:
 * `finisher.slash` with the coral rim, thickness `size.rig-slash` times the boss scale.
 */
const cutLine: FxFactory = (api) => {
  const g = api.ctx.scene.add.graphics().setDepth(CHOREO_DEPTH.slash).setVisible(false);
  api.ctx.addWorld(g);
  const core = THEME.sizePx['size.rig-slash'] * api.bossScale;
  const rim = THEME.sizePx['size.rig-slash-rim'] * api.bossScale;
  return {
    start() {
      const boss = api.boss();
      if (!boss) return;
      const x = Math.round(boss.container.x - CUT_LINE_HALF);
      const y = Math.round(CUT_LINE_Y - core / 2);
      g.clear();
      g.fillStyle(THEME.colors['finisher.slash-rim'].num, 1);
      g.fillRect(x, y - rim, 2 * CUT_LINE_HALF, core + 2 * rim);
      g.fillStyle(THEME.colors['finisher.slash'].num, 1);
      g.fillRect(x, y, 2 * CUT_LINE_HALF, core);
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

/** Shift (px) of the upper half along the cut: 14 at the hit, 18 after 1200 ms, back to 0 by 2400 ms. */
export const SPLIT_SHIFT: readonly [number, number] = [14, 18];
export const SPLIT_GROW_MS: readonly [number, number] = [200, 1200];
export const SPLIT_BACK_MS: readonly [number, number] = [2000, 2400];

export function splitShift(sinceMs: number): number {
  const [lo, hi] = SPLIT_SHIFT;
  const [growFrom, growTo] = SPLIT_GROW_MS;
  const [backFrom, backTo] = SPLIT_BACK_MS;
  if (sinceMs <= growFrom) return lo;
  if (sinceMs <= growTo)
    return Math.round(lo + ((hi - lo) * (sinceMs - growFrom)) / (growTo - growFrom));
  if (sinceMs <= backFrom) return hi;
  if (sinceMs >= backTo) return 0;
  return Math.round(hi * (1 - (sinceMs - backFrom) / (backTo - backFrom)));
}

/** Frame the figure shows for part `i` right now, with the hit-white mode (ink or white silhouette). */
function shownFrame(fig: RigFigure, i: number): string {
  const part = fig.parts[i];
  const frame = fig.frameOf(i);
  const mode = fig.white[i];
  if (mode === INK) return inkFrame(part, frame);
  if (mode === WHITE) return silhouetteFrame(part, frame);
  return frame;
}

/**
 * The picture is shifted along the cut (board 4b, 4c): for every part a second image sits in the figure
 * container; the original keeps the lower half (crop), the copy shows the upper half moved sideways. The cut
 * is the horizontal line `CUT_LINE_Y`. A movement, no flash: "reduce effects" keeps it.
 */
const cutSplit: FxFactory = (api) => {
  const fig = api.boss();
  if (!fig || !fig.atlasLoaded) return NOOP;
  const n = fig.images.length;
  const clones: Phaser.GameObjects.Image[] = [];
  const shown: string[] = new Array<string>(n).fill('');
  const cropped = new Uint8Array(n);
  for (let i = 0; i < n; i++) {
    const p = fig.parts[i];
    const img = api.ctx.scene.add
      .image(0, 0, api.atlas, p.frame)
      .setOrigin(p.originX, p.originY)
      .setVisible(false);
    fig.container.add(img);
    clones.push(img);
  }
  const restore = (): void => {
    for (let i = 0; i < n; i++) {
      fig.images[i].setCrop().setVisible(true);
      cropped[i] = 0;
      clones[i].setVisible(false);
    }
  };
  return {
    start() {
      cropped.fill(0);
      shown.fill('');
    },
    update(since) {
      const box = fig.container;
      const sx = box.scaleX;
      const sy = box.scaleY;
      if (sx === 0 || sy <= 0) return;
      const dx = splitShift(since) / sx;
      const cutLocal = (CUT_LINE_Y - box.y) / sy;
      for (let i = 0; i < n; i++) {
        const img = fig.images[i];
        const clone = clones[i];
        const p = fig.parts[i];
        const frame = shownFrame(fig, i);
        if (frame !== shown[i]) {
          shown[i] = frame;
          clone.setFrame(frame);
        }
        const h = img.height;
        const w = img.width;
        const iy = img.scaleY;
        const cutPx = iy > 0 ? (cutLocal - img.y) / iy + p.originY * h : h;
        clone
          .setPosition(img.x + dx, img.y)
          .setScale(img.scaleX, img.scaleY)
          .setAngle(img.angle)
          .setAlpha(img.alpha)
          .setDepth(img.depth);
        if (cutPx <= 0) {
          // The part lies completely below the cut.
          clone.setVisible(false);
          if (cropped[i] === 1) {
            img.setCrop();
            cropped[i] = 0;
          }
          img.setVisible(true);
        } else if (cutPx >= h) {
          // The part lies completely above the cut: only the shifted copy is shown.
          clone.setCrop();
          clone.setVisible(true);
          img.setVisible(false);
        } else {
          clone.setCrop(0, 0, w, cutPx).setVisible(true);
          img.setCrop(0, cutPx, w, h - cutPx).setVisible(true);
          cropped[i] = 1;
        }
      }
    },
    stop() {
      restore();
    },
    destroy() {
      restore();
      for (const c of clones) c.destroy();
      clones.length = 0;
    },
  };
};

/**
 * Portrait strip of shot 3 (board 3a): ink band with coral edges and the visor strip `finisher-portrait`
 * frame 1 (the forest ghost in the visor); slides in, holds, slides out to the right as the M10 cut-in.
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
  if (hasFrame(api, PORTRAIT, PORTRAIT_FRAME)) {
    children.push(
      scene.add
        .image(Math.round(width / 2), Math.round(top + h / 2), PORTRAIT, PORTRAIT_FRAME)
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

export const FOREST_GHOST_FX: BossFxModule = {
  'decoy-moment-1': decoy(DECOY_MOMENT_1),
  'decoy-moment-2': decoy(DECOY_MOMENT_2),
  'decoy-cine-1': decoy(DECOY_CINE_1),
  'decoy-cine-2': decoy(DECOY_CINE_2),
  'shot-beam': shotBeam,
  moonlight: rise(MOONLIGHT),
  lights: rise(LIGHTS),
  'cut-line': cutLine,
  'cut-split': cutSplit,
  // The one light-dark pair of the cinematic (decision 7a): same picture as for the root monster.
  'impact-pair': ROOT_MONSTER_FX['impact-pair'],
  portrait,
  // Speedline ring of the main hit of the moment (AP-194): hit point on the ghost, 48 px reference height.
  'hit-ring': hitRingFx({ refH: FOREST_GHOST_REF_H }),
};

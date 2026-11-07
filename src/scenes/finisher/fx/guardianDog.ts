// Own effects of the boss `guardianDog` for its choreographies (M13, AP-189, brief H-48 part 2b): the torches of the
// grave chamber, the band of grave light, the runes that rise from the collar, the sparks of torch light that flow
// into the blade, the portrait strip of shot 3, the ring centre on the collar and the impact pair of the cinematic.
// The player calls them by the `name` of an `fx` event (config/choreo/guardianDog.ts). The speedline ring is the
// shared block of AP-194 (`hit-ring`), the light-dark impact pair is the one of the root monster (it only uses
// the boss figure). The night world and the letterbox are a separate shared block and not part of this file.
// Rules as everywhere in the finisher: every object is made in the factory (scene start), `update` only sets
// values (frames are cached, nothing is built per frame); no tint, no FX, no Rope (Canvas-safe); time is real time.
import type Phaser from 'phaser';
import { THEME, themeColor } from '../../../config/theme';
import { CHOREO_DEPTH } from '../context';
import { CUTIN_EDGE, PORTRAIT_SCALE, seededRandom } from '../layout';
import { cutInOffset } from '../timing';
import { BOSS_REF_H, hitRingFx } from './hitRing';
import type { BossFxModule, FxApi, FxFactory, FxInstance } from './index';
import { ROOT_MONSTER_FX } from './rootMonster';

const GROUND = THEME.sizePx['size.rig-ground'];
const MOMENT_SCALE = THEME.sizeCount['size.rig-scale-boss-moment'];
const MOMENT_X_BOSS = THEME.sizePx['size.rig-boss-x-moment'];
const ATLAS_FX = 'rig-fx-dog';
const TORCH = 'rig-prop-torch';
const PORTRAIT = 'finisher-portrait';
/** Image 4 of `finisher-portrait`: the guardian dog in the visor. */
export const PORTRAIT_FRAME = 4;
/** Particle images are drawn at this scale (8 px images). */
const PARTICLE_SCALE = 2;
const RUNE_SCALE = 3;

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

function figureX(api: FxApi, rigId: 'astronaut' | 'guardianDog'): number {
  const fig = api.figure(rigId);
  return fig ? fig.container.x : api.ctx.stageX + api.ctx.layout.width / 2;
}

function graphics(api: FxApi, depth: number): Phaser.GameObjects.Graphics {
  const g = api.ctx.scene.add.graphics().setDepth(depth).setVisible(false);
  api.ctx.addWorld(g);
  return g;
}

// ---------------------------------------------------------------------------------------------------
// Torches (boards H1 to H9, 1a to 5c)
// ---------------------------------------------------------------------------------------------------

/** Hang height of the torches: foot of the image, px above the ground line (design value of the mockup). */
export const TORCH_Y = GROUND - 120;
/** The flame glow sits this far above the foot (mockup: ground - 160). */
export const TORCH_GLOW = { dy: -40, r: 34, squash: 0.8, alpha: 0.18 } as const;
/** The two burning frames swap in this beat (stepped flicker). */
export const TORCH_FLICKER_MS = 250;
/** Places of the torches (px of the stage): the moment has two, the cinematic four. */
export const TORCHES_MOMENT = [60, 590] as const;
export const TORCHES_CINE = [60, 180, 460, 580] as const;
/** Cinematic: outer pair ignites in board 3a, inner pair in board 3b (ms since the start). */
export const TORCH_IGNITE_CINE: readonly number[] = [6100, 7100, 7100, 6100];
const TORCH_IGNITE_MOMENT: readonly number[] = [0, 0];

function torches(xs: readonly number[], ignite: readonly number[]): FxFactory {
  return (api) => {
    const names = [0, 1, 2].map((i) => `${TORCH}-${i}`);
    if (!names.every((n) => hasFrame(api, api.atlas, n))) return NOOP;
    const n = xs.length;
    const imgs: Phaser.GameObjects.Image[] = [];
    const glows: Phaser.GameObjects.Graphics[] = [];
    const colour = themeColor('gold.400').num;
    for (let i = 0; i < n; i++) {
      const x = Math.round(api.ctx.stageX + xs[i]);
      const img = api.ctx.scene.add
        .image(x, TORCH_Y, api.atlas, names[0])
        .setOrigin(0.5, 1)
        .setScale(MOMENT_SCALE)
        .setDepth(CHOREO_DEPTH.ground)
        .setVisible(false);
      api.ctx.addWorld(img);
      imgs.push(img);
      const g = graphics(api, CHOREO_DEPTH.ground - 1);
      g.fillStyle(colour, TORCH_GLOW.alpha).fillEllipse(
        0,
        0,
        TORCH_GLOW.r * 2,
        TORCH_GLOW.r * 2 * TORCH_GLOW.squash,
      );
      g.setPosition(x, TORCH_Y + TORCH_GLOW.dy);
      glows.push(g);
    }
    const shown = new Int8Array(n).fill(-1);
    return {
      start() {
        shown.fill(-1);
        for (const img of imgs) img.setVisible(true);
      },
      update(since) {
        const beat = Math.floor(since / TORCH_FLICKER_MS);
        for (let i = 0; i < n; i++) {
          const lit = since >= ignite[i];
          const frame = lit ? 1 + ((beat + i) % 2) : 0;
          if (frame === shown[i]) continue;
          shown[i] = frame;
          imgs[i].setFrame(names[frame]);
          glows[i].setVisible(lit);
        }
      },
      stop() {
        for (const img of imgs) img.setVisible(false);
        for (const g of glows) g.setVisible(false);
        shown.fill(-1);
      },
      destroy() {
        for (const img of imgs) img.destroy();
        for (const g of glows) g.destroy();
        imgs.length = 0;
        glows.length = 0;
      },
    };
  };
}

// ---------------------------------------------------------------------------------------------------
// Grave light (boards 5b, 5c)
// ---------------------------------------------------------------------------------------------------

/**
 * The band of grave light falls from the opened ceiling (design values of the mockup): half width in px, opening in
 * two hard steps, outer edge `finisher.title`, core `finisher.paper`. Offset from the boss stand.
 */
export const GRAVE_LIGHT = {
  dx: -20,
  alpha: 0.8,
  haloAlpha: 0.5,
  stages: [
    { fromMs: 0, half: 30 },
    { fromMs: 300, half: 60 },
  ],
} as const;

const graveLight: FxFactory = (api) => {
  const pad = THEME.sizePx['size.finisher-shake'];
  const top = -pad;
  const h = GROUND - top;
  const halo = themeColor('finisher.title');
  const core = themeColor('finisher.paper');
  const steps = GRAVE_LIGHT.stages.map((st) => {
    const g = graphics(api, CHOREO_DEPTH.figure - 3);
    g.fillStyle(halo.num, GRAVE_LIGHT.haloAlpha * GRAVE_LIGHT.alpha).fillRect(
      -st.half,
      top,
      st.half * 2,
      h,
    );
    const inner = Math.round(st.half / 3);
    g.fillStyle(core.num, GRAVE_LIGHT.alpha).fillRect(-inner, top, inner * 2, h);
    return g;
  });
  const starts = GRAVE_LIGHT.stages.map((s) => s.fromMs);
  let shown = -1;
  const show = (i: number): void => {
    shown = i;
    for (let k = 0; k < steps.length; k++) steps[k].setVisible(k === i);
  };
  return {
    start() {
      const x = Math.round(figureX(api, 'guardianDog') + GRAVE_LIGHT.dx);
      for (const g of steps) g.setPosition(x, 0);
      show(0);
    },
    update(since) {
      const i = stageAt(starts, since);
      if (i !== shown) show(i);
    },
    stop() {
      for (const g of steps) g.setVisible(false);
      shown = -1;
    },
    destroy() {
      for (const g of steps) g.destroy();
    },
  };
};

// ---------------------------------------------------------------------------------------------------
// Rising motes: runes of the collar (boards H7, H8), torch light into the blade (board 3b)
// ---------------------------------------------------------------------------------------------------

interface MoteConfig {
  /** Frame of `rig-fx-dog`. */
  frame: number;
  scale: number;
  count: number;
  /** Start delay of mote i = i * gapMs. */
  gapMs: number;
  lifeMs: number;
  steps: number;
  /** Repeats after its life (torch sparks) or goes out after one rise (runes). */
  loop: boolean;
  /** Which figure the x range hangs on, and the range (px) around it. */
  anchor: 'guardianDog' | 'astronaut';
  dxMin: number;
  dxMax: number;
  /** Start and end height as px above the ground line. */
  fromUp: number;
  toUp: number;
  seed: number;
}

/** Runes leave the collar and go out one after the other (board H7, H8: boxes x -80..+20, 130..210 above ground). */
export const RUNE_RISE: MoteConfig = {
  frame: 0,
  scale: RUNE_SCALE,
  count: 7,
  gapMs: 70,
  lifeMs: 450,
  steps: 5,
  loop: false,
  anchor: 'guardianDog',
  dxMin: -80,
  dxMax: 20,
  fromUp: 130,
  toUp: 210,
  seed: 7,
};

/** Light of the inner torches flows as sparks to the blade (board 3b: boxes 150..230 above ground). */
export const LIGHT_SPARKS: MoteConfig = {
  frame: 3,
  scale: PARTICLE_SCALE,
  count: 10,
  gapMs: 90,
  lifeMs: 600,
  steps: 6,
  loop: true,
  anchor: 'astronaut',
  dxMin: -40,
  dxMax: 140,
  fromUp: 70,
  toUp: 150,
  seed: 31,
};

function motes(cfg: MoteConfig): FxFactory {
  return (api) => {
    const name = `${ATLAS_FX}-${cfg.frame}`;
    if (!hasFrame(api, api.atlas, name)) return NOOP;
    const n = cfg.count;
    const rnd = seededRandom(api.ctx.data.levelId * 131 + cfg.seed);
    const dx = new Float64Array(n);
    for (let i = 0; i < n; i++) dx[i] = cfg.dxMin + rnd() * (cfg.dxMax - cfg.dxMin);
    const imgs: Phaser.GameObjects.Image[] = [];
    for (let i = 0; i < n; i++) {
      const img = api.ctx.scene.add
        .image(0, 0, api.atlas, name)
        .setDepth(CHOREO_DEPTH.particles)
        .setScale(cfg.scale)
        .setVisible(false);
      api.ctx.addWorld(img);
      imgs.push(img);
    }
    const live = new Int8Array(n);
    let ax = 0;
    return {
      start() {
        ax = figureX(api, cfg.anchor);
        live.fill(0);
      },
      update(since) {
        for (let i = 0; i < n; i++) {
          let age = since - i * cfg.gapMs;
          let on = age >= 0;
          if (on && age >= cfg.lifeMs) {
            if (cfg.loop) age %= cfg.lifeMs;
            else on = false;
          }
          if (!on) {
            if (live[i] === 1) {
              live[i] = 0;
              imgs[i].setVisible(false);
            }
            continue;
          }
          live[i] = 1;
          const u =
            Math.min(cfg.steps - 1, Math.floor((age / cfg.lifeMs) * cfg.steps)) / (cfg.steps - 1);
          const up = cfg.fromUp + (cfg.toUp - cfg.fromUp) * u;
          imgs[i].setPosition(Math.round(ax + dx[i]), Math.round(GROUND - up)).setVisible(true);
        }
      },
      stop() {
        for (const img of imgs) img.setVisible(false);
        live.fill(0);
      },
      destroy() {
        for (const img of imgs) img.destroy();
        imgs.length = 0;
      },
    };
  };
}

// ---------------------------------------------------------------------------------------------------
// Ring centre (board H6)
// ---------------------------------------------------------------------------------------------------

/** Hit point of the ring: the collar, left of and above the dog stand (px of the stage at the moment scale). */
export const RING_OFFSET = { dx: -40, dy: -110 } as const;

export function ringCentre(api: FxApi, out: { x: number; y: number }): void {
  const boss = api.boss();
  out.x = (boss ? boss.container.x : api.ctx.stageX + MOMENT_X_BOSS) + RING_OFFSET.dx;
  out.y = GROUND + RING_OFFSET.dy;
}

// ---------------------------------------------------------------------------------------------------
// Portrait strip (board 3a)
// ---------------------------------------------------------------------------------------------------

/**
 * Portrait strip of shot 3 (board 3a): ink band with coral edges and the visor strip `finisher-portrait`
 * frame 4 (the dog in the visor); slides in, holds, slides out to the right as the M10 cut-in.
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

export const GUARDIAN_DOG_FX: BossFxModule = {
  'torches-moment': torches(TORCHES_MOMENT, TORCH_IGNITE_MOMENT),
  'torches-cine': torches(TORCHES_CINE, TORCH_IGNITE_CINE),
  'grave-light': graveLight,
  'rune-rise': motes(RUNE_RISE),
  'light-sparks': motes(LIGHT_SPARKS),
  portrait,
  // The one light-dark pair of the cinematic does not depend on the boss: the factory of the root monster.
  'impact-pair': ROOT_MONSTER_FX['impact-pair'],
  // Speedline ring of the main hit of the moment (AP-194): reference height 64 px, centre on the collar.
  'hit-ring': hitRingFx({ refH: BOSS_REF_H, centre: ringCentre }),
};

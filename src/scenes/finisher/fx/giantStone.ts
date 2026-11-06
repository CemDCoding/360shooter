// Own effects of the boss `giantStone` for its choreographies (M13, AP-187, brief H-48 part 2b): the narrow band of
// morning light, the shot into the sky, the shadow over the astronaut, the stars that gather to the hammer and
// stay in the sky, the portrait strip of shot 3 (the giant in the visor). The player calls them by the `name` of
// an `fx` event (config/choreo/giantStone.ts). The speedline ring is the shared block of AP-194 (`hit-ring`), the
// light-dark impact pair of the cinematic is the one of the root monster (it only uses the boss figure).
// Rules as everywhere in the finisher: every object is made in the factory (scene start), `update` only sets
// values; no tint, no FX, no Rope (Canvas-safe); time is real time.
import type Phaser from 'phaser';
import { THEME, themeColor } from '../../../config/theme';
import { ASTRONAUT_ANCHORS, ASTRONAUT_RIG } from '../../../config/rigs/astronaut';
import { CHOREO_DEPTH } from '../context';
import { CUTIN_EDGE, PORTRAIT_SCALE, seededRandom } from '../layout';
import { cutInOffset } from '../timing';
import { BOSS_REF_H, hitRingFx } from './hitRing';
import { ROOT_MONSTER_FX } from './rootMonster';
import type { BossFxModule, FxApi, FxFactory, FxInstance } from './index';

const GROUND = THEME.sizePx['size.rig-ground'];
const ASTRO_SCALE = THEME.sizeCount['size.rig-scale-astronaut'];
/** Largest fine angle (token `size.rig-fine-rotate`): the arm of the sky shot is raised this far (see the choreography). */
const ARM_UP = THEME.sizeCount['size.rig-fine-rotate'];
const ATLAS_FX = 'rig-fx-stone';
/** Image 5 of `rig-fx-stone`: light spark (the stars). */
const STAR_FRAME = 5;
const PORTRAIT = 'finisher-portrait';
/** Image 2 of `finisher-portrait`: the giant in the visor. */
export const PORTRAIT_FRAME = 2;
/** Particle images are drawn at this scale (8 px images). */
const PARTICLE_SCALE = 2;

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

function figureX(api: FxApi, rigId: 'astronaut' | 'giantStone'): number {
  const fig = api.figure(rigId);
  return fig ? fig.container.x : api.ctx.stageX + api.ctx.layout.width / 2;
}

function graphics(api: FxApi, depth: number): Phaser.GameObjects.Graphics {
  const g = api.ctx.scene.add.graphics().setDepth(depth).setVisible(false);
  api.ctx.addWorld(g);
  return g;
}

// ---------------------------------------------------------------------------------------------------
// Morning light (boards S5 to S7)
// ---------------------------------------------------------------------------------------------------

/**
 * The band of morning light falls on the giant at the main hit and gets thinner in three steps while the cracks
 * glow (design values of the mockup, half width in px, never wider than 1/6 of the picture; the alpha steps are
 * stepped, no soft ramp). `fromMs`: real time since the start of the effect.
 */
export const LIGHT_STAGES: readonly { fromMs: number; half: number; alpha: number }[] = [
  { fromMs: 0, half: 36, alpha: 1 },
  { fromMs: 600, half: 30, alpha: 0.6 },
  { fromMs: 1200, half: 24, alpha: 0.3 },
];
/** The wide edge of the band (`finisher.title`) is this see-through; the core (`finisher.paper`) is solid. */
export const LIGHT_HALO_ALPHA = 0.55;

/** Vertical band from above the picture to the ground: Graphics, one per step, drawn once (no allocation in update). */
const morningLight: FxFactory = (api) => {
  const pad = THEME.sizePx['size.finisher-shake'];
  const top = -pad;
  const h = GROUND - top;
  const halo = themeColor('finisher.title');
  const core = themeColor('finisher.paper');
  const steps = LIGHT_STAGES.map((st) => {
    const g = graphics(api, CHOREO_DEPTH.figure - 3);
    g.fillStyle(halo.num, LIGHT_HALO_ALPHA * st.alpha).fillRect(-st.half, top, st.half * 2, h);
    const inner = Math.round(st.half / 3);
    g.fillStyle(core.num, st.alpha).fillRect(-inner, top, inner * 2, h);
    return g;
  });
  const starts = LIGHT_STAGES.map((s) => s.fromMs);
  let shown = -1;
  const show = (i: number): void => {
    shown = i;
    for (let k = 0; k < steps.length; k++) steps[k].setVisible(k === i);
  };
  return {
    start() {
      const x = Math.round(figureX(api, 'giantStone'));
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
// Sky shot (board S4)
// ---------------------------------------------------------------------------------------------------

/**
 * Muzzle of the raygun in the sky pose (offset from the feet of the astronaut, px of the stage): arm pivot plus
 * grip plus muzzle of the pose `up45` (ASTRONAUT_ANCHORS), turned with the arm by `-size.rig-fine-rotate` degrees,
 * at the astronaut scale. The beam leaves at `-(45 + ARM_UP)` degrees.
 */
export function skyMuzzle(): { dx: number; dy: number; angle: number } {
  const arm = ASTRONAUT_RIG.parts.find((p) => p.id === 'arm-front');
  const grip = ASTRONAUT_ANCHORS['arm-front'].aim.raygun;
  const muzzle = ASTRONAUT_ANCHORS.muzzle.up45;
  const rad = (-ARM_UP * Math.PI) / 180;
  const lx = grip.x + muzzle[0];
  const ly = grip.y + muzzle[1];
  const rx = lx * Math.cos(rad) - ly * Math.sin(rad);
  const ry = lx * Math.sin(rad) + ly * Math.cos(rad);
  return {
    dx: ((arm?.x ?? 0) + rx) * ASTRO_SCALE,
    dy: ((arm?.y ?? 0) + ry) * ASTRO_SCALE,
    angle: ASTRONAUT_ANCHORS.gunAngles.up45 - ARM_UP,
  };
}

/** The beam of the sky shot: the cut-line colours (`finisher.slash` core, coral rim) from the muzzle up past the top edge. */
const skyShot: FxFactory = (api) => {
  const g = graphics(api, CHOREO_DEPTH.slash);
  const core = THEME.sizePx['size.rig-slash'] * ASTRO_SCALE;
  const rim = core + 2 * THEME.sizePx['size.rig-slash-rim'] * ASTRO_SCALE;
  const m = skyMuzzle();
  const dirX = Math.cos((m.angle * Math.PI) / 180);
  const dirY = Math.sin((m.angle * Math.PI) / 180);
  return {
    start() {
      const fig = api.figure('astronaut');
      const x0 = Math.round((fig ? fig.container.x : 0) + m.dx);
      const y0 = Math.round((fig ? fig.container.y : GROUND) + m.dy);
      const top = -THEME.sizePx['size.finisher-shake'];
      const len = (y0 - top) / -dirY;
      const x1 = Math.round(x0 + dirX * len);
      g.clear();
      g.lineStyle(rim, THEME.colors['finisher.slash-rim'].num, 1);
      g.lineBetween(x0, y0, x1, top);
      g.lineStyle(core, THEME.colors['finisher.slash'].num, 1);
      g.lineBetween(x0, y0, x1, top);
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
// Shadow (board 1c)
// ---------------------------------------------------------------------------------------------------

/** His shadow over her (design values of the mockup): offset from her feet, radii, `finisher.ink` alpha. */
export const SHADOW = { dx: 60, dy: -40, rx: 130, ry: 90, alpha: 0.4 } as const;

const shadow: FxFactory = (api, event) => {
  const g = graphics(api, CHOREO_DEPTH.particles);
  g.fillStyle(themeColor('finisher.ink').num, SHADOW.alpha).fillEllipse(
    0,
    0,
    SHADOW.rx * 2,
    SHADOW.ry * 2,
  );
  const half = (event.durationMs ?? 700) / 2;
  let late = false;
  return {
    start() {
      g.setPosition(Math.round(figureX(api, 'astronaut') + SHADOW.dx), GROUND + SHADOW.dy);
      g.setAlpha(1).setVisible(true);
      late = false;
    },
    // Two hard steps (full, then half), no soft ramp.
    update(since) {
      const l = since >= half;
      if (l !== late) {
        late = l;
        g.setAlpha(l ? 0.5 : 1);
      }
    },
    stop() {
      g.setVisible(false);
    },
    destroy() {
      g.destroy();
    },
  };
};

// ---------------------------------------------------------------------------------------------------
// Stars (boards 3b, 3c, 5b)
// ---------------------------------------------------------------------------------------------------

/** Stars that gather to the hammer: count, start radius and end radius range (px), time to gather. */
export const GATHER = {
  count: 14,
  r0Min: 90,
  r0Max: 130,
  r1Min: 20,
  r1Max: 50,
  moveMs: 1300,
  steps: 8,
  /** Hammer centre: offset from her feet. */
  dx: -20,
  dy: -120,
  seed: 31,
} as const;

/** Stars of the hammer that stay in the sky: count, box of the sky (px of the stage), flight and twinkle times. */
export const SKY = {
  count: 14,
  xMin: 120,
  xMax: 600,
  yMin: 60,
  yMax: 150,
  delayMaxMs: 600,
  flightMs: 500,
  twinkleMs: 330,
  steps: 8,
  /** Where the stars rise from: offset from her feet. */
  fromDy: -80,
  seed: 52,
} as const;

function starImages(api: FxApi, n: number): Phaser.GameObjects.Image[] | null {
  if (!hasFrame(api, api.atlas, `${ATLAS_FX}-${STAR_FRAME}`)) return null;
  const imgs: Phaser.GameObjects.Image[] = [];
  for (let i = 0; i < n; i++) {
    const img = api.ctx.scene.add
      .image(0, 0, api.atlas, `${ATLAS_FX}-${STAR_FRAME}`)
      .setDepth(CHOREO_DEPTH.particles)
      .setScale(PARTICLE_SCALE)
      .setVisible(false);
    api.ctx.addWorld(img);
    imgs.push(img);
  }
  return imgs;
}

/** Light sparks sink in from a wide ring to the hammer above her, in `GATHER.steps` steps (pixel-crisp). */
const starGather: FxFactory = (api) => {
  const imgs = starImages(api, GATHER.count);
  if (!imgs) return NOOP;
  const n = GATHER.count;
  const rnd = seededRandom(api.ctx.data.levelId * 131 + GATHER.seed);
  const cos = new Float64Array(n);
  const sin = new Float64Array(n);
  const r0 = new Float64Array(n);
  const r1 = new Float64Array(n);
  for (let i = 0; i < n; i++) {
    const a = ((i + rnd()) / n) * Math.PI * 2;
    cos[i] = Math.cos(a);
    sin[i] = Math.sin(a);
    r0[i] = GATHER.r0Min + rnd() * (GATHER.r0Max - GATHER.r0Min);
    r1[i] = GATHER.r1Min + rnd() * (GATHER.r1Max - GATHER.r1Min);
  }
  let cx = 0;
  let cy = 0;
  let last = -1;
  const place = (u: number): void => {
    for (let i = 0; i < n; i++) {
      const r = r0[i] + (r1[i] - r0[i]) * u;
      imgs[i].setPosition(Math.round(cx + cos[i] * r), Math.round(cy + sin[i] * r));
    }
  };
  return {
    start() {
      cx = figureX(api, 'astronaut') + GATHER.dx;
      cy = GROUND + GATHER.dy;
      last = 0;
      place(0);
      for (const img of imgs) img.setVisible(true);
    },
    update(since) {
      const step = Math.min(GATHER.steps, Math.floor((since / GATHER.moveMs) * GATHER.steps));
      if (step === last) return;
      last = step;
      place(step / GATHER.steps);
    },
    stop() {
      for (const img of imgs) img.setVisible(false);
    },
    destroy() {
      for (const img of imgs) img.destroy();
      imgs.length = 0;
    },
  };
};

/** The stars of the hammer rise to their places in the sky and twinkle there (two steps of alpha). */
const skyStars: FxFactory = (api) => {
  const imgs = starImages(api, SKY.count);
  if (!imgs) return NOOP;
  const n = SKY.count;
  const rnd = seededRandom(api.ctx.data.levelId * 131 + SKY.seed);
  const tx = new Float64Array(n);
  const ty = new Float64Array(n);
  const delay = new Float64Array(n);
  const phase = new Float64Array(n);
  for (let i = 0; i < n; i++) {
    tx[i] = SKY.xMin + rnd() * (SKY.xMax - SKY.xMin);
    ty[i] = SKY.yMin + rnd() * (SKY.yMax - SKY.yMin);
    delay[i] = rnd() * SKY.delayMaxMs;
    phase[i] = rnd() * SKY.twinkleMs * 2;
  }
  let fx = 0;
  let fy = 0;
  const live = new Int8Array(n);
  const tw = new Int8Array(n);
  return {
    start() {
      fx = figureX(api, 'astronaut');
      fy = GROUND + SKY.fromDy;
      live.fill(0);
      tw.fill(-1);
    },
    update(since) {
      for (let i = 0; i < n; i++) {
        const age = since - delay[i];
        if (age < 0) continue;
        if (live[i] === 0) {
          live[i] = 1;
          imgs[i].setVisible(true);
        }
        const u = Math.min(SKY.steps, Math.floor((age / SKY.flightMs) * SKY.steps)) / SKY.steps;
        imgs[i].setPosition(Math.round(fx + (tx[i] - fx) * u), Math.round(fy + (ty[i] - fy) * u));
        const t = u >= 1 ? Math.floor((age + phase[i]) / SKY.twinkleMs) % 2 : 0;
        if (t !== tw[i]) {
          tw[i] = t;
          imgs[i].setAlpha(t === 0 ? 1 : 0.6);
        }
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

// ---------------------------------------------------------------------------------------------------
// Portrait strip (board 3a)
// ---------------------------------------------------------------------------------------------------

/**
 * Portrait strip of shot 3 (board 3a): ink band with coral edges and the visor strip `finisher-portrait`
 * frame 2 (the giant in the visor); slides in, holds, slides out to the right as the M10 cut-in. Same strip as
 * the one of the root monster, only the frame differs.
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

export const GIANT_STONE_FX: BossFxModule = {
  'morning-light': morningLight,
  'sky-shot': skyShot,
  shadow,
  'star-gather': starGather,
  'sky-stars': skyStars,
  portrait,
  // The light-dark pair of the cinematic (decision 7a): the same block as the root monster's, it only needs the boss figure.
  'impact-pair': ROOT_MONSTER_FX['impact-pair'],
  // Speedline ring of the main hit of the moment (AP-194): hit point on the body, boss x, ground - 96.
  'hit-ring': hitRingFx({ refH: BOSS_REF_H }),
};

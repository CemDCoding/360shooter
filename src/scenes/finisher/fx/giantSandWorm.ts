// Own effects of the boss `giantSandWorm` for its choreographies (M13, AP-188, brief H-48 part 2b): the sand
// wave in front of the breakthrough, the sand cover that hides the sunk links, the beam of the shot down, the
// speedline ring on the head, the portrait strip and the impact pair of the cinematic. The player calls them
// by the `name` of an `fx` event (config/choreo/giantSandWorm.ts). Rules as everywhere in the finisher: every
// object is made in the factory (scene start), `update` only sets values; no tint, no FX, no Rope
// (Canvas-safe); time is real time.
import type Phaser from 'phaser';
import { THEME, themeColor } from '../../../config/theme';
import { CHOREO_DEPTH } from '../context';
import { CUTIN_EDGE, PORTRAIT_SCALE } from '../layout';
import { cutInOffset } from '../timing';
import { BOSS_REF_H, hitRingFx } from './hitRing';
import type { BossFxModule, FxApi, FxFactory, FxInstance } from './index';
import { ROOT_MONSTER_FX } from './rootMonster';

const GROUND = THEME.sizePx['size.rig-ground'];
const WAVE = 'rig-prop-sandwave';
const PORTRAIT = 'finisher-portrait';
/** Frame of the sand worm in the portrait strip (`finisher-portrait`, the sixth is the pharaoh). */
export const PORTRAIT_FRAME = 3;
/** The wave sits 4 px (unscaled) below the ground line, its crest above it. */
const WAVE_BELOW_GROUND = 4;
/** Hit point of the ring seen from the container of the worm: left of and above the origin (px of the boss image). */
export const RING_OFFSET = { dx: -17, dy: -17 } as const;
/** Beam of the shot down, from the astronaut's feet (px of the stage): muzzle and the point in the head (board W5). */
export const BEAM = { from: { dx: 30, dy: -4 }, to: { dx: 20, dy: 70 } } as const;
/** Width of the ground cover on both sides of the stage and its depth below the ground line. */
const COVER_MARGIN = 400;
const COVER_DEPTH = 400;
/** Thickness of the lighter edge line on the ground line (board "cover"). */
const COVER_EDGE = 2;

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

function figureX(api: FxApi, rigId: 'astronaut' | 'giantSandWorm'): number {
  const fig = api.figure(rigId);
  return fig ? fig.container.x : api.ctx.stageX + api.ctx.layout.width / 2;
}

// ---------------------------------------------------------------------------------------------------
// Sand wave
// ---------------------------------------------------------------------------------------------------

interface WaveConfig {
  /** Start of the stage in image frames: the wave shows frame `first + stage`. */
  first: number;
  /** Real times (ms since the start) at which the next stage begins. */
  stages: readonly number[];
  /** Places on the stage (before `stageX`) at the start and at the end of the event; equal = stands still. */
  from(api: FxApi): number;
  to(api: FxApi): number;
}

const BOSS_X_MOMENT = THEME.sizePx['size.rig-boss-x-moment'];
const BOSS_X_CINE = THEME.sizePx['size.rig-boss-x-cinematic'];
/** The wave of the cinematic starts far on the right (board 1a). */
export const WAVE_IN_FROM = BOSS_X_CINE + 80;

/** Wave stages in ms since the start: rising wave of the moment (600 ms), approach of the cinematic (3000 ms). */
export const WAVE_STAGE_MS = {
  moment: [0, 200, 400],
  cinematic: [0, 1200, 2200],
  hold: [0, 1400],
} as const;

/** Sand wave (`rig-prop-sandwave`, stage 0 to 2) that runs from `from` to `to` during the event. */
function sandWave(cfg: WaveConfig): FxFactory {
  return (api, event) => {
    const frames = [0, 1, 2].map((i) => atlasFrame(api, WAVE, i));
    if (frames.some((f) => f === null)) return NOOP;
    const img = api.ctx.scene.add
      .image(0, 0, api.atlas, frames[0] as string)
      .setOrigin(0.5, 1)
      .setDepth(CHOREO_DEPTH.ground)
      .setScale(api.bossScale)
      .setVisible(false);
    api.ctx.addWorld(img);
    const duration = Math.max(1, event.durationMs ?? 1);
    const y = GROUND + WAVE_BELOW_GROUND;
    let x0 = 0;
    let x1 = 0;
    let shown = -1;
    return {
      start() {
        x0 = cfg.from(api);
        x1 = cfg.to(api);
        shown = -1;
        img.setPosition(Math.round(x0), y).setVisible(true);
      },
      update(since) {
        const p = Math.min(1, Math.max(0, since / duration));
        img.setPosition(Math.round(x0 + (x1 - x0) * p), y);
        const stage = Math.min(2, cfg.first + stageAt(cfg.stages, since));
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
}

const stageX = (api: FxApi, x: number): number => api.ctx.stageX + x;
const bossX = (api: FxApi): number => figureX(api, 'giantSandWorm');
const astroX = (api: FxApi): number => figureX(api, 'astronaut');

/** Wave of the moment: runs from the boss stand to the place where the worm bursts out (board W1, W2). */
const waveMoment = sandWave({
  first: 0,
  stages: WAVE_STAGE_MS.moment,
  from: (api) => stageX(api, BOSS_X_MOMENT),
  to: bossX,
});
/** Wave of the cinematic shot 1: approaches from the right to the boss stand (boards 1a to 1c). */
const waveIn = sandWave({
  first: 0,
  stages: WAVE_STAGE_MS.cinematic,
  from: (api) => stageX(api, WAVE_IN_FROM),
  to: (api) => stageX(api, BOSS_X_CINE),
});
/** Wave of the cinematic shot 3: stands at the boss stand and rises (board 3a). */
const waveHold = sandWave({
  first: 1,
  stages: WAVE_STAGE_MS.hold,
  from: (api) => stageX(api, BOSS_X_CINE),
  to: (api) => stageX(api, BOSS_X_CINE),
});
/** Calm sand (stage 0) where the astronaut stands (moment board W8). */
const smoothAtAstronaut = sandWave({ first: 0, stages: [0], from: astroX, to: astroX });
/** Calm sand (stage 0) on the boss stand (cinematic board 5c). */
const calmAtBoss = sandWave({ first: 0, stages: [0], from: bossX, to: bossX });

// ---------------------------------------------------------------------------------------------------
// Sand cover, shot beam, ring centre
// ---------------------------------------------------------------------------------------------------

/**
 * Ground strip in front of the worm: the links under the sand are covered by the desert ground (board
 * "cover": `biome.desert-ground`, a lighter edge line on the ground line). It lies just over the worm and
 * under the astronaut (her depth is one above the worm's).
 */
const sandCover: FxFactory = (api) => {
  const g = api.ctx.scene.add.graphics().setVisible(false);
  api.ctx.addWorld(g);
  const x = api.ctx.stageX - COVER_MARGIN;
  const w = api.ctx.layout.width + 2 * COVER_MARGIN;
  g.fillStyle(themeColor('biome.desert-ground').num, 1);
  g.fillRect(x, GROUND + COVER_EDGE, w, COVER_DEPTH);
  g.fillStyle(themeColor('biome.desert-ground-hi').num, 1);
  g.fillRect(x, GROUND, w, COVER_EDGE);
  return {
    start() {
      const boss = api.boss();
      g.setDepth(boss ? boss.container.depth + 0.5 : CHOREO_DEPTH.figure + 0.5).setVisible(true);
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

/** Beam of the shot down into the head: coral rim and a core band, from the astronaut to the head (board W5). */
const shotBeam: FxFactory = (api) => {
  const g = api.ctx.scene.add.graphics().setDepth(CHOREO_DEPTH.slash).setVisible(false);
  api.ctx.addWorld(g);
  const scale = api.figure('astronaut')?.scale ?? THEME.sizeCount['size.rig-scale-astronaut'];
  const core = (THEME.sizePx['size.rig-slash'] * scale) / 2;
  const rim = THEME.sizePx['size.rig-slash-rim'] * scale;
  const band = (x0: number, y0: number, x1: number, y1: number, half: number): void => {
    g.fillPoints(
      [
        { x: x0 - half, y: y0 },
        { x: x0 + half, y: y0 },
        { x: x1 + half, y: y1 },
        { x: x1 - half, y: y1 },
      ],
      true,
    );
  };
  return {
    start() {
      const astro = api.figure('astronaut');
      const x = astro ? astro.container.x : api.ctx.stageX + api.ctx.layout.width / 2;
      const y = astro ? astro.container.y : GROUND;
      const x0 = x + BEAM.from.dx;
      const y0 = y + BEAM.from.dy;
      const x1 = x + BEAM.to.dx;
      const y1 = y + BEAM.to.dy;
      g.clear();
      g.fillStyle(THEME.colors['finisher.slash-rim'].num, 1);
      band(x0, y0, x1, y1, core + rim);
      g.fillStyle(THEME.colors['finisher.slash'].num, 1);
      band(x0, y0, x1, y1, core);
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

/** Hit point of the ring: on the head, seen from the container of the worm (board W5, ring on the head). */
export function ringCentre(api: FxApi, out: { x: number; y: number }): void {
  const boss = api.boss();
  const s = api.bossScale;
  out.x =
    (boss ? boss.container.x : api.ctx.stageX + api.ctx.layout.width / 2) + RING_OFFSET.dx * s;
  out.y = (boss ? boss.container.y : GROUND) + RING_OFFSET.dy * s;
}

// ---------------------------------------------------------------------------------------------------
// Portrait strip of shot 3
// ---------------------------------------------------------------------------------------------------

/**
 * Portrait strip of shot 3 (board 3a): ink band with coral edges and the visor strip `finisher-portrait`
 * frame 3 (the worm in the visor); slides in, holds, slides out to the right as the M10 cut-in.
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

export const GIANT_SAND_WORM_FX: BossFxModule = {
  'sand-wave': waveMoment,
  'sand-wave-in': waveIn,
  'sand-wave-hold': waveHold,
  'sand-smooth': smoothAtAstronaut,
  'dune-calm': calmAtBoss,
  'sand-cover': sandCover,
  'shot-beam': shotBeam,
  portrait,
  // The one light-dark pair of the cinematic does not depend on the boss: the factory of the root monster.
  'impact-pair': ROOT_MONSTER_FX['impact-pair'],
  // Speedline ring of the main hit of the moment (AP-194): reference height is the head (64 px), own centre.
  'hit-ring': hitRingFx({ refH: BOSS_REF_H, centre: ringCentre }),
};

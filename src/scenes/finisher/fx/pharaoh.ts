// Own effects of the boss `pharaoh` for its choreographies (M13, AP-190, brief H-48 part 2b): the three riddle
// symbols and the shot at the right one, the glint of the gilding, the throne dais, the gold balls and the
// laser duel of the cinematic, the flashback on the five defeated bosses (shot 3, no flash), the stars, the
// portrait strip, the dawn band and the astronaut in the counter-light (shot 6). The player calls them by the
// `name` of an `fx` event (config/choreo/pharaoh.ts). The speedline ring is the shared block of AP-194
// (`hit-ring`), the light-dark impact pair of the cinematic is the one of the root monster.
// Rules as everywhere in the finisher: every object is made in the factory (scene start), `update` only sets
// values; no tint, no FX, no Rope (Canvas-safe); time is real time. The stage world (sky, moon, mist) and the
// letterbox are not part of these effects.
import type Phaser from 'phaser';
import { AIM_TURN, CINE_X } from '../../../config/choreo/pharaoh';
import { ASTRONAUT_ANCHORS, ASTRONAUT_RIG } from '../../../config/rigs/astronaut';
import { GUARDIAN_DOG_ANCHORS } from '../../../config/rigs/guardianDog';
import { RIGS } from '../../../config/rigs';
import { THEME, themeColor } from '../../../config/theme';
import type { BossId, RigDef, RigPartDef } from '../../../contracts';
import { CHOREO_DEPTH } from '../context';
import { CUTIN_EDGE, PORTRAIT_SCALE, seededRandom } from '../layout';
import { inkFrame, poseFrame } from '../rig';
import { cutInOffset } from '../timing';
import { BOSS_REF_H, hitRingFx } from './hitRing';
import { ROOT_MONSTER_FX } from './rootMonster';
import type { BossFxModule, FxApi, FxFactory, FxInstance } from './index';

const GROUND = THEME.sizePx['size.rig-ground'];
const ASTRO_SCALE = THEME.sizeCount['size.rig-scale-astronaut'];
const ATLAS_FX = 'rig-fx-pharaoh';
const ATLAS_RIDDLE = 'rig-prop-riddle';
const PORTRAIT = 'finisher-portrait';
/** Image 5 of `finisher-portrait`: the pharaoh in the visor. */
export const PORTRAIT_FRAME = 5;
/** Images of `rig-fx-pharaoh`: 0 gold spark, 4 light spark (the stars). */
const GOLD_FRAME = 0;
const STAR_FRAME = 4;
/** Particle images are drawn at this scale (8 px images). */
const PARTICLE_SCALE = 2;
/** Width of the choreography stage (px). */
const STAGE_W = 640;

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

function figureX(api: FxApi, rigId: 'astronaut' | 'pharaoh'): number {
  const fig = api.figure(rigId);
  return fig ? fig.container.x : api.ctx.stageX + api.ctx.layout.width / 2;
}

function figureY(api: FxApi, rigId: 'astronaut' | 'pharaoh'): number {
  const fig = api.figure(rigId);
  return fig ? fig.container.y : GROUND;
}

function graphics(api: FxApi, depth: number): Phaser.GameObjects.Graphics {
  const g = api.ctx.scene.add.graphics().setDepth(depth).setVisible(false);
  api.ctx.addWorld(g);
  return g;
}

function frameImages(
  api: FxApi,
  key: string,
  frame: string,
  n: number,
  scale: number,
  depth: number,
): Phaser.GameObjects.Image[] | null {
  if (!hasFrame(api, key, frame)) return null;
  const imgs: Phaser.GameObjects.Image[] = [];
  for (let i = 0; i < n; i++) {
    const img = api.ctx.scene.add
      .image(0, 0, key, frame)
      .setDepth(depth)
      .setScale(scale)
      .setVisible(false);
    api.ctx.addWorld(img);
    imgs.push(img);
  }
  return imgs;
}

function destroyAll(imgs: Phaser.GameObjects.GameObject[]): void {
  for (const img of imgs) img.destroy();
  imgs.length = 0;
}

/**
 * Muzzle of the raygun (offset from the feet of the astronaut, px of the stage): arm pivot plus grip plus the
 * muzzle of the pose, turned with the arm by `turn` degrees, at the astronaut scale.
 */
export function muzzleOf(
  pose: 'a0' | 'up45',
  turn: number,
): { dx: number; dy: number; angle: number } {
  const arm = ASTRONAUT_RIG.parts.find((p) => p.id === 'arm-front');
  const grip = ASTRONAUT_ANCHORS['arm-front'].aim.raygun;
  const m = ASTRONAUT_ANCHORS.muzzle[pose];
  const rad = (turn * Math.PI) / 180;
  const lx = grip.x + m[0];
  const ly = grip.y + m[1];
  return {
    dx: ((arm?.x ?? 0) + lx * Math.cos(rad) - ly * Math.sin(rad)) * ASTRO_SCALE,
    dy: ((arm?.y ?? 0) + lx * Math.sin(rad) + ly * Math.cos(rad)) * ASTRO_SCALE,
    angle: ASTRONAUT_ANCHORS.gunAngles[pose] + turn,
  };
}

/** Cut-line beam (`finisher.slash` core, coral rim) between two points, drawn once. */
function beam(
  g: Phaser.GameObjects.Graphics,
  x0: number,
  y0: number,
  x1: number,
  y1: number,
): void {
  const core = THEME.sizePx['size.rig-slash'] * ASTRO_SCALE;
  const rim = core + 2 * THEME.sizePx['size.rig-slash-rim'] * ASTRO_SCALE;
  g.clear();
  g.lineStyle(rim, THEME.colors['finisher.slash-rim'].num, 1);
  g.lineBetween(x0, y0, x1, y1);
  g.lineStyle(core, THEME.colors['finisher.slash'].num, 1);
  g.lineBetween(x0, y0, x1, y1);
}

// ---------------------------------------------------------------------------------------------------
// Riddle and shot (boards R2, R3)
// ---------------------------------------------------------------------------------------------------

/** Three symbols above him (child, human, old man): offsets from his feet, the one that is hit, the time it lights. */
export const RIDDLE = { dx: [-50, 0, 50], dy: -250, scale: 2, right: 1, litAtMs: 700 } as const;

/** The symbols hang above the pharaoh; the right one lights up before the shot. */
const riddle: FxFactory = (api) => {
  const n = RIDDLE.dx.length;
  const rows: Phaser.GameObjects.Image[][] = [];
  for (const prefix of [0, n]) {
    const imgs: Phaser.GameObjects.Image[] = [];
    for (let i = 0; i < n; i++) {
      const frame = `${ATLAS_RIDDLE}-${prefix + i}`;
      if (!hasFrame(api, api.atlas, frame)) {
        destroyAll(imgs);
        for (const r of rows) destroyAll(r);
        return NOOP;
      }
      const img = api.ctx.scene.add
        .image(0, 0, api.atlas, frame)
        .setDepth(CHOREO_DEPTH.particles)
        .setScale(RIDDLE.scale)
        .setVisible(false);
      api.ctx.addWorld(img);
      imgs.push(img);
    }
    rows.push(imgs);
  }
  const [dark, lit] = rows;
  let litNow = false;
  const place = (): void => {
    const x = figureX(api, 'pharaoh');
    const y = figureY(api, 'pharaoh') + RIDDLE.dy;
    for (let i = 0; i < n; i++) {
      dark[i].setPosition(Math.round(x + RIDDLE.dx[i]), y);
      lit[i].setPosition(Math.round(x + RIDDLE.dx[i]), y);
    }
  };
  const show = (isLit: boolean): void => {
    litNow = isLit;
    for (let i = 0; i < n; i++) {
      const right = i === RIDDLE.right;
      dark[i].setVisible(!(isLit && right));
      lit[i].setVisible(isLit && right);
    }
  };
  return {
    start() {
      place();
      show(false);
    },
    update(since) {
      const l = since >= RIDDLE.litAtMs;
      if (l !== litNow) show(l);
    },
    stop() {
      for (let i = 0; i < n; i++) {
        dark[i].setVisible(false);
        lit[i].setVisible(false);
      }
    },
    destroy() {
      destroyAll(dark);
      destroyAll(lit);
    },
  };
};

/** The beam of the steep shot: from the muzzle to the right symbol. */
const shotBeam: FxFactory = (api) => {
  const g = graphics(api, CHOREO_DEPTH.slash);
  const m = muzzleOf('up45', AIM_TURN);
  return {
    start() {
      const x0 = Math.round(figureX(api, 'astronaut') + m.dx);
      const y0 = Math.round(figureY(api, 'astronaut') + m.dy);
      const x1 = Math.round(figureX(api, 'pharaoh') + RIDDLE.dx[RIDDLE.right]);
      const y1 = Math.round(figureY(api, 'pharaoh') + RIDDLE.dy);
      beam(g, x0, y0, x1, y1);
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
// Glint of the gilding (boards R6, R7)
// ---------------------------------------------------------------------------------------------------

/** A glint wanders up the body in `steps` steps: heights above his feet (px of the stage), twinkle alpha. */
export const GLEAM = { fromDy: -10, toDy: -110, steps: 8, twinkleMs: 110 } as const;

const gleam: FxFactory = (api, event) => {
  const imgs = frameImages(
    api,
    api.atlas,
    `${ATLAS_FX}-${STAR_FRAME}`,
    1,
    PARTICLE_SCALE,
    CHOREO_DEPTH.particles,
  );
  if (!imgs) return NOOP;
  const img = imgs[0];
  const duration = event.durationMs ?? 1000;
  let x = 0;
  let y = 0;
  let last = -1;
  return {
    start() {
      x = Math.round(figureX(api, 'pharaoh'));
      y = figureY(api, 'pharaoh');
      last = -1;
      img.setVisible(true);
    },
    update(since) {
      const step = Math.min(GLEAM.steps, Math.floor((since / duration) * GLEAM.steps));
      const t = Math.floor(since / GLEAM.twinkleMs) % 2;
      const key = step * 2 + t;
      if (key === last) return;
      last = key;
      const dy = GLEAM.fromDy + ((GLEAM.toDy - GLEAM.fromDy) * step) / GLEAM.steps;
      img.setPosition(x, Math.round(y + dy)).setAlpha(t === 0 ? 1 : 0.6);
    },
    stop() {
      img.setVisible(false);
    },
    destroy() {
      destroyAll(imgs);
    },
  };
};

// ---------------------------------------------------------------------------------------------------
// Throne dais (cinematic boards 1a to 8a)
// ---------------------------------------------------------------------------------------------------

/** Flat plate under a figure: width and height (px of the stage), the lighter edge on top. */
export const DAIS = { w: 150, h: 12, edge: 2 } as const;

function daisAt(centre: number): FxFactory {
  return (api) => {
    const g = graphics(api, CHOREO_DEPTH.ground);
    g.fillStyle(themeColor('finisher.ink').num, 1).fillRect(-DAIS.w / 2, 0, DAIS.w, DAIS.h);
    g.fillStyle(themeColor('finisher.paper').num, 0.5).fillRect(-DAIS.w / 2, 0, DAIS.w, DAIS.edge);
    return {
      start() {
        g.setPosition(Math.round(api.ctx.stageX + centre), GROUND).setVisible(true);
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
}

// ---------------------------------------------------------------------------------------------------
// Gold balls and the laser duel (cinematic boards 2a to 2c)
// ---------------------------------------------------------------------------------------------------

/**
 * Gold balls fly from him to her: how many are in the air, the gap between two launches, the flight time, the
 * steps of the flight, launch and arrival points (offsets from the feet of the two stage places).
 */
export const VOLLEY = {
  balls: 8,
  gapMs: 280,
  flightMs: 600,
  steps: 10,
  fromDx: -40,
  fromDy: -80,
  toDx: 40,
  toDy: -70,
  scale: 3,
} as const;
/** The duel beam ends where it meets the balls (px of the stage). */
export const DUEL_END_X = 340;

const orbVolley: FxFactory = (api, event) => {
  const imgs = frameImages(
    api,
    api.atlas,
    `${ATLAS_FX}-${GOLD_FRAME}`,
    VOLLEY.balls,
    VOLLEY.scale,
    CHOREO_DEPTH.particles,
  );
  if (!imgs) return NOOP;
  const duration = event.durationMs ?? VOLLEY.balls * VOLLEY.gapMs;
  const live = new Int8Array(VOLLEY.balls);
  let x0 = 0;
  let x1 = 0;
  return {
    start() {
      x0 = api.ctx.stageX + CINE_X.boss + VOLLEY.fromDx;
      x1 = api.ctx.stageX + CINE_X.astronaut + VOLLEY.toDx;
      live.fill(0);
    },
    update(since) {
      for (let i = 0; i < VOLLEY.balls; i++) {
        const age = since - i * VOLLEY.gapMs;
        const flying = age >= 0 && age < VOLLEY.flightMs && since < duration;
        if (flying !== (live[i] === 1)) {
          live[i] = flying ? 1 : 0;
          imgs[i].setVisible(flying);
        }
        if (!flying) continue;
        const u = Math.floor((age / VOLLEY.flightMs) * VOLLEY.steps) / VOLLEY.steps;
        imgs[i].setPosition(
          Math.round(x0 + (x1 - x0) * u),
          Math.round(GROUND + VOLLEY.fromDy + (VOLLEY.toDy - VOLLEY.fromDy) * u),
        );
      }
    },
    stop() {
      for (const img of imgs) img.setVisible(false);
      live.fill(0);
    },
    destroy() {
      destroyAll(imgs);
    },
  };
};

/** The return fire: a flat beam from the muzzle to the meeting point. */
const duelBeam: FxFactory = (api) => {
  const g = graphics(api, CHOREO_DEPTH.slash);
  const m = muzzleOf('a0', 0);
  return {
    start() {
      const x0 = Math.round(figureX(api, 'astronaut') + m.dx);
      const y0 = Math.round(figureY(api, 'astronaut') + m.dy);
      beam(g, x0, y0, Math.round(api.ctx.stageX + DUEL_END_X), y0);
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
// Flashback (cinematic shot 3, boards 3a to 3c)
// ---------------------------------------------------------------------------------------------------

/** The five defeated bosses in the order of the game. */
export const FLASHBACK_BOSSES: readonly Exclude<BossId, 'pharaoh'>[] = [
  'rootMonster',
  'forestGhost',
  'giantStone',
  'giantSandWorm',
  'guardianDog',
];
/** The groups of the flashback: bosses per group, each group stands this long and runs this fast to the left. */
export const FLASHBACK = {
  groups: [[0, 1], [2, 3], [4]],
  groupMs: 1130,
  scrollPxPerS: 60,
  /** Light strip behind the silhouettes (px of the stage): top above the ground and height. */
  stripTop: -160,
  stripH: 140,
  /** Centres of the silhouettes (stage px at the start of the group) and the scale of the figures. */
  centres: [280, 410],
  scale: 2,
} as const;
const flashbackDogLie: Readonly<Record<string, readonly [number, number]>> = {
  body: GUARDIAN_DOG_ANCHORS.lie.body,
  head: GUARDIAN_DOG_ANCHORS.lie.head,
};
/** Rough size of a plain block when the atlas of a defeated boss is not loaded (px of the stage). */
const FALLBACK_BLOCK = { w: 48, h: 64 } as const;

/** Ink images of the rest pose of a rig, laid out without rotation (one parent level); null without the atlas. */
function inkFigure(
  api: FxApi,
  rig: RigDef,
  atlas: string,
  scale: number,
  mirror: boolean,
  lie: Readonly<Record<string, readonly [number, number]>>,
  poseOf: (part: RigPartDef) => string | undefined,
): Phaser.GameObjects.Image[] | null {
  const textures = api.ctx.scene.textures;
  if (!textures.exists(atlas)) return null;
  const byId = new Map(rig.parts.map((p) => [p.id, p]));
  const sign = mirror ? -1 : 1;
  const imgs: Phaser.GameObjects.Image[] = [];
  const sorted = [...rig.parts].sort((a, b) => a.order - b.order);
  for (const part of sorted) {
    const frame = inkFrame(part, poseFrame(part, poseOf(part)));
    if (!textures.get(atlas).has(frame)) continue;
    const parent = part.parent ? byId.get(part.parent) : undefined;
    const off = lie[part.id] ?? [0, 0];
    const px = (parent ? parent.x : 0) + part.x + off[0];
    const py = (parent ? parent.y : 0) + part.y + off[1];
    const img = api.ctx.scene.add
      .image(sign * px * scale, py * scale, atlas, frame)
      .setOrigin(mirror ? 1 - part.originX : part.originX, part.originY)
      .setScale(scale)
      .setFlipX(mirror)
      .setVisible(false);
    imgs.push(img);
  }
  return imgs;
}

/**
 * The flashback: three groups of silhouettes on a light strip run slowly to the left, one after the other
 * (the five bosses she beat). Ink frames of the boss atlases; a boss whose atlas is not loaded shows a plain
 * ink block, so the shot never stays empty. No flash, no brightness jump.
 */
const flashback: FxFactory = (api) => {
  const g = graphics(api, CHOREO_DEPTH.figure + 3);
  const strips = FLASHBACK.groups.map(() => {
    const strip = api.ctx.scene.add
      .container(0, 0)
      .setDepth(CHOREO_DEPTH.figure + 3)
      .setVisible(false);
    api.ctx.addWorld(strip);
    return strip;
  });
  const figs: { box: Phaser.GameObjects.Container; cx: number }[] = [];
  const ink = themeColor('finisher.ink').num;
  FLASHBACK.groups.forEach((group, gi) => {
    group.forEach((bi, k) => {
      const id = FLASHBACK_BOSSES[bi];
      const rig = RIGS[id];
      const lie = id === 'guardianDog' ? flashbackDogLie : {};
      const imgs = inkFigure(
        api,
        rig,
        `finisher-rig-${id}`,
        FLASHBACK.scale,
        false,
        lie,
        () => undefined,
      );
      const box = api.ctx.scene.add.container(0, GROUND);
      if (imgs && imgs.length > 0) {
        box.add(imgs);
        for (const img of imgs) img.setVisible(true);
      } else {
        const block = api.ctx.scene.add.graphics();
        block
          .fillStyle(ink, 1)
          .fillRect(-FALLBACK_BLOCK.w / 2, -FALLBACK_BLOCK.h, FALLBACK_BLOCK.w, FALLBACK_BLOCK.h);
        box.add(block);
      }
      strips[gi].add(box);
      figs.push({ box, cx: FLASHBACK.centres[k] ?? FLASHBACK.centres[0] });
    });
  });
  // The light strip of every group is one Graphics (drawn once), placed under its figures.
  g.fillStyle(themeColor('finisher.paper').num, 1).fillRect(
    0,
    GROUND + FLASHBACK.stripTop,
    STAGE_W,
    FLASHBACK.stripH,
  );
  let shown = -1;
  const count = FLASHBACK.groups.length;
  let figIndex: number[][] = [];
  {
    let at = 0;
    figIndex = FLASHBACK.groups.map((grp) => grp.map(() => at++));
  }
  return {
    start() {
      g.setPosition(api.ctx.stageX, 0).setVisible(true);
      shown = -1;
    },
    update(since) {
      const gi = Math.min(count - 1, Math.floor(since / FLASHBACK.groupMs));
      const local = since - gi * FLASHBACK.groupMs;
      const run = Math.round((local / 1000) * FLASHBACK.scrollPxPerS);
      if (gi !== shown) {
        shown = gi;
        for (let k = 0; k < count; k++) strips[k].setVisible(k === gi);
      }
      for (const fi of figIndex[gi]) {
        figs[fi].box.setX(Math.round(api.ctx.stageX + figs[fi].cx - run));
      }
    },
    stop() {
      g.setVisible(false);
      for (const s of strips) s.setVisible(false);
      shown = -1;
    },
    destroy() {
      g.destroy();
      for (const s of strips) s.destroy();
    },
  };
};

// ---------------------------------------------------------------------------------------------------
// Stars (boards 4a, 4b) and portrait strip (board 4a)
// ---------------------------------------------------------------------------------------------------

/** Stars that gather to the blade: count, start and end radius range (px), time to gather, centre above her feet. */
export const GATHER = {
  count: 14,
  r0Min: 90,
  r0Max: 130,
  r1Min: 20,
  r1Max: 50,
  moveMs: 1300,
  steps: 8,
  dx: -20,
  dy: -120,
  seed: 40,
} as const;

/** Light sparks sink in from a wide ring to her, in `GATHER.steps` steps (pixel-crisp). */
const starGather: FxFactory = (api) => {
  const imgs = frameImages(
    api,
    api.atlas,
    `${ATLAS_FX}-${STAR_FRAME}`,
    GATHER.count,
    PARTICLE_SCALE,
    CHOREO_DEPTH.particles,
  );
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
      destroyAll(imgs);
    },
  };
};

/** Portrait strip (same strip as the one of the root monster, only the frame differs): the pharaoh in the visor. */
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

// ---------------------------------------------------------------------------------------------------
// Dawn band and counter-light (cinematic shot 6, boards 6a to 6c)
// ---------------------------------------------------------------------------------------------------

/**
 * The band of dawn behind the figures grows in hard steps (no soft ramp): top above the ground, height,
 * alpha per step, time per step. Gold of the gilding (`gold.400`).
 */
export const DAWN = { top: -170, h: 26, alphas: [0.12, 0.22, 0.32, 0.42], stepMs: 450 } as const;

const dawn: FxFactory = (api) => {
  const g = graphics(api, CHOREO_DEPTH.ground);
  g.fillStyle(themeColor('gold.400').num, 1).fillRect(0, GROUND + DAWN.top, STAGE_W, DAWN.h);
  let last = -1;
  return {
    start() {
      g.setPosition(api.ctx.stageX, 0).setAlpha(DAWN.alphas[0]).setVisible(true);
      last = 0;
    },
    update(since) {
      const i = Math.min(DAWN.alphas.length - 1, Math.floor(since / DAWN.stepMs));
      if (i === last) return;
      last = i;
      g.setAlpha(DAWN.alphas[i]);
    },
    stop() {
      g.setVisible(false);
    },
    destroy() {
      g.destroy();
    },
  };
};

/** Standing pose of every part of the astronaut for her silhouette in the counter-light. */
const STAND_POSE: Readonly<Record<string, string>> = {
  'leg-front': 'stand',
  'leg-back': 'stand',
  torso: 'upright',
  helmet: 'serious',
  pack: 'rest',
  'arm-back': 'rest',
  'arm-front': 'rest',
  raygun: ASTRONAUT_ANCHORS['arm-front'].rest.raygun.pose,
};
/** Parts that have no place in the silhouette (blade parts are hidden at rest). */
const NO_SILHOUETTE = new Set(['blade', 'blade-arc']);

/**
 * She stands in the dawn as an ink silhouette (board 6c): own static ink images of her standing pose (mirrored,
 * like the figure after the axis change), the figure itself is hidden by the choreography from the same moment.
 */
const backlight: FxFactory = (api) => {
  const rig = {
    ...ASTRONAUT_RIG,
    parts: ASTRONAUT_RIG.parts.filter((p) => !NO_SILHOUETTE.has(p.id)),
  };
  const imgs = inkFigure(api, rig, api.atlas, ASTRO_SCALE, true, {}, (p) => STAND_POSE[p.id]);
  if (!imgs || imgs.length === 0) return NOOP;
  const box = api.ctx.scene.add
    .container(0, GROUND, imgs)
    .setDepth(CHOREO_DEPTH.figure + 1)
    .setVisible(false);
  api.ctx.addWorld(box);
  for (const img of imgs) img.setVisible(true);
  return {
    start() {
      const fig = api.figure('astronaut');
      box.setPosition(Math.round(fig ? fig.container.x : api.ctx.stageX), GROUND).setVisible(true);
    },
    update() {},
    stop() {
      box.setVisible(false);
    },
    destroy() {
      box.destroy();
    },
  };
};

export const PHARAOH_FX: BossFxModule = {
  riddle,
  'shot-beam': shotBeam,
  gleam,
  'dais-right': daisAt(CINE_X.boss),
  'dais-left': daisAt(CINE_X.astronaut),
  'orb-volley': orbVolley,
  'duel-beam': duelBeam,
  flashback,
  'star-gather': starGather,
  portrait,
  dawn,
  backlight,
  // The light-dark pair of the cinematic (decision 7a): the same block as the root monster's, it only needs the boss figure.
  'impact-pair': ROOT_MONSTER_FX['impact-pair'],
  // Speedline ring of the main hit of the moment (AP-194): boss x, ground - 96.
  'hit-ring': hitRingFx({ refH: BOSS_REF_H }),
};

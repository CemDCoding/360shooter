// Choreographies of the sand worm (M13, AP-188, brief H-48 part 2b, mockup m13b-sand-worm.html, PE-235,
// PE-249, PE-250): the fight moment "Segmentkette" (`moment-giantSandWorm`, 3.5 s, levels 21 to 24) and the
// cinematic of level 25 "SONNENSPEER" (`cinematic-25`, 15 s, 5 shots). Only data: key frames, camera and
// events; the effects of the boss itself live in `scenes/finisher/fx/giantSandWorm.ts`.
//
// Times are written in REAL time (the storyboard tables); `clockOf` turns them into choreography time (hit
// stop and slow motion). Key frames are collected by `Tracks`, which sorts them and drops repeated hold keys.
//
// What is special about this boss (brief H-48, "Annahmen des Designers in Teil 2b"):
// - The arch of the chain (`seg-k` shifted by `[k, -6k]`, the tail as k = 8) is an offset of the choreography,
//   not part of the rig. The parts below the sand are covered by the boss effect `sand-cover`.
// - The shot down is the raygun pose `down45` (arm pose `slash-end`) plus a fine rotation of the arm.
// - The chain crumbles from the head to the tail, one link every `GIANT_SAND_WORM_CRUMBLE_STEP_MS` of REAL
//   time (poses `crumble1`, `crumble2`, then gone).
// - Children of `arm-front` (raygun, blade, blade-arc) follow the arm pose by hold keys from
//   ASTRONAUT_ANCHORS (PE-252). Only the spear of the cinematic leaves its anchor after the throw.
import type {
  ChoreoBeat,
  ChoreoDef,
  ChoreoEase,
  ChoreoEvent,
  ChoreoKey,
  ChoreoProperty,
  ChoreoShot,
  ChoreoTrack,
  RigDef,
} from '../../contracts';
import { THEME } from '../theme';
import { ASTRONAUT_ANCHORS, ASTRONAUT_RIG } from '../rigs/astronaut';
import { GIANT_SAND_WORM_CRUMBLE_STEP_MS, GIANT_SAND_WORM_RIG } from '../rigs/giantSandWorm';

const GROUND = THEME.sizePx['size.rig-ground'];
const BLADE_STEP = THEME.motionMs['motion.rig-blade-step'];
const SMEAR = THEME.motionMs['motion.rig-smear'];
const HIT_WHITE = THEME.motionMs['motion.rig-hit-white'];
/** Whole speedline ring: `size.rig-hit-ring-steps` steps of `motion.rig-hit-ring-step` (AP-194). */
const HIT_RING =
  THEME.sizeCount['size.rig-hit-ring-steps'] * THEME.motionMs['motion.rig-hit-ring-step'];
const AFTERIMAGE_GAP = THEME.motionMs['motion.rig-afterimage-gap'];
const AFTERIMAGE_FADE = THEME.motionMs['motion.rig-afterimage-fade'];
const ANCH = ASTRONAUT_ANCHORS;
/** Time between two links crumbling (token `motion.rig-crumble-step`, equals the constant of the rig; test). */
const CRUMBLE = GIANT_SAND_WORM_CRUMBLE_STEP_MS;
/** Largest angle of a part without `freeRotate` (token `size.rig-fine-rotate`): the fine rotation of the aim. */
const TWIST = THEME.sizeCount['size.rig-fine-rotate'];

/** Placeholder sound of the main hit (PE-237); equals `SOUND_HIT` in scenes/finisher/timing.ts (test). */
export const HIT_SOUND_KEY = 'sfx-finisher-hit';
/** Slow motion of the reaction. */
const SLOW = 0.3;
/** Stand of the actors in the 640 px stage (tokens `size.rig-ground`: moment 170/470, cinematic 160/480). */
const MOMENT_X = {
  astronaut: THEME.sizePx['size.rig-astro-x-moment'],
  boss: THEME.sizePx['size.rig-boss-x-moment'],
} as const;
const CINE_X = {
  astronaut: THEME.sizePx['size.rig-astro-x-cinematic'],
  boss: THEME.sizePx['size.rig-boss-x-cinematic'],
} as const;
const SCALE_ASTRO = THEME.sizeCount['size.rig-scale-astronaut'];
const SCALE_CINE = THEME.sizeCount['size.rig-scale-boss-cinematic'];

/**
 * Board values of the mockup (layout, no tokens): the worm of the moment stands 120 px right of the astronaut,
 * raised 20 px out of the sand; she lands on its head at 80 px right of her stand, feet at y 158.
 */
export const MOMENT_WORM_DX = 120;
export const MOMENT_SAND_RAISE = 20;
export const HEAD_STAND = { dx: 80, y: 158 } as const;
/** Sunk parts of the worm below the ground line, in px of the stage (bursts out of the sand). */
const SUNK = { moment: 100, near: 110, mid: 90, deep: 150, hidden: 250 } as const;

// ---------------------------------------------------------------------------------------------------
// Tools
// ---------------------------------------------------------------------------------------------------

type Value = number | string;

/** Collects key frames per target and property; `list()` sorts them and drops repeated hold keys. */
class Tracks {
  private readonly map = new Map<
    string,
    { target: string; property: ChoreoProperty; keys: ChoreoKey[] }
  >();

  key(
    target: string,
    property: ChoreoProperty,
    atMs: number,
    value: Value,
    ease: ChoreoEase = 'hold',
    steps?: number,
  ): void {
    const id = `${target}|${property}`;
    let track = this.map.get(id);
    if (!track) {
      track = { target, property, keys: [] };
      this.map.set(id, track);
    }
    const key: ChoreoKey =
      steps === undefined ? { atMs, value, ease } : { atMs, value, ease, steps };
    const same = track.keys.findIndex((k) => k.atMs === atMs);
    if (same >= 0) track.keys[same] = key;
    else track.keys.push(key);
  }

  list(): ChoreoTrack[] {
    const out: ChoreoTrack[] = [];
    for (const t of this.map.values()) {
      const sorted = [...t.keys].sort((a, b) => a.atMs - b.atMs);
      const keys: ChoreoKey[] = [];
      for (const k of sorted) {
        const prev = keys[keys.length - 1];
        if (prev && prev.ease === 'hold' && k.ease === 'hold' && prev.value === k.value) continue;
        keys.push(k);
      }
      out.push({ target: t.target, property: t.property, keys });
    }
    return out;
  }
}

/**
 * Real time to choreography time for a variant with one hit stop and one slow motion after it. The first
 * real ms after the stop maps to hit + 1, so a key written at the end of the stop applies to the reaction
 * and not to the frozen picture.
 */
function clockOf(hitReal: number, stopMs: number, slowRealMs: number, factor: number) {
  const afterStop = hitReal + stopMs;
  const afterSlow = afterStop + slowRealMs;
  const slowChoreo = Math.round(slowRealMs * factor);
  return {
    slowChoreo,
    c(real: number): number {
      if (real < hitReal) return real;
      if (real < afterStop) return hitReal;
      if (real === afterStop) return hitReal + 1;
      if (real <= afterSlow) return hitReal + Math.round((real - afterStop) * factor);
      return hitReal + slowChoreo + (real - afterSlow);
    },
  };
}

function part(rig: RigDef, id: string) {
  const p = rig.parts.find((x) => x.id === id);
  if (!p) throw new Error(`rig part ${id} missing`);
  return p;
}
const A = (id: string) => part(ASTRONAUT_RIG, id);
const W = (id: string) => part(GIANT_SAND_WORM_RIG, id);

type Legs = 'stand' | 'crouch' | 'tuck' | 'kneel' | 'smear';
type TorsoPose = 'upright' | 'lean' | 'smear';
type ArmFront = keyof (typeof ANCH)['arm-front'];
type BladeStage = 'off' | 'grow1' | 'grow2' | 'full' | 'spear';

/** One drawn stance of the astronaut. */
interface Stance {
  legs: Legs;
  torso: TorsoPose;
  armFront: ArmFront;
  armBack: 'rest' | 'back' | 'up';
  helmet: 'serious' | 'dark';
  pack: 'rest' | 'thrust';
  blade: BladeStage;
}

const STAND: Stance = {
  legs: 'stand',
  torso: 'upright',
  armFront: 'rest',
  armBack: 'rest',
  helmet: 'serious',
  pack: 'rest',
  blade: 'off',
};
const CROUCH: Stance = {
  ...STAND,
  legs: 'crouch',
  torso: 'lean',
  armFront: 'aim',
  armBack: 'back',
};
const LEAP: Stance = { ...STAND, legs: 'tuck', pack: 'thrust', armFront: 'aim', armBack: 'back' };
/** Shot down onto the head: crouching, visor dark, arm low (raygun `down45`, fine rotation `TWIST` by track). */
const SHOOT: Stance = { ...STAND, legs: 'crouch', armFront: 'slash-end', helmet: 'dark' };
const KNEEL: Stance = {
  ...STAND,
  legs: 'kneel',
  torso: 'lean',
  armFront: 'slash-end',
  armBack: 'back',
};
const GUARD: Stance = { ...CROUCH, torso: 'upright', blade: 'full' };
/** Arm raised with the spear of light behind the head. */
const RAISE_SPEAR: Stance = {
  ...STAND,
  legs: 'crouch',
  armFront: 'raise',
  armBack: 'up',
  helmet: 'dark',
  blade: 'spear',
};
const SMEARED: Stance = {
  ...STAND,
  legs: 'smear',
  torso: 'smear',
  armFront: 'smear',
  armBack: 'back',
  helmet: 'dark',
  blade: 'spear',
};

/** Offset of the arm-front pivot of a stance in the astronaut's own px (rig position + drop + lean). */
function armPos(s: Stance): { x: number; y: number } {
  const base = A('arm-front');
  const drop =
    s.legs === 'crouch' ? ANCH.bodyDrop.crouch : s.legs === 'kneel' ? ANCH.bodyDrop.kneel : 0;
  const push = s.torso === 'lean' ? ANCH.torsoLean['arm-front'] : [0, 0];
  return { x: base.x + push[0], y: base.y + drop + push[1] };
}

/** Writes a stance at `at`: poses, body drop and lean, and the hold keys of the arm children (PE-252). */
function stance(t: Tracks, at: number, s: Stance): void {
  const w = 'astronaut';
  t.key(`${w}.leg-front`, 'pose', at, s.legs);
  t.key(`${w}.leg-back`, 'pose', at, s.legs);
  t.key(`${w}.torso`, 'pose', at, s.torso);
  t.key(`${w}.helmet`, 'pose', at, s.helmet);
  t.key(`${w}.pack`, 'pose', at, s.pack);
  t.key(`${w}.arm-back`, 'pose', at, s.armBack);
  t.key(`${w}.arm-front`, 'pose', at, s.armFront);
  const drop =
    s.legs === 'crouch' ? ANCH.bodyDrop.crouch : s.legs === 'kneel' ? ANCH.bodyDrop.kneel : 0;
  const lean = s.torso === 'lean';
  t.key(`${w}.torso`, 'y', at, A('torso').y + drop);
  const place = (id: 'arm-front' | 'arm-back' | 'pack'): void => {
    const base = A(id);
    const push = lean ? ANCH.torsoLean[id] : [0, 0];
    t.key(`${w}.${id}`, 'x', at, base.x + push[0]);
    t.key(`${w}.${id}`, 'y', at, base.y + drop + push[1]);
  };
  place('arm-front');
  place('arm-back');
  place('pack');
  const anchor = ANCH['arm-front'][s.armFront];
  t.key(`${w}.raygun`, 'pose', at, anchor.raygun.pose);
  t.key(`${w}.raygun`, 'x', at, anchor.raygun.x);
  t.key(`${w}.raygun`, 'y', at, anchor.raygun.y);
  for (const id of ['blade', 'blade-arc'] as const) {
    t.key(`${w}.${id}`, 'x', at, anchor.blade.x);
    t.key(`${w}.${id}`, 'y', at, anchor.blade.y);
    t.key(`${w}.${id}`, 'angle', at, anchor.blade.angle);
  }
  t.key(`${w}.blade`, 'pose', at, s.blade === 'off' ? 'grow1' : s.blade);
  t.key(`${w}.blade`, 'alpha', at, s.blade === 'off' ? 0 : 1);
}

/** The blade arc is never drawn here (no cut): hidden by `alpha` over its base frame. */
function hideArc(t: Tracks): void {
  t.key('astronaut.blade-arc', 'pose', 0, 'none');
  t.key('astronaut.blade-arc', 'alpha', 0, 0);
}

/** The blade steps in `motion.rig-blade-step`, grown (`dir` 1) or pulled back (`dir` -1). */
function bladeSteps(t: Tracks, at: number, from: Stance, dir: 1 | -1): void {
  const order: BladeStage[] = dir === 1 ? ['grow1', 'grow2', 'full'] : ['grow2', 'grow1', 'off'];
  order.forEach((blade, i) => stance(t, at + i * BLADE_STEP, { ...from, blade }));
}

/** Jump in an arc: fast up (sine.out), plunge down (expo.in); x runs linear. */
function jump(
  t: Tracks,
  at: number,
  from: number,
  to: number,
  apexY: number,
  upMs: number,
  downMs: number,
): void {
  t.key('astronaut', 'x', at, from, 'linear');
  t.key('astronaut', 'x', at + upMs + downMs, to);
  t.key('astronaut', 'y', at, GROUND, 'sine.out');
  t.key('astronaut', 'y', at + upMs, apexY, 'expo.in');
  t.key('astronaut', 'y', at + upMs + downMs, GROUND);
}

/** Parts of the astronaut that leave afterimages (not the blade parts: their frames ignore `alpha`). */
const TRAIL_PARTS = [
  'pack',
  'arm-back',
  'leg-back',
  'leg-front',
  'torso',
  'helmet',
  'arm-front',
  'raygun',
].map((p) => `astronaut.${p}`);

function trail(atMs: number, durationMs: number): ChoreoEvent {
  return {
    kind: 'afterimage',
    atMs,
    durationMs,
    parts: TRAIL_PARTS,
    copies: THEME.sizeCount['size.rig-afterimages'],
    spacingMs: AFTERIMAGE_GAP,
    fadeMs: AFTERIMAGE_FADE,
    flash: false,
  };
}

// ---------------------------------------------------------------------------------------------------
// The worm: arch of the chain, links, crumbling
// ---------------------------------------------------------------------------------------------------

/** Links in crumble order: head and jaw first, then seg-1 to seg-7, the tail last (brief H-48, 11a). */
export const CRUMBLE_ORDER: readonly (readonly string[])[] = [
  ['head', 'jaw'],
  ...[1, 2, 3, 4, 5, 6, 7].map((k) => [`seg-${k}`]),
  ['tail'],
];

/** The chain arches out of the sand: `seg-k` (the tail as k = 8) is shifted by `[k, -6k]` (brief H-48). */
export function archOffset(index: number): readonly [number, number] {
  return [index, -6 * index];
}

/** Rig pose of the chain at the start: the arch, all parts shown, poses at rest. */
function wormRest(t: Tracks): void {
  const chain = [1, 2, 3, 4, 5, 6, 7].map((k) => ({ id: `seg-${k}`, k }));
  chain.push({ id: 'tail', k: 8 });
  for (const { id, k } of chain) {
    const base = W(id);
    const [dx, dy] = archOffset(k);
    t.key(`giantSandWorm.${id}`, 'x', 0, base.x + dx);
    t.key(`giantSandWorm.${id}`, 'y', 0, base.y + dy);
  }
  for (const link of CRUMBLE_ORDER) {
    for (const id of link) {
      t.key(`giantSandWorm.${id}`, 'pose', 0, id === 'jaw' ? 'closed' : 'rest');
      t.key(`giantSandWorm.${id}`, 'alpha', 0, 1);
    }
  }
}

/**
 * The chain crumbles from the head to the tail. Link `g` shows `crumble1` at `startReal + g * CRUMBLE`,
 * `crumble2` one step later and is gone one more step later; `c` maps the real times to choreography time.
 * Returns the real time at which the first link starts and the last one is gone.
 */
function crumbleChain(t: Tracks, startReal: number, c: (real: number) => number): number {
  CRUMBLE_ORDER.forEach((link, g) => {
    const one = c(startReal + g * CRUMBLE);
    const two = c(startReal + (g + 1) * CRUMBLE);
    const gone = c(startReal + (g + 2) * CRUMBLE);
    for (const id of link) {
      t.key(`giantSandWorm.${id}`, 'pose', one, 'crumble1');
      t.key(`giantSandWorm.${id}`, 'pose', two, 'crumble2');
      t.key(`giantSandWorm.${id}`, 'alpha', gone, 0);
    }
  });
  return startReal + (CRUMBLE_ORDER.length + 1) * CRUMBLE;
}

/** Sand from every crumbling link (follows the link, a few grains each). */
function crumbleDust(c: (real: number) => number, startReal: number): ChoreoEvent[] {
  const out: ChoreoEvent[] = [];
  CRUMBLE_ORDER.forEach((link, g) => {
    const at = c(startReal + g * CRUMBLE);
    link.forEach((id, i) => {
      out.push({
        kind: 'particles',
        atMs: at,
        texture: `rig-fx-worm-${(g + i) % 3}`,
        count: 5,
        follow: `giantSandWorm.${id}`,
        flash: false,
      });
    });
  });
  return out;
}

function sandBurst(atMs: number, x: number, y: number, count: number): ChoreoEvent[] {
  return [0, 1, 2].map((i) => ({
    kind: 'particles' as const,
    atMs,
    texture: `rig-fx-worm-${i}`,
    count: Math.round(count / 3),
    at: { x, y },
    flash: false,
  }));
}

// ---------------------------------------------------------------------------------------------------
// Fight moment "Segmentkette" (brief H-48, boards W1 to W8)
// ---------------------------------------------------------------------------------------------------

/** Real time of the main hit, its hit stop and the end of the slow motion (board W5/W6). */
const MOMENT_HIT = 1000;
const MOMENT_STOP = 150;
const MOMENT_SLOW_UNTIL = 1600;

function buildMoment(): ChoreoDef {
  const reactionStart = MOMENT_HIT + MOMENT_STOP;
  const { c, slowChoreo } = clockOf(
    MOMENT_HIT,
    MOMENT_STOP,
    MOMENT_SLOW_UNTIL - reactionStart,
    SLOW,
  );
  const t = new Tracks();
  const AX = MOMENT_X.astronaut;
  const WX = AX + MOMENT_WORM_DX;
  const WY = GROUND - MOMENT_SAND_RAISE;
  const HX = AX + HEAD_STAND.dx;
  const HY = HEAD_STAND.y;

  // Astronaut: calm, crouch while the wave comes, leap onto the head, shot down, glide, kneel, stand.
  stance(t, 0, STAND);
  hideArc(t);
  t.key('astronaut', 'x', 0, AX);
  t.key('astronaut', 'y', 0, GROUND);
  t.key('astronaut.arm-front', 'angle', 0, 0);
  stance(t, 300, CROUCH);
  // 600 to 720: the worm bursts out, she leaps off with the pack and lands on its head.
  stance(t, 600, LEAP);
  t.key('astronaut', 'x', 600, AX, 'linear');
  t.key('astronaut', 'x', 660, HX);
  t.key('astronaut', 'y', 600, GROUND, 'sine.out');
  t.key('astronaut', 'y', 660, HY - 6, 'sine.inOut');
  t.key('astronaut', 'y', 720, HY);
  // 720 to 900: hold on the head, visor dark, the raygun points steeply down (`down45` + fine rotation).
  stance(t, 720, SHOOT);
  t.key('astronaut.arm-front', 'angle', 720, TWIST);
  // Reaction: she glides down with the crumbling head, lands behind the worm on one knee, stands up.
  stance(t, c(reactionStart), { ...LEAP, helmet: 'dark' });
  t.key('astronaut.arm-front', 'angle', c(reactionStart), 0);
  t.key('astronaut', 'x', c(reactionStart), HX, 'linear');
  t.key('astronaut', 'x', c(1500), 340, 'linear');
  t.key('astronaut', 'x', c(2200), 370);
  t.key('astronaut', 'y', c(reactionStart), HY, 'linear');
  t.key('astronaut', 'y', c(1500), 208, 'linear');
  t.key('astronaut', 'y', c(2200), GROUND);
  stance(t, c(2200), KNEEL);
  stance(t, c(3000), STAND);

  // Sand worm: hidden under the wave, bursts out at 600 (120 ms), jaw wide, then crumbles link by link.
  wormRest(t);
  t.key('giantSandWorm', 'alpha', 0, 0);
  t.key('giantSandWorm', 'alpha', 600, 1);
  t.key('giantSandWorm', 'y', 0, WY + SUNK.moment, 'sine.out');
  t.key('giantSandWorm', 'y', 600, WY + SUNK.moment, 'sine.out');
  t.key('giantSandWorm', 'y', 720, WY);
  t.key('giantSandWorm.jaw', 'pose', 600, 'roar');
  t.key('giantSandWorm.jaw', 'pose', 720, 'open');
  const crumbleEnd = crumbleChain(t, reactionStart, c);

  const events: ChoreoEvent[] = [
    // Stage (AP-196, Q-97): dunes with the sun, plus cinema bars, once at the start.
    { kind: 'fx', atMs: 0, name: 'letterbox', flash: false },
    { kind: 'fx', atMs: 0, name: 'stage-world:giantSandWorm-moment', flash: false },
    // The wave runs towards her (600 ms), then the worm bursts out of the sand.
    { kind: 'fx', atMs: 0, durationMs: 600, name: 'sand-wave', flash: false },
    {
      kind: 'fx',
      atMs: 600,
      durationMs: crumbleEnd + CRUMBLE - 600,
      name: 'sand-cover',
      flash: false,
    },
    ...sandBurst(600, WX - 10, GROUND - 4, 14),
    trail(600, 120),
    // Shot down into the head, beam until the end of the hit stop.
    { kind: 'fx', atMs: MOMENT_HIT, durationMs: MOMENT_STOP, name: 'shot-beam', flash: false },
    { kind: 'sound', atMs: MOMENT_HIT, key: HIT_SOUND_KEY, flash: false },
    {
      kind: 'hitStop',
      atMs: MOMENT_HIT,
      ms: MOMENT_STOP,
      axis: 'x',
      targets: ['giantSandWorm'],
      strength: 1,
      flash: false,
    },
    { kind: 'timeScale', atMs: MOMENT_HIT, durationMs: slowChoreo, factor: SLOW, flash: false },
    // Main hit (H-48 13a): only the boss turns white for 100 ms, no full-screen flash. This is the one
    // flash of the moment, so "reduce effects" removes it.
    {
      kind: 'hitWhite',
      atMs: MOMENT_HIT,
      durationMs: HIT_WHITE,
      targets: ['giantSandWorm'],
      flash: true,
    },
    // Speedline ring (AP-194, H-50): with the boss white, same atMs; no flash, gone with "reduce effects".
    {
      kind: 'fx',
      atMs: MOMENT_HIT,
      durationMs: HIT_RING,
      name: 'hit-ring',
      flash: false,
      reduce: 'drop',
    },
    { kind: 'shake', atMs: MOMENT_HIT, durationMs: 200, strength: 0.5, flash: false },
    {
      kind: 'particles',
      atMs: MOMENT_HIT,
      texture: 'rig-fx-worm-3',
      count: 8,
      follow: 'giantSandWorm.head',
      flash: false,
    },
    ...crumbleDust(c, reactionStart),
    { kind: 'fx', atMs: c(2700), durationMs: 800, name: 'sand-smooth', flash: false },
    { kind: 'text', atMs: c(3100), text: 'BEZWUNGEN!', color: 'finisher.title', flash: false },
  ];

  // Beats in choreography time; the grid test reads them (RS-06.2). The board times are real time.
  const beats: ChoreoBeat[] = [
    { phase: 'anticipation', atMs: 0, durationMs: 600 },
    { phase: 'action', atMs: 600, durationMs: 120 },
    { phase: 'anticipation', atMs: 720, durationMs: 180 },
    { phase: 'action', atMs: 900, durationMs: 100 },
    { phase: 'hitStop', atMs: MOMENT_HIT, durationMs: MOMENT_STOP, final: true },
    { phase: 'reaction', atMs: MOMENT_HIT, durationMs: slowChoreo, final: true },
    { phase: 'followThrough', atMs: c(2200), durationMs: c(3500) - c(2200), final: true },
  ];

  return {
    variantId: 'moment-giantSandWorm',
    actors: [
      { rigId: 'giantSandWorm', x: WX, y: WY },
      { rigId: 'astronaut', x: AX, y: GROUND },
    ],
    durationMs: c(3500),
    tracks: t.list(),
    events,
    beats,
  };
}

// ---------------------------------------------------------------------------------------------------
// Cinematic level 25 "SONNENSPEER" (brief H-48, boards 1a to 5c)
// ---------------------------------------------------------------------------------------------------

/** Camera centre (stage px) to scroll values of a 640 x 360 stage (scroll 0 = stage centred). */
const scrollOf = (cx: number, cy: number) => ({ scrollX: cx - 320, scrollY: cy - 180 });

/** Where the spear sticks: above the jaw (x of head + jaw), this many px of the boss image above the head (board 4c). */
const SPEAR_STUCK_DY = -28;
const SPEAR_ANGLE = 40;

function buildCinematic(): ChoreoDef {
  const { c, slowChoreo } = clockOf(9600, 200, 2200, SLOW);
  const t = new Tracks();
  const AC = CINE_X.astronaut;
  const BC = CINE_X.boss;
  const head = W('head');
  const jaw = W('jaw');

  // Camera. Shot 1: slow ride to the right (1a to 1c), shot 2 stands, shot 3 zooms 2 on the astronaut while
  // the spear of light is made and back to 1 for the name, shots 4 and 5 stay on 1.
  const start = scrollOf(260, 180);
  t.key('camera', 'zoom', 0, 1);
  t.key('camera', 'scrollX', 0, start.scrollX, 'sine.inOut');
  t.key('camera', 'scrollX', 2600, 0);
  t.key('camera', 'scrollY', 0, 0);
  const onHer = scrollOf(190, 220);
  t.key('camera', 'zoom', 7000, 2);
  t.key('camera', 'zoom', 8200, 1);
  t.key('camera', 'scrollX', 7000, onHer.scrollX);
  t.key('camera', 'scrollX', 8200, 0);
  t.key('camera', 'scrollY', 7000, onHer.scrollY);
  t.key('camera', 'scrollY', 8200, 0);

  // Astronaut. E1: only dunes, she steps in at 2600.
  stance(t, 0, STAND);
  hideArc(t);
  t.key('astronaut', 'alpha', 0, 0);
  t.key('astronaut', 'alpha', 2600, 1);
  t.key('astronaut', 'x', 0, AC);
  t.key('astronaut', 'y', 0, GROUND);
  // E2 (3000 to 6000): breakthrough 1 in front of her, she leaps back.
  stance(t, 3150, CROUCH);
  stance(t, 3300, LEAP);
  jump(t, 3300, AC, AC - 40, 214, 120, 180);
  stance(t, 3600, CROUCH);
  // Breakthrough 2 behind her: blade grows, she rolls to the side and stops the link with the blade (guard).
  bladeSteps(t, 3700, CROUCH, 1);
  stance(t, 4000, { ...LEAP, blade: 'full' });
  jump(t, 4000, AC - 40, 280, 226, 100, 150);
  stance(t, 4300, GUARD);
  t.key('astronaut.blade', 'angle', 4300, -16);
  stance(t, 4900, { ...GUARD, blade: 'full' });
  // Breakthrough 3: the worm dives away in an arc, she crouches and pulls the blade back (3 steps).
  bladeSteps(t, 5150, { ...CROUCH }, -1);
  stance(t, 5400, CROUCH);
  t.key('astronaut', 'x', 4900, 280, 'sine.inOut');
  t.key('astronaut', 'x', 5400, AC + 40);
  stance(t, 5900, CROUCH);
  // E3 (6000 to 9000): back to her stand, visor dark, the blade grows and turns into the spear of light.
  t.key('astronaut', 'x', 5900, AC + 40, 'sine.inOut');
  t.key('astronaut', 'x', 6200, AC);
  stance(t, 6000, CROUCH);
  stance(t, 7000, { ...CROUCH, helmet: 'dark' });
  bladeSteps(t, 7100, { ...CROUCH, helmet: 'dark' }, 1);
  stance(t, 7400, { ...CROUCH, helmet: 'dark', blade: 'spear' });
  t.key('astronaut.blade', 'alpha', 7400, 0.6);
  stance(t, 8200, RAISE_SPEAR);
  // E4 (9000 to 12000): leap high over the open maw, throw from above, land on one knee in slow motion.
  stance(t, 9000, { ...LEAP, armFront: 'raise', armBack: 'up', helmet: 'dark', blade: 'spear' });
  t.key('astronaut', 'x', 9000, AC, 'linear');
  t.key('astronaut', 'x', 9300, 300, 'linear');
  t.key('astronaut', 'x', 9600, 300, 'linear');
  t.key('astronaut', 'y', 9000, GROUND, 'sine.out');
  t.key('astronaut', 'y', 9300, 150, 'linear');
  t.key('astronaut', 'y', 9600, 140, 'linear');
  // The throw: smear poses 33 ms, then the arm ends low; the spear leaves the hand and sticks in the maw.
  stance(t, 9500, SMEARED);
  const thrown: Stance = {
    ...LEAP,
    torso: 'lean',
    armFront: 'slash-end',
    helmet: 'dark',
    blade: 'spear',
  };
  stance(t, 9500 + SMEAR, thrown);
  // Spear in the astronaut's local px: world target minus her place (scale 2), minus the arm pivot.
  const target = {
    x: BC + (head.x + jaw.x) * SCALE_CINE,
    y: GROUND + (head.y + SPEAR_STUCK_DY) * SCALE_CINE,
  };
  const local = (s: Stance, ax: number, ay: number) => {
    const arm = armPos(s);
    return {
      x: (target.x - ax) / SCALE_ASTRO - arm.x,
      y: (target.y - ay) / SCALE_ASTRO - arm.y,
    };
  };
  const landReal = 10800;
  const spearAt = (at: number, s: Stance, ax: number, ay: number, ease: ChoreoEase) => {
    const p = local(s, ax, ay);
    t.key('astronaut.blade', 'x', at, p.x, ease);
    t.key('astronaut.blade', 'y', at, p.y, ease);
  };
  t.key(
    'astronaut.blade',
    'angle',
    9500 + SMEAR,
    ANCH['arm-front']['slash-end'].blade.angle,
    'linear',
  );
  t.key('astronaut.blade', 'x', 9500 + SMEAR, ANCH['arm-front']['slash-end'].blade.x, 'linear');
  t.key('astronaut.blade', 'y', 9500 + SMEAR, ANCH['arm-front']['slash-end'].blade.y, 'linear');
  t.key('astronaut.blade', 'angle', 9600, SPEAR_ANGLE);
  spearAt(9600, thrown, 300, 140, 'linear');
  // She falls and drifts left (linear, so the spear keeps its place in the world), lands kneeling.
  const kneel: Stance = { ...KNEEL, blade: 'spear', helmet: 'dark' };
  t.key('astronaut', 'x', c(landReal), 240);
  t.key('astronaut', 'y', c(landReal), GROUND);
  spearAt(c(landReal) - 1, thrown, 240, GROUND, 'linear');
  stance(t, c(landReal), kneel);
  t.key('astronaut.blade', 'angle', c(landReal), SPEAR_ANGLE);
  spearAt(c(landReal), kneel, 240, GROUND, 'hold');
  // The spear burns out while the chain starts to crumble.
  t.key('astronaut.blade', 'alpha', c(12000), 0);
  stance(t, c(12400), { ...KNEEL, blade: 'off' });
  t.key('astronaut.blade', 'alpha', c(12400), 0);
  // E5: she stands up (x 260 to 280), the arm lowers with the title.
  t.key('astronaut', 'x', c(13000), 240, 'sine.inOut');
  t.key('astronaut', 'x', c(13400), 260);
  stance(t, c(13400), STAND);
  t.key('astronaut', 'x', c(14000), 260, 'sine.inOut');
  t.key('astronaut', 'x', c(14300), 280);
  stance(t, c(14150), { ...STAND, armFront: 'aim' });
  t.key('astronaut.arm-front', 'angle', c(14200), 14);

  // Sand worm. E2: three breakthroughs, each a rise out of the sand, a pose, a dive and gone.
  wormRest(t);
  t.key('giantSandWorm', 'alpha', 0, 0);
  t.key('giantSandWorm', 'x', 0, BC);
  t.key('giantSandWorm', 'y', 0, GROUND + SUNK.hidden);
  // 1: right in front of her (x 330), jaw wide.
  const breakthrough = (
    at: number,
    x: number,
    up: number,
    out: number,
    hold: number,
    jawPose: string,
  ) => {
    t.key('giantSandWorm', 'alpha', at - 100, 1);
    t.key('giantSandWorm', 'x', at - 100, x);
    t.key('giantSandWorm', 'y', at - 100, GROUND + SUNK.hidden, 'sine.out');
    t.key('giantSandWorm', 'y', at, GROUND + up);
    t.key('giantSandWorm', 'y', at + hold, GROUND + up, 'expo.in');
    t.key('giantSandWorm', 'y', at + hold + 200, GROUND + out);
    t.key('giantSandWorm', 'alpha', at + hold + 250, 0);
    t.key('giantSandWorm.jaw', 'pose', at - 100, jawPose);
  };
  breakthrough(3400, 330, SUNK.near, SUNK.hidden, 400, 'roar');
  breakthrough(4300, BC, SUNK.mid, SUNK.hidden, 500, 'open');
  breakthrough(5400, BC + 40, SUNK.deep, SUNK.hidden, 250, 'closed');
  t.key('giantSandWorm.head', 'angle', 5400, 0, 'sine.inOut');
  t.key('giantSandWorm.head', 'angle', 5650, 18);
  t.key('giantSandWorm.head', 'angle', 5700, 0);
  // E3: the whole worm breaks out at 8200 (100 ms) and roars at the name; stands to the hit.
  t.key('giantSandWorm', 'alpha', 8100, 1);
  t.key('giantSandWorm', 'x', 8100, BC);
  t.key('giantSandWorm', 'y', 8100, GROUND + SUNK.hidden, 'sine.out');
  t.key('giantSandWorm', 'y', 8300, GROUND);
  t.key('giantSandWorm.jaw', 'pose', 8100, 'roar');
  const chainStart = 12000;
  const chainEnd = crumbleChain(t, chainStart, c);

  const events: ChoreoEvent[] = [
    // Stage (AP-196, Q-97): dunes; board 3b (zoom 2, camera keys 7000 to 8200) a larger sun, then back.
    { kind: 'fx', atMs: 0, name: 'letterbox', flash: false },
    { kind: 'fx', atMs: 0, name: 'stage-world:giantSandWorm-1', flash: false },
    { kind: 'fx', atMs: 7000, name: 'stage-world:giantSandWorm-3b', flash: false },
    { kind: 'fx', atMs: 8200, name: 'stage-world:giantSandWorm-1', flash: false },
    // E1: the wave comes closer (3 stages); E2: sand fountains of the breakthroughs
    { kind: 'fx', atMs: 0, durationMs: 3000, name: 'sand-wave-in', flash: false },
    { kind: 'fx', atMs: 3300, durationMs: chainEnd - 3300, name: 'sand-cover', flash: false },
    ...sandBurst(3300, 300, GROUND, 12),
    trail(3300, 300),
    ...sandBurst(4300, BC - 20, GROUND, 9),
    {
      kind: 'particles',
      atMs: 4300,
      texture: 'rig-fx-worm-3',
      count: 6,
      at: { x: 330, y: 236 },
      flash: false,
    },
    {
      kind: 'particles',
      atMs: 4300,
      texture: 'rig-fx-worm-1',
      count: 4,
      at: { x: 330, y: 236 },
      flash: false,
    },
    ...sandBurst(5400, BC - 20, GROUND - 10, 20),
    // E3: the wave builds up again, the portrait strip, sun sparks at the spear, the name
    { kind: 'fx', atMs: 6000, durationMs: 2200, name: 'sand-wave-hold', flash: false },
    { kind: 'fx', atMs: 6000, durationMs: 1000, name: 'portrait', flash: false },
    {
      kind: 'particles',
      atMs: 7400,
      texture: 'rig-fx-worm-4',
      count: 8,
      at: { x: AC + 90, y: GROUND - 50 },
      flash: false,
    },
    {
      kind: 'text',
      atMs: 8200,
      durationMs: 800,
      text: 'SONNENSPEER',
      color: 'finisher.name',
      flash: false,
    },
    // E4: jump with afterimages, the only impact pair, slow motion
    trail(9000, 500),
    trail(9500, 100),
    { kind: 'sound', atMs: 9600, key: HIT_SOUND_KEY, flash: false },
    {
      kind: 'hitStop',
      atMs: 9600,
      ms: 200,
      axis: 'x',
      targets: ['giantSandWorm'],
      strength: 1,
      flash: false,
    },
    { kind: 'timeScale', atMs: 9600, durationMs: slowChoreo, factor: SLOW, flash: false },
    { kind: 'fx', atMs: 9600, durationMs: 200, name: 'impact-pair', flash: true },
    {
      kind: 'hitWhite',
      atMs: 9600,
      durationMs: 200,
      targets: ['giantSandWorm', 'astronaut'],
      flash: false,
    },
    { kind: 'shake', atMs: c(9800), durationMs: 300, strength: 0.6, flash: false },
    {
      kind: 'particles',
      atMs: c(9800),
      texture: 'rig-fx-worm-4',
      count: 10,
      follow: 'giantSandWorm.seg-2',
      durationMs: 600,
      flash: false,
    },
    {
      kind: 'particles',
      atMs: c(9800),
      texture: 'rig-fx-worm-4',
      count: 10,
      follow: 'giantSandWorm.seg-4',
      durationMs: 600,
      flash: false,
    },
    // E5: the chain crumbles from the head (12000), the dune calms down, the title
    ...crumbleDust(c, chainStart),
    { kind: 'fx', atMs: c(13400), durationMs: 1600, name: 'dune-calm', flash: false },
    { kind: 'text', atMs: c(14000), text: 'BEZWUNGEN!', color: 'finisher.title', flash: false },
  ];

  const beats: ChoreoBeat[] = [
    { phase: 'anticipation', atMs: 9000, durationMs: 400 },
    { phase: 'action', atMs: 9500, durationMs: 100 },
    { phase: 'hitStop', atMs: 9600, durationMs: 200, final: true },
    { phase: 'reaction', atMs: 9600, durationMs: slowChoreo, final: true },
    { phase: 'followThrough', atMs: c(12000), durationMs: c(15000) - c(12000), final: true },
  ];

  // Five shots of 3000 ms real time; shot 5 starts after the slow motion.
  const long = { scrollX: 0, scrollY: 0, zoom: 1 };
  const shots: ChoreoShot[] = [
    { atMs: 0, camera: { ...start, scrollY: 0, zoom: 1 } },
    { atMs: 3000, camera: long },
    { atMs: 6000, camera: long },
    { atMs: 9000, camera: long },
    { atMs: c(12000), camera: long },
  ];

  return {
    variantId: 'cinematic-25',
    actors: [
      { rigId: 'giantSandWorm', x: BC, y: GROUND },
      { rigId: 'astronaut', x: AC, y: GROUND },
    ],
    durationMs: c(15000),
    shots,
    tracks: t.list(),
    events,
    beats,
  };
}

export const MOMENT_GIANT_SAND_WORM: ChoreoDef = buildMoment();
export const CINEMATIC_25: ChoreoDef = buildCinematic();

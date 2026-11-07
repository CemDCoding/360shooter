// Choreographies of the pharaoh (M13, AP-190, brief H-48 part 2b, mockup m13b-pharaoh.html, PE-235, PE-249,
// PE-250): the fight moment "Raetsel" (`moment-pharaoh`, 3.5 s, levels 31 to 39) and the cinematic of level 40
// "LETZTER STERN" (`cinematic-40`, 20 s, 6 shots, the climax of the game). Only data: key frames, camera and
// events; the effects of the boss itself live in `scenes/finisher/fx/pharaoh.ts`.
//
// Times are written in REAL time (the storyboard tables); `clockOf` turns them into choreography time (hit
// stop and slow motion). Key frames are collected by `Tracks`, which sorts them and drops repeated hold keys.
//
// What is special about this boss (brief H-48, "Annahmen des Designers in Teil 2b"):
// - The pharaoh gilds from the feet upwards in the order `PHARAOH_GILD_ORDER` (robe half, then robe, flail, crook,
//   collar, head) and bursts into gold dust. The moment and the last shot of the cinematic use the same helper.
// - Moment: three riddle symbols (effect `riddle`), the shot goes steeply up at the right one (raygun `up45`,
//   fine rotation of the arm). The gold spiral (`orb-ring`) turns round at the hit and draws in.
// - Cinematic: shot 3 is the flashback on the five defeated bosses (effect `flashback`) without any flash;
//   the only axis change of all finales is at shot 5 (both figures mirrored, `scaleX` -1, shot flag
//   `axisFlip`); the final hit has the longest slow motion of the game (factor 0.2 for 2.5 s real time).
// - Children of `arm-front` (raygun, blade, blade-arc) follow the arm pose by hold keys from ASTRONAUT_ANCHORS
//   (PE-252). The blade arc is shown by `alpha` with its base frame; arc1/arc2 are keyed after `none`.
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
import { PHARAOH_GILD_ORDER } from '../rigs/pharaoh';

const GROUND = THEME.sizePx['size.rig-ground'];
const BLADE_STEP = THEME.motionMs['motion.rig-blade-step'];
const SMEAR = THEME.motionMs['motion.rig-smear'];
const SMEAR_ARC = THEME.motionMs['motion.rig-smear-arc'];
const HIT_WHITE = THEME.motionMs['motion.rig-hit-white'];
/** Whole speedline ring: `size.rig-hit-ring-steps` steps of `motion.rig-hit-ring-step` (AP-194). */
const HIT_RING =
  THEME.sizeCount['size.rig-hit-ring-steps'] * THEME.motionMs['motion.rig-hit-ring-step'];
const AFTERIMAGE_GAP = THEME.motionMs['motion.rig-afterimage-gap'];
const AFTERIMAGE_FADE = THEME.motionMs['motion.rig-afterimage-fade'];
const CUTIN = THEME.motionMs['motion.finisher-cutin'];
const ANCH = ASTRONAUT_ANCHORS;

/** Placeholder sound of the main hit (PE-237); equals `SOUND_HIT` in scenes/finisher/timing.ts (test). */
export const HIT_SOUND_KEY = 'sfx-finisher-hit';
/** Slow motion of the moment's reaction and of the cinematic's final hit (the longest of the game, 11a/12a). */
const SLOW_MOMENT = 0.3;
export const SLOW_FINAL = 0.2;

const MOMENT_X = {
  astronaut: THEME.sizePx['size.rig-astro-x-moment'],
  boss: THEME.sizePx['size.rig-boss-x-moment'],
} as const;
/** The cinematic stands the figures on the cinematic tokens; after the axis change they swap places (8a). */
export const CINE_X = {
  astronaut: THEME.sizePx['size.rig-astro-x-cinematic'],
  boss: THEME.sizePx['size.rig-boss-x-cinematic'],
} as const;

/**
 * Board values of the mockup (layout, no tokens). Fine rotation of the arm for the steep shot, orbit step of the
 * gold spiral, where the astronaut stands in the shots of the cinematic.
 */
export const AIM_TURN = -10;
export const ORB_STEP_MS = 150;
/** Shot 1: camera start (scroll value), the ride to the throne and back to the total (boards 1a to 1c). */
const RIDE = { start: -160, throne: 100, total: 0 } as const;
/** Where the astronaut stands in shots 2 and 3, and where she walks to for the counter (boards 2c, 3a). */
export const CINE_STAND = { counter: 260, flashback: 90 } as const;
/** Shot 5: she comes in from the right, ends the cut next to the throne and kneels behind it (boards 5a to 5c). */
export const FINAL_CUT = { from: 560, hit: 310, kneel: 330, hitLift: 30, apexLift: 90 } as const;
/** Shot 6: she steps right for the gilding and back into the sun (boards 6a to 6c). */
export const DAWN_WALK = { out: 480, back: 330 } as const;

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

type Legs = 'stand' | 'crouch' | 'tuck' | 'kneel' | 'smear';
type TorsoPose = 'upright' | 'lean' | 'smear';
type ArmFront = keyof (typeof ANCH)['arm-front'];
type BladeStage = 'off' | 'grow1' | 'grow2' | 'full';

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
const AIM: Stance = { ...STAND, armFront: 'aim' };
/** Board R3: steep shot at the symbol; the raygun pose `up45` is keyed on top (`steepUp`). */
const SHOOT_UP: Stance = { ...AIM, armBack: 'back', helmet: 'dark' };
const CROUCH: Stance = { ...AIM, legs: 'crouch', torso: 'lean', armBack: 'back' };
const GUARD: Stance = { ...CROUCH, torso: 'upright', blade: 'full' };
const RAISE: Stance = {
  ...STAND,
  legs: 'tuck',
  armFront: 'raise',
  armBack: 'up',
  helmet: 'dark',
  blade: 'full',
};
const SMEARED: Stance = {
  ...STAND,
  legs: 'smear',
  torso: 'smear',
  armFront: 'smear',
  armBack: 'back',
  helmet: 'dark',
};
const CUT: Stance = {
  ...STAND,
  legs: 'kneel',
  torso: 'lean',
  armFront: 'slash-end',
  armBack: 'back',
  blade: 'full',
};

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

/** The drawn blade arc: shown only by `alpha` over its base frame; `none` is no drawn pose (not a smear). */
function arc(t: Tracks, at: number, shown: 'off' | 'arc1' | 'arc2', angle?: number): void {
  t.key('astronaut.blade-arc', 'pose', at, shown === 'off' ? 'none' : shown);
  t.key('astronaut.blade-arc', 'alpha', at, shown === 'off' ? 0 : 1);
  if (angle !== undefined) t.key('astronaut.blade-arc', 'angle', at, angle);
}

/** The blade steps in `motion.rig-blade-step`, grown (`dir` 1) or pulled back (`dir` -1). */
function bladeSteps(t: Tracks, at: number, from: Stance, dir: 1 | -1): void {
  const order: BladeStage[] = dir === 1 ? ['grow1', 'grow2', 'full'] : ['grow2', 'grow1', 'off'];
  order.forEach((blade, i) => stance(t, at + i * BLADE_STEP, { ...from, blade }));
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
// The pharaoh: poses, gold spiral, gilding
// ---------------------------------------------------------------------------------------------------

type PharaohPart = 'robe' | 'collar' | 'flail' | 'crook' | 'head';
const REST_POSES: Readonly<Record<PharaohPart, string>> = {
  robe: 'rest',
  collar: 'rest',
  flail: 'rest',
  crook: 'rest',
  head: 'rest',
};
/** He lifts crook and flail and glares (boards R2, 2a, 5a). */
const RAISED: Partial<Record<PharaohPart, string>> = {
  crook: 'raised',
  flail: 'raised',
  head: 'glare',
};
const GLARE: Partial<Record<PharaohPart, string>> = { head: 'glare' };

/** Poses of the five parts at `at` (the parts not named rest). */
function pharaohPose(t: Tracks, at: number, poses: Partial<Record<PharaohPart, string>>): void {
  for (const [id, pose] of Object.entries({ ...REST_POSES, ...poses })) {
    t.key(`pharaoh.${id}`, 'pose', at, pose);
  }
}

/** The gold spiral circles in steps of `ORB_STEP_MS` (spin1, spin2, spin3) between `from` and `to` (real time). */
function spiral(t: Tracks, from: number, to: number): void {
  for (let at = from, k = 0; at < to; at += ORB_STEP_MS, k++) {
    t.key('pharaoh.orb-ring', 'pose', at, `spin${(k % 3) + 1}`);
  }
}

/**
 * The gilding from the feet upwards: the robe turns half gold at `half`, then robe, flail, crook, collar and head
 * follow in `PHARAOH_GILD_ORDER` at the given times (real time, `c` maps them).
 */
function gild(
  t: Tracks,
  c: (real: number) => number,
  half: number,
  times: readonly number[],
): void {
  t.key('pharaoh.robe', 'pose', c(half), 'gilded-half');
  PHARAOH_GILD_ORDER.forEach((id, i) => t.key(`pharaoh.${id}`, 'pose', c(times[i]), 'gilded'));
}

/** Gilding times of the moment (R6 half gold at 1700, R7 robe, flail and crook gold at 2200, R8 head at 2550). */
export const MOMENT_GILD = { half: 1400, times: [1750, 1950, 2100, 2250, 2400] } as const;
/** Gilding times of the last shot (board 6a: robe and flail gold at 17200). */
export const CINE_GILD = { half: 16800, times: [17000, 17150, 17300, 17500, 17700] } as const;

/** Dust of the gilding: gold grains that rise at the feet, a few per step (frame 1 of `rig-fx-pharaoh`). */
function riseDust(
  c: (real: number) => number,
  times: readonly number[],
  x: number,
  count: number,
): ChoreoEvent[] {
  return times.map((real) => ({
    kind: 'particles' as const,
    atMs: c(real),
    texture: 'rig-fx-pharaoh-1',
    count,
    at: { x, y: GROUND - 10 },
    flash: false,
  }));
}

/** Burst of gold dust: the three gold frames (spark, grain, splinter) with `count / 3` each. */
function goldBurst(atMs: number, x: number, y: number, count: number): ChoreoEvent[] {
  return [0, 1, 2].map((i) => ({
    kind: 'particles' as const,
    atMs,
    texture: `rig-fx-pharaoh-${i}`,
    count: Math.round(count / 3),
    at: { x, y },
    flash: false,
  }));
}

// ---------------------------------------------------------------------------------------------------
// Fight moment "Raetsel" (brief H-48, boards R1 to R9)
// ---------------------------------------------------------------------------------------------------

/** Real time of the main hit, its hit stop and the end of the slow motion (boards R4/R5/R6). */
const MOMENT_HIT = 1100;
const MOMENT_STOP = 200;
const MOMENT_SLOW_UNTIL = 2000;

function buildMoment(): ChoreoDef {
  const reactionStart = MOMENT_HIT + MOMENT_STOP;
  const { c, slowChoreo } = clockOf(
    MOMENT_HIT,
    MOMENT_STOP,
    MOMENT_SLOW_UNTIL - reactionStart,
    SLOW_MOMENT,
  );
  const t = new Tracks();
  const AX = MOMENT_X.astronaut;
  const BX = MOMENT_X.boss;

  // Astronaut: calm, aim, steep shot at the right symbol, recoil, glide down, stand.
  stance(t, 0, STAND);
  t.key('astronaut.blade-arc', 'pose', 0, 'none');
  t.key('astronaut.blade-arc', 'alpha', 0, 0);
  t.key('astronaut', 'x', 0, AX);
  t.key('astronaut', 'y', 0, GROUND);
  t.key('astronaut.arm-front', 'angle', 0, 0);
  stance(t, 400, AIM);
  const steepUp = (at: number, s: Stance): void => {
    stance(t, at, s);
    t.key('astronaut.raygun', 'pose', at, 'up45');
  };
  steepUp(700, SHOOT_UP);
  t.key('astronaut.arm-front', 'angle', 700, AIM_TURN);
  steepUp(1000, { ...SHOOT_UP, pack: 'thrust' });
  steepUp(MOMENT_HIT, SHOOT_UP);
  stance(t, c(reactionStart), AIM);
  t.key('astronaut.arm-front', 'angle', c(reactionStart), 0);
  stance(t, c(2200), STAND);

  // Pharaoh: gold spiral circles, lifts the staffs (anticipation 700 ms in two beats), turns the spiral round at
  // the hit and draws it in, gilds from the feet upwards, bursts into gold dust and sinks into the sand.
  t.key('pharaoh', 'x', 0, BX);
  t.key('pharaoh', 'y', 0, GROUND);
  t.key('pharaoh', 'alpha', 0, 1);
  pharaohPose(t, 0, {});
  pharaohPose(t, 400, RAISED);
  spiral(t, 0, 1000);
  t.key('pharaoh.orb-ring', 'pose', 1000, 'spin3');
  t.key('pharaoh.orb-ring', 'pose', c(reactionStart), 'spin2');
  t.key('pharaoh.orb-ring', 'pose', c(1500), 'spin1');
  t.key('pharaoh.orb-ring', 'scaleX', c(reactionStart), 1, 'sine.inOut');
  t.key('pharaoh.orb-ring', 'scaleY', c(reactionStart), 1, 'sine.inOut');
  t.key('pharaoh.orb-ring', 'scaleX', c(1600), 0.3);
  t.key('pharaoh.orb-ring', 'scaleY', c(1600), 0.3);
  t.key('pharaoh.orb-ring', 'alpha', 0, 1);
  t.key('pharaoh.orb-ring', 'alpha', c(1600), 0);
  gild(t, c, MOMENT_GILD.half, MOMENT_GILD.times);
  t.key('pharaoh', 'alpha', c(2550), 0.45);
  t.key('pharaoh', 'alpha', c(2800), 0);

  const events: ChoreoEvent[] = [
    // Stage (AP-197): world of the oasis and the letterbox of the storyboard, once at the start.
    { kind: 'fx', atMs: 0, name: 'stage-world:pharaoh-moment', flash: false },
    { kind: 'fx', atMs: 0, name: 'letterbox', flash: false },
    // Three riddle symbols above him (400 to 1300), the shot hits the right one.
    { kind: 'fx', atMs: 300, durationMs: 1000, name: 'riddle', flash: false },
    { kind: 'fx', atMs: 1000, durationMs: MOMENT_HIT - 1000, name: 'shot-beam', flash: false },
    trail(1000, MOMENT_HIT - 1000),
    { kind: 'sound', atMs: MOMENT_HIT, key: HIT_SOUND_KEY, flash: false },
    {
      kind: 'hitStop',
      atMs: MOMENT_HIT,
      ms: MOMENT_STOP,
      axis: 'x',
      targets: ['pharaoh'],
      strength: 1,
      flash: false,
    },
    {
      kind: 'timeScale',
      atMs: MOMENT_HIT,
      durationMs: slowChoreo,
      factor: SLOW_MOMENT,
      flash: false,
    },
    // Main hit (H-48 13a): only the boss turns white for 100 ms, no full-screen flash. This is the one
    // flash of the moment, so "reduce effects" removes it.
    {
      kind: 'hitWhite',
      atMs: MOMENT_HIT,
      durationMs: HIT_WHITE,
      targets: ['pharaoh'],
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
    // Gilding: dust rises at the feet, a glint wanders up, then the gold dust.
    ...riseDust(c, [1400, 1700, 2000], BX, 6),
    { kind: 'fx', atMs: c(1400), durationMs: 1100, name: 'gleam', flash: false },
    ...goldBurst(c(2550), BX, GROUND - 100, 40),
    ...riseDust(c, [3100], BX, 16),
    { kind: 'text', atMs: c(3100), text: 'BEZWUNGEN!', color: 'finisher.title', flash: false },
  ];

  // Beats in choreography time; the grid test reads them (RS-06.2). The boss anticipation (700 ms) is two beats.
  const beats: ChoreoBeat[] = [
    { phase: 'anticipation', atMs: 0, durationMs: 350 },
    { phase: 'anticipation', atMs: 350, durationMs: 350 },
    { phase: 'anticipation', atMs: 700, durationMs: 300 },
    { phase: 'action', atMs: 1000, durationMs: 100 },
    { phase: 'hitStop', atMs: MOMENT_HIT, durationMs: MOMENT_STOP, final: true },
    { phase: 'reaction', atMs: MOMENT_HIT, durationMs: slowChoreo, final: true },
    { phase: 'followThrough', atMs: c(2700), durationMs: c(3500) - c(2700), final: true },
  ];

  return {
    variantId: 'moment-pharaoh',
    actors: [
      { rigId: 'pharaoh', x: BX, y: GROUND },
      { rigId: 'astronaut', x: AX, y: GROUND },
    ],
    durationMs: c(3500),
    tracks: t.list(),
    events,
    beats,
  };
}

// ---------------------------------------------------------------------------------------------------
// Cinematic level 40 "LETZTER STERN" (brief H-48, boards 1a to 6c)
// ---------------------------------------------------------------------------------------------------

/** Camera centre (stage px) to scroll value of a 640 x 360 stage (scroll 0 = stage centred). */
const FINAL_HIT = 13800;
const FINAL_STOP = 200;
const FINAL_SLOW_FROM = FINAL_HIT + FINAL_STOP;
const FINAL_SLOW_UNTIL = 16500;
/** Start of shot 6 in real time (after the slow motion). */
const SHOT6 = 16700;
/** The six shots of ~3.3 s (boards 1 to 6) in real time. */
export const SHOT_STARTS = [0, 3300, 6600, 10000, 13300, SHOT6] as const;

function buildCinematic(): ChoreoDef {
  const { c, slowChoreo } = clockOf(
    FINAL_HIT,
    FINAL_STOP,
    FINAL_SLOW_UNTIL - FINAL_SLOW_FROM,
    SLOW_FINAL,
  );
  const t = new Tracks();
  const AC = CINE_X.astronaut;
  const BC = CINE_X.boss;

  // Camera. Shot 1 rides to the right to the throne and back to the total (sine.inOut); the zoom stays 1.
  t.key('camera', 'zoom', 0, 1);
  t.key('camera', 'scrollX', 0, RIDE.start, 'sine.inOut');
  t.key('camera', 'scrollX', 1300, RIDE.throne, 'sine.inOut');
  t.key('camera', 'scrollX', 2600, RIDE.total);
  t.key('camera', 'scrollY', 0, 0);

  // Astronaut. E1: out of the picture until the total at 2600.
  stance(t, 0, STAND);
  t.key('astronaut.blade-arc', 'pose', 0, 'none');
  t.key('astronaut.blade-arc', 'alpha', 0, 0);
  t.key('astronaut', 'alpha', 0, 0);
  t.key('astronaut', 'alpha', 2600, 1);
  t.key('astronaut', 'scaleX', 0, 1);
  t.key('astronaut', 'x', 0, AC);
  t.key('astronaut', 'y', 0, GROUND);
  // E2: guard against the gold balls (2a), return fire with the raygun (2b), arc counter (2c).
  bladeSteps(t, 3500, GUARD, 1);
  bladeSteps(t, 4600, GUARD, -1);
  stance(t, 4800, AIM);
  bladeSteps(t, 5400, CROUCH, 1);
  t.key('astronaut', 'x', 5400, AC, 'sine.inOut');
  t.key('astronaut', 'x', 5700, CINE_STAND.counter);
  // Cut (action 100 ms): smear poses 33 ms, blade arc arc1 then arc2 (66 ms each), then the arm ends low.
  stance(t, 5900, SMEARED);
  arc(t, 5900, 'arc1', 20);
  stance(t, 5900 + SMEAR, { ...CROUCH, armFront: 'slash-end', blade: 'full' });
  arc(t, 5900 + SMEAR_ARC, 'arc2', 20);
  arc(t, 5900 + 2 * SMEAR_ARC, 'off');
  bladeSteps(t, 6240, AIM, -1);
  // E3: the flashback, she stands in front on the left and looks after the strips.
  stance(t, 6400, STAND);
  t.key('astronaut', 'x', 6590, CINE_STAND.counter);
  t.key('astronaut', 'x', 6600, CINE_STAND.flashback);
  // E4: back at her stand, stars gather, portrait, the blade grows and goes up for the name.
  t.key('astronaut', 'x', 9990, CINE_STAND.flashback);
  t.key('astronaut', 'x', 10000, AC);
  stance(t, 10000, AIM);
  stance(t, 11500, CROUCH);
  bladeSteps(t, 12440, RAISE, 1);
  // E5: axis change (8a). She leaps in from the right, mirrored, the blade far behind her.
  const flipAt = SHOT_STARTS[4];
  t.key('astronaut', 'scaleX', flipAt, -1);
  stance(t, flipAt, { ...RAISE, legs: 'tuck', pack: 'thrust' });
  t.key('astronaut', 'x', flipAt, FINAL_CUT.from, 'linear');
  t.key('astronaut', 'x', 13700, FINAL_CUT.kneel, 'linear');
  t.key('astronaut', 'x', FINAL_HIT, FINAL_CUT.hit);
  t.key('astronaut', 'y', flipAt, GROUND, 'sine.out');
  t.key('astronaut', 'y', 13450, GROUND - FINAL_CUT.apexLift, 'sine.inOut');
  t.key('astronaut', 'y', FINAL_HIT, GROUND - FINAL_CUT.hitLift);
  // The cut (action 100 ms, 13700 to 13800): smear, arc1, arc2, the arm ends low; she kneels in slow motion.
  stance(t, 13700, { ...SMEARED, blade: 'off' });
  arc(t, 13700, 'arc1', 20);
  stance(t, 13700 + SMEAR, CUT);
  arc(t, 13700 + SMEAR_ARC, 'arc2', 20);
  arc(t, 13700 + 2 * SMEAR_ARC, 'off');
  t.key('astronaut', 'x', c(FINAL_SLOW_FROM), FINAL_CUT.hit, 'sine.inOut');
  t.key('astronaut', 'x', c(15200), FINAL_CUT.kneel);
  t.key('astronaut', 'y', c(FINAL_SLOW_FROM), GROUND - FINAL_CUT.hitLift, 'expo.in');
  t.key('astronaut', 'y', c(15200), GROUND);
  // E6: blade back in three steps after the slow motion, stand up, step right for the gilding, back into the sun.
  bladeSteps(t, c(FINAL_SLOW_UNTIL), { ...CUT, blade: 'full' }, -1);
  stance(t, c(SHOT6), STAND);
  t.key('astronaut', 'x', c(SHOT6), FINAL_CUT.kneel, 'sine.inOut');
  t.key('astronaut', 'x', c(17200), DAWN_WALK.out);
  t.key('astronaut', 'x', c(18300), DAWN_WALK.out, 'sine.inOut');
  t.key('astronaut', 'x', c(19000), DAWN_WALK.back);
  // In the counter-light (6c) the effect `backlight` draws her as an ink silhouette; the figure steps aside.
  t.key('astronaut', 'alpha', c(19200), 0);

  // Pharaoh. E1/E2: sits on the throne, the spiral circles; he lifts the staffs at 3700 and glares at the counter.
  t.key('pharaoh', 'x', 0, BC);
  t.key('pharaoh', 'y', 0, GROUND);
  t.key('pharaoh', 'scaleX', 0, 1);
  t.key('pharaoh', 'alpha', 0, 1);
  t.key('pharaoh.orb-ring', 'alpha', 0, 1);
  pharaohPose(t, 0, {});
  pharaohPose(t, 3700, RAISED);
  pharaohPose(t, 5900, GLARE);
  spiral(t, 0, flipAt);
  // E3: hidden during the flashback (the throne has no part in it).
  t.key('pharaoh', 'alpha', 6600, 0);
  t.key('pharaoh', 'alpha', 10000, 1);
  pharaohPose(t, 10000, GLARE);
  pharaohPose(t, 11500, {});
  pharaohPose(t, 12600, GLARE);
  // E5: moves to the other side of the axis, mirrored, staffs up; spiral gone with the hit; mask bursts.
  t.key('pharaoh', 'x', flipAt, AC);
  t.key('pharaoh', 'scaleX', flipAt, -1);
  pharaohPose(t, flipAt, RAISED);
  t.key('pharaoh.orb-ring', 'alpha', FINAL_HIT, 0);
  pharaohPose(t, c(FINAL_SLOW_FROM), { head: 'cracked' });
  // E6: gilds again from the feet upwards (the Gold curse returns), is dust in the wind, gone.
  gild(t, c, CINE_GILD.half, CINE_GILD.times);
  t.key('pharaoh', 'alpha', c(18200), 0.4);
  t.key('pharaoh', 'alpha', c(18600), 0);

  const dais = (name: string, from: number, until: number): ChoreoEvent => ({
    kind: 'fx',
    atMs: from,
    durationMs: until - from,
    name,
    flash: false,
  });

  const events: ChoreoEvent[] = [
    // Stage (AP-197): world per shot at the shot boundary (a new world cuts the previous one), letterbox once.
    { kind: 'fx', atMs: 0, name: 'letterbox', flash: false },
    { kind: 'fx', atMs: SHOT_STARTS[0], name: 'stage-world:pharaoh-1', flash: false },
    { kind: 'fx', atMs: SHOT_STARTS[2], name: 'stage-world:pharaoh-3', flash: false },
    { kind: 'fx', atMs: SHOT_STARTS[3], name: 'stage-world:pharaoh-1', flash: false },
    { kind: 'fx', atMs: SHOT_STARTS[4], name: 'stage-world:pharaoh-5', flash: false },
    { kind: 'fx', atMs: c(SHOT6), name: 'stage-world:pharaoh-6', flash: false },
    { kind: 'fx', atMs: c(18200), name: 'stage-world:pharaoh-6b', flash: false },
    { kind: 'fx', atMs: c(19200), name: 'stage-world:pharaoh-6c', flash: false },
    // The throne dais: a flat plate in finisher ink; not in the flashback (E3).
    dais('dais-right', 0, SHOT_STARTS[2]),
    dais('dais-right', SHOT_STARTS[3], flipAt),
    dais('dais-left', flipAt, 20000),
    // E2: gold balls against laser, sparks where they meet, the arc counter through the last balls.
    { kind: 'fx', atMs: 3700, durationMs: 2300, name: 'orb-volley', flash: false },
    { kind: 'fx', atMs: 4800, durationMs: 800, name: 'duel-beam', flash: false },
    ...[4800, 5000, 5200, 5400].map((atMs): ChoreoEvent => ({
      kind: 'particles',
      atMs,
      texture: `rig-fx-pharaoh-${(atMs / 200) % 2}`,
      count: 8,
      at: { x: 340, y: GROUND - 74 },
      flash: false,
    })),
    ...goldBurst(5900, 330, 180, 12),
    // E3: the flashback on the five defeated bosses, no flash, no brightness jump.
    {
      kind: 'fx',
      atMs: SHOT_STARTS[2],
      durationMs: SHOT_STARTS[3] - SHOT_STARTS[2],
      name: 'flashback',
      flash: false,
    },
    // E4: stars gather above her, the portrait strip, the name, the stars sit in the blade.
    { kind: 'fx', atMs: 10100, durationMs: flipAt - 10100, name: 'star-gather', flash: false },
    { kind: 'fx', atMs: 11300, durationMs: CUTIN, name: 'portrait', flash: false },
    {
      kind: 'text',
      atMs: 12600,
      durationMs: 800,
      text: 'LETZTER STERN',
      color: 'finisher.name',
      flash: false,
    },
    {
      kind: 'particles',
      atMs: 12600,
      texture: 'rig-fx-pharaoh-4',
      count: 10,
      at: { x: AC + 4, y: GROUND - 160 },
      flash: false,
    },
    // E5: the leap with afterimages, the only impact pair, the longest slow motion of the game.
    trail(flipAt, 400),
    { kind: 'sound', atMs: FINAL_HIT, key: HIT_SOUND_KEY, flash: false },
    {
      kind: 'hitStop',
      atMs: FINAL_HIT,
      ms: FINAL_STOP,
      axis: 'x',
      targets: ['pharaoh'],
      strength: 1,
      flash: false,
    },
    {
      kind: 'timeScale',
      atMs: FINAL_HIT,
      durationMs: slowChoreo,
      factor: SLOW_FINAL,
      flash: false,
    },
    { kind: 'fx', atMs: FINAL_HIT, durationMs: FINAL_STOP, name: 'impact-pair', flash: true },
    {
      kind: 'hitWhite',
      atMs: FINAL_HIT,
      durationMs: FINAL_STOP,
      targets: ['pharaoh', 'astronaut'],
      flash: false,
    },
    { kind: 'shake', atMs: c(FINAL_SLOW_FROM), durationMs: 300, strength: 0.6, flash: false },
    {
      kind: 'particles',
      atMs: c(FINAL_SLOW_FROM),
      texture: 'rig-fx-pharaoh-3',
      count: 10,
      follow: 'pharaoh.head',
      durationMs: 600,
      flash: false,
    },
    {
      kind: 'particles',
      atMs: c(FINAL_SLOW_FROM),
      texture: 'rig-fx-pharaoh-2',
      count: 10,
      follow: 'pharaoh.head',
      durationMs: 600,
      flash: false,
    },
    // E6: gold dust, dawn band, the figure in the counter-light, the title.
    ...riseDust(c, [16800, 17100, 17400], AC, 6),
    ...goldBurst(c(18200), AC + 60, GROUND - 120, 36),
    { kind: 'fx', atMs: c(18200), durationMs: 20000 - 18200, name: 'dawn', flash: false },
    { kind: 'fx', atMs: c(19200), durationMs: 20000 - 19200, name: 'backlight', flash: false },
    ...riseDust(c, [19400], AC, 14),
    { kind: 'text', atMs: c(19400), text: 'BEZWUNGEN!', color: 'finisher.title', flash: false },
  ];

  const beats: ChoreoBeat[] = [
    { phase: 'anticipation', atMs: 5700, durationMs: 200 },
    { phase: 'action', atMs: 5900, durationMs: 100 },
    { phase: 'anticipation', atMs: flipAt, durationMs: 400 },
    { phase: 'action', atMs: 13700, durationMs: 100 },
    { phase: 'hitStop', atMs: FINAL_HIT, durationMs: FINAL_STOP, final: true },
    { phase: 'reaction', atMs: FINAL_HIT, durationMs: slowChoreo, final: true },
    { phase: 'followThrough', atMs: c(SHOT6), durationMs: c(20000) - c(SHOT6), final: true },
  ];

  // Six shots of ~3.3 s real time; shot 5 crosses the axis, shot 6 starts after the slow motion.
  const still = { scrollX: 0, scrollY: 0, zoom: 1 };
  const shots: ChoreoShot[] = [
    { atMs: SHOT_STARTS[0], camera: { scrollX: RIDE.start, scrollY: 0, zoom: 1 } },
    { atMs: SHOT_STARTS[1], camera: still },
    { atMs: SHOT_STARTS[2], camera: still },
    { atMs: SHOT_STARTS[3], camera: still },
    { atMs: SHOT_STARTS[4], camera: still, axisFlip: true },
    { atMs: c(SHOT6), camera: still },
  ];

  return {
    variantId: 'cinematic-40',
    actors: [
      { rigId: 'pharaoh', x: BC, y: GROUND },
      { rigId: 'astronaut', x: AC, y: GROUND },
    ],
    durationMs: c(20000),
    shots,
    tracks: t.list(),
    events,
    beats,
  };
}

export const MOMENT_PHARAOH: ChoreoDef = buildMoment();
export const CINEMATIC_40: ChoreoDef = buildCinematic();

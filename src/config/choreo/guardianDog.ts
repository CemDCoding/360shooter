// Choreographies of the guardian dog (M13, AP-189, brief H-48 part 2b, RS-06 result 3, PE-244 to PE-252, PE-255):
// the fight moment "Drei Takte" (`moment-guardianDog`, 3.5 s) and the cinematic of level 30 "GRABESLICHT"
// (`cinematic-30`, 15 s, 5 shots). Only data: key frames, camera and events; the effects of the boss itself
// (torches, grave light, rising runes and sparks, portrait strip, ring centre) live in
// `scenes/finisher/fx/guardianDog.ts`.
// Storyboards: docs/design/mockups/m13b-guardian-dog.html (H1 to H9, 1a to 5c).
//
// Times are written in REAL time (the storyboard tables); `clockOf` turns them into choreography time
// (hit stop and slow motion). Key frames are collected by `Tracks`, which sorts them and drops repeated hold keys.
//
// Rules this data keeps (checked by tests/config/choreo/guardianDog.test.ts):
// - Children of `arm-front` (raygun, blade, blade-arc) are moved by hold keys from ASTRONAUT_ANCHORS in the same
//   key frame as the arm pose (PE-252).
// - A smear pose is never the first key of a pose track; two poses of one part are at least `smearMsOf(part)`
//   apart (33 ms, the blade arc 66 ms, H-48 14a).
// - Main hit of the moment: Boss white 100 ms + shared speedline ring at the same `atMs` (13a, AP-194), no
//   full-screen flash. The one full-screen flash of the cinematic is its impact pair. The three counters are sparks.
// - The beat of the heads is fixed: one head per `MOMENT_TAKT` ms (cinematic: `CINE_TAKT`). After a counter the
//   head fades (`fade`) and is hidden (alpha 0).
// - `jaw` is hidden while the head is `low` or `sleep` (the jaw is drawn into the head image there).
// - Lying down: legs `lie`, head `sleep`, tail `down`, body and head moved by `GUARDIAN_DOG_ANCHORS.lie`.
// - In the cinematic the shadow heads hang 12 to 16 px lower (they would reach into the letterbox at 4x).
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
import { GUARDIAN_DOG_ANCHORS, GUARDIAN_DOG_RIG } from '../rigs/guardianDog';

const GROUND = THEME.sizePx['size.rig-ground'];
const SMEAR = THEME.motionMs['motion.rig-smear'];
const SMEAR_ARC = THEME.motionMs['motion.rig-smear-arc'];
const HIT_WHITE = THEME.motionMs['motion.rig-hit-white'];
/** Whole speedline ring: `size.rig-hit-ring-steps` steps of `motion.rig-hit-ring-step` (AP-194). */
const HIT_RING =
  THEME.sizeCount['size.rig-hit-ring-steps'] * THEME.motionMs['motion.rig-hit-ring-step'];
const AFTERIMAGE_GAP = THEME.motionMs['motion.rig-afterimage-gap'];
const AFTERIMAGE_FADE = THEME.motionMs['motion.rig-afterimage-fade'];
const ANCH = ASTRONAUT_ANCHORS;

/** Placeholder sound of the main hit (PE-237); equals `SOUND_HIT` in scenes/finisher/timing.ts (test). */
const HIT_SOUND_KEY = 'sfx-finisher-hit';
/** Slow motion of the reaction. */
const SLOW = 0.3;
/** Stand of the actors in the 640 px stage (tokens `size.rig-*-x-*`). */
const MOMENT_X = {
  astronaut: THEME.sizePx['size.rig-astro-x-moment'],
  boss: THEME.sizePx['size.rig-boss-x-moment'],
} as const;
const CINE_X = {
  astronaut: THEME.sizePx['size.rig-astro-x-cinematic'],
  boss: THEME.sizePx['size.rig-boss-x-cinematic'],
} as const;

/** Beat of the heads: one head per 400 ms in the moment (board H1 to H4); the cinematic gives each head 1000 ms. */
export const MOMENT_TAKT = 400;
export const CINE_TAKT = 1000;
/** Anticipation and action of a snap (boards: 150 and 120 ms). */
const SNAP_ANTIC = 150;
const SNAP_ACTION = 120;
/** Pieces of the dog that are no shadow heads. */
const DOG_BODY = ['legs-back', 'legs-front', 'tail', 'body', 'head', 'jaw', 'collar'] as const;
const SHADES = ['shade-1', 'shade-2', 'shade-3'] as const;

/** Where the astronaut stands at the stab (board H6): left of the collar. */
export const MOMENT_STAB_X = MOMENT_X.boss - 150;
/** Where she stands after the strike of the cinematic (board 4b). */
export const CINE_STAB_X = CINE_X.boss - 190;
/** Dodge/counter places of the moment (boards H2 to H4) and the halt before the stab (board H5). */
const MOMENT_PARRY_X = [
  MOMENT_X.astronaut - 10,
  MOMENT_X.astronaut + 20,
  MOMENT_X.astronaut + 30,
] as const;
const MOMENT_HALT_X = MOMENT_X.astronaut + 40;
/** Counter sparks of the moment (boards H2 to H4): place and extra spark image. */
const MOMENT_SPARKS = [
  { x: MOMENT_X.astronaut + 100, y: GROUND - 120 },
  { x: MOMENT_X.astronaut + 120, y: GROUND - 140 },
  { x: MOMENT_X.astronaut + 130, y: GROUND - 120 },
] as const;
/** Lunge of each shadow head (rig px, added to its place) in the moment and in the cinematic (boards). */
const LUNGE_MOMENT: readonly (readonly [number, number])[] = [
  [-18, 10],
  [-16, 16],
  [-20, 8],
];
const LUNGE_CINE: readonly (readonly [number, number])[] = [
  [-30, 18],
  [-24, 22],
  [-28, 10],
];
/** The shadow heads hang lower in the cinematic (design brief: 12 to 16 px). */
const SHADE_DROP_CINE: readonly number[] = [12, 16, 12];
/** Collar at the end of the cinematic (board 5c): offset (rig px) and lean. */
const COLLAR_LIE = { dx: 6, dy: 26, angle: 12 } as const;
/** Parry places and sparks of the cinematic (boards 2a to 2c). */
const CINE_PARRY_X = [250, 270, 280] as const;
const CINE_SPARKS = [
  { x: 330, y: 190 },
  { x: 340, y: 150 },
  { x: 360, y: 200 },
] as const;

const FX_RUNE = 'rig-fx-dog-0';
const FX_RUNE_SPARK = 'rig-fx-dog-1';
const FX_SPARK = 'rig-fx-dog-3';
const FX_STONE = 'rig-fx-dog-4';

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
const B = (id: string) => part(GUARDIAN_DOG_RIG, id);

type Legs = 'stand' | 'crouch' | 'tuck' | 'kneel' | 'smear';
type TorsoPose = 'upright' | 'lean' | 'smear';
type ArmFront = keyof (typeof ANCH)['arm-front'];

/** One drawn stance of the astronaut. In this fight the blade is on for the parries and the stab. */
interface Stance {
  legs: Legs;
  torso: TorsoPose;
  armFront: ArmFront;
  armBack: 'rest' | 'back' | 'up';
  helmet: 'serious' | 'dark';
  pack: 'rest' | 'thrust';
  blade: boolean;
}

const STAND: Stance = {
  legs: 'stand',
  torso: 'upright',
  armFront: 'rest',
  armBack: 'rest',
  helmet: 'serious',
  pack: 'rest',
  blade: false,
};
const CROUCH: Stance = {
  ...STAND,
  legs: 'crouch',
  torso: 'lean',
  armFront: 'aim',
  armBack: 'back',
};
const LEAP: Stance = { ...STAND, legs: 'tuck', pack: 'thrust', armFront: 'aim', armBack: 'back' };
const AIM: Stance = { ...STAND, armFront: 'aim', armBack: 'back' };
/** Guard with the blade (boards H2, H3, 2a). */
const GUARD: Stance = {
  ...STAND,
  legs: 'crouch',
  armFront: 'aim',
  armBack: 'back',
  blade: true,
};
/** Parry upwards (board 2b). */
const GUARD_UP: Stance = { ...GUARD, armFront: 'raise' };
/** Blade set on, visor dark (boards H5, 4a, 4b). */
const THRUST: Stance = {
  ...STAND,
  legs: 'crouch',
  torso: 'lean',
  armFront: 'aim',
  armBack: 'back',
  helmet: 'dark',
  blade: true,
};
const SMEARED: Stance = {
  ...STAND,
  legs: 'smear',
  torso: 'smear',
  armFront: 'smear',
  armBack: 'back',
  helmet: 'dark',
};
/** Cut finished, kneeling (boards H7, 5a). */
const CUT: Stance = {
  ...STAND,
  legs: 'kneel',
  torso: 'lean',
  armFront: 'slash-end',
  armBack: 'back',
  blade: true,
};
const AIM_BLADE: Stance = { ...AIM, blade: true };
const AIM_BLADE_DARK: Stance = { ...AIM_BLADE, helmet: 'dark' };
const RAISE: Stance = {
  ...STAND,
  legs: 'tuck',
  armFront: 'raise',
  armBack: 'up',
  helmet: 'dark',
  blade: true,
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
  t.key(`${w}.arm-front`, 'angle', at, 0);
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
  t.key(`${w}.blade`, 'pose', at, s.blade ? 'full' : 'grow1');
  t.key(`${w}.blade`, 'alpha', at, s.blade ? 1 : 0);
}

/** The blade arc is hidden (pose `none` is no drawn pose). */
function arcOff(t: Tracks, at: number): void {
  t.key('astronaut.blade-arc', 'pose', at, 'none');
  t.key('astronaut.blade-arc', 'alpha', at, 0);
}

/** The thin counter arc (`arc2`) is shown 66 ms (H-48 14a). */
function counterArc(t: Tracks, at: number): void {
  t.key('astronaut.blade-arc', 'pose', at, 'arc2');
  t.key('astronaut.blade-arc', 'alpha', at, 1);
  arcOff(t, at + SMEAR_ARC);
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

function sparks(atMs: number, at: { x: number; y: number }): ChoreoEvent[] {
  return [
    { kind: 'particles', atMs, texture: FX_SPARK, count: 6, at, flash: false },
    { kind: 'particles', atMs, texture: FX_RUNE_SPARK, count: 3, at, flash: false },
  ];
}

/** Dog at rest: shadow heads in place, all poses at their first image (lowered shadow heads for the cinematic). */
function dogRest(t: Tracks, drop: readonly number[]): void {
  const w = 'guardianDog';
  t.key(w, 'alpha', 0, 1);
  SHADES.forEach((id, k) => {
    const b = B(id);
    t.key(`${w}.${id}`, 'pose', 0, 'rest');
    t.key(`${w}.${id}`, 'x', 0, b.x);
    t.key(`${w}.${id}`, 'y', 0, b.y + drop[k]);
    t.key(`${w}.${id}`, 'alpha', 0, 1);
  });
  t.key(`${w}.legs-back`, 'pose', 0, 'stand');
  t.key(`${w}.legs-front`, 'pose', 0, 'stand');
  t.key(`${w}.tail`, 'pose', 0, 'rest');
  t.key(`${w}.body`, 'pose', 0, 'rest');
  t.key(`${w}.head`, 'pose', 0, 'rest');
  t.key(`${w}.jaw`, 'pose', 0, 'closed');
  t.key(`${w}.jaw`, 'alpha', 0, 1);
  t.key(`${w}.collar`, 'pose', 0, 'rest');
}

interface TaktSpec {
  /** Start of the first beat (ms); head k starts at `t0 + k * period`. */
  t0: number;
  period: number;
  /** From the start of a beat to the snap. */
  lead: number;
  lunge: readonly (readonly [number, number])[];
  drop: readonly number[];
  /** Time the last head stays faded before it is hidden. */
  lastHideMs: number;
}

/** The three heads snap one after the other in a fixed beat; each fades after its counter and is then hidden. */
function takts(t: Tracks, s: TaktSpec): void {
  const w = 'guardianDog';
  SHADES.forEach((id, k) => {
    const b = B(id);
    const start = s.t0 + k * s.period;
    const snapAt = start + s.lead;
    const endAt = snapAt + SNAP_ACTION;
    const back = start + s.period;
    const target = `${w}.${id}`;
    t.key(target, 'pose', snapAt, 'snap');
    t.key(target, 'pose', endAt, 'rest');
    t.key(target, 'pose', back, 'fade');
    t.key(target, 'alpha', k < 2 ? back + s.period : back + s.lastHideMs, 0);
    // The head dives at her (action 120 ms) and sinks back until the next beat.
    t.key(target, 'x', snapAt, b.x, 'expo.in');
    t.key(target, 'y', snapAt, b.y + s.drop[k], 'expo.in');
    t.key(target, 'x', endAt, b.x + s.lunge[k][0], 'sine.out');
    t.key(target, 'y', endAt, b.y + s.drop[k] + s.lunge[k][1], 'sine.out');
    t.key(target, 'x', back, b.x);
    t.key(target, 'y', back, b.y + s.drop[k]);
    // The jaw of the head snaps with the shadow head.
    t.key(`${w}.jaw`, 'pose', snapAt, 'snap');
    t.key(`${w}.jaw`, 'pose', endAt, 'closed');
  });
}

/** Head hangs (`low`): the jaw is drawn into the head image and is hidden. */
function headLow(t: Tracks, at: number): void {
  t.key('guardianDog.head', 'pose', at, 'low');
  t.key('guardianDog.jaw', 'alpha', at, 0);
}

// ---------------------------------------------------------------------------------------------------
// Fight moment "Drei Takte" (brief H-48 part 2b, boards H1 to H9)
// ---------------------------------------------------------------------------------------------------

/** Real time of the stab through the collar (main hit). */
const MOMENT_HIT = 1500;
/** Hit stop and slow motion of the moment (board H6: stop 150; reaction up to the title). */
const MOMENT_STOP = 150;
const MOMENT_SLOW_REAL = 1150;
/** Where the runes of the collar spring off: left of and above the dog stand (board H6, px of the stage). */
const RUNE_BURST = { dx: -50, dy: -110 } as const;

function buildMoment(): ChoreoDef {
  const { c, slowChoreo } = clockOf(MOMENT_HIT, MOMENT_STOP, MOMENT_SLOW_REAL, SLOW);
  const t = new Tracks();
  const AX = MOMENT_X.astronaut;
  const BX = MOMENT_X.boss;
  const w = 'guardianDog';

  // Astronaut: waits, guards (blade on), dodges each snap with afterimages and counters (H2 to H4), halts and sets
  // the blade on (H5), stabs through the collar (H6), steps back and stands up (H7 to H9).
  stance(t, 0, STAND);
  arcOff(t, 0);
  t.key('astronaut', 'x', 0, AX);
  t.key('astronaut', 'y', 0, GROUND);
  stance(t, 100, GUARD);
  let prevX: number = AX;
  for (let k = 0; k < 3; k++) {
    const start = k * MOMENT_TAKT;
    const snapAt = start + SNAP_ANTIC;
    const done = snapAt + SNAP_ACTION;
    stance(t, snapAt, LEAP);
    t.key('astronaut', 'x', snapAt, prevX, 'linear');
    t.key('astronaut', 'x', done, MOMENT_PARRY_X[k]);
    if (k < 2) stance(t, done, GUARD);
    else {
      // Third counter with the blade arc: smear 33 ms for the body, 66 ms for the arc.
      stance(t, done, SMEARED);
      counterArc(t, done);
      stance(t, done + SMEAR, GUARD);
    }
    prevX = MOMENT_PARRY_X[k];
  }
  // Halt: she steps up to the dog and sets the blade on, then the stab (action 120 ms, smear 33 ms).
  t.key('astronaut', 'x', 1103, prevX, 'sine.out');
  t.key('astronaut', 'x', 1200, MOMENT_HALT_X);
  stance(t, 1200, THRUST);
  const stabAt = MOMENT_HIT - SNAP_ACTION;
  stance(t, stabAt, SMEARED);
  stance(t, stabAt + SMEAR, THRUST);
  t.key('astronaut', 'x', stabAt, MOMENT_HALT_X, 'expo.in');
  t.key('astronaut', 'x', MOMENT_HIT, MOMENT_STAB_X);
  // After the stop she pulls the blade out, kneels, and stands up while the runes go out.
  t.key('astronaut', 'x', c(1800), MOMENT_STAB_X, 'sine.inOut');
  t.key('astronaut', 'x', c(2100), MOMENT_STAB_X - 10);
  stance(t, c(2100), CUT);
  t.key('astronaut', 'x', c(2300), MOMENT_STAB_X - 10, 'sine.inOut');
  t.key('astronaut', 'x', c(2600), MOMENT_STAB_X - 20);
  stance(t, c(2600), AIM_BLADE);
  stance(t, c(3100), STAND);

  // Dog: three shadow heads in the beat, then the head hangs, the stab breaks the collar, the dog lies down.
  dogRest(t, [0, 0, 0]);
  takts(t, {
    t0: 0,
    period: MOMENT_TAKT,
    lead: SNAP_ANTIC,
    lunge: LUNGE_MOMENT,
    drop: [0, 0, 0],
    lastHideMs: 100,
  });
  headLow(t, 1200);
  t.key(`${w}.collar`, 'pose', MOMENT_HIT + 1, 'broken');
  // Lies down (anchor `lie`): legs, head, tail, body; body and head sink by the anchor.
  const lieAt = c(1850);
  t.key(`${w}.legs-back`, 'pose', lieAt, 'lie');
  t.key(`${w}.legs-front`, 'pose', lieAt, 'lie');
  t.key(`${w}.head`, 'pose', lieAt, 'sleep');
  t.key(`${w}.tail`, 'pose', lieAt, 'down');
  t.key(`${w}.body`, 'pose', lieAt, 'dark');
  for (const id of ['body', 'head'] as const) {
    const base = B(id);
    t.key(`${w}.${id}`, 'x', lieAt, base.x + GUARDIAN_DOG_ANCHORS.lie[id][0]);
    t.key(`${w}.${id}`, 'y', lieAt, base.y + GUARDIAN_DOG_ANCHORS.lie[id][1]);
  }

  const span = (a: number, b: number): number => c(b) - c(a);
  const events: ChoreoEvent[] = [
    { kind: 'fx', atMs: 0, durationMs: c(3500), name: 'torches-moment', flash: false },
    // H2 to H4: dodge with afterimages, counter with sparks only (no flash).
    trail(SNAP_ANTIC, SNAP_ACTION),
    trail(MOMENT_TAKT + SNAP_ANTIC, SNAP_ACTION),
    trail(2 * MOMENT_TAKT + SNAP_ANTIC, SNAP_ACTION),
    ...sparks(MOMENT_TAKT * 0 + 280, MOMENT_SPARKS[0]),
    ...sparks(MOMENT_TAKT + 280, MOMENT_SPARKS[1]),
    ...sparks(2 * MOMENT_TAKT + 280, MOMENT_SPARKS[2]),
    // H6: the stab.
    trail(stabAt, SNAP_ACTION),
    { kind: 'sound', atMs: MOMENT_HIT, key: HIT_SOUND_KEY, flash: false },
    {
      kind: 'hitStop',
      atMs: MOMENT_HIT,
      ms: MOMENT_STOP,
      axis: 'x',
      targets: ['guardianDog'],
      strength: 1,
      flash: false,
    },
    { kind: 'timeScale', atMs: MOMENT_HIT, durationMs: slowChoreo, factor: SLOW, flash: false },
    // Main hit (H-48 13a): only the boss turns white for 100 ms, no full-screen flash. This is the one flash of
    // the moment, so "reduce effects" removes it.
    {
      kind: 'hitWhite',
      atMs: MOMENT_HIT,
      durationMs: HIT_WHITE,
      targets: ['guardianDog'],
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
    { kind: 'shake', atMs: MOMENT_HIT, durationMs: 150, strength: 0.3, flash: false },
    // H6: the runes of the collar spring off.
    {
      kind: 'particles',
      atMs: MOMENT_HIT,
      texture: FX_RUNE,
      count: 6,
      at: { x: BX + RUNE_BURST.dx, y: GROUND + RUNE_BURST.dy },
      flash: false,
    },
    // H7, H8: the runes go out one after the other and rise.
    { kind: 'fx', atMs: c(1850), durationMs: span(1850, 2900), name: 'rune-rise', flash: false },
    { kind: 'text', atMs: c(2900), text: 'BEZWUNGEN!', color: 'finisher.title', flash: false },
  ];

  // Beats in choreography time; the grid test reads them (RS-06.2). The board times are real time.
  const beats: ChoreoBeat[] = [];
  for (let k = 0; k < 3; k++) {
    const start = k * MOMENT_TAKT;
    beats.push({ phase: 'anticipation', atMs: start, durationMs: SNAP_ANTIC });
    beats.push({ phase: 'action', atMs: start + SNAP_ANTIC, durationMs: SNAP_ACTION });
  }
  beats.push(
    { phase: 'anticipation', atMs: 1200, durationMs: 180 },
    { phase: 'action', atMs: stabAt, durationMs: SNAP_ACTION },
    { phase: 'hitStop', atMs: MOMENT_HIT, durationMs: MOMENT_STOP, final: true },
    { phase: 'reaction', atMs: MOMENT_HIT, durationMs: slowChoreo, final: true },
    { phase: 'followThrough', atMs: c(2800), durationMs: c(3500) - c(2800), final: true },
  );

  return {
    variantId: 'moment-guardianDog',
    actors: [
      { rigId: 'astronaut', x: AX, y: GROUND },
      { rigId: 'guardianDog', x: BX, y: GROUND },
    ],
    durationMs: c(3500),
    tracks: t.list(),
    events,
    beats,
  };
}

// ---------------------------------------------------------------------------------------------------
// Cinematic level 30 "GRABESLICHT" (brief H-48 part 2b, boards 1a to 5c)
// ---------------------------------------------------------------------------------------------------

/** Camera centre (stage px) to scroll values of a 640 x 360 stage (scroll 0 = stage centred). */
const scrollOf = (cx: number, cy: number) => ({ scrollX: cx - 320, scrollY: cy - 180 });
/** Real time of the light thrust through the collar. */
const CINE_HIT = 9600;
const CINE_STOP = 200;
const CINE_SLOW_REAL = 2200;

function buildCinematic(): ChoreoDef {
  const { c, slowChoreo } = clockOf(CINE_HIT, CINE_STOP, CINE_SLOW_REAL, SLOW);
  const t = new Tracks();
  const AC = CINE_X.astronaut;
  const BC = CINE_X.boss;
  const w = 'guardianDog';

  // Camera. Shot 1 (0 to 3000): slow drive along the corridor, three eyes appear. Shot 3 (6000 to 9000): zoom 2 on
  // her for the torch light, back to 1.
  const s1 = scrollOf(360, 180);
  const s2 = scrollOf(380, 180);
  t.key('camera', 'scrollX', 0, s1.scrollX, 'sine.inOut');
  t.key('camera', 'scrollX', 1200, s2.scrollX, 'sine.inOut');
  t.key('camera', 'scrollX', 2400, 0);
  const onHer = scrollOf(190, 220);
  t.key('camera', 'zoom', 0, 1);
  t.key('camera', 'zoom', 7000, 2);
  t.key('camera', 'zoom', 8200, 1);
  t.key('camera', 'scrollX', 7000, onHer.scrollX);
  t.key('camera', 'scrollX', 8200, 0);
  t.key('camera', 'scrollY', 0, 0);
  t.key('camera', 'scrollY', 7000, onHer.scrollY);
  t.key('camera', 'scrollY', 8200, 0);

  // Astronaut: not in the picture while the eyes light up (1a, 1b), then she stands left, small (1c).
  stance(t, 0, STAND);
  arcOff(t, 0);
  t.key('astronaut', 'alpha', 0, 0);
  t.key('astronaut', 'alpha', 2400, 1);
  t.key('astronaut', 'x', 0, AC);
  t.key('astronaut', 'y', 0, GROUND);
  // E2: she walks to the dog and parries the three heads in the beat (boards 2a to 2c).
  t.key('astronaut', 'x', 2600, AC, 'linear');
  t.key('astronaut', 'x', 2900, CINE_PARRY_X[0]);
  stance(t, 2900, GUARD);
  t.key('astronaut', 'x', 3800, CINE_PARRY_X[0], 'linear');
  t.key('astronaut', 'x', 4000, CINE_PARRY_X[1]);
  t.key('astronaut', 'x', 4800, CINE_PARRY_X[1], 'linear');
  t.key('astronaut', 'x', 5000, CINE_PARRY_X[2]);
  const snap = (k: number): number => 3000 + k * CINE_TAKT + 300;
  stance(t, snap(1), GUARD_UP);
  stance(t, snap(1) + SNAP_ACTION, GUARD);
  stance(t, snap(2), SMEARED);
  counterArc(t, snap(2));
  stance(t, snap(2) + SMEAR, GUARD);
  // E3: back to her place, torch light into the blade, the name.
  stance(t, 5600, STAND);
  t.key('astronaut', 'x', 5600, CINE_PARRY_X[2], 'linear');
  t.key('astronaut', 'x', 6000, AC);
  stance(t, 6000, CROUCH);
  stance(t, 7000, { ...CROUCH, helmet: 'dark' });
  stance(t, 7300, AIM_BLADE_DARK);
  stance(t, 8300, RAISE);
  // E4: she pulls the blade back, runs up (afterimages) and thrusts through the collar.
  stance(t, 9000, THRUST);
  t.key('astronaut', 'x', 9000, AC, 'linear');
  t.key('astronaut', 'x', 9200, 240);
  const thrustAt = CINE_HIT - SNAP_ACTION;
  t.key('astronaut', 'x', thrustAt, 240, 'expo.in');
  t.key('astronaut', 'x', CINE_HIT, CINE_STAB_X);
  stance(t, thrustAt, SMEARED);
  stance(t, thrustAt + SMEAR, THRUST);
  // She hangs in the slow motion, then steps back and kneels (5a); stands (5b).
  t.key('astronaut', 'x', c(11800), CINE_STAB_X, 'sine.inOut');
  t.key('astronaut', 'x', c(12400), 250);
  stance(t, c(12400), CUT);
  stance(t, c(13400), STAND);

  // Dog: the three eyes (1a to 1c), the beat (E2), shadow heads gone (E3), head low (E4), collar breaks, statue.
  dogRest(t, SHADE_DROP_CINE);
  for (const id of DOG_BODY) t.key(`${w}.${id}`, 'alpha', 0, 0);
  t.key(`${w}.shade-2`, 'alpha', 0, 0);
  t.key(`${w}.shade-2`, 'alpha', 1200, 1);
  t.key(`${w}.shade-3`, 'alpha', 0, 0);
  t.key(`${w}.shade-3`, 'alpha', 2400, 1);
  for (const id of DOG_BODY) t.key(`${w}.${id}`, 'alpha', 2400, 1);
  t.key(w, 'alpha', 2400, 0.85);
  t.key(w, 'alpha', 3000, 1);
  takts(t, {
    t0: 3000,
    period: CINE_TAKT,
    lead: 300,
    lunge: LUNGE_CINE,
    drop: SHADE_DROP_CINE,
    lastHideMs: 200,
  });
  headLow(t, 9000);
  t.key(`${w}.collar`, 'pose', CINE_HIT + 1, 'broken');
  // E5: the dog turns to stone (every part `stone`), crumbles, only the collar stays.
  const stone = c(12400);
  t.key(`${w}.jaw`, 'alpha', stone, 1);
  for (const id of DOG_BODY) t.key(`${w}.${id}`, 'pose', stone, 'stone');
  t.key(w, 'alpha', c(13400), 0.55);
  const left = c(14000);
  t.key(w, 'alpha', left, 1);
  for (const id of DOG_BODY) if (id !== 'collar') t.key(`${w}.${id}`, 'alpha', left, 0);
  const collar = B('collar');
  t.key(`${w}.collar`, 'pose', left, 'broken');
  t.key(`${w}.collar`, 'x', stone, collar.x);
  t.key(`${w}.collar`, 'y', stone, collar.y);
  t.key(`${w}.collar`, 'angle', stone, 0);
  t.key(`${w}.collar`, 'x', left, collar.x + COLLAR_LIE.dx);
  t.key(`${w}.collar`, 'y', left, collar.y + COLLAR_LIE.dy);
  t.key(`${w}.collar`, 'angle', left, COLLAR_LIE.angle);

  const span = (a: number, b: number): number => c(b) - c(a);
  const events: ChoreoEvent[] = [
    { kind: 'fx', atMs: 0, durationMs: c(15000), name: 'torches-cine', flash: false },
    // E2: parries with sparks only.
    ...sparks(snap(0) + 30, CINE_SPARKS[0]),
    ...sparks(snap(1) + 30, CINE_SPARKS[1]),
    ...sparks(snap(2) + SMEAR, CINE_SPARKS[2]),
    // E3: portrait strip, torch light flows into the blade, the name.
    { kind: 'fx', atMs: 6000, durationMs: 1000, name: 'portrait', flash: false },
    { kind: 'fx', atMs: 7100, durationMs: 1200, name: 'light-sparks', flash: false },
    {
      kind: 'particles',
      atMs: 8300,
      texture: FX_SPARK,
      count: 6,
      at: { x: AC + 10, y: GROUND - 130 },
      flash: false,
    },
    {
      kind: 'text',
      atMs: 8300,
      durationMs: 700,
      text: 'GRABESLICHT',
      color: 'finisher.name',
      flash: false,
    },
    // E4: run-up with afterimages, the only impact pair, slow motion.
    trail(9000, 300),
    trail(thrustAt, SNAP_ACTION),
    { kind: 'sound', atMs: CINE_HIT, key: HIT_SOUND_KEY, flash: false },
    {
      kind: 'hitStop',
      atMs: CINE_HIT,
      ms: CINE_STOP,
      axis: 'x',
      targets: ['guardianDog'],
      strength: 1,
      flash: false,
    },
    { kind: 'timeScale', atMs: CINE_HIT, durationMs: slowChoreo, factor: SLOW, flash: false },
    { kind: 'fx', atMs: CINE_HIT, durationMs: CINE_STOP, name: 'impact-pair', flash: true },
    {
      kind: 'hitWhite',
      atMs: CINE_HIT,
      durationMs: CINE_STOP,
      targets: ['guardianDog', 'astronaut'],
      flash: false,
    },
    { kind: 'shake', atMs: c(9800), durationMs: 300, strength: 0.6, flash: false },
    // 4c: the runes of the collar spring off one by one.
    ...[9800, 10300, 10800, 11300].map((real): ChoreoEvent => ({
      kind: 'particles',
      atMs: c(real),
      texture: FX_RUNE,
      count: 2,
      at: { x: BC - 60, y: GROUND - 140 },
      flash: false,
    })),
    // E5: statue, the ceiling opens, the statue crumbles, only the collar lies in the light.
    {
      kind: 'particles',
      atMs: c(13400),
      texture: FX_STONE,
      count: 22,
      at: { x: BC - 20, y: GROUND - 60 },
      flash: false,
    },
    {
      kind: 'fx',
      atMs: c(13400),
      durationMs: span(13400, 15000),
      name: 'grave-light',
      flash: false,
    },
    {
      kind: 'particles',
      atMs: c(14300),
      texture: FX_STONE,
      count: 10,
      at: { x: BC - 20, y: GROUND - 6 },
      flash: false,
    },
    { kind: 'text', atMs: c(14200), text: 'BEZWUNGEN!', color: 'finisher.title', flash: false },
  ];

  const beats: ChoreoBeat[] = [];
  for (let k = 0; k < 3; k++) {
    beats.push({ phase: 'anticipation', atMs: snap(k) - SNAP_ANTIC, durationMs: SNAP_ANTIC });
    beats.push({ phase: 'action', atMs: snap(k), durationMs: SNAP_ACTION });
  }
  beats.push(
    { phase: 'anticipation', atMs: 9000, durationMs: thrustAt - 9000 },
    { phase: 'action', atMs: thrustAt, durationMs: SNAP_ACTION },
    { phase: 'hitStop', atMs: CINE_HIT, durationMs: CINE_STOP, final: true },
    { phase: 'reaction', atMs: CINE_HIT, durationMs: slowChoreo, final: true },
    { phase: 'followThrough', atMs: c(12000), durationMs: c(15000) - c(12000), final: true },
  );

  // Five shots; shot 5 starts after the slow motion. No axis flip (only L40 has one).
  const long = { scrollX: 0, scrollY: 0, zoom: 1 };
  const shots: ChoreoShot[] = [
    { atMs: 0, camera: { ...s1, scrollY: 0, zoom: 1 } },
    { atMs: 3000, camera: long },
    { atMs: 6000, camera: long },
    { atMs: 9000, camera: long },
    { atMs: c(12000), camera: long },
  ];

  return {
    variantId: 'cinematic-30',
    actors: [
      { rigId: 'astronaut', x: AC, y: GROUND },
      { rigId: 'guardianDog', x: BC, y: GROUND },
    ],
    durationMs: c(15000),
    shots,
    tracks: t.list(),
    events,
    beats,
  };
}

export const MOMENT_GUARDIAN_DOG: ChoreoDef = buildMoment();
export const CINEMATIC_30: ChoreoDef = buildCinematic();

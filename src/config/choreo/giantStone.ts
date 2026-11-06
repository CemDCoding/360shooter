// Choreographies of the giant stone (M13, AP-187, brief H-48 part 2b, RS-06 result 3, PE-244 to PE-252, PE-255):
// the fight moment "Morgenlicht" (`moment-giantStone`, 3.5 s) and the cinematic of level 20 "STERNENHAMMER"
// (`cinematic-20`, 15 s, 5 shots). Only data: key frames, camera and events; the effects of the boss itself
// (light band, sky shot, shadow, star gathering, portrait strip) live in `scenes/finisher/fx/giantStone.ts`.
// Storyboards: docs/design/mockups/m13b-giant-stone.html (S1 to S8, 1a to 5c).
//
// Times are written in REAL time (the storyboard tables); `clockOf` turns them into choreography time
// (hit stop and slow motion). Key frames are collected by `Tracks`, which sorts them and drops repeated hold keys.
//
// Rules this data keeps (checked by tests/config/choreo/giantStone.test.ts):
// - Children of `arm-front` (raygun, blade, blade-arc) are moved by hold keys from ASTRONAUT_ANCHORS in the same
//   key frame as the arm pose (PE-252). Only the sky shot sets the raygun pose `up45` by hand (hold keys, same hand).
// - A smear pose is never the first key of a pose track; two poses of one part are at least `smearMsOf(part)`
//   apart (33 ms, the blade arc 66 ms, H-48 14a). The hammer (`blade-arc` pose `hammer`) is no smear pose.
// - Main hit of the moment: Boss white 100 ms + shared speedline ring at the same `atMs` (13a, AP-194), no
//   full-screen flash. The one full-screen flash of the cinematic is its impact pair.
// - The four chunks are invisible (alpha 0) until the break-up (design brief H-48, assumption part 2a).
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
import { GIANT_STONE_RIG } from '../rigs/giantStone';

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
/** Largest angle of a part without `freeRotate` (token `size.rig-fine-rotate`). */
const LEAN = THEME.sizeCount['size.rig-fine-rotate'];

/** Where she lands and shoots in the moment (board S4, px of the 640 x 360 stage); she stands here at the main hit. */
export const MOMENT_SHOOT_X = MOMENT_X.astronaut - 30;
/** Fist-left of the boss in rig px: rest, raised behind the head, at the end of the punch, pulled back. */
const FIST_REST = { x: -36, y: -18 };
const FIST_HIGH = { x: -6, y: -76 };
const FIST_PUNCH = { x: -76, y: -16 };
const FIST_BACK = { x: -66, y: -24 };
/** The fist of the cinematic reaches further (board 2a). */
const FIST_PUNCH_CINE = { x: -88, y: -14 };

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
const B = (id: string) => part(GIANT_STONE_RIG, id);

type Legs = 'stand' | 'crouch' | 'tuck' | 'kneel' | 'smear';
type TorsoPose = 'upright' | 'lean' | 'smear';
type ArmFront = keyof (typeof ANCH)['arm-front'];

/** One drawn stance of the astronaut. The blade stays off: she shoots and, in the cinematic, swings the hammer. */
interface Stance {
  legs: Legs;
  torso: TorsoPose;
  armFront: ArmFront;
  armBack: 'rest' | 'back' | 'up';
  helmet: 'serious' | 'dark';
  pack: 'rest' | 'thrust';
  /** Raygun pointed to the sky (only the sky shot of the moment, board S4). */
  gunUp?: boolean;
}

const STAND: Stance = {
  legs: 'stand',
  torso: 'upright',
  armFront: 'rest',
  armBack: 'rest',
  helmet: 'serious',
  pack: 'rest',
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
const SHOOT: Stance = { ...AIM, gunUp: true };
/** Hammer raised behind the head (arm pose `raise`, visor dark). */
const HAMMER_UP: Stance = {
  ...STAND,
  armFront: 'raise',
  armBack: 'up',
  helmet: 'dark',
};
const HAMMER_AIR: Stance = { ...HAMMER_UP, legs: 'tuck', pack: 'thrust' };
const SMEARED: Stance = {
  ...STAND,
  legs: 'smear',
  torso: 'smear',
  armFront: 'smear',
  armBack: 'back',
  helmet: 'dark',
};
const STRIKE: Stance = {
  ...STAND,
  legs: 'tuck',
  armFront: 'slash-end',
  armBack: 'back',
  helmet: 'dark',
};
const LAND: Stance = {
  ...STAND,
  legs: 'kneel',
  torso: 'lean',
  armFront: 'slash-end',
  armBack: 'back',
  helmet: 'dark',
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
  t.key(`${w}.arm-front`, 'angle', at, s.gunUp ? -LEAN : 0);
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
  t.key(`${w}.raygun`, 'pose', at, s.gunUp ? 'up45' : anchor.raygun.pose);
  t.key(`${w}.raygun`, 'x', at, anchor.raygun.x);
  t.key(`${w}.raygun`, 'y', at, anchor.raygun.y);
  for (const id of ['blade', 'blade-arc'] as const) {
    t.key(`${w}.${id}`, 'x', at, anchor.blade.x);
    t.key(`${w}.${id}`, 'y', at, anchor.blade.y);
    t.key(`${w}.${id}`, 'angle', at, anchor.blade.angle);
  }
  // No laser blade in this fight: the blade stays hidden at its first growth frame.
  t.key(`${w}.blade`, 'pose', at, 'grow1');
  t.key(`${w}.blade`, 'alpha', at, 0);
}

/** The hammer of stars (`blade-arc` pose `hammer`), shown by `alpha`; `0` hides it (pose `none` is no drawn pose). */
function hammer(t: Tracks, at: number, alpha: number): void {
  t.key('astronaut.blade-arc', 'pose', at, alpha === 0 ? 'none' : 'hammer');
  t.key('astronaut.blade-arc', 'alpha', at, alpha);
}

/** The thin counter arc (`arc2`) is shown 66 ms (H-48 14a). */
function counterArc(t: Tracks, at: number, angle: number): void {
  t.key('astronaut.blade-arc', 'pose', at, 'arc2');
  t.key('astronaut.blade-arc', 'alpha', at, 1);
  t.key('astronaut.blade-arc', 'angle', at, angle);
  t.key('astronaut.blade-arc', 'pose', at + SMEAR_ARC, 'none');
  t.key('astronaut.blade-arc', 'alpha', at + SMEAR_ARC, 0);
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

/** Pose and position of the fist-left at `at` (rig px, relative to the boss origin). */
function fistLeft(
  t: Tracks,
  at: number,
  pose: 'rest' | 'raised' | 'punch' | 'frozen',
  pos: { x: number; y: number },
  angle: number,
  ease: ChoreoEase = 'hold',
): void {
  t.key('giantStone.fist-left', 'pose', at, pose);
  t.key('giantStone.fist-left', 'x', at, pos.x, ease);
  t.key('giantStone.fist-left', 'y', at, pos.y, ease);
  t.key('giantStone.fist-left', 'angle', at, angle, ease);
}

/** The boss at rest at `at`: all four chunks hidden (they appear only at the break-up). */
function bossRest(t: Tracks): void {
  for (const id of ['chunk-1', 'chunk-2', 'chunk-3', 'chunk-4']) {
    t.key(`giantStone.${id}`, 'alpha', 0, 0);
  }
  fistLeft(t, 0, 'rest', FIST_REST, 0);
  t.key('giantStone.fist-right', 'pose', 0, 'rest');
  t.key('giantStone.body', 'pose', 0, 'rest');
  t.key('giantStone.face', 'pose', 0, 'rest');
  t.key('giantStone.crystals', 'pose', 0, 'rest');
}

/** Times of the freeze and the break-up (choreography time, written with `c`). */
interface Freeze {
  /** First frame after the hit stop: body, face, fists and crystals freeze. */
  frozen: number;
  crack2: number;
  crack3: number;
  /** The body breaks into four chunks; the upper ones (chunk-1, chunk-4) fall first. */
  breakAt: number;
  lowerAt: number;
  settle: number;
}

/** Chunk offsets in rig px at the break and at rest (board S7, S8; 5a, 5b): `[x, y]` added to the base position. */
const CHUNK_BREAK: Readonly<Record<string, readonly [number, number]>> = {
  'chunk-1': [-8, 0],
  'chunk-2': [8, 2],
  'chunk-3': [8, 6],
  'chunk-4': [-8, 5],
};
const CHUNK_REST: Readonly<Record<string, readonly [number, number]>> = {
  'chunk-1': [-14, 12],
  'chunk-2': [14, 14],
  'chunk-3': [14, 6],
  'chunk-4': [-14, 5],
};
/** Lean of the chunks (no more than `size.rig-fine-rotate`). */
const CHUNK_ANGLE: Readonly<Record<string, number>> = {
  'chunk-1': -16,
  'chunk-2': 12,
  'chunk-3': 18,
  'chunk-4': -10,
};
/** The fists sink where they hang. */
const FIST_SINK: Readonly<Record<'fist-left' | 'fist-right', readonly [number, number]>> = {
  'fist-left': [-6, 12],
  'fist-right': [6, 12],
};

/** Freeze, glowing cracks one after the other (`cracked1..3`), then the break-up in four chunks. */
function freeze(t: Tracks, k: Freeze, from: { x: number; y: number }): void {
  t.key('giantStone.body', 'pose', k.frozen, 'cracked1');
  t.key('giantStone.body', 'pose', k.crack2, 'cracked2');
  t.key('giantStone.body', 'pose', k.crack3, 'cracked3');
  t.key('giantStone.face', 'pose', k.frozen, 'frozen');
  t.key('giantStone.crystals', 'pose', k.frozen, 'lit');
  t.key('giantStone.fist-right', 'pose', k.frozen, 'frozen');
  fistLeft(t, k.frozen, 'frozen', from, 0);
  // Break-up: body, face and crystals give way to the chunks (hold keys: a hard cut, crisp like a sprite).
  for (const id of ['body', 'face', 'crystals']) t.key(`giantStone.${id}`, 'alpha', k.breakAt, 0);
  for (const id of Object.keys(CHUNK_BREAK)) {
    const upper = id === 'chunk-1' || id === 'chunk-4';
    const start = upper ? k.breakAt : k.lowerAt;
    const base = B(id);
    t.key(`giantStone.${id}`, 'alpha', k.breakAt, 1);
    t.key(`giantStone.${id}`, 'x', k.breakAt, base.x);
    t.key(`giantStone.${id}`, 'y', k.breakAt, base.y);
    t.key(`giantStone.${id}`, 'angle', k.breakAt, 0);
    t.key(`giantStone.${id}`, 'x', start, base.x, 'expo.in');
    t.key(`giantStone.${id}`, 'y', start, base.y, 'expo.in');
    t.key(`giantStone.${id}`, 'angle', start, 0, 'expo.in');
    t.key(`giantStone.${id}`, 'x', k.settle, base.x + CHUNK_REST[id][0]);
    t.key(`giantStone.${id}`, 'y', k.settle, base.y + CHUNK_REST[id][1]);
    t.key(`giantStone.${id}`, 'angle', k.settle, CHUNK_ANGLE[id]);
  }
  for (const id of ['fist-left', 'fist-right'] as const) {
    const base = B(id);
    const startX = id === 'fist-left' ? from.x : base.x;
    const startY = id === 'fist-left' ? from.y : base.y;
    t.key(`giantStone.${id}`, 'x', k.breakAt, startX, 'expo.in');
    t.key(`giantStone.${id}`, 'y', k.breakAt, startY, 'expo.in');
    t.key(`giantStone.${id}`, 'x', k.settle, base.x + FIST_SINK[id][0]);
    t.key(`giantStone.${id}`, 'y', k.settle, base.y + FIST_SINK[id][1]);
  }
}

// ---------------------------------------------------------------------------------------------------
// Fight moment "Morgenlicht" (brief H-48 part 2b, boards S1 to S8)
// ---------------------------------------------------------------------------------------------------

/** Real time of the main hit (the light falls on the giant). */
const MOMENT_HIT = 1300;

function buildMoment(): ChoreoDef {
  const { c, slowChoreo } = clockOf(MOMENT_HIT, 200, 1300, SLOW);
  const t = new Tracks();
  const AX = MOMENT_X.astronaut;
  const BX = MOMENT_X.boss;

  // Astronaut: crouch (S2), she glides back and up away from the punch (S3), lands and shoots into the sky (S4),
  // holds still while the light falls (S5), lowers the gun (S6), stands (S8).
  stance(t, 0, STAND);
  hammer(t, 0, 0);
  t.key('astronaut', 'x', 0, AX);
  t.key('astronaut', 'y', 0, GROUND);
  stance(t, 300, CROUCH);
  stance(t, 800, LEAP);
  t.key('astronaut', 'x', 800, AX, 'linear');
  t.key('astronaut', 'x', 1000, MOMENT_SHOOT_X);
  t.key('astronaut', 'y', 800, GROUND, 'sine.out');
  t.key('astronaut', 'y', 870, GROUND - 36, 'expo.in');
  t.key('astronaut', 'y', 1000, GROUND);
  stance(t, 1000, SHOOT);
  stance(t, c(1900), AIM);
  stance(t, c(3100), STAND);

  // Giant: the front fist climbs far behind and above him (800 ms anticipation = weight), the face strains,
  // then the punch (action 100 ms at most), the fist is pulled back and hangs until the light hits.
  bossRest(t);
  fistLeft(t, 100, 'rest', FIST_REST, 0, 'sine.inOut');
  fistLeft(t, 150, 'raised', FIST_REST, 0, 'sine.inOut');
  fistLeft(t, 700, 'raised', FIST_HIGH, LEAN / 2);
  t.key('giantStone.face', 'pose', 300, 'strain');
  fistLeft(t, 800, 'punch', FIST_HIGH, LEAN / 2, 'expo.in');
  fistLeft(t, 860, 'punch', FIST_PUNCH, 0);
  fistLeft(t, 920, 'raised', FIST_PUNCH, 0, 'sine.out');
  fistLeft(t, 1100, 'raised', FIST_BACK, 0);
  t.key('giantStone', 'scaleY', 100, 1, 'sine.inOut');
  t.key('giantStone', 'scaleY', 700, 1.03, 'sine.out');
  t.key('giantStone', 'scaleY', 820, 0.98, 'sine.out');
  t.key('giantStone', 'scaleY', 1000, 1);
  freeze(
    t,
    {
      frozen: c(1500),
      crack2: c(1800),
      crack3: c(2200),
      breakAt: c(2500),
      lowerAt: c(2650),
      settle: c(3100),
    },
    FIST_BACK,
  );

  const events: ChoreoEvent[] = [
    // S3: the punch hits the ground where she stood; dust and gravel, the ground trembles.
    trail(800, 120),
    { kind: 'shake', atMs: 860, durationMs: 120, strength: 0.3, flash: false },
    {
      kind: 'particles',
      atMs: 860,
      texture: 'rig-fx-stone-2',
      count: 8,
      at: { x: AX + 40, y: GROUND - 6 },
      flash: false,
    },
    {
      kind: 'particles',
      atMs: 860,
      texture: 'rig-fx-stone-1',
      count: 6,
      at: { x: AX + 40, y: GROUND - 6 },
      flash: false,
    },
    // S4: the shot into the sky (a thin line from the muzzle up past the top edge).
    { kind: 'fx', atMs: 1150, durationMs: MOMENT_HIT - 1150, name: 'sky-shot', flash: false },
    { kind: 'sound', atMs: MOMENT_HIT, key: HIT_SOUND_KEY, flash: false },
    {
      kind: 'hitStop',
      atMs: MOMENT_HIT,
      ms: 200,
      axis: 'y',
      targets: ['giantStone'],
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
      targets: ['giantStone'],
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
    { kind: 'shake', atMs: MOMENT_HIT, durationMs: 200, strength: 0.4, flash: false },
    // S5 to S7: the narrow band of morning light on the giant, thinner in three steps, then gone.
    { kind: 'fx', atMs: MOMENT_HIT, durationMs: 1500, name: 'morning-light', flash: false },
    {
      kind: 'particles',
      atMs: c(1500),
      texture: 'rig-fx-stone-3',
      count: 12,
      follow: 'giantStone.crystals',
      flash: false,
    },
    {
      kind: 'particles',
      atMs: c(1800),
      texture: 'rig-fx-stone-3',
      count: 8,
      follow: 'giantStone.body',
      flash: false,
    },
    {
      kind: 'particles',
      atMs: c(2200),
      texture: 'rig-fx-stone-3',
      count: 8,
      follow: 'giantStone.crystals',
      flash: false,
    },
    // S7: the break-up in four chunks, rubble and crystal splinters, the dust sinks.
    {
      kind: 'particles',
      atMs: c(2500),
      texture: 'rig-fx-stone-0',
      count: 14,
      follow: 'giantStone',
      flash: false,
    },
    {
      kind: 'particles',
      atMs: c(2500),
      texture: 'rig-fx-stone-2',
      count: 18,
      follow: 'giantStone',
      flash: false,
    },
    {
      kind: 'particles',
      atMs: c(2500),
      texture: 'rig-fx-stone-4',
      count: 10,
      follow: 'giantStone',
      flash: false,
    },
    {
      kind: 'particles',
      atMs: c(2900),
      texture: 'rig-fx-stone-1',
      count: 14,
      at: { x: BX, y: GROUND - 6 },
      flash: false,
    },
    { kind: 'text', atMs: c(3200), text: 'BEZWUNGEN!', color: 'finisher.title', flash: false },
  ];

  // Beats in choreography time; the grid test reads them (RS-06.2). The board times are real time. The boss
  // anticipation of 800 ms is written as two beats (the grid allows 600 ms per beat).
  const beats: ChoreoBeat[] = [
    { phase: 'anticipation', atMs: 0, durationMs: 400 },
    { phase: 'anticipation', atMs: 400, durationMs: 400 },
    { phase: 'action', atMs: 800, durationMs: 120 },
    { phase: 'anticipation', atMs: 1000, durationMs: 300 },
    { phase: 'hitStop', atMs: MOMENT_HIT, durationMs: 200, final: true },
    { phase: 'reaction', atMs: MOMENT_HIT, durationMs: slowChoreo, final: true },
    { phase: 'followThrough', atMs: c(2500), durationMs: c(3500) - c(2500), final: true },
  ];

  return {
    variantId: 'moment-giantStone',
    actors: [
      { rigId: 'astronaut', x: AX, y: GROUND },
      { rigId: 'giantStone', x: BX, y: GROUND },
    ],
    durationMs: c(3500),
    tracks: t.list(),
    events,
    beats,
  };
}

// ---------------------------------------------------------------------------------------------------
// Cinematic level 20 "STERNENHAMMER" (brief H-48 part 2b, boards 1a to 5c)
// ---------------------------------------------------------------------------------------------------

/** Camera centre (stage px) to scroll values of a 640 x 360 stage (scroll 0 = stage centred). */
const scrollOf = (cx: number, cy: number) => ({ scrollX: cx - 320, scrollY: cy - 180 });
/** Real time of the hammer strike. */
const CINE_HIT = 9600;
/** Where she hangs at the strike (board 4c): over the giant's head, left of him. */
export const CINE_STRIKE = { x: 400, y: 124 } as const;
/** Top of the fist-left in the cinematic: she lands on it (board 2b), px of the stage. */
export const CINE_FIST_STAND = { x: 216, y: 174 } as const;

function buildCinematic(): ChoreoDef {
  const { c, slowChoreo } = clockOf(CINE_HIT, 200, 2200, SLOW);
  const t = new Tracks();
  const AX = CINE_X.astronaut;
  const BX = CINE_X.boss;

  // Camera. Shot 1 (0 to 3000): zoom 2 on the stone fists, the camera climbs the giant to the crystals
  // (sine.inOut, about 2.5 s), then the cut to the long shot. Shot 3 (6000 to 9000): zoom 2 on her, back to 1.
  const shot1 = scrollOf(BX, 250);
  const eyes = scrollOf(BX, 130);
  t.key('camera', 'zoom', 0, 2);
  t.key('camera', 'zoom', 2600, 1);
  t.key('camera', 'scrollX', 0, shot1.scrollX);
  t.key('camera', 'scrollX', 2600, 0);
  t.key('camera', 'scrollY', 0, shot1.scrollY, 'sine.inOut');
  t.key('camera', 'scrollY', 2500, eyes.scrollY);
  t.key('camera', 'scrollY', 2600, 0);
  const onHer = scrollOf(190, 250);
  t.key('camera', 'zoom', 7000, 2);
  t.key('camera', 'zoom', 8200, 1);
  t.key('camera', 'scrollX', 7000, onHer.scrollX);
  t.key('camera', 'scrollX', 8200, 0);
  t.key('camera', 'scrollY', 7000, onHer.scrollY);
  t.key('camera', 'scrollY', 8200, 0);

  // Astronaut. E1: calm.
  stance(t, 0, STAND);
  hammer(t, 0, 0);
  t.key('astronaut', 'x', 0, AX);
  t.key('astronaut', 'y', 0, GROUND);
  // E2 board 2a (3000 to 4300): the fist punches, she hops over it and lands (afterimages).
  stance(t, 3150, CROUCH);
  stance(t, 3300, LEAP);
  t.key('astronaut', 'x', 3300, AX, 'linear');
  t.key('astronaut', 'x', 3600, 190);
  t.key('astronaut', 'y', 3300, GROUND, 'sine.out');
  t.key('astronaut', 'y', 3480, GROUND - 86, 'expo.in');
  t.key('astronaut', 'y', 3600, GROUND);
  stance(t, 3600, CROUCH);
  // Board 2b: she jumps onto the floating fist (no arms, 5a) and crouches there.
  stance(t, 4100, LEAP);
  t.key('astronaut', 'x', 4100, 190, 'linear');
  t.key('astronaut', 'x', 4300, CINE_FIST_STAND.x);
  t.key('astronaut', 'y', 4100, GROUND, 'sine.out');
  t.key('astronaut', 'y', 4200, 150, 'expo.in');
  t.key('astronaut', 'y', 4300, CINE_FIST_STAND.y);
  stance(t, 4300, CROUCH);
  // Board 2c: from the fist over his head; a blade counter at the crystals (arc2, only small sparks).
  stance(t, 5100, LEAP);
  t.key('astronaut', 'x', 5100, CINE_FIST_STAND.x, 'linear');
  t.key('astronaut', 'x', 5400, 380, 'linear');
  t.key('astronaut', 'x', 6000, AX);
  t.key('astronaut', 'y', 5100, CINE_FIST_STAND.y, 'sine.out');
  t.key('astronaut', 'y', 5250, 130, 'expo.in');
  t.key('astronaut', 'y', 5400, 140, 'expo.in');
  t.key('astronaut', 'y', 6000, GROUND);
  stance(t, 5400, SMEARED);
  counterArc(t, 5400, -30);
  stance(t, 5400 + SMEAR, LEAP);
  // E3 (6000 to 9000): she lands, dark visor, the stars gather to the hammer (alpha 0.5 then 1).
  stance(t, 6000, CROUCH);
  stance(t, 7000, { ...CROUCH, helmet: 'dark' });
  stance(t, 7300, HAMMER_UP);
  hammer(t, 7300, 0.5);
  hammer(t, 8100, 1);
  // E4 (9000 to 12000): jump high over him, the hammer far behind the head, the stroke from above (smear 33 ms).
  stance(t, 9000, { ...HAMMER_AIR, helmet: 'dark' });
  t.key('astronaut', 'x', 9000, AX, 'linear');
  t.key('astronaut', 'x', CINE_HIT, CINE_STRIKE.x);
  t.key('astronaut', 'y', 9000, GROUND, 'sine.out');
  t.key('astronaut', 'y', 9350, 120, 'linear');
  t.key('astronaut', 'y', CINE_HIT, CINE_STRIKE.y);
  stance(t, 9200, HAMMER_AIR);
  t.key('astronaut.arm-front', 'angle', 9200, -10);
  stance(t, 9500, SMEARED);
  stance(t, 9500 + SMEAR, { ...HAMMER_AIR, armFront: 'slash-end' });
  stance(t, CINE_HIT, STRIKE);
  t.key('astronaut.arm-front', 'angle', CINE_HIT, LEAN);
  // She hangs in the slow motion, then drops to the ground, kneeling (board 5a), the hammer is gone.
  t.key('astronaut', 'x', c(11600), CINE_STRIKE.x, 'expo.in');
  t.key('astronaut', 'y', c(11600), CINE_STRIKE.y, 'expo.in');
  t.key('astronaut', 'x', c(12400), 300);
  t.key('astronaut', 'y', c(12400), GROUND);
  stance(t, c(11600), STRIKE);
  stance(t, c(12400), LAND);
  hammer(t, c(12400), 0);
  // E5: she stands up, the title follows.
  stance(t, c(13400), STAND);

  // Giant, 4x. E1/E2: the front fist climbs, punches (board 2a) and is pulled back, where she lands on it.
  bossRest(t);
  fistLeft(t, 3000, 'rest', FIST_REST, 0, 'sine.inOut');
  fistLeft(t, 3050, 'raised', FIST_REST, 0, 'sine.inOut');
  fistLeft(t, 3250, 'raised', FIST_HIGH, LEAN / 2);
  fistLeft(t, 3300, 'punch', FIST_HIGH, LEAN / 2, 'expo.in');
  fistLeft(t, 3360, 'punch', FIST_PUNCH_CINE, 0);
  fistLeft(t, 3600, 'raised', FIST_PUNCH_CINE, 0, 'sine.out');
  fistLeft(t, 4100, 'raised', FIST_BACK, 0);
  // E3: he strains at the name (the fist sways back to its place); E4: it stays raised until the hammer comes.
  fistLeft(t, 7600, 'raised', FIST_BACK, 0, 'sine.inOut');
  fistLeft(t, 8200, 'raised', FIST_REST, 0);
  t.key('giantStone.face', 'pose', 8200, 'strain');
  freeze(
    t,
    {
      frozen: c(9800),
      crack2: c(10400),
      crack3: c(10800),
      breakAt: c(12400),
      lowerAt: c(12550),
      settle: c(13000),
    },
    FIST_REST,
  );

  const events: ChoreoEvent[] = [
    // E1: his shadow falls over her (board 1c).
    { kind: 'fx', atMs: 2600, durationMs: 700, name: 'shadow', flash: false },
    // E2: the punch (board 2a), the hops (afterimages), dust and gravel.
    trail(3300, 300),
    {
      kind: 'particles',
      atMs: 3360,
      texture: 'rig-fx-stone-2',
      count: 10,
      at: { x: 130, y: GROUND - 6 },
      flash: false,
    },
    {
      kind: 'particles',
      atMs: 3360,
      texture: 'rig-fx-stone-1',
      count: 6,
      at: { x: 130, y: GROUND - 6 },
      flash: false,
    },
    trail(4100, 200),
    trail(5100, 300),
    {
      kind: 'particles',
      atMs: 5400,
      texture: 'rig-fx-stone-4',
      count: 6,
      at: { x: 440, y: 120 },
      flash: false,
    },
    {
      kind: 'particles',
      atMs: 5400,
      texture: 'rig-fx-stone-3',
      count: 4,
      at: { x: 440, y: 120 },
      flash: false,
    },
    trail(5500, 400),
    // E3
    { kind: 'fx', atMs: 6000, durationMs: 1000, name: 'portrait', flash: false },
    { kind: 'fx', atMs: 7000, durationMs: 2000, name: 'star-gather', flash: false },
    {
      kind: 'text',
      atMs: 8200,
      durationMs: 800,
      text: 'STERNENHAMMER',
      color: 'finisher.name',
      flash: false,
    },
    // E4: jump with afterimages, the only impact pair, slow motion
    trail(9000, 500),
    trail(9500, 100),
    { kind: 'sound', atMs: CINE_HIT, key: HIT_SOUND_KEY, flash: false },
    {
      kind: 'hitStop',
      atMs: CINE_HIT,
      ms: 200,
      axis: 'y',
      targets: ['giantStone'],
      strength: 1,
      flash: false,
    },
    { kind: 'timeScale', atMs: CINE_HIT, durationMs: slowChoreo, factor: SLOW, flash: false },
    { kind: 'fx', atMs: CINE_HIT, durationMs: 200, name: 'impact-pair', flash: true },
    {
      kind: 'hitWhite',
      atMs: CINE_HIT,
      durationMs: 200,
      targets: ['giantStone', 'astronaut'],
      flash: false,
    },
    { kind: 'shake', atMs: c(9800), durationMs: 300, strength: 0.6, flash: false },
    {
      kind: 'particles',
      atMs: c(9800),
      texture: 'rig-fx-stone-4',
      count: 12,
      follow: 'giantStone.crystals',
      flash: false,
    },
    {
      kind: 'particles',
      atMs: c(10400),
      texture: 'rig-fx-stone-3',
      count: 10,
      follow: 'giantStone.body',
      flash: false,
    },
    {
      kind: 'particles',
      atMs: c(10800),
      texture: 'rig-fx-stone-5',
      count: 10,
      follow: 'giantStone.crystals',
      flash: false,
    },
    // E5: the break-up (board 5a), the stars of the hammer stay in the sky (5b), the title (5c)
    {
      kind: 'particles',
      atMs: c(12400),
      texture: 'rig-fx-stone-0',
      count: 16,
      follow: 'giantStone',
      flash: false,
    },
    {
      kind: 'particles',
      atMs: c(12400),
      texture: 'rig-fx-stone-2',
      count: 20,
      follow: 'giantStone',
      flash: false,
    },
    {
      kind: 'particles',
      atMs: c(12400),
      texture: 'rig-fx-stone-4',
      count: 12,
      follow: 'giantStone',
      flash: false,
    },
    {
      kind: 'particles',
      atMs: c(13200),
      texture: 'rig-fx-stone-1',
      count: 16,
      at: { x: BX, y: GROUND - 6 },
      flash: false,
    },
    { kind: 'fx', atMs: c(12600), durationMs: 2400, name: 'sky-stars', flash: false },
    { kind: 'text', atMs: c(14000), text: 'BEZWUNGEN!', color: 'finisher.title', flash: false },
  ];

  const beats: ChoreoBeat[] = [
    { phase: 'anticipation', atMs: 9000, durationMs: 400 },
    { phase: 'action', atMs: 9500, durationMs: 100 },
    { phase: 'hitStop', atMs: CINE_HIT, durationMs: 200, final: true },
    { phase: 'reaction', atMs: CINE_HIT, durationMs: slowChoreo, final: true },
    { phase: 'followThrough', atMs: c(12000), durationMs: c(15000) - c(12000), final: true },
  ];

  // Five shots of 3000 ms real time; shot 5 starts after the slow motion. No axis flip (only L40 has one).
  const long = { scrollX: 0, scrollY: 0, zoom: 1 };
  const shots: ChoreoShot[] = [
    { atMs: 0, camera: { ...shot1, zoom: 2 } },
    { atMs: 3000, camera: long },
    { atMs: 6000, camera: long },
    { atMs: 9000, camera: long },
    { atMs: c(12000), camera: long },
  ];

  return {
    variantId: 'cinematic-20',
    actors: [
      { rigId: 'astronaut', x: AX, y: GROUND },
      { rigId: 'giantStone', x: BX, y: GROUND },
    ],
    durationMs: c(15000),
    shots,
    tracks: t.list(),
    events,
    beats,
  };
}

export const MOMENT_GIANT_STONE: ChoreoDef = buildMoment();
export const CINEMATIC_20: ChoreoDef = buildCinematic();

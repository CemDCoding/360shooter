// Choreographies of the root monster (M13, AP-184, brief H-46, RS-06 result 3, PE-244 to PE-252):
// the fight moment "Rosenschnitt" (`moment-rootMonster`, 3.5 s) and the cinematic of level 4
// "WURZELBRECHER" (`cinematic-4`, 15 s, 5 shots). Only data: key frames, camera and events; the
// effects of the boss itself live in `scenes/finisher/fx/rootMonster.ts`.
//
// Times are written in REAL time (the storyboard tables); `clockOf` turns them into choreography time
// (hit stop and slow motion). Key frames are collected by `Tracks`, which sorts them and drops repeated
// hold keys, so a stance can simply be written again.
//
// Rules this data keeps (checked by tests/config/choreo/rootMonster.test.ts):
// - Children of `arm-front` (raygun, blade, blade-arc) are moved by hold keys from ASTRONAUT_ANCHORS in the
//   same key frame as the arm pose (PE-252); crouch/kneel lower torso, arms and pack by `bodyDrop`, the lean
//   pushes arm-front, arm-back and pack by `torsoLean`.
// - A smear pose is never the first key of a pose track. The blade arc is shown by `alpha` with its base
//   frame (arc1); the frame names arc1/arc2 are only keyed after the neutral name `none`.
// - The blade grows and retracts in steps of `motion.rig-blade-step`.
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
import { ROOT_MONSTER_RIG } from '../rigs/rootMonster';

const GROUND = THEME.sizePx['size.rig-ground'];
const BLADE_STEP = THEME.motionMs['motion.rig-blade-step'];
const SMEAR = THEME.motionMs['motion.rig-smear'];
const SMEAR_ARC = THEME.motionMs['motion.rig-smear-arc'];
const HIT_WHITE = THEME.motionMs['motion.rig-hit-white'];
const AFTERIMAGE_GAP = THEME.motionMs['motion.rig-afterimage-gap'];
const AFTERIMAGE_FADE = THEME.motionMs['motion.rig-afterimage-fade'];
const ANCH = ASTRONAUT_ANCHORS;

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
/** Largest angle of a part without `freeRotate` (token `size.rig-fine-rotate`): the halves and the crown lean this far. */
const LEAN = THEME.sizeCount['size.rig-fine-rotate'];

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
const B = (id: string) => part(ROOT_MONSTER_RIG, id);

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
const CROUCH: Stance = {
  ...STAND,
  legs: 'crouch',
  torso: 'lean',
  armFront: 'aim',
  armBack: 'back',
};
const LEAP: Stance = { ...STAND, legs: 'tuck', pack: 'thrust', armFront: 'aim', armBack: 'back' };
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
const GUARD: Stance = { ...CROUCH, torso: 'upright', blade: 'full' };

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

/** Boss arm poses. */
type Arm = 'rest' | 'raised' | 'stab';

function bossArms(t: Tracks, at: number, left: Arm, right: Arm, jaw: 'closed' | 'roar'): void {
  t.key('rootMonster.arm-left', 'pose', at, left);
  t.key('rootMonster.arm-right', 'pose', at, right);
  t.key('rootMonster.jaw', 'pose', at, jaw);
}

/** Timing of the break-up of the trunk (choreography time, written with `c`). */
interface Collapse {
  /** Halves show their glowing crack. */
  crack: number;
  /** Halves have opened by `firstAngle` degrees. */
  open1: number;
  firstAngle: number;
  /** Halves lean (`size.rig-fine-rotate` degrees) and fall apart. */
  open2: number;
  /** Trunk, roots and arms fade out in 3 steps (leaves). */
  fadeFrom: number;
  fadeTo: number;
  /** The crown breaks last. */
  crownBend: number;
  crownFall: number;
  crownFadeFrom: number;
  crownFadeTo: number;
}

function collapse(t: Tracks, k: Collapse): void {
  const trunkIds = ['trunk-left', 'trunk-right'] as const;
  for (const id of trunkIds) {
    const sign = id === 'trunk-left' ? -1 : 1;
    const base = B(id);
    t.key(`rootMonster.${id}`, 'pose', k.crack, 'cracked');
    t.key(`rootMonster.${id}`, 'angle', k.crack - 1, 0, 'sine.out');
    t.key(`rootMonster.${id}`, 'angle', k.open1, sign * k.firstAngle, 'sine.inOut');
    t.key(`rootMonster.${id}`, 'angle', k.open2, sign * LEAN);
    t.key(`rootMonster.${id}`, 'x', k.crack - 1, base.x, 'sine.out');
    t.key(`rootMonster.${id}`, 'x', k.open1, base.x + sign * 2, 'sine.inOut');
    t.key(`rootMonster.${id}`, 'x', k.open2, base.x + sign * 10);
    t.key(`rootMonster.${id}`, 'y', k.crack - 1, base.y, 'sine.out');
    t.key(`rootMonster.${id}`, 'y', k.open1, base.y, 'sine.inOut');
    t.key(`rootMonster.${id}`, 'y', k.open2, base.y + 2);
  }
  const crown = B('crown');
  t.key('rootMonster.crown', 'pose', k.crownBend, 'bent');
  t.key('rootMonster.crown', 'angle', k.crownBend, 0, 'sine.inOut');
  t.key('rootMonster.crown', 'angle', k.crownFall, LEAN);
  t.key('rootMonster.crown', 'x', k.crownBend, crown.x, 'sine.inOut');
  t.key('rootMonster.crown', 'x', k.crownFall, crown.x + 10);
  t.key('rootMonster.crown', 'y', k.crownBend, crown.y, 'sine.inOut');
  t.key('rootMonster.crown', 'y', k.crownFall, crown.y + 8);
  const jaw = B('jaw');
  t.key('rootMonster.jaw', 'y', k.crack, jaw.y, 'sine.inOut');
  t.key('rootMonster.jaw', 'y', k.open2, jaw.y + 6);
  // Fade in 3 steps: `stepped` keeps the picture crisp (no soft alpha ramp).
  for (const id of [
    'trunk-left',
    'trunk-right',
    'roots-left',
    'roots-right',
    'arm-left',
    'arm-right',
    'jaw',
  ]) {
    t.key(`rootMonster.${id}`, 'alpha', k.fadeFrom, 1, 'stepped', 3);
    t.key(`rootMonster.${id}`, 'alpha', k.fadeTo, 0);
  }
  t.key('rootMonster.crown', 'alpha', k.crownFadeFrom, 1, 'stepped', 3);
  t.key('rootMonster.crown', 'alpha', k.crownFadeTo, 0);
}

// ---------------------------------------------------------------------------------------------------
// Fight moment "Rosenschnitt" (brief H-46, table "Kampfmoment Rosenschnitt", boards M1 to M9)
// ---------------------------------------------------------------------------------------------------

function buildMoment(): ChoreoDef {
  const { c, slowChoreo } = clockOf(1000, 200, 1000, SLOW);
  const t = new Tracks();
  const AX = MOMENT_X.astronaut;
  const BX = MOMENT_X.boss;

  // Astronaut: crouch, recoil jump, hang with the growing blade, vertical cut, kneeling landing, stand up.
  stance(t, 0, STAND);
  arc(t, 0, 'off');
  t.key('astronaut', 'x', 0, AX);
  t.key('astronaut', 'y', 0, GROUND);
  stance(t, 150, CROUCH);
  stance(t, 500, LEAP);
  // The recoil throws her up and to the right, then she hangs in the air (700 to 900).
  t.key('astronaut', 'x', 500, AX, 'sine.out');
  t.key('astronaut', 'x', 700, 340, 'linear');
  t.key('astronaut', 'x', 900, 380, 'linear');
  t.key('astronaut', 'x', 1000, 372);
  t.key('astronaut', 'y', 500, GROUND, 'sine.out');
  t.key('astronaut', 'y', 600, 186, 'sine.inOut');
  t.key('astronaut', 'y', 700, 192, 'linear');
  t.key('astronaut', 'y', 900, 212, 'expo.in');
  t.key('astronaut', 'y', 1000, GROUND);
  stance(t, 700, { ...RAISE, blade: 'grow1' });
  stance(t, 700 + BLADE_STEP, { ...RAISE, blade: 'grow2' });
  stance(t, 700 + 2 * BLADE_STEP, RAISE);
  t.key('astronaut.torso', 'angle', 700, -4);
  t.key('astronaut.arm-front', 'angle', 700, -8);
  // Cut (action 100 ms): smear poses 33 ms, blade arc arc1 then arc2, then the arm ends low.
  stance(t, 900, SMEARED);
  arc(t, 900, 'arc1', 20);
  t.key('astronaut.torso', 'angle', 900, 0);
  t.key('astronaut.arm-front', 'angle', 900, 0);
  stance(t, 900 + SMEAR, { ...RAISE, armFront: 'slash-end' });
  arc(t, 900 + SMEAR_ARC, 'arc2', 20);
  arc(t, 900 + 2 * SMEAR_ARC, 'off');
  stance(t, 1000, CUT);
  // Stand up (board M9): blade back in 3 steps, then the title.
  bladeSteps(t, c(3100), { ...STAND, armFront: 'aim' }, -1);

  // Root monster: arms up and jaw open (anticipation), root thrust, hit, break-up.
  bossArms(t, 0, 'rest', 'rest', 'closed');
  bossArms(t, 150, 'raised', 'raised', 'roar');
  bossArms(t, 500, 'stab', 'raised', 'roar');
  bossArms(t, c(1200), 'rest', 'raised', 'roar');
  t.key('rootMonster', 'scaleY', 150, 1, 'sine.inOut');
  t.key('rootMonster', 'scaleY', 480, 1.05, 'back.out');
  t.key('rootMonster', 'scaleY', 500, 0.97, 'sine.out');
  t.key('rootMonster', 'scaleY', 650, 1);
  collapse(t, {
    crack: c(1200),
    open1: c(2200),
    firstAngle: 12,
    open2: c(2600),
    fadeFrom: c(2400),
    fadeTo: c(3000),
    crownBend: c(1700),
    crownFall: c(2600),
    crownFadeFrom: c(2700),
    crownFadeTo: c(3100),
  });

  const events: ChoreoEvent[] = [
    { kind: 'fx', atMs: 0, durationMs: 500, name: 'ground-bulge', flash: false },
    { kind: 'fx', atMs: 500, durationMs: 300, name: 'root-spike', flash: false },
    trail(500, 200),
    trail(900, 100),
    { kind: 'sound', atMs: 1000, key: HIT_SOUND_KEY, flash: false },
    {
      kind: 'hitStop',
      atMs: 1000,
      ms: 200,
      axis: 'x',
      targets: ['rootMonster'],
      strength: 1,
      flash: false,
    },
    { kind: 'timeScale', atMs: 1000, durationMs: slowChoreo, factor: SLOW, flash: false },
    // Main hit (H-48 13a): only the boss turns white for 100 ms, no full-screen flash. This is the
    // one flash of the moment, so "reduce effects" removes it.
    {
      kind: 'hitWhite',
      atMs: 1000,
      durationMs: HIT_WHITE,
      targets: ['rootMonster'],
      flash: true,
    },
    { kind: 'shake', atMs: 1000, durationMs: 200, strength: 0.5, flash: false },
    { kind: 'fx', atMs: 1000, durationMs: 1600, name: 'slash', flash: false },
    {
      kind: 'particles',
      atMs: 1000,
      texture: 'rig-fx-root-6',
      count: 14,
      follow: 'rootMonster',
      flash: false,
    },
    {
      kind: 'particles',
      atMs: 1000,
      texture: 'rig-fx-root-7',
      count: 10,
      follow: 'rootMonster',
      flash: false,
    },
    {
      kind: 'particles',
      atMs: c(1200),
      texture: 'rig-fx-root-5',
      count: 10,
      follow: 'rootMonster',
      flash: false,
    },
    { kind: 'fx', atMs: c(1200), durationMs: 1800, name: 'leaves', flash: false },
    { kind: 'fx', atMs: c(2200), durationMs: 1300, name: 'rose-hedge', flash: false },
    { kind: 'fx', atMs: c(2600), durationMs: 900, name: 'petals', flash: false },
    { kind: 'text', atMs: c(3000), text: 'BEZWUNGEN!', color: 'finisher.title', flash: false },
  ];

  // Beats in choreography time; the grid test reads them (RS-06.2). The board times are real time.
  const beats: ChoreoBeat[] = [
    { phase: 'anticipation', atMs: 0, durationMs: 500 },
    { phase: 'action', atMs: 500, durationMs: 100 },
    { phase: 'anticipation', atMs: 700, durationMs: 200 },
    { phase: 'action', atMs: 900, durationMs: 100 },
    { phase: 'hitStop', atMs: 1000, durationMs: 200, final: true },
    { phase: 'reaction', atMs: 1000, durationMs: slowChoreo, final: true },
    { phase: 'followThrough', atMs: c(2200), durationMs: c(3500) - c(2200), final: true },
  ];

  return {
    variantId: 'moment-rootMonster',
    actors: [
      { rigId: 'astronaut', x: AX, y: GROUND },
      { rigId: 'rootMonster', x: BX, y: GROUND },
    ],
    durationMs: c(3500),
    tracks: t.list(),
    events,
    beats,
  };
}

// ---------------------------------------------------------------------------------------------------
// Cinematic level 4 "WURZELBRECHER" (brief H-46, table "Cinematic Level 4", boards 1a to 5c)
// ---------------------------------------------------------------------------------------------------

/** Camera centre (stage px) to scroll values of a 640 x 360 stage (scroll 0 = stage centred). */
const scrollOf = (cx: number, cy: number) => ({ scrollX: cx - 320, scrollY: cy - 180 });

function buildCinematic(): ChoreoDef {
  const { c, slowChoreo } = clockOf(9600, 200, 2200, SLOW);
  const t = new Tracks();
  const AX = CINE_X.astronaut;
  const BX = CINE_X.boss;

  // Shot 1 (0 to 3000): zoom 2 on the roots, the camera travels up the trunk (sine.inOut, about 2.5 s),
  // then the cut to the long shot (zoom 1).
  const shot1 = scrollOf(470, 260);
  const eyes = scrollOf(470, 170);
  t.key('camera', 'zoom', 0, 2);
  t.key('camera', 'zoom', 2600, 1);
  t.key('camera', 'scrollX', 0, shot1.scrollX);
  t.key('camera', 'scrollX', 2600, 0);
  t.key('camera', 'scrollY', 0, shot1.scrollY, 'sine.inOut');
  t.key('camera', 'scrollY', 2500, eyes.scrollY);
  t.key('camera', 'scrollY', 2600, 0);
  // Shot 3 (6000 to 9000): zoom 2 on the astronaut while the blade grows, back to zoom 1 for the name.
  const onHer = scrollOf(190, 250);
  t.key('camera', 'zoom', 7000, 2);
  t.key('camera', 'zoom', 8200, 1);
  t.key('camera', 'scrollX', 7000, onHer.scrollX);
  t.key('camera', 'scrollX', 8200, 0);
  t.key('camera', 'scrollY', 7000, onHer.scrollY);
  t.key('camera', 'scrollY', 8200, 0);

  // Astronaut. E1: calm.
  stance(t, 0, STAND);
  arc(t, 0, 'off');
  t.key('astronaut', 'x', 0, AX);
  t.key('astronaut', 'y', 0, GROUND);
  // E2 (3000 to 6000): root thrusts and zig-zag dodges, two blade counters.
  stance(t, 3150, CROUCH);
  stance(t, 3300, LEAP);
  jump(t, 3300, AX, 250, 214, 120, 180);
  stance(t, 3600, CROUCH);
  stance(t, 3750, LEAP);
  jump(t, 3750, 250, 200, 230, 100, 150);
  stance(t, 4000, CROUCH);
  stance(t, 4150, LEAP);
  jump(t, 4150, 200, 300, 240, 150, 150);
  // Counter 1: a thin arc (arc2) against the back arm, only small sparks.
  stance(t, 4300, SMEARED);
  arc(t, 4300, 'arc2', -30);
  stance(t, 4300 + SMEAR, LEAP);
  arc(t, 4300 + SMEAR_ARC, 'off');
  stance(t, 4450, CROUCH);
  t.key('astronaut', 'x', 4450, 300, 'linear');
  t.key('astronaut', 'x', 5300, 280);
  // Counter 2: she stops the root arm with the blade (guard), then jumps back to the left.
  stance(t, 5300, GUARD);
  t.key('astronaut.blade', 'angle', 5300, -16);
  stance(t, 5600, LEAP);
  jump(t, 5600, 280, AX, 240, 150, 150);
  stance(t, 5900, CROUCH);
  // E3 (6000 to 9000): charge. Dark visor, the blade grows in 3 steps, then the name.
  stance(t, 6000, CROUCH);
  stance(t, 7000, { ...CROUCH, helmet: 'dark' });
  stance(t, 7100, { ...CROUCH, helmet: 'dark', blade: 'grow1' });
  stance(t, 7100 + BLADE_STEP, { ...CROUCH, helmet: 'dark', blade: 'grow2' });
  stance(t, 7100 + 2 * BLADE_STEP, { ...CROUCH, helmet: 'dark', blade: 'full' });
  // E4 (9000 to 12000): jump over the boss, cut from the top left, kneeling landing.
  stance(t, 9000, { ...LEAP, helmet: 'dark', blade: 'full' });
  t.key('astronaut', 'x', 9000, AX, 'linear');
  t.key('astronaut', 'x', 9300, 300, 'linear');
  t.key('astronaut', 'x', 9500, 312, 'linear');
  t.key('astronaut', 'x', 9600, 330);
  t.key('astronaut', 'y', 9000, GROUND, 'sine.out');
  t.key('astronaut', 'y', 9300, 190, 'linear');
  t.key('astronaut', 'y', 9500, 196, 'expo.in');
  t.key('astronaut', 'y', 9600, GROUND);
  stance(t, 9200, { ...RAISE, pack: 'thrust' });
  t.key('astronaut.arm-front', 'angle', 9200, -10);
  stance(t, 9500, SMEARED);
  arc(t, 9500, 'arc1', 20);
  t.key('astronaut.arm-front', 'angle', 9500, 0);
  stance(t, 9500 + SMEAR, { ...RAISE, armFront: 'slash-end' });
  arc(t, 9500 + SMEAR_ARC, 'arc2', 20);
  arc(t, 9500 + 2 * SMEAR_ARC, 'off');
  stance(t, 9600, CUT);
  t.key('astronaut', 'x', c(9600), 330, 'sine.out');
  t.key('astronaut', 'x', c(10800), 356);
  t.key('astronaut', 'x', c(13000), 356, 'linear');
  t.key('astronaut', 'x', c(13400), 300);
  t.key('astronaut', 'x', c(14000), 300, 'linear');
  t.key('astronaut', 'x', c(14300), 290);
  // E5: she stands up, lowers the blade (3 steps), the title follows.
  bladeSteps(t, c(14150), { ...STAND, armFront: 'aim' }, -1);
  t.key('astronaut.arm-front', 'angle', c(14200), 14);

  // Root monster, 4x. E2: two thrusts and the arm that meets the blade.
  bossArms(t, 0, 'rest', 'rest', 'closed');
  bossArms(t, 3300, 'stab', 'rest', 'roar');
  bossArms(t, 3550, 'rest', 'rest', 'closed');
  bossArms(t, 3750, 'rest', 'stab', 'roar');
  bossArms(t, 4000, 'rest', 'rest', 'closed');
  bossArms(t, 4200, 'raised', 'raised', 'roar');
  bossArms(t, 4500, 'rest', 'rest', 'closed');
  bossArms(t, 5250, 'raised', 'raised', 'roar');
  bossArms(t, 5700, 'rest', 'rest', 'closed');
  // E3: he roars back at the name; E4: the thrust arm drops as she lands.
  bossArms(t, 8200, 'raised', 'raised', 'roar');
  bossArms(t, 9600, 'stab', 'raised', 'roar');
  bossArms(t, c(9800), 'rest', 'raised', 'roar');
  collapse(t, {
    crack: c(9800),
    open1: c(10800),
    firstAngle: 10,
    open2: c(12400),
    fadeFrom: c(12400),
    fadeTo: c(13000),
    crownBend: c(11000),
    crownFall: c(12600),
    crownFadeFrom: c(12800),
    crownFadeTo: c(13400),
  });

  const events: ChoreoEvent[] = [
    // E2
    { kind: 'fx', atMs: 3300, durationMs: 300, name: 'root-spike', flash: false },
    trail(3300, 300),
    { kind: 'fx', atMs: 3750, durationMs: 300, name: 'root-spike', flash: false },
    trail(3750, 250),
    trail(4150, 300),
    {
      kind: 'particles',
      atMs: 4300,
      texture: 'rig-fx-root-6',
      count: 6,
      at: { x: 352, y: 170 },
      flash: false,
    },
    {
      kind: 'particles',
      atMs: 4300,
      texture: 'rig-fx-root-7',
      count: 4,
      at: { x: 352, y: 170 },
      flash: false,
    },
    {
      kind: 'particles',
      atMs: 5400,
      texture: 'rig-fx-root-6',
      count: 7,
      at: { x: 330, y: 232 },
      flash: false,
    },
    {
      kind: 'particles',
      atMs: 5400,
      texture: 'rig-fx-root-7',
      count: 4,
      at: { x: 330, y: 232 },
      flash: false,
    },
    trail(5600, 300),
    // E3
    { kind: 'fx', atMs: 6000, durationMs: 1000, name: 'portrait', flash: false },
    {
      kind: 'text',
      atMs: 8200,
      durationMs: 800,
      text: 'WURZELBRECHER',
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
      targets: ['rootMonster'],
      strength: 1,
      flash: false,
    },
    { kind: 'timeScale', atMs: 9600, durationMs: slowChoreo, factor: SLOW, flash: false },
    { kind: 'fx', atMs: 9600, durationMs: 200, name: 'impact-pair', flash: true },
    {
      kind: 'hitWhite',
      atMs: 9600,
      durationMs: 200,
      targets: ['rootMonster', 'astronaut'],
      flash: false,
    },
    { kind: 'shake', atMs: c(9800), durationMs: 300, strength: 0.6, flash: false },
    { kind: 'fx', atMs: 9600, durationMs: 2800, name: 'cut-line', flash: false },
    {
      kind: 'particles',
      atMs: c(9800),
      texture: 'rig-fx-root-6',
      count: 16,
      follow: 'rootMonster',
      flash: false,
    },
    {
      kind: 'particles',
      atMs: c(9800),
      texture: 'rig-fx-root-7',
      count: 12,
      follow: 'rootMonster',
      flash: false,
    },
    {
      kind: 'particles',
      atMs: c(9800),
      texture: 'rig-fx-root-5',
      count: 16,
      follow: 'rootMonster',
      flash: false,
    },
    { kind: 'fx', atMs: c(9800), durationMs: 2200, name: 'leaves', flash: false },
    // E5
    { kind: 'fx', atMs: c(12400), durationMs: 1400, name: 'leaves', flash: false },
    { kind: 'fx', atMs: c(13000), durationMs: 2000, name: 'rose-hedge', flash: false },
    { kind: 'fx', atMs: c(13200), durationMs: 1800, name: 'petals', flash: false },
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
    { atMs: 0, camera: { ...shot1, zoom: 2 } },
    { atMs: 3000, camera: long },
    { atMs: 6000, camera: long },
    { atMs: 9000, camera: long },
    { atMs: c(12000), camera: long },
  ];

  return {
    variantId: 'cinematic-4',
    actors: [
      { rigId: 'astronaut', x: AX, y: GROUND },
      { rigId: 'rootMonster', x: BX, y: GROUND },
    ],
    durationMs: c(15000),
    shots,
    tracks: t.list(),
    events,
    beats,
  };
}

export const MOMENT_ROOT_MONSTER: ChoreoDef = buildMoment();
export const CINEMATIC_4: ChoreoDef = buildCinematic();

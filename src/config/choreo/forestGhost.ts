// Choreographies of the forest ghost (M13, AP-186, brief H-48 part 2b, RS-06 result 3, PE-244 to PE-252):
// the fight moment "Erlkönigs Töchter" (`moment-forestGhost`, 3.5 s) and the cinematic of level 9
// "MONDSCHNITT" (`cinematic-9`, 15 s, 5 shots). Only data: key frames, camera and events; the effects of the
// boss itself (decoys, shot, moonlight, split picture) live in `scenes/finisher/fx/forestGhost.ts`.
//
// Times are written in REAL time (the storyboard tables of `docs/design/mockups/m13b-forest-ghost.html`);
// `clockOf` turns them into choreography time (hit stop and slow motion). Key frames are collected by
// `Tracks`, which sorts them and drops repeated hold keys, so a stance can simply be written again.
//
// Rules this data keeps (checked by tests/config/choreo/forestGhost.test.ts):
// - Children of `arm-front` (raygun, blade, blade-arc) are moved by hold keys from ASTRONAUT_ANCHORS in the
//   same key frame as the arm pose (PE-252); crouch/kneel lower torso, arms and pack by `bodyDrop`, the lean
//   pushes arm-front, arm-back and pack by `torsoLean`. The ghost children follow the pose `stretch` by
//   FOREST_GHOST_ANCHORS in the same key frame as the body pose.
// - A smear pose is never the first key of a pose track and stands 33 ms (blade arc 66 ms, H-48 14a).
// - Main hit of the moment (H-48 13a): boss white 100 ms + speedline ring (AP-194) at the same `atMs`, no
//   full-screen flash. The one full-screen impact pair belongs to the cinematic.
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
import { FOREST_GHOST_ANCHORS, FOREST_GHOST_RIG } from '../rigs/forestGhost';

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
/** Brief H-48 (part 2b): the real ghost slips behind her, she steps forward by this much (px). */
const STEP_FORWARD = 70;
/** Where the real ghost hovers behind her at the main hit (board G6, stage px). */
export const GHOST_BEHIND_X = 66;
/** Height of the horizontal cut through the ghost in the cinematic (board 4b, stage px). */
export const CUT_Y = 212;
/** Hit points of the decoys (boards G6, 2a, 2b, stage px) for the burst of splinters and mist. */
const DECOY_BURST_MOMENT = [
  { x: 370, y: GROUND - 70 },
  { x: 300, y: GROUND - 120 },
] as const;

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
const G = (id: string) => part(FOREST_GHOST_RIG, id);

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
const AIM: Stance = { ...STAND, armFront: 'aim', armBack: 'back' };
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

/** Jump in an arc: fast up (sine.out), plunge down (expo.in), x runs on its own keys. */
function hop(t: Tracks, at: number, apexY: number, upMs: number, downMs: number): void {
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
// The ghost
// ---------------------------------------------------------------------------------------------------

/** Named poses of the ghost (brief H-48 16a, board table of the mockup). */
type GhostPose = 'rest' | 'wail' | 'stretch' | 'dissolve1' | 'dissolve2';

interface GhostLook {
  body: string;
  face: string;
  arms: string;
  antennas: string;
  tail: string;
}

const STRETCHED: Omit<GhostLook, 'body'> = {
  face: 'wail',
  arms: 'rest',
  antennas: 'swept',
  tail: 'stretch',
};
const LOOK: Readonly<Record<GhostPose, GhostLook>> = {
  rest: { body: 'rest', face: 'rest', arms: 'rest', antennas: 'rest', tail: 'rest' },
  wail: { body: 'rest', face: 'wail', arms: 'reach', antennas: 'swept', tail: 'flow' },
  stretch: { body: 'stretch', ...STRETCHED },
  dissolve1: { body: 'dissolve1', ...STRETCHED },
  dissolve2: { body: 'dissolve2', ...STRETCHED },
};
const STRETCH_OFFSET = FOREST_GHOST_ANCHORS.stretch as Readonly<Record<string, readonly number[]>>;
const MOVED_BY_STRETCH = [
  'tail-wisp',
  'antenna-right',
  'antenna-left',
  'arm-right',
  'arm-left',
  'face',
];

/** Writes a ghost pose at `at`: part poses and, for the stretched body, the offsets of the children. */
function ghost(t: Tracks, at: number, pose: GhostPose): void {
  const look = LOOK[pose];
  const w = 'forestGhost';
  t.key(`${w}.body`, 'pose', at, look.body);
  t.key(`${w}.face`, 'pose', at, look.face);
  t.key(`${w}.arm-left`, 'pose', at, look.arms);
  t.key(`${w}.arm-right`, 'pose', at, look.arms);
  t.key(`${w}.antenna-left`, 'pose', at, look.antennas);
  t.key(`${w}.antenna-right`, 'pose', at, look.antennas);
  t.key(`${w}.tail-wisp`, 'pose', at, look.tail);
  const stretched = look.body !== 'rest';
  for (const id of MOVED_BY_STRETCH) {
    const base = G(id);
    const off = stretched ? (STRETCH_OFFSET[id] ?? [0, 0]) : [0, 0];
    t.key(`${w}.${id}`, 'x', at, base.x + off[0]);
    t.key(`${w}.${id}`, 'y', at, base.y + off[1]);
  }
}

/** Dissolve into moonlight: arms and face go first, the whole figure then fades in 3 steps (no soft ramp). */
function dissolve(
  t: Tracks,
  d: { dissolve1: number; dissolve2: number; fadeFrom: number; fadeTo: number },
): void {
  ghost(t, d.dissolve1, 'dissolve1');
  ghost(t, d.dissolve2, 'dissolve2');
  for (const id of ['arm-left', 'arm-right', 'face'])
    t.key(`forestGhost.${id}`, 'alpha', d.dissolve2, 0);
  t.key('forestGhost', 'alpha', d.dissolve2, 0.55);
  t.key('forestGhost', 'alpha', d.fadeFrom, 0.55, 'stepped', 3);
  t.key('forestGhost', 'alpha', d.fadeTo, 0);
}

// ---------------------------------------------------------------------------------------------------
// Fight moment "Erlkönigs Töchter" (brief H-48 part 2b, boards G1 to G9)
// ---------------------------------------------------------------------------------------------------

function buildMoment(): ChoreoDef {
  const STOP = 150;
  const AFTER_STOP = 1000 + STOP;
  const { c, slowChoreo } = clockOf(1000, STOP, 1250, SLOW);
  const t = new Tracks();
  const AX = MOMENT_X.astronaut;
  const BX = MOMENT_X.boss;
  const AX2 = AX + STEP_FORWARD;

  // Astronaut: aims (G2), steps forward (G3), stands still with a dark visor (G4), turns round and shoots
  // behind her (G5, G6), watches the ghost dissolve (G7, G8), turns back (G9).
  stance(t, 0, STAND);
  arc(t, 0, 'off');
  t.key('astronaut', 'x', 0, AX);
  t.key('astronaut', 'y', 0, GROUND);
  t.key('astronaut', 'scaleX', 0, 1);
  stance(t, 150, AIM);
  t.key('astronaut', 'x', 300, AX, 'sine.inOut');
  t.key('astronaut', 'x', 600, AX2);
  stance(t, 800, { ...STAND, helmet: 'dark' });
  stance(t, 900, { ...AIM, helmet: 'dark' });
  t.key('astronaut', 'scaleX', 900, -1);
  stance(t, c(2400), STAND);
  t.key('astronaut', 'x', c(2900), AX2, 'sine.inOut');
  t.key('astronaut', 'x', c(3200), AX + 20);
  t.key('astronaut', 'scaleX', c(2900), 1);

  // Ghost: divides (G2), slips behind her through her (G3), wails (G4 to G6), stretches and dissolves.
  ghost(t, 0, 'rest');
  t.key('forestGhost', 'x', 0, BX);
  t.key('forestGhost', 'x', 300, BX, 'sine.inOut');
  t.key('forestGhost', 'x', 600, GHOST_BEHIND_X);
  t.key('forestGhost', 'alpha', 0, 1);
  t.key('forestGhost', 'alpha', 300, 1, 'sine.inOut');
  t.key('forestGhost', 'alpha', 450, 0.35, 'sine.inOut');
  t.key('forestGhost', 'alpha', 600, 0.9);
  t.key('forestGhost', 'alpha', 800, 1);
  ghost(t, 150, 'wail');
  ghost(t, 600, 'rest');
  ghost(t, 800, 'wail');
  ghost(t, c(AFTER_STOP), 'stretch');
  dissolve(t, {
    dissolve1: c(1500),
    dissolve2: c(2400),
    fadeFrom: c(2800),
    fadeTo: c(3200),
  });

  const events: ChoreoEvent[] = [
    // Boss anticipation: two decoys glide out of the ghost and circle her; they stay until the shot.
    { kind: 'fx', atMs: 150, durationMs: 850, name: 'decoy-moment-1', flash: false },
    { kind: 'fx', atMs: 150, durationMs: 850, name: 'decoy-moment-2', flash: false },
    trail(900, 100),
    // The shot behind her (board G5).
    { kind: 'fx', atMs: 940, durationMs: 60, name: 'shot-beam', flash: false },
    { kind: 'sound', atMs: 1000, key: HIT_SOUND_KEY, flash: false },
    {
      kind: 'hitStop',
      atMs: 1000,
      ms: STOP,
      axis: 'x',
      targets: ['forestGhost'],
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
      targets: ['forestGhost'],
      flash: true,
    },
    // Speedline ring (AP-194, H-50): with the boss white, same atMs; no flash, gone with "reduce effects".
    {
      kind: 'fx',
      atMs: 1000,
      durationMs: HIT_RING,
      name: 'hit-ring',
      flash: false,
      reduce: 'drop',
    },
    { kind: 'shake', atMs: 1000, durationMs: 200, strength: 0.5, flash: false },
    // The decoys burst into splinters and mist (board G6).
    {
      kind: 'particles',
      atMs: 1000,
      texture: 'rig-fx-ghost-3',
      count: 12,
      at: DECOY_BURST_MOMENT[0],
      flash: false,
    },
    {
      kind: 'particles',
      atMs: 1000,
      texture: 'rig-fx-ghost-2',
      count: 10,
      at: DECOY_BURST_MOMENT[1],
      flash: false,
    },
    // The ghost flows into moonlight (boards G7, G8).
    {
      kind: 'fx',
      atMs: c(AFTER_STOP),
      durationMs: 2000,
      name: 'moonlight',
      flash: false,
    },
    { kind: 'text', atMs: c(3000), text: 'BEZWUNGEN!', color: 'finisher.title', flash: false },
  ];

  // Beats in choreography time; the grid test reads them (RS-06.2). The board times are real time.
  const beats: ChoreoBeat[] = [
    { phase: 'anticipation', atMs: 0, durationMs: 600 },
    { phase: 'anticipation', atMs: 600, durationMs: 300 },
    { phase: 'action', atMs: 900, durationMs: 100 },
    { phase: 'hitStop', atMs: 1000, durationMs: STOP, final: true },
    { phase: 'reaction', atMs: 1000, durationMs: slowChoreo, final: true },
    { phase: 'followThrough', atMs: c(2400), durationMs: c(3500) - c(2400), final: true },
  ];

  return {
    variantId: 'moment-forestGhost',
    actors: [
      { rigId: 'astronaut', x: AX, y: GROUND },
      { rigId: 'forestGhost', x: BX, y: GROUND },
    ],
    durationMs: c(3500),
    tracks: t.list(),
    events,
    beats,
  };
}

// ---------------------------------------------------------------------------------------------------
// Cinematic level 9 "MONDSCHNITT" (brief H-48 part 2b, boards 1a to 5c)
// ---------------------------------------------------------------------------------------------------

/** Camera centre (stage px) to scroll values of a 640 x 360 stage (scroll 0 = stage centred). */
const scrollOf = (cx: number, cy: number) => ({ scrollX: cx - 320, scrollY: cy - 180 });

function buildCinematic(): ChoreoDef {
  const { c, slowChoreo } = clockOf(9600, 200, 2200, SLOW);
  const t = new Tracks();
  const AC = CINE_X.astronaut;
  const BC = CINE_X.boss;

  // Shot 1 (0 to 3000): zoom 1, the camera travels from the right to the middle in about 2.5 s (sine.inOut).
  const start = scrollOf(440, 180);
  t.key('camera', 'scrollX', 0, start.scrollX, 'sine.inOut');
  t.key('camera', 'scrollX', 2500, 0);
  // Shot 3 (6000 to 9000): zoom 2 on the astronaut while the blade grows, back to zoom 1 for the name.
  const onHer = scrollOf(190, 230);
  t.key('camera', 'zoom', 7000, 2);
  t.key('camera', 'zoom', 8200, 1);
  t.key('camera', 'scrollX', 7000, onHer.scrollX);
  t.key('camera', 'scrollX', 8200, 0);
  t.key('camera', 'scrollY', 7000, onHer.scrollY);
  t.key('camera', 'scrollY', 8200, 0);

  // Astronaut. E1: not yet in the picture (fog, eyes only), she walks in with the cut to the long shot.
  stance(t, 0, STAND);
  arc(t, 0, 'off');
  t.key('astronaut', 'x', 0, AC);
  t.key('astronaut', 'y', 0, GROUND);
  t.key('astronaut', 'alpha', 0, 0);
  t.key('astronaut', 'alpha', 2600, 1);
  // E2 (3000 to 6000): blow 1 through a decoy (smear, arc2 only), blow 2 through the second one (guard).
  stance(t, 3150, CROUCH);
  stance(t, 3250, LEAP);
  t.key('astronaut', 'x', 3250, AC, 'linear');
  t.key('astronaut', 'x', 3400, 270, 'sine.out');
  t.key('astronaut', 'x', 3550, 250);
  hop(t, 3250, 250, 150, 150);
  stance(t, 3400, SMEARED);
  arc(t, 3400, 'arc2', -30);
  stance(t, 3400 + SMEAR, LEAP);
  arc(t, 3400 + SMEAR_ARC, 'off');
  stance(t, 3550, CROUCH);
  t.key('astronaut', 'x', 3550, 250, 'sine.inOut');
  t.key('astronaut', 'x', 3900, 300);
  bladeSteps(t, 3900, CROUCH, 1);
  stance(t, 4200, GUARD);
  t.key('astronaut', 'x', 4200, 320);
  t.key('astronaut.blade', 'angle', 4200, -14);
  // Back to the left in a jump (board 2c), afterimages.
  stance(t, 5300, LEAP);
  t.key('astronaut', 'x', 5300, 320, 'linear');
  t.key('astronaut', 'x', 5600, 230);
  hop(t, 5300, 240, 150, 150);
  stance(t, 5600, CROUCH);
  t.key('astronaut', 'x', 5700, 230, 'sine.inOut');
  t.key('astronaut', 'x', 6000, AC);
  // E3 (6000 to 9000): charge. Dark visor, the blade grows in 3 steps, then the name.
  stance(t, 6000, CROUCH);
  stance(t, 7000, { ...CROUCH, helmet: 'dark' });
  bladeSteps(t, 7100, { ...CROUCH, helmet: 'dark' }, 1);
  // E4 (9000 to 12000): jump to chest height, horizontal moon-sickle cut, kneeling landing.
  stance(t, 9000, { ...LEAP, helmet: 'dark', blade: 'full' });
  t.key('astronaut', 'x', 9000, AC, 'linear');
  t.key('astronaut', 'x', 9300, 320, 'linear');
  t.key('astronaut', 'x', 9500, 350, 'linear');
  t.key('astronaut', 'x', 9600, 380);
  t.key('astronaut', 'y', 9000, GROUND, 'sine.out');
  t.key('astronaut', 'y', 9300, 214, 'linear');
  t.key('astronaut', 'y', 9500, 216, 'expo.in');
  t.key('astronaut', 'y', 9600, GROUND);
  stance(t, 9200, { ...RAISE, pack: 'thrust' });
  t.key('astronaut.arm-front', 'angle', 9200, -10);
  stance(t, 9500, SMEARED);
  arc(t, 9500, 'arc1', 75);
  t.key('astronaut.arm-front', 'angle', 9500, 0);
  stance(t, 9500 + SMEAR, { ...RAISE, armFront: 'slash-end' });
  t.key('astronaut.blade-arc', 'angle', 9500 + SMEAR, 75);
  arc(t, 9500 + SMEAR_ARC, 'arc2', 75);
  arc(t, 9500 + 2 * SMEAR_ARC, 'off');
  stance(t, 9600, CUT);
  t.key('astronaut.blade-arc', 'angle', 9600, 75);
  t.key('astronaut', 'x', c(12800), 380, 'linear');
  t.key('astronaut', 'x', c(13400), 360);
  t.key('astronaut', 'x', c(13900), 360, 'linear');
  t.key('astronaut', 'x', c(14300), 340);
  // E5: she stands up, lowers the blade (3 steps), the title follows.
  stance(t, c(13000), { ...STAND, armFront: 'aim', blade: 'full' });
  bladeSteps(t, c(14150), { ...STAND, armFront: 'aim' }, -1);
  t.key('astronaut.arm-front', 'angle', c(14200), 14);

  // Ghost, 4x. E1: only the eyes in the fog, then half out of it, then whole (1a to 1c).
  ghost(t, 0, 'rest');
  t.key('forestGhost', 'x', 0, BC);
  for (const id of [
    'tail-wisp',
    'antenna-left',
    'antenna-right',
    'arm-left',
    'arm-right',
    'body',
  ]) {
    t.key(`forestGhost.${id}`, 'alpha', 0, id === 'body' ? 0.12 : 0.1);
    t.key(`forestGhost.${id}`, 'alpha', 1000, id === 'body' ? 0.12 : 0.1, 'stepped', 3);
    t.key(`forestGhost.${id}`, 'alpha', 1500, 1);
  }
  t.key('forestGhost', 'alpha', 0, 1);
  t.key('forestGhost', 'alpha', 1500, 0.6, 'stepped', 2);
  t.key('forestGhost', 'alpha', 2600, 1);
  // E2: he laughs behind the decoys and steps back (2c).
  ghost(t, 3300, 'wail');
  t.key('forestGhost', 'x', 3300, BC, 'sine.out');
  t.key('forestGhost', 'x', 3400, BC + 20);
  t.key('forestGhost', 'x', 5300, BC + 20, 'sine.inOut');
  t.key('forestGhost', 'x', 5500, BC + 30);
  t.key('forestGhost', 'alpha', 5300, 1, 'sine.inOut');
  t.key('forestGhost', 'alpha', 5500, 0.8);
  t.key('forestGhost', 'alpha', 5900, 0.8, 'sine.inOut');
  t.key('forestGhost', 'alpha', 6300, 1);
  ghost(t, 5400, 'rest');
  t.key('forestGhost', 'x', 5900, BC + 30, 'sine.inOut');
  t.key('forestGhost', 'x', 6300, BC);
  // E3 and E4: he wails at the name and takes the cut.
  ghost(t, 8300, 'wail');
  // E5: stretches, dissolves into light points, nothing is left.
  ghost(t, c(12000), 'stretch');
  dissolve(t, {
    dissolve1: c(12200),
    dissolve2: c(12400),
    fadeFrom: c(13000),
    fadeTo: c(13400),
  });

  const events: ChoreoEvent[] = [
    // E2: the decoys of the blows
    { kind: 'fx', atMs: 3000, durationMs: 400, name: 'decoy-cine-1', flash: false },
    trail(3250, 300),
    {
      kind: 'particles',
      atMs: 3400,
      texture: 'rig-fx-ghost-3',
      count: 14,
      at: { x: 330, y: 210 },
      flash: false,
    },
    {
      kind: 'particles',
      atMs: 3400,
      texture: 'rig-fx-ghost-2',
      count: 10,
      at: { x: 330, y: 210 },
      flash: false,
    },
    { kind: 'fx', atMs: 3900, durationMs: 400, name: 'decoy-cine-2', flash: false },
    {
      kind: 'particles',
      atMs: 4300,
      texture: 'rig-fx-ghost-3',
      count: 6,
      at: { x: 372, y: 236 },
      flash: false,
    },
    trail(5300, 300),
    // E3
    { kind: 'fx', atMs: 6000, durationMs: 1000, name: 'portrait', flash: false },
    {
      kind: 'particles',
      atMs: 7300,
      durationMs: 600,
      texture: 'rig-fx-ghost-0',
      count: 4,
      at: { x: AC + 70, y: GROUND - 52 },
      flash: false,
    },
    {
      kind: 'particles',
      atMs: 7300,
      durationMs: 600,
      texture: 'rig-fx-ghost-1',
      count: 4,
      at: { x: AC + 70, y: GROUND - 52 },
      flash: false,
    },
    {
      kind: 'text',
      atMs: 8200,
      durationMs: 800,
      text: 'MONDSCHNITT',
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
      targets: ['forestGhost'],
      strength: 1,
      flash: false,
    },
    { kind: 'timeScale', atMs: 9600, durationMs: slowChoreo, factor: SLOW, flash: false },
    { kind: 'fx', atMs: 9600, durationMs: 200, name: 'impact-pair', flash: true },
    {
      kind: 'hitWhite',
      atMs: 9600,
      durationMs: 200,
      targets: ['forestGhost', 'astronaut'],
      flash: false,
    },
    { kind: 'shake', atMs: c(9800), durationMs: 300, strength: 0.6, flash: false },
    // The cut line and the picture shifted along it stay with "reduce effects" (movement, no flash).
    { kind: 'fx', atMs: 9600, durationMs: 2400, name: 'cut-line', flash: false },
    { kind: 'fx', atMs: 9600, durationMs: 2400, name: 'cut-split', flash: false },
    {
      kind: 'particles',
      atMs: c(9800),
      texture: 'rig-fx-ghost-0',
      count: 5,
      at: { x: BC, y: CUT_Y },
      flash: false,
    },
    {
      kind: 'particles',
      atMs: c(9800),
      texture: 'rig-fx-ghost-1',
      count: 5,
      at: { x: BC, y: CUT_Y },
      flash: false,
    },
    {
      kind: 'particles',
      atMs: c(9800),
      texture: 'rig-fx-ghost-2',
      count: 4,
      at: { x: BC, y: CUT_Y },
      flash: false,
    },
    // E5
    { kind: 'fx', atMs: c(12000), durationMs: 2400, name: 'moonlight', flash: false },
    { kind: 'fx', atMs: c(13000), durationMs: 1400, name: 'lights', flash: false },
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
    { atMs: 0, camera: { scrollX: start.scrollX, scrollY: 0, zoom: 1 } },
    { atMs: 3000, camera: long },
    { atMs: 6000, camera: long },
    { atMs: 9000, camera: long },
    { atMs: c(12000), camera: long },
  ];

  return {
    variantId: 'cinematic-9',
    actors: [
      { rigId: 'astronaut', x: AC, y: GROUND },
      { rigId: 'forestGhost', x: BC, y: GROUND },
    ],
    durationMs: c(15000),
    shots,
    tracks: t.list(),
    events,
    beats,
  };
}

export const MOMENT_FOREST_GHOST: ChoreoDef = buildMoment();
export const CINEMATIC_9: ChoreoDef = buildCinematic();

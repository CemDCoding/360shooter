// Choreographies of the giant stone (M13, AP-187, brief H-48 part 2b): data rules, storyboard times, the effects of
// the boss and a run through the real choreography player on a fake scene (no Phaser at run time).
import type Phaser from 'phaser';
import { describe, expect, it } from 'vitest';
import type {
  ChoreoDef,
  ChoreoEvent,
  ChoreoTrack,
  FinisherStartData,
  RigDef,
  SafeInsets,
} from '../../../src/contracts';
import {
  CINE_FIST_STAND,
  CINE_STRIKE,
  CINEMATIC_20,
  MOMENT_GIANT_STONE,
  MOMENT_SHOOT_X,
} from '../../../src/config/choreo/giantStone';
import { CHOREOS } from '../../../src/config/choreo';
import { CHOREO_RULES } from '../../../src/config/finishers';
import { ASTRONAUT_ANCHORS, ASTRONAUT_RIG } from '../../../src/config/rigs/astronaut';
import { GIANT_STONE_RIG } from '../../../src/config/rigs/giantStone';
import { RIGS } from '../../../src/config/rigs';
import { THEME } from '../../../src/config/theme';
import {
  countFlashes,
  prepareChoreo,
  realDurationMs,
  reduceChoreo,
  sampleTrack,
  validateChoreo,
} from '../../../src/logic/choreo';
import { buildFinisher } from '../../../src/logic/finisher';
import { ChoreoPlayer } from '../../../src/scenes/finisher/choreoPlayer';
import type { ChoreoContext } from '../../../src/scenes/finisher/context';
import {
  BOSS_FX,
  BOSS_REF_H,
  HIT_RING_MS,
  ringRadius,
  type FxApi,
  type FxEvent,
} from '../../../src/scenes/finisher/fx';
import {
  GATHER,
  GIANT_STONE_FX,
  LIGHT_STAGES,
  PORTRAIT_FRAME,
  SHADOW,
  SKY,
  skyMuzzle,
} from '../../../src/scenes/finisher/fx/giantStone';
import { ROOT_MONSTER_FX } from '../../../src/scenes/finisher/fx/rootMonster';
import { finisherLayout } from '../../../src/scenes/finisher/layout';
import {
  inkFrame,
  isSmearPose,
  silhouetteFrame,
  smearMsOf,
} from '../../../src/scenes/finisher/rig';
import { debugFinisherData } from '../../../src/scenes/finisher/startData';
import { TextureBank } from '../../../src/scenes/finisher/textures';
import { SOUND_HIT } from '../../../src/scenes/finisher/timing';

const GROUND = THEME.sizePx['size.rig-ground'];
const SMEAR_ARC = THEME.motionMs['motion.rig-smear-arc'];
const MOMENT = MOMENT_GIANT_STONE;
const CINE = CINEMATIC_20;
const BOTH: readonly ChoreoDef[] = [MOMENT, CINE];
const CHUNKS = ['chunk-1', 'chunk-2', 'chunk-3', 'chunk-4'];

/** Real time (ms) at which the choreography clock reaches `choreoMs`. */
function realAt(def: ChoreoDef, choreoMs: number): number {
  for (const s of prepareChoreo(def).segments) {
    if (s.stop && s.choreoStart === choreoMs) return s.realStart;
    if (!s.stop && choreoMs >= s.choreoStart && choreoMs < s.choreoEnd) {
      return (
        s.realStart +
        ((choreoMs - s.choreoStart) / (s.choreoEnd - s.choreoStart)) * (s.realEnd - s.realStart)
      );
    }
  }
  return realDurationMs(def);
}

const track = (def: ChoreoDef, target: string, property: ChoreoTrack['property']): ChoreoTrack => {
  const t = def.tracks.find((x) => x.target === target && x.property === property);
  if (!t) throw new Error(`no track ${target}.${property}`);
  return t;
};

const events = <K extends ChoreoEvent['kind']>(def: ChoreoDef, kind: K) =>
  def.events.filter((e): e is Extract<ChoreoEvent, { kind: K }> => e.kind === kind);

const fxNamed = (def: ChoreoDef, name: string) => events(def, 'fx').filter((e) => e.name === name);

describe('rules of the choreographies (validateChoreo)', () => {
  it.each(BOTH.map((d) => [d.variantId, d] as const))('%s breaks no rule', (_id, def) => {
    expect(validateChoreo(def, RIGS)).toEqual([]);
    expect(validateChoreo(def, RIGS, CHOREO_RULES)).toEqual([]);
  });

  it.each(BOTH.map((d) => [d.variantId, d] as const))('%s reduced breaks no rule', (_id, def) => {
    const reduced = reduceChoreo(def);
    expect(reduced.events.length).toBeLessThan(def.events.length);
    expect(validateChoreo(reduced, RIGS)).toEqual([]);
  });

  it('plays the real lengths of the brief: moment 3.5 s, cinematic 15 s, in both modes', () => {
    expect(realDurationMs(MOMENT)).toBe(3500);
    expect(realDurationMs(CINE)).toBe(15000);
    expect(realDurationMs(reduceChoreo(MOMENT))).toBe(3500);
    expect(realDurationMs(reduceChoreo(CINE))).toBe(15000);
  });

  it('has exactly one flash: the main hit (moment: boss white, cinematic: impact pair)', () => {
    expect(MOMENT.events.filter((e) => e.flash)).toHaveLength(1);
    expect(CINE.events.filter((e) => e.flash)).toHaveLength(1);
    expect(countFlashes(MOMENT)).toBe(1);
    expect(countFlashes(CINE)).toBe(1);
    expect(events(MOMENT, 'flash')).toHaveLength(0);
    expect(events(CINE, 'flash')).toHaveLength(0);
    expect(events(CINE, 'impact')).toHaveLength(0);
  });

  it('removes flash, boss white, shake, ring and impact pair when reduced, keeps the hit stop', () => {
    for (const def of BOTH) {
      const reduced = reduceChoreo(def);
      expect(reduced.events.some((e) => e.flash)).toBe(false);
      expect(events(reduced, 'hitWhite')).toHaveLength(0);
      expect(events(reduced, 'shake')).toHaveLength(0);
      expect(fxNamed(reduced, 'hit-ring')).toHaveLength(0);
      expect(fxNamed(reduced, 'impact-pair')).toHaveLength(0);
      expect(events(reduced, 'hitStop')).toHaveLength(1);
      expect(events(reduced, 'timeScale')).toHaveLength(1);
    }
    // Light, sky shot, cracks and chunks stay (brief: "Lichtstrahl, Risse und Brocken bleiben").
    expect(fxNamed(reduceChoreo(MOMENT), 'morning-light')).toHaveLength(1);
    expect(fxNamed(reduceChoreo(MOMENT), 'sky-shot')).toHaveLength(1);
    expect(reduceChoreo(MOMENT).tracks).toEqual(MOMENT.tracks);
  });

  it('uses the placeholder sound only on the main hit (PE-237)', () => {
    for (const def of BOTH) {
      const sounds = events(def, 'sound');
      expect(sounds.map((s) => s.key)).toEqual([SOUND_HIT]);
      expect(sounds[0].atMs).toBe(events(def, 'hitStop')[0].atMs);
    }
  });

  it('keeps the figures inside the 3 to 4 s and 14.5 to 15.5 s grid of the rules', () => {
    expect(realDurationMs(MOMENT)).toBeGreaterThanOrEqual(CHOREO_RULES.momentRealMs.minMs);
    expect(realDurationMs(MOMENT)).toBeLessThanOrEqual(CHOREO_RULES.momentRealMs.maxMs);
    expect(CINE.shots).toHaveLength(CHOREO_RULES.cinematicShots);
  });
});

describe('fight moment "Morgenlicht" (boards S1 to S8)', () => {
  const hit = events(MOMENT, 'hitStop')[0];

  it('stands the actors on the ground line at x = 170 and 470 (tokens)', () => {
    expect(MOMENT.actors).toEqual([
      { rigId: 'astronaut', x: 170, y: GROUND },
      { rigId: 'giantStone', x: 470, y: GROUND },
    ]);
  });

  it('has a long boss anticipation (800 ms in two beats), a punch of 120 ms and the final hit at 1300 ms', () => {
    const antic = MOMENT.beats.filter((b) => b.phase === 'anticipation');
    expect(antic[0].atMs).toBe(0);
    expect(antic[0].durationMs + antic[1].durationMs).toBe(800);
    expect(antic[1].atMs).toBe(antic[0].durationMs);
    const action = MOMENT.beats.find((b) => b.phase === 'action');
    expect(action).toMatchObject({ atMs: 800, durationMs: 120 });
    expect(hit).toMatchObject({ atMs: 1300, ms: 200, targets: ['giantStone'] });
    expect(MOMENT.beats.find((b) => b.phase === 'hitStop')).toMatchObject({
      atMs: 1300,
      final: true,
    });
  });

  it('has the slow motion 0.3 for 1300 ms real time and the title at 3200 ms', () => {
    const slow = events(MOMENT, 'timeScale')[0];
    expect(slow.factor).toBe(0.3);
    expect(
      realAt(MOMENT, slow.atMs + (slow.durationMs ?? 0)) - realAt(MOMENT, slow.atMs) - hit.ms,
    ).toBe(1300);
    const title = events(MOMENT, 'text')[0];
    expect(title).toMatchObject({ text: 'BEZWUNGEN!', color: 'finisher.title' });
    expect(realAt(MOMENT, title.atMs)).toBe(3200);
  });

  it('makes the main hit only boss white 100 ms plus the shared ring at the same atMs (13a, AP-194)', () => {
    const white = events(MOMENT, 'hitWhite')[0];
    expect(white).toMatchObject({
      atMs: 1300,
      durationMs: THEME.motionMs['motion.rig-hit-white'],
      targets: ['giantStone'],
      flash: true,
    });
    expect(white.durationMs).toBe(100);
    const ring = fxNamed(MOMENT, 'hit-ring');
    expect(ring).toHaveLength(1);
    expect(ring[0]).toMatchObject({
      atMs: white.atMs,
      durationMs: HIT_RING_MS,
      flash: false,
      reduce: 'drop',
    });
    expect(HIT_RING_MS).toBe(99);
  });

  it('has the ring only in the moment, not in the cinematic (there the impact pair owns the hit)', () => {
    expect(fxNamed(CINE, 'hit-ring')).toHaveLength(0);
  });

  it('keeps the astronaut clear of the ring (Q-96): she stands left of it at the main hit', () => {
    const x = sampleTrack(track(MOMENT, 'astronaut', 'x'), hit.atMs);
    expect(x).toBe(MOMENT_SHOOT_X);
    // Ring: centre boss x, largest radius = inner radius + two steps outwards + longest ray.
    const P = THEME.sizePx;
    const outer =
      ringRadius(BOSS_REF_H, THEME.sizeCount['size.rig-scale-boss-moment']) +
      (THEME.sizeCount['size.rig-hit-ring-steps'] - 1) * P['size.rig-hit-ring-step-out'] +
      P['size.rig-hit-ring-ray-max'];
    const ringLeft = 470 - outer;
    const reach = skyMuzzle().dx + 2 * THEME.sizePx['size.rig-hit-ring-dot-out'];
    expect(Number(x) + reach).toBeLessThan(ringLeft);
  });

  it('lets the light fall in the sky-shot direction: shot ends before the hit, light starts with it', () => {
    const shot = fxNamed(MOMENT, 'sky-shot')[0];
    expect(shot.atMs + (shot.durationMs ?? 0)).toBe(hit.atMs);
    const light = fxNamed(MOMENT, 'morning-light')[0];
    expect(light.atMs).toBe(hit.atMs);
    // Ends with the slow motion: real 1300 + 1500 = 2800 ms.
    expect(light.atMs + (light.durationMs ?? 0)).toBe(2800);
  });

  it('freezes after the hit stop, lets the cracks glow one by one, then breaks into four chunks', () => {
    const body = track(MOMENT, 'giantStone.body', 'pose').keys;
    expect(body.map((k) => k.value)).toEqual(['rest', 'cracked1', 'cracked2', 'cracked3']);
    expect(body[1].atMs).toBe(hit.atMs + 1);
    expect(body[2].atMs).toBeLessThan(body[3].atMs);
    expect(track(MOMENT, 'giantStone.face', 'pose').keys.map((k) => k.value)).toEqual([
      'rest',
      'strain',
      'frozen',
    ]);
    expect(sampleTrack(track(MOMENT, 'giantStone.crystals', 'pose'), hit.atMs + 1)).toBe('lit');
    expect(sampleTrack(track(MOMENT, 'giantStone.fist-left', 'pose'), hit.atMs + 1)).toBe('frozen');
    expect(sampleTrack(track(MOMENT, 'giantStone.fist-right', 'pose'), hit.atMs + 1)).toBe(
      'frozen',
    );
    const breakAt = track(MOMENT, 'giantStone.chunk-1', 'alpha').keys.find((k) => k.value === 1);
    expect(breakAt && breakAt.atMs).toBeGreaterThan(body[3].atMs);
    // The upper chunks fall first, the lower ones follow later.
    const startOf = (id: string) =>
      track(MOMENT, `giantStone.${id}`, 'y').keys.find((k) => k.ease === 'expo.in')?.atMs ?? -1;
    expect(startOf('chunk-1')).toBe(breakAt?.atMs);
    expect(startOf('chunk-4')).toBe(breakAt?.atMs);
    expect(startOf('chunk-2')).toBeGreaterThan(startOf('chunk-1'));
    expect(startOf('chunk-3')).toBeGreaterThan(startOf('chunk-1'));
  });

  it('shoots into the sky with the raygun pose up45 and the arm raised by the fine range', () => {
    expect(sampleTrack(track(MOMENT, 'astronaut.raygun', 'pose'), 1100)).toBe('up45');
    expect(sampleTrack(track(MOMENT, 'astronaut.arm-front', 'angle'), 1100)).toBe(-20);
    expect(sampleTrack(track(MOMENT, 'astronaut.raygun', 'pose'), 2200)).toBe('a0');
    expect(skyMuzzle().angle).toBe(ASTRONAUT_ANCHORS.gunAngles.up45 - 20);
  });
});

describe('cinematic level 20 "STERNENHAMMER" (boards 1a to 5c)', () => {
  it('has 5 shots of 3000 ms real time, no axis flip', () => {
    expect(CINE.shots).toHaveLength(5);
    expect(CINE.shots?.map((s) => realAt(CINE, s.atMs))).toEqual([0, 3000, 6000, 9000, 12000]);
    expect(CINE.shots?.some((s) => s.axisFlip)).toBe(false);
  });

  it('keeps the astronaut left and the boss right at x = 160 and 480', () => {
    expect(CINE.actors).toEqual([
      { rigId: 'astronaut', x: 160, y: GROUND },
      { rigId: 'giantStone', x: 480, y: GROUND },
    ]);
    for (const a of CINE.actors) expect(a.flipX).toBeUndefined();
  });

  it('zooms in whole steps only: shot 1 on 2, shot 3 from 1 to 2 and back, shot 4 stays on 1', () => {
    const zoom = track(CINE, 'camera', 'zoom');
    expect(zoom.keys.every((k) => Number.isInteger(k.value) && k.ease === 'hold')).toBe(true);
    expect(zoom.keys.map((k) => [k.atMs, k.value])).toEqual([
      [0, 2],
      [2600, 1],
      [7000, 2],
      [8200, 1],
    ]);
    expect(CINE.shots?.[0].camera.zoom).toBe(2);
    expect(CINE.shots?.slice(1).every((s) => s.camera.zoom === 1)).toBe(true);
    const climb = track(CINE, 'camera', 'scrollY').keys;
    expect(climb[0]).toMatchObject({ atMs: 0, ease: 'sine.inOut' });
    expect(climb[1].atMs).toBe(2500);
  });

  it('shows the shadow in shot 1, the portrait strip and the star gathering in shot 3, the name before the cut', () => {
    expect(fxNamed(CINE, 'shadow')[0]).toMatchObject({ atMs: 2600 });
    expect(fxNamed(CINE, 'portrait')[0]).toMatchObject({ atMs: 6000, durationMs: 1000 });
    expect(fxNamed(CINE, 'star-gather')[0].atMs).toBe(7000);
    const name = events(CINE, 'text').find((e) => e.color === 'finisher.name');
    expect(name).toMatchObject({ text: 'STERNENHAMMER', atMs: 8200, durationMs: 800 });
    const title = events(CINE, 'text').find((e) => e.color === 'finisher.title');
    expect(title?.text).toBe('BEZWUNGEN!');
    expect(realAt(CINE, title?.atMs ?? 0)).toBe(14000);
    expect(fxNamed(CINE, 'sky-stars')).toHaveLength(1);
  });

  it('has the one impact pair (light 100 / dark 100) with boss white at the same atMs and slow motion 0.3 for 2200 ms', () => {
    const pair = fxNamed(CINE, 'impact-pair');
    expect(pair).toHaveLength(1);
    expect(pair[0]).toMatchObject({ atMs: 9600, durationMs: 200, flash: true });
    expect(events(CINE, 'hitWhite').some((w) => w.atMs === pair[0].atMs)).toBe(true);
    const stop = events(CINE, 'hitStop')[0];
    expect(stop).toMatchObject({ atMs: 9600, ms: 200 });
    const slow = events(CINE, 'timeScale')[0];
    expect(slow.factor).toBe(0.3);
    expect(realAt(CINE, slow.atMs + (slow.durationMs ?? 0)) - realAt(CINE, slow.atMs) - 200).toBe(
      2200,
    );
  });

  it('stands on the fist (board 2b) and hangs over his head at the strike (board 4c)', () => {
    expect(sampleTrack(track(CINE, 'astronaut', 'x'), 4300)).toBe(CINE_FIST_STAND.x);
    expect(sampleTrack(track(CINE, 'astronaut', 'y'), 4300)).toBe(CINE_FIST_STAND.y);
    // The fist-left (rig px, 4x) reaches that spot: boss x + 4 * x, ground + 4 * y.
    const fx = sampleTrack(track(CINE, 'giantStone.fist-left', 'x'), 4300);
    const fy = sampleTrack(track(CINE, 'giantStone.fist-left', 'y'), 4300);
    expect(480 + 4 * Number(fx)).toBe(CINE_FIST_STAND.x);
    expect(GROUND + 4 * Number(fy)).toBeGreaterThan(CINE_FIST_STAND.y);
    expect(sampleTrack(track(CINE, 'astronaut', 'x'), 9600)).toBe(CINE_STRIKE.x);
    expect(sampleTrack(track(CINE, 'astronaut', 'y'), 9600)).toBe(CINE_STRIKE.y);
  });

  it('draws the hammer by alpha: half while the stars gather, full at the name, gone after the landing', () => {
    const alpha = track(CINE, 'astronaut.blade-arc', 'alpha');
    const pose = track(CINE, 'astronaut.blade-arc', 'pose');
    expect(pose.keys[0].value).toBe('none');
    expect(sampleTrack(alpha, 7500)).toBe(0.5);
    expect(sampleTrack(alpha, 9000)).toBe(1);
    expect(sampleTrack(pose, 9000)).toBe('hammer');
    expect(sampleTrack(alpha, realAt(CINE, 0) + 14000 + 5000)).toBe(0);
    // The blade stays hidden in the whole cinematic.
    expect(track(CINE, 'astronaut.blade', 'alpha').keys.every((k) => k.value === 0)).toBe(true);
  });

  it('opens with cracks after the strike and breaks the stone after the slow motion', () => {
    const body = track(CINE, 'giantStone.body', 'pose').keys;
    expect(body.map((k) => k.value)).toEqual(['rest', 'cracked1', 'cracked2', 'cracked3']);
    expect(body[1].atMs).toBe(9601);
    const breakAt = track(CINE, 'giantStone.chunk-2', 'alpha').keys.find((k) => k.value === 1);
    expect(realAt(CINE, breakAt?.atMs ?? 0)).toBeCloseTo(12400, 0);
  });
});

describe('rules for the data of the rig (PE-252, brief H-48)', () => {
  it.each(BOTH.map((d) => [d.variantId, d] as const))(
    '%s moves the arm children with the arm pose (ASTRONAUT_ANCHORS)',
    (_id, def) => {
      for (const key of track(def, 'astronaut.arm-front', 'pose').keys) {
        const a =
          ASTRONAUT_ANCHORS['arm-front'][
            key.value as keyof (typeof ASTRONAUT_ANCHORS)['arm-front']
          ];
        const at = key.atMs;
        // The sky shot turns the raygun to `up45` by hand; its hand offset stays the anchor's.
        const shooting = sampleTrack(track(def, 'astronaut.raygun', 'pose'), at) === 'up45';
        if (!shooting)
          expect(sampleTrack(track(def, 'astronaut.raygun', 'pose'), at)).toBe(a.raygun.pose);
        expect(sampleTrack(track(def, 'astronaut.raygun', 'x'), at)).toBe(a.raygun.x);
        expect(sampleTrack(track(def, 'astronaut.raygun', 'y'), at)).toBe(a.raygun.y);
        for (const child of ['blade', 'blade-arc']) {
          expect(sampleTrack(track(def, `astronaut.${child}`, 'x'), at)).toBe(a.blade.x);
          expect(sampleTrack(track(def, `astronaut.${child}`, 'y'), at)).toBe(a.blade.y);
        }
        const bladeArc = sampleTrack(track(def, 'astronaut.blade-arc', 'angle'), at);
        // The counter arc of the cinematic (-30) sets its own angle; every other key follows the anchor.
        if (!(def === CINE && at >= 5400 && at < 5400 + SMEAR_ARC)) {
          expect(bladeArc).toBe(a.blade.angle);
        }
      }
    },
  );

  it.each(BOTH.map((d) => [d.variantId, d] as const))(
    '%s lowers the body in crouch and kneel and leans arms and pack with the torso',
    (_id, def) => {
      const base = (id: string) => ASTRONAUT_RIG.parts.find((p) => p.id === id)!;
      for (const key of track(def, 'astronaut.leg-front', 'pose').keys) {
        const at = key.atMs;
        const drop =
          key.value === 'crouch' || key.value === 'kneel' ? ASTRONAUT_ANCHORS.bodyDrop.crouch : 0;
        expect(sampleTrack(track(def, 'astronaut.torso', 'y'), at)).toBe(base('torso').y + drop);
        const lean = sampleTrack(track(def, 'astronaut.torso', 'pose'), at) === 'lean';
        for (const id of ['arm-front', 'arm-back', 'pack'] as const) {
          const push = lean ? ASTRONAUT_ANCHORS.torsoLean[id] : [0, 0];
          expect(sampleTrack(track(def, `astronaut.${id}`, 'x'), at)).toBe(base(id).x + push[0]);
          expect(sampleTrack(track(def, `astronaut.${id}`, 'y'), at)).toBe(
            base(id).y + drop + push[1],
          );
        }
      }
    },
  );

  it.each(BOTH.map((d) => [d.variantId, d] as const))(
    '%s never starts a pose track on a smear pose and keeps two poses of one part at least smearMsOf(part) apart (AP-193)',
    (_id, def) => {
      for (const t of def.tracks.filter((x) => x.property === 'pose')) {
        expect(isSmearPose(String(t.keys[0].value)), t.target).toBe(false);
        const partId = t.target.split('.')[1] ?? '';
        const min = smearMsOf({ id: partId });
        t.keys.forEach((k, i) => {
          const next = t.keys[i + 1];
          if (!next) return;
          expect(
            next.atMs - k.atMs,
            `${t.target} ${String(k.value)} at ${k.atMs}`,
          ).toBeGreaterThanOrEqual(min);
          if (isSmearPose(String(k.value))) expect(next.atMs - k.atMs).toBeLessThanOrEqual(2 * min);
        });
      }
    },
  );

  it('shows the blade arc (counter) 66 ms and the hammer is no smear pose', () => {
    const pose = track(CINE, 'astronaut.blade-arc', 'pose').keys;
    const arc = pose.findIndex((k) => k.value === 'arc2');
    expect(pose[arc + 1].atMs - pose[arc].atMs).toBe(SMEAR_ARC);
    expect(isSmearPose('hammer')).toBe(false);
    // The moment has no blade arc at all.
    expect(track(MOMENT, 'astronaut.blade-arc', 'alpha').keys.every((k) => k.value === 0)).toBe(
      true,
    );
  });

  it('hides the four chunks until the break-up and never needs a rotation beyond the fine range', () => {
    for (const def of BOTH) {
      for (const id of CHUNKS) {
        const alpha = track(def, `giantStone.${id}`, 'alpha');
        expect(alpha.keys[0]).toMatchObject({ atMs: 0, value: 0 });
        expect(sampleTrack(alpha, def.durationMs)).toBe(1);
      }
      expect(validateChoreo(def, RIGS).filter((v) => v.rule === 'rotation')).toEqual([]);
    }
  });

  it('keeps every track target and part name inside the rigs and names only effects the module provides', () => {
    for (const def of BOTH) {
      for (const t of def.tracks) {
        if (t.target === 'camera') continue;
        const [rigId, partId] = t.target.split('.');
        const rig: RigDef = RIGS[rigId as 'astronaut' | 'giantStone'];
        if (partId) {
          const part = rig.parts.find((p) => p.id === partId);
          expect(part, t.target).toBeDefined();
          if (t.property === 'pose' && part?.poses) {
            for (const k of t.keys) {
              if (k.value === 'none') continue;
              expect(Object.keys(part.poses), `${t.target} ${String(k.value)}`).toContain(k.value);
            }
          }
          const times = t.keys.map((k) => k.atMs);
          expect(times).toEqual([...times].sort((a, b) => a - b));
          expect(new Set(times).size).toBe(times.length);
        }
      }
      for (const e of events(def, 'fx')) expect(e.name in GIANT_STONE_FX, e.name).toBe(true);
    }
    expect(BOSS_FX.giantStone).toBe(GIANT_STONE_FX);
  });

  it('uses only the six stone particle images 0 to 5 of rig-fx-stone', () => {
    for (const def of BOTH) {
      for (const e of events(def, 'particles')) {
        const n = Number(e.texture.replace('rig-fx-stone-', ''));
        expect(e.texture.startsWith('rig-fx-stone-') && n >= 0 && n <= 5, e.texture).toBe(true);
      }
    }
  });

  it('writes every number that has a token from the tokens (no literal for stand points or timing)', () => {
    expect(THEME.sizePx['size.rig-astro-x-moment']).toBe(MOMENT.actors[0].x);
    expect(THEME.sizePx['size.rig-boss-x-moment']).toBe(MOMENT.actors[1].x);
    expect(THEME.sizePx['size.rig-astro-x-cinematic']).toBe(CINE.actors[0].x);
    expect(THEME.sizePx['size.rig-boss-x-cinematic']).toBe(CINE.actors[1].x);
    expect(events(MOMENT, 'hitWhite')[0].durationMs).toBe(THEME.motionMs['motion.rig-hit-white']);
  });
});

// ---------------------------------------------------------------- fake scene

interface FakeObject {
  kind: string;
  st: Record<string, unknown>;
  log: { name: string; args: unknown[] }[];
}

interface FakeRecord {
  objects: FakeObject[];
  adds: number;
  sounds: string[];
}

function fakeObject(kind: string, rec: FakeRecord, init: Record<string, unknown>): unknown {
  const st: Record<string, unknown> = {
    x: 0,
    y: 0,
    scaleX: 1,
    scaleY: 1,
    angle: 0,
    alpha: 1,
    visible: true,
    depth: 0,
    width: 16,
    height: 24,
    ...init,
  };
  const obj: FakeObject = { kind, st, log: [] };
  rec.objects.push(obj);
  const proxy: unknown = new Proxy(st, {
    get(t, p) {
      if (typeof p === 'symbol' || p === 'then') return undefined;
      if (p === 'getTextBounds') return () => ({ local: { width: 40, height: 8 } });
      if (p in t) return t[p];
      return (...args: unknown[]) => {
        obj.log.push({ name: p, args });
        if (p === 'setPosition') {
          t.x = args[0];
          t.y = args[1] ?? args[0];
        } else if (p === 'setX') t.x = args[0];
        else if (p === 'setScale') {
          t.scaleX = args[0];
          t.scaleY = args[1] ?? args[0];
        } else if (p === 'setAngle') t.angle = args[0];
        else if (p === 'setAlpha') t.alpha = args[0];
        else if (p === 'setVisible') t.visible = args[0];
        else if (p === 'setDepth') t.depth = args[0];
        else if (p === 'setFrame') t.frame = args[0];
        else if (p === 'setTexture') {
          t.texture = args[0];
          t.frame = args[1];
        }
        return proxy;
      };
    },
  });
  return proxy;
}

function fakeScene(textures: Readonly<Record<string, readonly string[]>>) {
  const rec: FakeRecord = { objects: [], adds: 0, sounds: [] };
  const known = new Map<string, Set<string>>(
    Object.entries(textures).map(([k, f]) => [k, new Set(f)]),
  );
  const add = new Proxy(
    {},
    {
      get(_t, p) {
        if (typeof p === 'symbol') return undefined;
        return (...args: unknown[]) => {
          rec.adds += 1;
          const init: Record<string, unknown> =
            p === 'image' ? { texture: args[2], frame: args[3] } : {};
          if (p === 'rectangle') {
            init.x = args[0];
            init.y = args[1];
            init.width = args[2];
            init.height = args[3];
          }
          return fakeObject(p, rec, init);
        };
      },
    },
  );
  const scene = {
    add,
    textures: {
      exists: (k: string) => known.has(k),
      get: (k: string) => ({ has: (f: string) => known.get(k)?.has(f) ?? false }),
      getFrame: () => ({ cutX: 0, cutY: 0, cutWidth: 8, cutHeight: 8, source: { image: {} } }),
      createCanvas: (k: string) => {
        known.set(k, new Set());
        return {
          context: {
            imageSmoothingEnabled: true,
            globalCompositeOperation: 'source-over',
            fillStyle: '',
            drawImage: () => undefined,
            fillRect: () => undefined,
          },
          refresh: () => undefined,
        };
      },
      remove: (k: string) => known.delete(k),
    },
    cache: { bitmapFont: { exists: () => true } },
  };
  return { scene: scene as unknown as Phaser.Scene, rec };
}

const NO_INSETS: SafeInsets = { top: 0, right: 0, bottom: 0, left: 0 };
const DATA: FinisherStartData = debugFinisherData(0, 640, 360, false);
const ATLAS = 'finisher-rig-giantStone';

function rigFrames(rig: RigDef): string[] {
  return rig.parts.flatMap((p) => {
    const frames = [p.frame, ...Object.values(p.poses ?? {})];
    return [
      ...frames,
      ...frames.map((f) => silhouetteFrame(p, f)),
      ...frames.map((f) => inkFrame(p, f)),
    ];
  });
}

const frames = (sheet: string, n: number): string[] =>
  Array.from({ length: n }, (_, i) => `${sheet}-${i}`);

const TEXTURES: Readonly<Record<string, readonly string[]>> = {
  [DATA.boss.texture]: [],
  [DATA.player.texture]: [],
  [ATLAS]: [
    ...rigFrames(ASTRONAUT_RIG),
    ...rigFrames(GIANT_STONE_RIG),
    ...frames('rig-fx-stone', 6),
  ],
  'finisher-portrait': ['0', '1', '2', '3', '4', '5'],
};

function makeContext(
  textures: Readonly<Record<string, readonly string[]>>,
  reduced = false,
): { ctx: ChoreoContext; rec: FakeRecord; ui: unknown[] } {
  const { scene, rec } = fakeScene(textures);
  const ui: unknown[] = [];
  const ctx: ChoreoContext = {
    scene,
    data: DATA,
    plan: { ...DATA.plan, reduced },
    layout: finisherLayout(640, 360, NO_INSETS, false),
    webgl: false,
    stageX: 0,
    textures: new TextureBank(scene),
    fontKey: 'font',
    playSound: (key) => {
      rec.sounds.push(key);
    },
    addWorld: () => undefined,
    addUi: (o) => {
      ui.push(o);
    },
  };
  return { ctx, rec, ui };
}

describe('the choreography player plays both choreographies', () => {
  const cases: [string, ChoreoDef, boolean][] = [
    ['moment', MOMENT, false],
    ['moment reduced', reduceChoreo(MOMENT), true],
    ['cinematic', CINE, false],
    ['cinematic reduced', reduceChoreo(CINE), true],
  ];

  it.each(cases)('%s runs to the end at 60 fps without creating objects', (_name, def, reduced) => {
    const { ctx, rec } = makeContext(TEXTURES, reduced);
    const cam = { zoom: 1, scrollX: 0, scrollY: 0 };
    const camera = {
      setZoom(z?: number) {
        cam.zoom = z ?? 1;
        return camera;
      },
      setScroll(x: number, y?: number) {
        cam.scrollX = x;
        cam.scrollY = y ?? x;
        return camera;
      },
    };
    const player = new ChoreoPlayer(ctx, def, camera, { rigs: RIGS });
    expect(player.realMs).toBe(realDurationMs(def));
    const built = rec.adds;
    let n = 0;
    while (!player.done && n < 2000) {
      player.update(1000 / 60);
      n++;
    }
    expect(player.done).toBe(true);
    expect(rec.adds).toBe(built);
    expect(player.runnerCount).toBeGreaterThan(5);
    expect(rec.sounds).toEqual([SOUND_HIT]);
    player.destroy();
  });

  it('shows the speedline ring in the moment only for 99 ms at the hit, never when reduced', () => {
    const run = (reduced: boolean): number[] => {
      const { ctx, rec } = makeContext(TEXTURES, reduced);
      const camera = { setZoom: () => camera, setScroll: () => camera };
      const player = new ChoreoPlayer(ctx, reduced ? reduceChoreo(MOMENT) : MOMENT, camera, {
        rigs: RIGS,
      });
      // The ring lies below the figures at depth 19.5 (README); the light band is at depth 17.
      const rings = (): FakeObject[] =>
        rec.objects.filter(
          (o) => o.kind === 'graphics' && o.log.filter((l) => l.name === 'fillRect').length > 200,
        );
      const seen: number[] = [];
      while (!player.done) {
        player.update(1000 / 60);
        if (rings().some((o) => o.st.visible === true)) seen.push(Math.round(player.elapsedMs));
      }
      return seen;
    };
    const normal = run(false);
    expect(normal.length).toBeGreaterThan(0);
    expect(Math.min(...normal)).toBeGreaterThanOrEqual(1300);
    expect(Math.max(...normal)).toBeLessThanOrEqual(1300 + HIT_RING_MS + 17);
    expect(run(true)).toEqual([]);
  });

  it('shows the light band only from the main hit to 1500 ms later', () => {
    const { ctx, rec } = makeContext(TEXTURES, false);
    const camera = { setZoom: () => camera, setScroll: () => camera };
    const player = new ChoreoPlayer(ctx, MOMENT, camera, { rigs: RIGS });
    const bands = rec.objects.filter(
      (o) => o.kind === 'graphics' && o.st.depth === 17 && o.log.some((l) => l.name === 'fillRect'),
    );
    expect(bands).toHaveLength(LIGHT_STAGES.length);
    let first = Infinity;
    let last = -Infinity;
    while (!player.done) {
      player.update(1000 / 60);
      if (bands.some((o) => o.st.visible === true)) {
        first = Math.min(first, player.elapsedMs);
        last = Math.max(last, player.elapsedMs);
      }
    }
    expect(first).toBeGreaterThanOrEqual(1300);
    expect(first).toBeLessThan(1300 + 40);
    expect(last).toBeLessThanOrEqual(1300 + 1500 + 40);
  });

  it('moves the camera as in the storyboard: zoom 2 on the fists, 1 in the long shot, 2 on her, 1', () => {
    const { ctx } = makeContext(TEXTURES);
    const cam = { zoom: 1, scrollX: 0, scrollY: 0 };
    const camera = {
      setZoom(z?: number) {
        cam.zoom = z ?? 1;
        return camera;
      },
      setScroll(x: number, y?: number) {
        cam.scrollX = x;
        cam.scrollY = y ?? x;
        return camera;
      },
    };
    const player = new ChoreoPlayer(ctx, CINE, camera, { rigs: RIGS });
    const zoomAt: Record<number, number> = {};
    const want = [100, 2000, 2700, 4000, 6500, 7500, 8500, 9500, 13000, 14500];
    while (!player.done) {
      player.update(10);
      for (const w of want) if (Math.round(player.elapsedMs) === w) zoomAt[w] = cam.zoom;
    }
    expect(zoomAt).toEqual({
      100: 2,
      2000: 2,
      2700: 1,
      4000: 1,
      6500: 1,
      7500: 2,
      8500: 1,
      9500: 1,
      13000: 1,
      14500: 1,
    });
  });
});

// ---------------------------------------------------------------- effects of the boss

function fxApi(textures: Readonly<Record<string, readonly string[]>>): {
  api: FxApi;
  rec: FakeRecord;
  ui: unknown[];
} {
  const { ctx, rec, ui } = makeContext(textures);
  const fig = (x: number, top: number) => ({ container: { x, y: GROUND }, top: () => top });
  const figures = { astronaut: fig(140, 240), giantStone: fig(470, 60) };
  const api = {
    ctx,
    atlas: ATLAS,
    bossScale: 3,
    figure: (id: string) => figures[id as keyof typeof figures] ?? null,
    boss: () => figures.giantStone,
  } as unknown as FxApi;
  return { api, rec, ui };
}

const fxEvent = (name: string, durationMs?: number, atMs = 0): FxEvent => ({
  kind: 'fx',
  name,
  atMs,
  flash: false,
  ...(durationMs === undefined ? {} : { durationMs }),
});

describe('effects of the boss', () => {
  it('names the effects the choreographies call, and reuses the shared blocks', () => {
    expect(Object.keys(GIANT_STONE_FX).sort()).toEqual(
      [
        'hit-ring',
        'impact-pair',
        'morning-light',
        'portrait',
        'shadow',
        'sky-shot',
        'sky-stars',
        'star-gather',
      ].sort(),
    );
    expect(GIANT_STONE_FX['impact-pair']).toBe(ROOT_MONSTER_FX['impact-pair']);
  });

  it('builds every object in the factory and only sets values in update', () => {
    for (const [name, factory] of Object.entries(GIANT_STONE_FX)) {
      const { api, rec } = fxApi(TEXTURES);
      const inst = factory(api, fxEvent(name, 1000));
      const built = rec.adds;
      inst.start();
      for (let t = 0; t <= 2400; t += 16) inst.update(t, 16);
      inst.stop();
      expect(rec.adds, name).toBe(built);
      inst.destroy();
    }
  });

  it('does nothing without the atlas (placeholder run) for the star effects', () => {
    for (const name of ['star-gather', 'sky-stars']) {
      const { api, rec } = fxApi({});
      const inst = GIANT_STONE_FX[name](api, fxEvent(name, 500));
      inst.start();
      inst.update(100, 16);
      inst.stop();
      inst.destroy();
      expect(rec.objects, name).toHaveLength(0);
    }
  });

  it('draws the light band at boss x in three stepped widths, never wider than a sixth of the picture', () => {
    const { api, rec } = fxApi(TEXTURES);
    const inst = GIANT_STONE_FX['morning-light'](api, fxEvent('morning-light', 1500));
    const bands = rec.objects.filter((o) => o.kind === 'graphics');
    expect(bands).toHaveLength(3);
    inst.start();
    inst.update(0, 16);
    expect(bands.map((b) => b.st.visible)).toEqual([true, false, false]);
    expect(bands[0].st.x).toBe(470);
    inst.update(650, 16);
    expect(bands.map((b) => b.st.visible)).toEqual([false, true, false]);
    inst.update(1300, 16);
    expect(bands.map((b) => b.st.visible)).toEqual([false, false, true]);
    for (const st of LIGHT_STAGES) expect(st.half * 2).toBeLessThanOrEqual(640 / 6);
    expect(LIGHT_STAGES.map((s) => s.half)).toEqual(
      [...LIGHT_STAGES.map((s) => s.half)].sort((a, b) => b - a),
    );
    inst.stop();
    expect(bands.every((b) => b.st.visible === false)).toBe(true);
    // The colours are the tokens finisher.title (halo) and finisher.paper (core).
    const fills = bands[0].log.filter((l) => l.name === 'fillStyle').map((l) => l.args[0]);
    expect(fills).toEqual([THEME.colors['finisher.title'].num, THEME.colors['finisher.paper'].num]);
  });

  it('shoots from the muzzle past the top edge of the picture at 65 degrees', () => {
    const { api, rec } = fxApi(TEXTURES);
    const inst = GIANT_STONE_FX['sky-shot'](api, fxEvent('sky-shot', 150));
    inst.start();
    const g = rec.objects.find((o) => o.kind === 'graphics');
    const lines = g?.log.filter((l) => l.name === 'lineBetween') ?? [];
    expect(lines).toHaveLength(2);
    const m = skyMuzzle();
    for (const l of lines) {
      const [x0, y0, x1, y1] = l.args as number[];
      expect(x0).toBe(Math.round(140 + m.dx));
      expect(y0).toBe(Math.round(GROUND + m.dy));
      expect(y1).toBeLessThan(0);
      expect(x1).toBeGreaterThan(x0);
      const deg = (Math.atan2(y0 - y1, x1 - x0) * 180) / Math.PI;
      expect(deg).toBeGreaterThan(64);
      expect(deg).toBeLessThan(66);
    }
    expect(g?.st.visible).toBe(true);
  });

  it('puts the shadow over the astronaut in two hard steps', () => {
    const { api, rec } = fxApi(TEXTURES);
    const inst = GIANT_STONE_FX.shadow(api, fxEvent('shadow', 700));
    inst.start();
    const g = rec.objects.find((o) => o.kind === 'graphics');
    expect(g?.st).toMatchObject({ x: 140 + SHADOW.dx, y: GROUND + SHADOW.dy, alpha: 1 });
    inst.update(100, 16);
    expect(g?.st.alpha).toBe(1);
    inst.update(400, 16);
    expect(g?.st.alpha).toBe(0.5);
  });

  it('gathers the stars to the hammer above her and lets the sky stars rise and stay', () => {
    const gather = fxApi(TEXTURES);
    const g = GIANT_STONE_FX['star-gather'](gather.api, fxEvent('star-gather', 2000));
    const stars = gather.rec.objects.filter((o) => o.kind === 'image');
    expect(stars).toHaveLength(GATHER.count);
    g.start();
    const dist = (o: FakeObject) =>
      Math.hypot(Number(o.st.x) - (140 + GATHER.dx), Number(o.st.y) - (GROUND + GATHER.dy));
    g.update(0, 16);
    const far = stars.reduce((s, o) => s + dist(o), 0);
    g.update(GATHER.moveMs + 100, 16);
    const near = stars.reduce((s, o) => s + dist(o), 0);
    expect(near).toBeLessThan(far / 2);
    expect(stars.every((o) => o.st.frame === 'rig-fx-stone-5')).toBe(true);

    const sky = fxApi(TEXTURES);
    const s = GIANT_STONE_FX['sky-stars'](sky.api, fxEvent('sky-stars', 2400));
    const imgs = sky.rec.objects.filter((o) => o.kind === 'image');
    expect(imgs).toHaveLength(SKY.count);
    s.start();
    s.update(SKY.delayMaxMs + SKY.flightMs + 50, 16);
    for (const o of imgs) {
      expect(o.st.visible).toBe(true);
      expect(Number(o.st.x)).toBeGreaterThanOrEqual(SKY.xMin);
      expect(Number(o.st.x)).toBeLessThanOrEqual(SKY.xMax);
      expect(Number(o.st.y)).toBeGreaterThanOrEqual(SKY.yMin);
      expect(Number(o.st.y)).toBeLessThanOrEqual(SKY.yMax);
    }
    s.stop();
    expect(imgs.every((o) => o.st.visible === false)).toBe(true);
  });

  it('slides the portrait strip with the giant in the visor (frame 2) in the screen layer', () => {
    const { api, rec, ui } = fxApi(TEXTURES);
    const inst = GIANT_STONE_FX.portrait(api, fxEvent('portrait', 1000));
    expect(ui).toHaveLength(1);
    expect(PORTRAIT_FRAME).toBe(2);
    expect(rec.objects.find((o) => o.kind === 'image')?.st).toMatchObject({
      texture: 'finisher-portrait',
      frame: 2,
    });
    inst.start();
    const box = rec.objects.find((o) => o.kind === 'container');
    inst.update(0, 16);
    expect(Number(box?.st.x)).toBeLessThan(0);
    inst.update(500, 16);
    expect(box?.st.x).toBe(0);
    inst.update(1000, 16);
    expect(Number(box?.st.x)).toBeGreaterThan(0);
  });
});

describe('register and plan', () => {
  it('holds both choreographies and they pass validateChoreo with the rules', () => {
    expect(CHOREOS['moment-giantStone']).toBe(MOMENT);
    expect(CHOREOS['cinematic-20']).toBe(CINE);
    for (const def of [MOMENT, CINE]) expect(validateChoreo(def, RIGS, CHOREO_RULES)).toEqual([]);
  });

  it.each([
    [10, 'moment-giantStone'],
    [15, 'moment-giantStone'],
    [19, 'moment-giantStone'],
    [20, 'cinematic-20'],
  ])('buildFinisher for level %i gives %s with choreo and realMs', (level, id) => {
    const plan = buildFinisher(level, { reduceEffects: false, seen: [] });
    expect(plan.variantId).toBe(id);
    expect(plan.choreo?.variantId).toBe(id);
    expect(plan.realMs).toBe(id === 'cinematic-20' ? 15000 : 3500);
  });
});

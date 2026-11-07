// Choreographies of the guardian dog (M13, AP-189, brief H-48 part 2b): data rules, storyboard times, the effects of
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
  CINE_STAB_X,
  CINE_TAKT,
  CINEMATIC_30,
  MOMENT_GUARDIAN_DOG,
  MOMENT_STAB_X,
  MOMENT_TAKT,
} from '../../../src/config/choreo/guardianDog';
import { CHOREOS } from '../../../src/config/choreo';
import { CHOREO_RULES } from '../../../src/config/finishers';
import { ASTRONAUT_ANCHORS, ASTRONAUT_RIG } from '../../../src/config/rigs/astronaut';
import { GUARDIAN_DOG_ANCHORS, GUARDIAN_DOG_RIG } from '../../../src/config/rigs/guardianDog';
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
  GRAVE_LIGHT,
  GUARDIAN_DOG_FX,
  LIGHT_SPARKS,
  PORTRAIT_FRAME,
  RING_OFFSET,
  RUNE_RISE,
  TORCHES_CINE,
  TORCHES_MOMENT,
  TORCH_FLICKER_MS,
  TORCH_IGNITE_CINE,
} from '../../../src/scenes/finisher/fx/guardianDog';
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
const MOMENT = MOMENT_GUARDIAN_DOG;
const CINE = CINEMATIC_30;
const BOTH: readonly ChoreoDef[] = [MOMENT, CINE];
const SHADES = ['shade-1', 'shade-2', 'shade-3'];
const DOG_X = {
  moment: THEME.sizePx['size.rig-boss-x-moment'],
  cine: THEME.sizePx['size.rig-boss-x-cinematic'],
};

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

/** First key of a pose track with this value (ms). */
const firstKey = (def: ChoreoDef, target: string, property: ChoreoTrack['property'], v: unknown) =>
  track(def, target, property).keys.find((k) => k.value === v)?.atMs ?? -1;

describe('rules of the choreographies (validateChoreo)', () => {
  it.each(BOTH.map((d) => [d.variantId, d] as const))('%s breaks no rule', (_id, def) => {
    expect(validateChoreo(def, RIGS)).toEqual([]);
    expect(validateChoreo(def, RIGS, CHOREO_RULES)).toEqual([]);
  });

  it.each(BOTH.map((d) => [d.variantId, d] as const))('%s reduced breaks no rule', (_id, def) => {
    const reduced = reduceChoreo(def);
    expect(reduced.events.length).toBeLessThan(def.events.length);
    expect(validateChoreo(reduced, RIGS)).toEqual([]);
    expect(validateChoreo(reduced, RIGS, CHOREO_RULES)).toEqual([]);
  });

  it('plays the real lengths of the brief: moment 3.5 s, cinematic 15 s, in both modes', () => {
    expect(realDurationMs(MOMENT)).toBe(3500);
    expect(realDurationMs(CINE)).toBe(15000);
    expect(realDurationMs(reduceChoreo(MOMENT))).toBe(3500);
    expect(realDurationMs(reduceChoreo(CINE))).toBe(15000);
  });

  it('has exactly one flash per variant: the stab (boss white) and the impact pair', () => {
    expect(MOMENT.events.filter((e) => e.flash)).toHaveLength(1);
    expect(CINE.events.filter((e) => e.flash)).toHaveLength(1);
    expect(countFlashes(MOMENT)).toBe(1);
    expect(countFlashes(CINE)).toBe(1);
    expect(events(MOMENT, 'flash')).toHaveLength(0);
    expect(events(CINE, 'flash')).toHaveLength(0);
    expect(events(CINE, 'impact')).toHaveLength(0);
  });

  it('removes flash, boss white, shake, ring and impact pair when reduced, keeps hit stop, beat and runes', () => {
    for (const def of BOTH) {
      const reduced = reduceChoreo(def);
      expect(reduced.events.some((e) => e.flash)).toBe(false);
      expect(countFlashes(reduced)).toBe(0);
      expect(events(reduced, 'hitWhite')).toHaveLength(0);
      expect(events(reduced, 'shake')).toHaveLength(0);
      expect(fxNamed(reduced, 'hit-ring')).toHaveLength(0);
      expect(fxNamed(reduced, 'impact-pair')).toHaveLength(0);
      expect(events(reduced, 'hitStop')).toHaveLength(1);
      expect(events(reduced, 'timeScale')).toHaveLength(1);
    }
    expect(fxNamed(reduceChoreo(MOMENT), 'rune-rise')).toHaveLength(1);
    expect(fxNamed(reduceChoreo(MOMENT), 'torches-moment')).toHaveLength(1);
    expect(fxNamed(reduceChoreo(CINE), 'grave-light')).toHaveLength(1);
    expect(reduceChoreo(MOMENT).tracks).toEqual(MOMENT.tracks);
    expect(reduceChoreo(CINE).tracks).toEqual(CINE.tracks);
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

describe('fight moment "Drei Takte" (boards H1 to H9)', () => {
  const hit = events(MOMENT, 'hitStop')[0];

  it('stands the actors on the ground line at x = 170 and 470 (tokens)', () => {
    expect(MOMENT.actors).toEqual([
      { rigId: 'astronaut', x: 170, y: GROUND },
      { rigId: 'guardianDog', x: 470, y: GROUND },
    ]);
  });

  it('snaps the three shadow heads in a fixed beat of 400 ms with anticipation 150 and action 120', () => {
    expect(MOMENT_TAKT).toBe(400);
    const snaps = SHADES.map((id) => firstKey(MOMENT, `guardianDog.${id}`, 'pose', 'snap'));
    expect(snaps).toEqual([150, 550, 950]);
    expect(snaps[1] - snaps[0]).toBe(MOMENT_TAKT);
    expect(snaps[2] - snaps[1]).toBe(MOMENT_TAKT);
    const action = MOMENT.beats.filter((b) => b.phase === 'action');
    expect(action.slice(0, 3).map((b) => [b.atMs, b.durationMs])).toEqual([
      [150, 120],
      [550, 120],
      [950, 120],
    ]);
    const antic = MOMENT.beats.filter((b) => b.phase === 'anticipation').slice(0, 3);
    expect(antic.map((b) => [b.atMs, b.durationMs])).toEqual([
      [0, 150],
      [400, 150],
      [800, 150],
    ]);
    // The jaw snaps with every shadow head.
    expect(
      track(MOMENT, 'guardianDog.jaw', 'pose').keys.filter((k) => k.value === 'snap'),
    ).toHaveLength(3);
  });

  it('fades each head after its counter and then hides it (alpha 0)', () => {
    SHADES.forEach((id, k) => {
      const fadeAt = firstKey(MOMENT, `guardianDog.${id}`, 'pose', 'fade');
      expect(fadeAt).toBe((k + 1) * MOMENT_TAKT);
      const gone = firstKey(MOMENT, `guardianDog.${id}`, 'alpha', 0);
      expect(gone).toBeGreaterThan(fadeAt);
      expect(sampleTrack(track(MOMENT, `guardianDog.${id}`, 'alpha'), gone - 1)).toBe(1);
    });
    // Board H5: all heads are gone before the stab.
    for (const id of SHADES) {
      expect(sampleTrack(track(MOMENT, `guardianDog.${id}`, 'alpha'), 1350)).toBe(0);
    }
  });

  it('counters only with sparks: no flash, no shake before the stab', () => {
    const early = MOMENT.events.filter((e) => e.atMs < hit.atMs);
    expect(early.some((e) => e.flash)).toBe(false);
    expect(early.some((e) => e.kind === 'shake' || e.kind === 'hitWhite')).toBe(false);
    const sparks = events(MOMENT, 'particles').filter((e) => e.atMs < hit.atMs);
    expect(sparks.length).toBeGreaterThanOrEqual(6);
    expect(sparks.every((e) => e.texture.startsWith('rig-fx-dog-'))).toBe(true);
  });

  it('hangs the head (low) at the halt and hides the jaw then (board H5)', () => {
    expect(firstKey(MOMENT, 'guardianDog.head', 'pose', 'low')).toBe(1200);
    expect(sampleTrack(track(MOMENT, 'guardianDog.jaw', 'alpha'), 1199)).toBe(1);
    expect(sampleTrack(track(MOMENT, 'guardianDog.jaw', 'alpha'), 1200)).toBe(0);
    // And also while it sleeps: the jaw stays hidden to the end.
    expect(sampleTrack(track(MOMENT, 'guardianDog.jaw', 'alpha'), MOMENT.durationMs)).toBe(0);
  });

  it('makes the main hit only boss white 100 ms plus the shared ring at the same atMs (13a, AP-194)', () => {
    expect(hit).toMatchObject({ atMs: 1500, ms: 150, targets: ['guardianDog'] });
    expect(MOMENT.beats.find((b) => b.phase === 'hitStop')).toMatchObject({
      atMs: 1500,
      final: true,
    });
    const white = events(MOMENT, 'hitWhite')[0];
    expect(white).toMatchObject({
      atMs: 1500,
      durationMs: THEME.motionMs['motion.rig-hit-white'],
      targets: ['guardianDog'],
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
    expect(fxNamed(CINE, 'hit-ring')).toHaveLength(0);
  });

  it('keeps the stab to 120 ms with a 33 ms smear and breaks the collar after the stop', () => {
    const action = MOMENT.beats.find((b) => b.phase === 'action' && b.atMs === 1380);
    expect(action?.durationMs).toBe(120);
    const legs = track(MOMENT, 'astronaut.leg-front', 'pose').keys;
    const smear = legs.findIndex((k) => k.value === 'smear' && k.atMs === 1380);
    expect(smear).toBeGreaterThan(0);
    expect(legs[smear + 1].atMs - legs[smear].atMs).toBe(THEME.motionMs['motion.rig-smear']);
    expect(firstKey(MOMENT, 'guardianDog.collar', 'pose', 'broken')).toBe(hit.atMs + 1);
  });

  it('keeps the astronaut clear of the ring (Q-96): she stands left of its inner radius at the stab', () => {
    const x = Number(sampleTrack(track(MOMENT, 'astronaut', 'x'), hit.atMs));
    expect(x).toBe(MOMENT_STAB_X);
    const cx = DOG_X.moment + RING_OFFSET.dx;
    const r0 = ringRadius(BOSS_REF_H, THEME.sizeCount['size.rig-scale-boss-moment']);
    // At her body height (ring centre) the inner ellipse reaches r0 to the left: she stands outside it.
    expect(cx - x).toBeGreaterThanOrEqual(r0);
  });

  it('lies down with the anchor: legs lie, head sleep, tail down, body and head +8 px', () => {
    const lie = firstKey(MOMENT, 'guardianDog.legs-front', 'pose', 'lie');
    expect(lie).toBeGreaterThan(hit.atMs);
    expect(firstKey(MOMENT, 'guardianDog.legs-back', 'pose', 'lie')).toBe(lie);
    expect(firstKey(MOMENT, 'guardianDog.head', 'pose', 'sleep')).toBe(lie);
    expect(firstKey(MOMENT, 'guardianDog.tail', 'pose', 'down')).toBe(lie);
    expect(firstKey(MOMENT, 'guardianDog.body', 'pose', 'dark')).toBe(lie);
    for (const id of ['body', 'head'] as const) {
      const base = GUARDIAN_DOG_RIG.parts.find((p) => p.id === id)!;
      expect(sampleTrack(track(MOMENT, `guardianDog.${id}`, 'y'), lie)).toBe(
        base.y + GUARDIAN_DOG_ANCHORS.lie[id][1],
      );
      expect(sampleTrack(track(MOMENT, `guardianDog.${id}`, 'x'), lie)).toBe(
        base.x + GUARDIAN_DOG_ANCHORS.lie[id][0],
      );
    }
  });

  it('has the slow motion 0.3 for 1150 ms real time and the title in the follow-through', () => {
    const slow = events(MOMENT, 'timeScale')[0];
    expect(slow.factor).toBe(0.3);
    expect(
      realAt(MOMENT, slow.atMs + (slow.durationMs ?? 0)) - realAt(MOMENT, slow.atMs) - hit.ms,
    ).toBe(1150);
    const title = events(MOMENT, 'text')[0];
    expect(title).toMatchObject({ text: 'BEZWUNGEN!', color: 'finisher.title' });
    expect(realAt(MOMENT, title.atMs)).toBe(2900);
    const follow = MOMENT.beats.find((b) => b.phase === 'followThrough');
    expect(follow?.durationMs).toBeGreaterThanOrEqual(CHOREO_RULES.followThroughMinMs);
  });
});

describe('cinematic level 30 "GRABESLICHT" (boards 1a to 5c)', () => {
  it('has 5 shots of 3000 ms real time, no axis flip', () => {
    expect(CINE.shots).toHaveLength(5);
    expect(CINE.shots?.map((s) => realAt(CINE, s.atMs))).toEqual([0, 3000, 6000, 9000, 12000]);
    expect(CINE.shots?.some((s) => s.axisFlip)).toBe(false);
  });

  it('keeps the astronaut left and the dog right at x = 160 and 480', () => {
    expect(CINE.actors).toEqual([
      { rigId: 'astronaut', x: 160, y: GROUND },
      { rigId: 'guardianDog', x: 480, y: GROUND },
    ]);
    for (const a of CINE.actors) expect(a.flipX).toBeUndefined();
  });

  it('zooms in whole steps only: 1, then 2 on her for the torch light, then back to 1', () => {
    const zoom = track(CINE, 'camera', 'zoom');
    expect(zoom.keys.every((k) => Number.isInteger(k.value) && k.ease === 'hold')).toBe(true);
    expect(zoom.keys.map((k) => [k.atMs, k.value])).toEqual([
      [0, 1],
      [7000, 2],
      [8200, 1],
    ]);
    expect(CINE.shots?.every((s) => s.camera.zoom === 1)).toBe(true);
  });

  it('lights up the eyes one by one (1a to 1c) and shows the dog in the half dark', () => {
    const a = (id: string) => track(CINE, `guardianDog.${id}`, 'alpha');
    expect(sampleTrack(a('shade-1'), 100)).toBe(1);
    expect(sampleTrack(a('shade-2'), 1199)).toBe(0);
    expect(sampleTrack(a('shade-2'), 1200)).toBe(1);
    expect(sampleTrack(a('shade-3'), 2399)).toBe(0);
    expect(sampleTrack(a('shade-3'), 2400)).toBe(1);
    expect(sampleTrack(a('body'), 2399)).toBe(0);
    expect(sampleTrack(a('body'), 2400)).toBe(1);
    expect(sampleTrack(track(CINE, 'guardianDog', 'alpha'), 2500)).toBe(0.85);
    expect(sampleTrack(track(CINE, 'astronaut', 'alpha'), 2399)).toBe(0);
    expect(sampleTrack(track(CINE, 'astronaut', 'alpha'), 2400)).toBe(1);
  });

  it('hangs the shadow heads 12 to 16 px lower than the rig (letterbox) and keeps the beat', () => {
    SHADES.forEach((id, k) => {
      const base = GUARDIAN_DOG_RIG.parts.find((p) => p.id === id)!;
      const y = Number(sampleTrack(track(CINE, `guardianDog.${id}`, 'y'), 0));
      expect(y - base.y).toBeGreaterThanOrEqual(12);
      expect(y - base.y).toBeLessThanOrEqual(16);
      expect(firstKey(CINE, `guardianDog.${id}`, 'pose', 'snap')).toBe(3300 + k * CINE_TAKT);
    });
    expect(CINE_TAKT).toBe(1000);
  });

  it('parries in the beat: Kopf 1 and 2 fade, Kopf 3 is answered with the blade arc (66 ms)', () => {
    const pose = track(CINE, 'astronaut.blade-arc', 'pose').keys;
    const arc = pose.findIndex((k) => k.value === 'arc2');
    expect(pose[arc].atMs).toBe(5300);
    expect(pose[arc + 1].atMs - pose[arc].atMs).toBe(SMEAR_ARC);
    expect(firstKey(CINE, 'guardianDog.shade-1', 'pose', 'fade')).toBe(4000);
    expect(firstKey(CINE, 'guardianDog.shade-2', 'pose', 'fade')).toBe(5000);
    for (const id of SHADES) {
      expect(sampleTrack(track(CINE, `guardianDog.${id}`, 'alpha'), 6300)).toBe(0);
    }
    const sparks = events(CINE, 'particles').filter((e) => e.atMs < 6000);
    expect(sparks.length).toBeGreaterThanOrEqual(6);
  });

  it('shows the portrait strip and torches: outer pair in 3a, inner pair in 3b, the name before the cut', () => {
    expect(fxNamed(CINE, 'portrait')[0]).toMatchObject({ atMs: 6000, durationMs: 1000 });
    expect(TORCH_IGNITE_CINE[0]).toBe(TORCH_IGNITE_CINE[3]);
    expect(TORCH_IGNITE_CINE[1]).toBe(TORCH_IGNITE_CINE[2]);
    expect(TORCH_IGNITE_CINE[0]).toBeLessThan(TORCH_IGNITE_CINE[1]);
    expect(TORCH_IGNITE_CINE[1]).toBeLessThanOrEqual(7300);
    const name = events(CINE, 'text').find((e) => e.color === 'finisher.name');
    expect(name).toMatchObject({ text: 'GRABESLICHT', atMs: 8300, durationMs: 700 });
    expect(fxNamed(CINE, 'light-sparks')).toHaveLength(1);
    const title = events(CINE, 'text').find((e) => e.color === 'finisher.title');
    expect(title?.text).toBe('BEZWUNGEN!');
    expect(realAt(CINE, title?.atMs ?? 0)).toBe(14200);
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
    expect(sampleTrack(track(CINE, 'astronaut', 'x'), 9600)).toBe(CINE_STAB_X);
    expect(sampleTrack(track(CINE, 'guardianDog.jaw', 'alpha'), 9600)).toBe(0);
  });

  it('turns to stone, crumbles in the light and leaves only the collar (5a to 5c)', () => {
    const stoneAt = firstKey(CINE, 'guardianDog.head', 'pose', 'stone');
    expect(realAt(CINE, stoneAt)).toBeCloseTo(12400, 0);
    for (const id of ['legs-back', 'legs-front', 'tail', 'body', 'head', 'jaw', 'collar']) {
      expect(firstKey(CINE, `guardianDog.${id}`, 'pose', 'stone'), id).toBe(stoneAt);
    }
    const broken = track(CINE, 'guardianDog.collar', 'pose').keys.filter(
      (k) => k.value === 'broken',
    );
    expect(broken).toHaveLength(2);
    expect(broken[1].atMs).toBeGreaterThan(stoneAt);
    const end = CINE.durationMs;
    expect(sampleTrack(track(CINE, 'guardianDog.body', 'alpha'), end)).toBe(0);
    expect(sampleTrack(track(CINE, 'guardianDog.collar', 'alpha'), end)).toBe(1);
    expect(sampleTrack(track(CINE, 'guardianDog.collar', 'angle'), end)).toBe(12);
    const light = fxNamed(CINE, 'grave-light')[0];
    expect(realAt(CINE, light.atMs)).toBeCloseTo(13400, 0);
    expect(light.atMs + (light.durationMs ?? 0)).toBe(CINE.durationMs);
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
        expect(sampleTrack(track(def, 'astronaut.raygun', 'pose'), at)).toBe(a.raygun.pose);
        expect(sampleTrack(track(def, 'astronaut.raygun', 'x'), at)).toBe(a.raygun.x);
        expect(sampleTrack(track(def, 'astronaut.raygun', 'y'), at)).toBe(a.raygun.y);
        for (const child of ['blade', 'blade-arc']) {
          expect(sampleTrack(track(def, `astronaut.${child}`, 'x'), at)).toBe(a.blade.x);
          expect(sampleTrack(track(def, `astronaut.${child}`, 'y'), at)).toBe(a.blade.y);
          expect(sampleTrack(track(def, `astronaut.${child}`, 'angle'), at)).toBe(a.blade.angle);
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

  it('uses the 66 ms blade arc only in the third counter of each variant', () => {
    for (const def of BOTH) {
      const pose = track(def, 'astronaut.blade-arc', 'pose').keys;
      expect(pose.filter((k) => k.value === 'arc2')).toHaveLength(1);
      const arc = pose.findIndex((k) => k.value === 'arc2');
      expect(pose[arc + 1].atMs - pose[arc].atMs).toBe(SMEAR_ARC);
    }
  });

  it('keeps every track target and part name inside the rigs and names only effects the module provides', () => {
    for (const def of BOTH) {
      for (const t of def.tracks) {
        if (t.target === 'camera') continue;
        const [rigId, partId] = t.target.split('.');
        const rig: RigDef = RIGS[rigId as 'astronaut' | 'guardianDog'];
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
      for (const e of events(def, 'fx')) expect(e.name in GUARDIAN_DOG_FX, e.name).toBe(true);
      expect(validateChoreo(def, RIGS).filter((v) => v.rule === 'rotation')).toEqual([]);
    }
    expect(BOSS_FX.guardianDog).toBe(GUARDIAN_DOG_FX);
  });

  it('uses only the five dog particle images 0 to 4 of rig-fx-dog', () => {
    for (const def of BOTH) {
      for (const e of events(def, 'particles')) {
        const n = Number(e.texture.replace('rig-fx-dog-', ''));
        expect(e.texture.startsWith('rig-fx-dog-') && n >= 0 && n <= 4, e.texture).toBe(true);
      }
    }
  });

  it('writes every number that has a token from the tokens (stand points, timing)', () => {
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
const ATLAS = 'finisher-rig-guardianDog';

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
    ...rigFrames(GUARDIAN_DOG_RIG),
    ...frames('rig-fx-dog', 5),
    ...frames('rig-prop-torch', 3),
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

  const camera = () => {
    const cam = { zoom: 1, scrollX: 0, scrollY: 0 };
    const c = {
      setZoom(z?: number) {
        cam.zoom = z ?? 1;
        return c;
      },
      setScroll(x: number, y?: number) {
        cam.scrollX = x;
        cam.scrollY = y ?? x;
        return c;
      },
    };
    return { cam, c };
  };

  it.each(cases)('%s runs to the end at 60 fps without creating objects', (_name, def, reduced) => {
    const { ctx, rec } = makeContext(TEXTURES, reduced);
    const { c } = camera();
    const player = new ChoreoPlayer(ctx, def, c, { rigs: RIGS });
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

  it('shows the speedline ring in the moment only for 99 ms at the stab, below both figures, never when reduced', () => {
    const run = (reduced: boolean): { seen: number[]; depths: number[]; figures: number[] } => {
      const { ctx, rec } = makeContext(TEXTURES, reduced);
      const { c } = camera();
      const player = new ChoreoPlayer(ctx, reduced ? reduceChoreo(MOMENT) : MOMENT, c, {
        rigs: RIGS,
      });
      const rings = (): FakeObject[] =>
        rec.objects.filter(
          (o) => o.kind === 'graphics' && o.log.filter((l) => l.name === 'fillRect').length > 200,
        );
      const seen: number[] = [];
      const depths: number[] = [];
      while (!player.done) {
        player.update(1000 / 60);
        const visible = rings().filter((o) => o.st.visible === true);
        if (visible.length > 0) {
          seen.push(Math.round(player.elapsedMs));
          depths.push(...visible.map((o) => Number(o.st.depth)));
        }
      }
      const figures = rec.objects
        .filter(
          (o) => o.kind === 'container' && Number(o.st.depth) >= 20 && Number(o.st.depth) < 30,
        )
        .map((o) => Number(o.st.depth));
      return { seen, depths, figures };
    };
    const normal = run(false);
    expect(normal.seen.length).toBeGreaterThan(0);
    expect(Math.min(...normal.seen)).toBeGreaterThanOrEqual(1500);
    expect(Math.max(...normal.seen)).toBeLessThanOrEqual(1500 + HIT_RING_MS + 17);
    // Depth check (README, Q-98): the ring lies below every figure (the astronaut is the lowest, 20).
    expect(normal.figures.length).toBeGreaterThanOrEqual(2);
    expect(normal.depths.length).toBeGreaterThan(0);
    for (const d of normal.depths) expect(d).toBeLessThan(Math.min(...normal.figures));
    expect(run(true).seen).toEqual([]);
  });

  it('lights the torches from the start in the moment and moves the camera as in the storyboard in the cinematic', () => {
    const { ctx, rec } = makeContext(TEXTURES, false);
    const { cam, c } = camera();
    const player = new ChoreoPlayer(ctx, CINE, c, { rigs: RIGS });
    const zoomAt: Record<number, number> = {};
    const want = [100, 2000, 4000, 6500, 7500, 8500, 9500, 13000, 14500];
    while (!player.done) {
      player.update(10);
      for (const w of want) if (Math.round(player.elapsedMs) === w) zoomAt[w] = cam.zoom;
    }
    expect(zoomAt).toEqual({
      100: 1,
      2000: 1,
      4000: 1,
      6500: 1,
      7500: 2,
      8500: 1,
      9500: 1,
      13000: 1,
      14500: 1,
    });
    expect(
      rec.objects.filter((o) => o.kind === 'image' && o.st.texture === ATLAS).length,
    ).toBeGreaterThan(10);
  });
});

// ---------------------------------------------------------------- effects of the boss

function fxApi(textures: Readonly<Record<string, readonly string[]>>): {
  api: FxApi;
  rec: FakeRecord;
  ui: unknown[];
} {
  const { ctx, rec, ui } = makeContext(textures);
  const fig = (x: number, depth: number) => ({ container: { x, y: GROUND, depth }, top: () => 60 });
  const figures = { astronaut: fig(140, 20), guardianDog: fig(470, 21) };
  const api = {
    ctx,
    atlas: ATLAS,
    bossScale: 3,
    figure: (id: string) => figures[id as keyof typeof figures] ?? null,
    boss: () => figures.guardianDog,
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
    expect(Object.keys(GUARDIAN_DOG_FX).sort()).toEqual(
      [
        'grave-light',
        'hit-ring',
        'impact-pair',
        'light-sparks',
        'portrait',
        'rune-rise',
        'torches-cine',
        'torches-moment',
      ].sort(),
    );
    expect(GUARDIAN_DOG_FX['impact-pair']).toBe(ROOT_MONSTER_FX['impact-pair']);
  });

  it('builds every object in the factory and only sets values in update', () => {
    for (const [name, factory] of Object.entries(GUARDIAN_DOG_FX)) {
      const { api, rec } = fxApi(TEXTURES);
      const inst = factory(api, fxEvent(name, 1000));
      const built = rec.adds;
      inst.start();
      for (let t = 0; t <= 8000; t += 16) inst.update(t, 16);
      inst.stop();
      expect(rec.adds, name).toBe(built);
      inst.destroy();
    }
  });

  it('does nothing without the atlas (placeholder run) for torches and motes', () => {
    for (const name of ['torches-moment', 'torches-cine', 'rune-rise', 'light-sparks']) {
      const { api, rec } = fxApi({});
      const inst = GUARDIAN_DOG_FX[name](api, fxEvent(name, 500));
      inst.start();
      inst.update(100, 16);
      inst.stop();
      inst.destroy();
      expect(rec.objects, name).toHaveLength(0);
    }
  });

  it('ignites the cinematic torches in pairs and flickers the burning ones in steps', () => {
    const { api, rec } = fxApi(TEXTURES);
    const inst = GUARDIAN_DOG_FX['torches-cine'](api, fxEvent('torches-cine', 15000));
    const imgs = rec.objects.filter((o) => o.kind === 'image');
    const glows = rec.objects.filter((o) => o.kind === 'graphics');
    expect(imgs).toHaveLength(TORCHES_CINE.length);
    inst.start();
    inst.update(100, 16);
    expect(imgs.every((o) => o.st.frame === 'rig-prop-torch-0')).toBe(true);
    expect(glows.every((o) => o.st.visible === false)).toBe(true);
    inst.update(TORCH_IGNITE_CINE[0] + 10, 16);
    const lit = imgs.map((o) => o.st.frame !== 'rig-prop-torch-0');
    expect(lit).toEqual([true, false, false, true]);
    inst.update(TORCH_IGNITE_CINE[1] + 10, 16);
    expect(imgs.every((o) => o.st.frame !== 'rig-prop-torch-0')).toBe(true);
    const before = imgs.map((o) => o.st.frame);
    inst.update(TORCH_IGNITE_CINE[1] + 10 + TORCH_FLICKER_MS, 16);
    expect(imgs.map((o) => o.st.frame)).not.toEqual(before);
    inst.stop();
    expect(imgs.every((o) => o.st.visible === false)).toBe(true);
  });

  it('burns both torches of the moment from the first frame', () => {
    const { api, rec } = fxApi(TEXTURES);
    const inst = GUARDIAN_DOG_FX['torches-moment'](api, fxEvent('torches-moment', 3500));
    const imgs = rec.objects.filter((o) => o.kind === 'image');
    expect(imgs).toHaveLength(TORCHES_MOMENT.length);
    inst.start();
    inst.update(0, 16);
    expect(imgs.every((o) => o.st.frame !== 'rig-prop-torch-0')).toBe(true);
  });

  it('draws the grave light at the dog in two hard steps, edge finisher.title and core finisher.paper', () => {
    const { api, rec } = fxApi(TEXTURES);
    const inst = GUARDIAN_DOG_FX['grave-light'](api, fxEvent('grave-light', 1600));
    const bands = rec.objects.filter((o) => o.kind === 'graphics');
    expect(bands).toHaveLength(GRAVE_LIGHT.stages.length);
    inst.start();
    inst.update(0, 16);
    expect(bands.map((b) => b.st.visible)).toEqual([true, false]);
    expect(bands[0].st.x).toBe(470 + GRAVE_LIGHT.dx);
    inst.update(350, 16);
    expect(bands.map((b) => b.st.visible)).toEqual([false, true]);
    const fills = bands[1].log.filter((l) => l.name === 'fillStyle').map((l) => l.args[0]);
    expect(fills).toEqual([THEME.colors['finisher.title'].num, THEME.colors['finisher.paper'].num]);
    inst.stop();
    expect(bands.every((b) => b.st.visible === false)).toBe(true);
  });

  it('lets the runes rise one after the other and go out, and the torch sparks keep flowing', () => {
    const runes = fxApi(TEXTURES);
    const r = GUARDIAN_DOG_FX['rune-rise'](runes.api, fxEvent('rune-rise', 1000));
    const imgs = runes.rec.objects.filter((o) => o.kind === 'image');
    expect(imgs).toHaveLength(RUNE_RISE.count);
    expect(imgs.every((o) => o.st.frame === 'rig-fx-dog-0')).toBe(true);
    r.start();
    r.update(10, 16);
    expect(imgs.filter((o) => o.st.visible === true)).toHaveLength(1);
    r.update(RUNE_RISE.gapMs * 3 + 10, 16);
    const y3 = Number(imgs[0].st.y);
    expect(y3).toBeLessThan(GROUND - RUNE_RISE.fromUp + 1);
    r.update(RUNE_RISE.gapMs * RUNE_RISE.count + RUNE_RISE.lifeMs + 50, 16);
    expect(imgs.every((o) => o.st.visible === false)).toBe(true);

    const sp = fxApi(TEXTURES);
    const s = GUARDIAN_DOG_FX['light-sparks'](sp.api, fxEvent('light-sparks', 1200));
    const sparks = sp.rec.objects.filter((o) => o.kind === 'image');
    expect(sparks).toHaveLength(LIGHT_SPARKS.count);
    s.start();
    s.update(LIGHT_SPARKS.lifeMs * 3, 16);
    expect(sparks.filter((o) => o.st.visible === true).length).toBeGreaterThan(5);
    expect(sparks.every((o) => o.st.frame === 'rig-fx-dog-3')).toBe(true);
  });

  it('puts the ring centre on the collar of the dog', () => {
    const { api, rec } = fxApi(TEXTURES);
    const inst = GUARDIAN_DOG_FX['hit-ring'](api, fxEvent('hit-ring', HIT_RING_MS, 1500));
    inst.start();
    const rings = rec.objects.filter((o) => o.kind === 'graphics');
    expect(rings).toHaveLength(THEME.sizeCount['size.rig-hit-ring-steps']);
    expect(rings[0].st.x).toBe(470 + RING_OFFSET.dx);
    expect(rings[0].st.y).toBe(GROUND + RING_OFFSET.dy);
    // Below the astronaut (depth 20) and with it below the dog (21).
    expect(rings[0].st.depth).toBe(19.5);
  });

  it('slides the portrait strip with the dog in the visor (frame 4) in the screen layer', () => {
    const { api, rec, ui } = fxApi(TEXTURES);
    const inst = GUARDIAN_DOG_FX.portrait(api, fxEvent('portrait', 1000));
    expect(ui).toHaveLength(1);
    expect(PORTRAIT_FRAME).toBe(4);
    expect(rec.objects.find((o) => o.kind === 'image')?.st).toMatchObject({
      texture: 'finisher-portrait',
      frame: 4,
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
    expect(CHOREOS['moment-guardianDog']).toBe(MOMENT);
    expect(CHOREOS['cinematic-30']).toBe(CINE);
    for (const def of [MOMENT, CINE]) expect(validateChoreo(def, RIGS, CHOREO_RULES)).toEqual([]);
  });

  it.each([
    [26, 'moment-guardianDog'],
    [28, 'moment-guardianDog'],
    [29, 'moment-guardianDog'],
    [30, 'cinematic-30'],
  ])('buildFinisher for level %i gives %s with choreo and realMs', (level, id) => {
    const plan = buildFinisher(level, { reduceEffects: false, seen: [] });
    expect(plan.variantId).toBe(id);
    expect(plan.choreo?.variantId).toBe(id);
    expect(plan.realMs).toBe(id === 'cinematic-30' ? 15000 : 3500);
  });
});

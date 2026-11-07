// Choreographies of the sand worm (M13, AP-188): data rules, storyboard times and the effects of the boss.
import { describe, expect, it } from 'vitest';
import type { ChoreoDef, ChoreoEvent, ChoreoTrack } from '../../../src/contracts';
import {
  CINEMATIC_25,
  CRUMBLE_ORDER,
  HEAD_STAND,
  HIT_SOUND_KEY,
  MOMENT_GIANT_SAND_WORM,
  MOMENT_SAND_RAISE,
  MOMENT_WORM_DX,
  archOffset,
} from '../../../src/config/choreo/giantSandWorm';
import { CHOREOS } from '../../../src/config/choreo';
import { CHOREO_RULES } from '../../../src/config/finishers';
import { RIGS } from '../../../src/config/rigs';
import { ASTRONAUT_ANCHORS } from '../../../src/config/rigs/astronaut';
import {
  GIANT_SAND_WORM_CRUMBLE_STEP_MS,
  GIANT_SAND_WORM_RIG,
} from '../../../src/config/rigs/giantSandWorm';
import { STAGES } from '../../../src/config/choreo/stages';
import { THEME } from '../../../src/config/theme';
import {
  prepareChoreo,
  realDurationMs,
  reduceChoreo,
  sampleTrack,
  validateChoreo,
} from '../../../src/logic/choreo';
import { buildFinisher } from '../../../src/logic/finisher';
import { BOSS_FX, findStageFx } from '../../../src/scenes/finisher/fx';
import { GIANT_SAND_WORM_FX } from '../../../src/scenes/finisher/fx/giantSandWorm';

const GROUND = THEME.sizePx['size.rig-ground'];
const MOMENT = MOMENT_GIANT_SAND_WORM;
const CINE = CINEMATIC_25;
const BOTH: readonly ChoreoDef[] = [MOMENT, CINE];
const NAMED = BOTH.map((d) => [d.variantId, d] as const);

/** Real time (ms) at which the choreography clock reaches `choreoMs`. */
function realAt(def: ChoreoDef, choreoMs: number): number {
  for (const s of prepareChoreo(def).segments) {
    if (!s.stop && choreoMs >= s.choreoStart && choreoMs < s.choreoEnd) {
      return (
        s.realStart +
        ((choreoMs - s.choreoStart) / (s.choreoEnd - s.choreoStart)) * (s.realEnd - s.realStart)
      );
    }
    if (s.stop && choreoMs === s.choreoStart) return s.realStart;
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
  it.each(NAMED)('%s breaks no rule', (_id, def) => {
    expect(validateChoreo(def, RIGS, CHOREO_RULES)).toEqual([]);
  });

  it.each(NAMED)('%s reduced breaks no rule', (_id, def) => {
    const reduced = reduceChoreo(def);
    expect(reduced.events.length).toBeLessThan(def.events.length);
    expect(validateChoreo(reduced, RIGS, CHOREO_RULES)).toEqual([]);
  });

  it('plays the real lengths of the brief', () => {
    expect(realDurationMs(MOMENT)).toBe(3500);
    expect(realDurationMs(CINE)).toBe(15000);
  });

  it('has exactly one flash each', () => {
    expect(MOMENT.events.filter((e) => e.flash).map((e) => e.kind)).toEqual(['hitWhite']);
    expect(CINE.events.filter((e) => e.flash).map((e) => e.kind)).toEqual(['fx']);
    expect(fxNamed(CINE, 'impact-pair')[0].flash).toBe(true);
  });

  it('drops white, ring, shake and impact pair when reduced', () => {
    for (const def of BOTH) {
      const reduced = reduceChoreo(def);
      expect(reduced.events.some((e) => e.flash)).toBe(false);
      expect(events(reduced, 'hitWhite')).toHaveLength(0);
      expect(events(reduced, 'shake')).toHaveLength(0);
      expect(fxNamed(reduced, 'hit-ring')).toHaveLength(0);
      expect(fxNamed(reduced, 'impact-pair')).toHaveLength(0);
      expect(fxNamed(reduced, 'sand-cover')).toHaveLength(1);
      expect(reduced.tracks).toEqual(def.tracks);
    }
  });

  it('uses the placeholder sound once, on the hit stop', () => {
    for (const def of BOTH) {
      const sounds = events(def, 'sound');
      expect(sounds.map((s) => s.key)).toEqual([HIT_SOUND_KEY]);
      expect(sounds[0].atMs).toBe(events(def, 'hitStop')[0].atMs);
    }
  });
});

describe('fight moment "Segmentkette"', () => {
  it('stands the actors from the tokens, worm first', () => {
    expect(MOMENT.actors.map((a) => a.rigId)).toEqual(['giantSandWorm', 'astronaut']);
    expect(MOMENT.actors[1]).toMatchObject({
      x: THEME.sizePx['size.rig-astro-x-moment'],
      y: GROUND,
    });
    expect(MOMENT.actors[0]).toMatchObject({
      x: THEME.sizePx['size.rig-astro-x-moment'] + MOMENT_WORM_DX,
      y: GROUND - MOMENT_SAND_RAISE,
    });
  });

  it('hits at 1000 ms with hit stop 150 and slow motion 0.3', () => {
    expect(events(MOMENT, 'hitStop')[0]).toMatchObject({ atMs: 1000, ms: 150 });
    expect(events(MOMENT, 'timeScale')[0]).toMatchObject({ atMs: 1000, factor: 0.3 });
  });

  it('makes boss white and ring with the same atMs', () => {
    const white = events(MOMENT, 'hitWhite');
    expect(white).toHaveLength(1);
    expect(white[0]).toMatchObject({ atMs: 1000, targets: ['giantSandWorm'], flash: true });
    expect(fxNamed(MOMENT, 'hit-ring')).toEqual([
      {
        kind: 'fx',
        atMs: white[0].atMs,
        durationMs: 99,
        name: 'hit-ring',
        flash: false,
        reduce: 'drop',
      },
    ]);
  });

  it('shoots with down45 and the arm rotated by the fine range', () => {
    expect(sampleTrack(track(MOMENT, 'astronaut.raygun', 'pose'), 900)).toBe('down45');
    expect(sampleTrack(track(MOMENT, 'astronaut.arm-front', 'angle'), 900)).toBe(
      THEME.sizeCount['size.rig-fine-rotate'],
    );
  });

  it('stands on the head at the shot', () => {
    expect(sampleTrack(track(MOMENT, 'astronaut', 'x'), 900)).toBe(
      THEME.sizePx['size.rig-astro-x-moment'] + HEAD_STAND.dx,
    );
    expect(sampleTrack(track(MOMENT, 'astronaut', 'y'), 900)).toBe(HEAD_STAND.y);
  });

  it('shows the worm from 600 ms', () => {
    expect(sampleTrack(track(MOMENT, 'giantSandWorm', 'alpha'), 599)).toBe(0);
    expect(sampleTrack(track(MOMENT, 'giantSandWorm', 'alpha'), 600)).toBe(1);
    expect(events(MOMENT, 'text')[0].text).toBe('BEZWUNGEN!');
  });
});

describe('the chain crumbles from head to tail', () => {
  it('takes the step from the token', () => {
    expect(GIANT_SAND_WORM_CRUMBLE_STEP_MS).toBe(THEME.motionMs['motion.rig-crumble-step']);
  });

  it('lists every part exactly once', () => {
    expect(CRUMBLE_ORDER.flat().sort()).toEqual(GIANT_SAND_WORM_RIG.parts.map((p) => p.id).sort());
    expect(CRUMBLE_ORDER.map((l) => l[0])).toEqual([
      'head',
      'seg-1',
      'seg-2',
      'seg-3',
      'seg-4',
      'seg-5',
      'seg-6',
      'seg-7',
      'tail',
    ]);
  });

  it.each(NAMED)('%s: links start 120 ms real time apart', (_id, def) => {
    const starts = CRUMBLE_ORDER.map((link) => {
      const k = track(def, `giantSandWorm.${link[0]}`, 'pose').keys.find(
        (x) => x.value === 'crumble1',
      );
      expect(k).toBeDefined();
      return realAt(def, k!.atMs);
    });
    for (let i = 1; i < starts.length; i++) {
      // whole choreography ms inside slow motion (factor 0.3) round up to 3.4 real ms
      expect(Math.abs(starts[i] - starts[i - 1] - GIANT_SAND_WORM_CRUMBLE_STEP_MS)).toBeLessThan(4);
    }
  });

  it.each(NAMED)('%s: crumble1, crumble2, then hidden', (_id, def) => {
    for (const id of CRUMBLE_ORDER.flat()) {
      const poses = track(def, `giantSandWorm.${id}`, 'pose').keys.map((k) => String(k.value));
      expect(poses[poses.indexOf('crumble1') + 1], id).toBe('crumble2');
      expect(track(def, `giantSandWorm.${id}`, 'alpha').keys.at(-1)!.value).toBe(0);
    }
  });

  it('arches the chain by [k, -6k]', () => {
    for (const def of BOTH) {
      for (let k = 1; k <= 8; k++) {
        const id = k === 8 ? 'tail' : `seg-${k}`;
        const base = GIANT_SAND_WORM_RIG.parts.find((p) => p.id === id)!;
        expect(archOffset(k)).toEqual([k, -6 * k]);
        expect(sampleTrack(track(def, `giantSandWorm.${id}`, 'x'), 0)).toBe(base.x + k);
        expect(sampleTrack(track(def, `giantSandWorm.${id}`, 'y'), 0)).toBe(base.y - 6 * k);
      }
    }
  });
});

describe('cinematic level 25 "SONNENSPEER"', () => {
  it('has 5 shots', () => {
    expect(CINE.shots).toHaveLength(5);
    expect(CINE.shots!.slice(0, 4).map((s) => s.atMs)).toEqual([0, 3000, 6000, 9000]);
  });

  it('stands the actors on the cinematic tokens', () => {
    expect(CINE.actors.map((a) => a.rigId)).toEqual(['giantSandWorm', 'astronaut']);
    expect(CINE.actors[0].x).toBe(THEME.sizePx['size.rig-boss-x-cinematic']);
    expect(CINE.actors[1].x).toBe(THEME.sizePx['size.rig-astro-x-cinematic']);
  });

  it('names the spear and zooms only in shot 3', () => {
    expect(events(CINE, 'text')[0]).toMatchObject({ atMs: 8200, text: 'SONNENSPEER' });
    const zoom = track(CINE, 'camera', 'zoom');
    expect([0, 3000, 6500, 7500, 8500, 9500, 13000].map((t) => sampleTrack(zoom, t))).toEqual([
      1, 1, 1, 2, 1, 1, 1,
    ]);
  });

  it('has the impact pair and boss white at the same atMs', () => {
    const pair = fxNamed(CINE, 'impact-pair')[0];
    expect(pair).toMatchObject({ atMs: 9600, durationMs: 200, flash: true });
    expect(events(CINE, 'hitWhite').some((w) => w.atMs === pair.atMs)).toBe(true);
    expect(fxNamed(CINE, 'hit-ring')).toHaveLength(0);
  });

  it('starts the crumble with the last shot', () => {
    const head = track(CINE, 'giantSandWorm.head', 'pose').keys.find(
      (k) => k.value === 'crumble1',
    )!;
    expect(realAt(CINE, head.atMs)).toBeCloseTo(12000, 0);
    expect(events(CINE, 'text').at(-1)!.text).toBe('BEZWUNGEN!');
  });
});

describe('rig data rules', () => {
  it.each(NAMED)('%s moves the raygun with the arm pose (anchors)', (_id, def) => {
    for (const key of track(def, 'astronaut.arm-front', 'pose').keys) {
      const a =
        ASTRONAUT_ANCHORS['arm-front'][key.value as keyof (typeof ASTRONAUT_ANCHORS)['arm-front']];
      expect(sampleTrack(track(def, 'astronaut.raygun', 'pose'), key.atMs)).toBe(a.raygun.pose);
      expect(sampleTrack(track(def, 'astronaut.raygun', 'x'), key.atMs)).toBe(a.raygun.x);
      expect(sampleTrack(track(def, 'astronaut.raygun', 'y'), key.atMs)).toBe(a.raygun.y);
    }
  });

  it('keeps track keys sorted and effect names known', () => {
    for (const def of BOTH) {
      for (const t of def.tracks) {
        const times = t.keys.map((k) => k.atMs);
        expect(times).toEqual([...times].sort((a, b) => a - b));
      }
      for (const e of events(def, 'fx')) {
        expect(
          e.name === 'slash' || e.name in GIANT_SAND_WORM_FX || findStageFx(e.name) !== null,
          e.name,
        ).toBe(true);
      }
    }
    expect(BOSS_FX.giantSandWorm).toBe(GIANT_SAND_WORM_FX);
  });
});

describe('register and plan', () => {
  it('holds both choreographies', () => {
    expect(CHOREOS['moment-giantSandWorm']).toBe(MOMENT);
    expect(CHOREOS['cinematic-25']).toBe(CINE);
  });

  it.each([
    [21, 'moment-giantSandWorm'],
    [24, 'moment-giantSandWorm'],
    [25, 'cinematic-25'],
  ])('level %i gives %s', (level, id) => {
    const plan = buildFinisher(level, { reduceEffects: false, seen: [] });
    expect(plan.variantId).toBe(id);
    expect(plan.choreo?.variantId).toBe(id);
  });
});

describe('effects of the boss', () => {
  it('names the effects the choreographies call', () => {
    expect(Object.keys(GIANT_SAND_WORM_FX).sort()).toEqual(
      [
        'dune-calm',
        'hit-ring',
        'impact-pair',
        'portrait',
        'sand-cover',
        'sand-smooth',
        'sand-wave',
        'sand-wave-hold',
        'sand-wave-in',
        'shot-beam',
      ].sort(),
    );
  });
});

describe('stage world and letterbox (AP-196, Q-97)', () => {
  const worlds = (def: ChoreoDef) =>
    events(def, 'fx').filter((e) => e.name.startsWith('stage-world:'));
  const MOMENT_IDS = ['giantSandWorm-moment'];
  const CINE_IDS = ['giantSandWorm-1', 'giantSandWorm-3b', 'giantSandWorm-1'];

  it('enters the worlds in order, each a known preset, never a flash', () => {
    expect(worlds(MOMENT).map((e) => e.name.slice('stage-world:'.length))).toEqual(MOMENT_IDS);
    expect(worlds(CINE).map((e) => e.name.slice('stage-world:'.length))).toEqual(CINE_IDS);
    for (const def of BOTH) {
      for (const e of worlds(def)) {
        const id = e.name.slice('stage-world:'.length);
        expect(Object.prototype.hasOwnProperty.call(STAGES, id), id).toBe(true);
        expect(id.startsWith('giantSandWorm-'), id).toBe(true);
        expect(e.flash).toBe(false);
        expect(e.durationMs).toBeUndefined();
      }
    }
  });

  it('starts the first world and the one letterbox at 0', () => {
    for (const def of BOTH) {
      expect(worlds(def)[0].atMs).toBe(0);
      const bars = fxNamed(def, 'letterbox');
      expect(bars).toHaveLength(1);
      expect(bars[0].atMs).toBe(0);
      expect(bars[0].flash).toBe(false);
    }
  });

  it('changes the world at the shot boundaries of the storyboard', () => {
    expect(worlds(CINE).map((e) => e.atMs)).toEqual([0, 7000, 8200]);
    const moment = worlds(MOMENT).map((e) => e.atMs);
    expect(moment).toEqual([...moment].sort((a, b) => a - b));
    expect(moment[moment.length - 1]).toBeLessThan(MOMENT.durationMs);
  });

  it('keeps world and bars when reduced and adds no flash', () => {
    for (const def of BOTH) {
      const reduced = reduceChoreo(def);
      expect(worlds(reduced)).toHaveLength(worlds(def).length);
      expect(fxNamed(reduced, 'letterbox')).toHaveLength(1);
      expect(reduced.events.filter((e) => e.flash)).toHaveLength(0);
      expect(
        def.events.filter((e) => e.flash && e.kind === 'fx' && e.name.includes('stage')),
      ).toHaveLength(0);
    }
  });
});

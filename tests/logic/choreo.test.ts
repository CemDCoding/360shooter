import { describe, expect, it } from 'vitest';
import { CHOREO_RULES } from '../../src/config/finishers';
import { RIGS as REAL_RIGS } from '../../src/config/rigs';
import { CHOREOS } from '../../src/config/choreo';
import {
  CHOREO_VARIANT_IDS,
  type ChoreoDef,
  type ChoreoEvent,
  type ChoreoRuleId,
  type ChoreoTrack,
  type RigDef,
  type RigId,
} from '../../src/contracts';
import {
  applyEase,
  countFlashes,
  isChoreoVariantId,
  prepareChoreo,
  realDurationMs,
  reduceChoreo,
  sampleChoreo,
  sampleClock,
  sampleTrack,
  validateChoreo,
} from '../../src/logic/choreo';

/** Local one-part placeholder figures: the tests below target `<rig>.body` and do not depend on the real parts (AP-183). */
function placeholder(id: RigId): RigDef {
  return {
    id,
    parts: [
      {
        id: 'body',
        frame: `${id}-body`,
        silhouette: `${id}-body-white`,
        originX: 0.5,
        originY: 0.5,
        x: 0,
        y: 0,
        order: 0,
      },
    ],
  };
}
const RIGS: Readonly<Record<RigId, RigDef>> = {
  astronaut: placeholder('astronaut'),
  rootMonster: placeholder('rootMonster'),
  forestGhost: placeholder('forestGhost'),
  giantStone: placeholder('giantStone'),
  giantSandWorm: placeholder('giantSandWorm'),
  guardianDog: placeholder('guardianDog'),
  pharaoh: placeholder('pharaoh'),
};

const flashEvent = (atMs: number): ChoreoEvent => ({ kind: 'flash', atMs, flash: true });

/** Valid fight moment: real length 3550 ms (3400 choreography ms + 150 ms hit stop). */
function moment(): ChoreoDef {
  return {
    variantId: 'moment-rootMonster',
    actors: [
      { rigId: 'astronaut', x: 200, y: 180 },
      { rigId: 'rootMonster', x: 440, y: 180, flipX: true },
    ],
    durationMs: 3400,
    tracks: [
      {
        target: 'astronaut.body',
        property: 'x',
        keys: [
          { atMs: 0, value: 200, ease: 'hold' },
          { atMs: 1300, value: 200, ease: 'expo.out' },
          { atMs: 1400, value: 320, ease: 'linear' },
        ],
      },
      {
        target: 'rootMonster.body',
        property: 'angle',
        keys: [
          { atMs: 0, value: 0, ease: 'sine.inOut' },
          { atMs: 800, value: 15, ease: 'sine.inOut' },
        ],
      },
      {
        target: 'camera',
        property: 'zoom',
        keys: [
          { atMs: 0, value: 1, ease: 'linear' },
          { atMs: 1400, value: 1, ease: 'expo.out' },
          { atMs: 1500, value: 2, ease: 'hold' },
        ],
      },
    ],
    events: [
      {
        kind: 'hitStop',
        atMs: 1500,
        ms: 150,
        axis: 'x',
        targets: ['rootMonster.body'],
        flash: false,
      },
      flashEvent(1500),
      {
        kind: 'afterimage',
        atMs: 1300,
        parts: ['astronaut.body'],
        copies: 3,
        spacingMs: 20,
        fadeMs: 150,
        flash: false,
      },
      { kind: 'particles', atMs: 1500, texture: 'spark', count: 40, flash: false },
    ],
    beats: [
      { phase: 'anticipation', atMs: 1000, durationMs: 300 },
      { phase: 'action', atMs: 1300, durationMs: 100 },
      { phase: 'hitStop', atMs: 1500, durationMs: 150, final: true },
      { phase: 'followThrough', atMs: 2000, durationMs: 300 },
    ],
  };
}

/** Valid cinematic of a level: 15 s (20 s for level 40), 5 shots (6 for level 40). */
function cinematic(level: 4 | 40 = 4): ChoreoDef {
  const final = level === 40;
  const shots = final ? 6 : 5;
  const durationMs = final ? 20000 : 15000;
  return {
    variantId: `cinematic-${level}`,
    actors: [
      { rigId: 'astronaut', x: 200, y: 180 },
      { rigId: 'rootMonster', x: 440, y: 180 },
    ],
    durationMs,
    shots: Array.from({ length: shots }, (_, i) => ({
      atMs: (i * durationMs) / shots,
      camera: { scrollX: 0, scrollY: 0, zoom: 1 },
      axisFlip: i === shots - 1,
    })),
    tracks: [],
    events: [flashEvent(5000), flashEvent(9000)],
    beats: [],
  };
}

function rules(def: ChoreoDef, rigs: Partial<Record<RigId, RigDef>> = RIGS): ChoreoRuleId[] {
  return validateChoreo(def, rigs, CHOREO_RULES).map((v) => v.rule);
}

describe('easing', () => {
  it('hits 0 and 1 at the ends for every curve', () => {
    for (const e of [
      'linear',
      'sine.inOut',
      'sine.out',
      'expo.in',
      'expo.out',
      'back.out',
      'elastic.out',
    ] as const) {
      expect(applyEase(e, 0)).toBeCloseTo(0, 5);
      expect(applyEase(e, 1)).toBeCloseTo(1, 5);
    }
  });
  it('matches the Phaser formulas at 0.5', () => {
    expect(applyEase('linear', 0.5)).toBe(0.5);
    expect(applyEase('sine.inOut', 0.5)).toBeCloseTo(0.5, 10);
    expect(applyEase('sine.out', 0.5)).toBeCloseTo(Math.sin(Math.PI / 4), 10);
    expect(applyEase('expo.in', 0.5)).toBeCloseTo(Math.pow(2, -5), 10);
    expect(applyEase('expo.out', 0.5)).toBeCloseTo(1 - Math.pow(2, -5), 10);
    expect(applyEase('back.out', 0.5)).toBeCloseTo(1.0877, 3);
    expect(applyEase('back.out', 0.8)).toBeGreaterThan(1);
  });
  it('stepped jumps in levels, hold keeps the start value', () => {
    expect(applyEase('stepped', 0.1, 4)).toBeCloseTo(0.25);
    expect(applyEase('stepped', 0.3, 4)).toBeCloseTo(0.5);
    expect(applyEase('stepped', 0.99, 4)).toBeCloseTo(1);
    expect(applyEase('hold', 0.9)).toBe(0);
  });
  it('is deterministic', () => {
    expect(applyEase('elastic.out', 0.37)).toBe(applyEase('elastic.out', 0.37));
  });
});

describe('sampleTrack', () => {
  const track: ChoreoTrack = {
    target: 'astronaut.body',
    property: 'x',
    keys: [
      { atMs: 100, value: 10, ease: 'linear' },
      { atMs: 200, value: 20, ease: 'hold' },
      { atMs: 300, value: 40, ease: 'stepped', steps: 2 },
      { atMs: 400, value: 60, ease: 'linear' },
    ],
  };
  it('clamps before the first and after the last key', () => {
    expect(sampleTrack(track, 0)).toBe(10);
    expect(sampleTrack(track, 999)).toBe(60);
  });
  it('interpolates linearly between keys', () => {
    expect(sampleTrack(track, 150)).toBe(15);
  });
  it('hold keeps the value until the next key', () => {
    expect(sampleTrack(track, 200)).toBe(20);
    expect(sampleTrack(track, 299)).toBe(20);
    expect(sampleTrack(track, 300)).toBe(40);
  });
  it('stepped holds values within a level', () => {
    expect(sampleTrack(track, 310)).toBeCloseTo(50); // level 1 of 2 (halfway)
    expect(sampleTrack(track, 349)).toBeCloseTo(50);
    expect(sampleTrack(track, 360)).toBeCloseTo(60);
  });
  it('keeps pose and order values discrete and returns undefined for no keys', () => {
    const pose: ChoreoTrack = {
      target: 'astronaut.arm',
      property: 'pose',
      keys: [
        { atMs: 0, value: 'raised', ease: 'linear' },
        { atMs: 100, value: 'down', ease: 'linear' },
      ],
    };
    expect(sampleTrack(pose, 50)).toBe('raised');
    expect(sampleTrack(pose, 100)).toBe('down');
    expect(sampleTrack({ ...pose, keys: [] }, 10)).toBeUndefined();
  });
});

describe('real time mapping', () => {
  const base = (events: ChoreoEvent[]): ChoreoDef => ({
    variantId: 'moment-rootMonster',
    actors: [],
    durationMs: 1000,
    tracks: [
      {
        target: 'astronaut.body',
        property: 'x',
        keys: [
          { atMs: 0, value: 0, ease: 'linear' },
          { atMs: 1000, value: 1000, ease: 'linear' },
        ],
      },
    ],
    events,
    beats: [],
  });
  it('is the choreography length without timeScale and hitStop', () => {
    expect(realDurationMs(base([]))).toBe(1000);
  });
  it('slows the clock with timeScale', () => {
    const def = base([
      { kind: 'timeScale', atMs: 200, durationMs: 400, factor: 0.5, flash: false },
    ]);
    expect(realDurationMs(def)).toBeCloseTo(1000 + 400);
    expect(sampleChoreo(def, 200).choreoMs).toBeCloseTo(200);
    expect(sampleChoreo(def, 400).choreoMs).toBeCloseTo(300);
    expect(sampleChoreo(def, 1000).choreoMs).toBeCloseTo(600);
  });
  it('stops the clock during hitStop but not real time', () => {
    const def = base([
      { kind: 'hitStop', atMs: 500, ms: 150, axis: 'x', targets: [], flash: false },
    ]);
    expect(realDurationMs(def)).toBe(1150);
    const mid = sampleChoreo(def, 560);
    expect(mid.frozen).toBe(true);
    expect(mid.choreoMs).toBe(500);
    expect(mid.values[0].value).toBe(500);
    expect(sampleChoreo(def, 650).choreoMs).toBeCloseTo(500);
    expect(sampleChoreo(def, 750).choreoMs).toBeCloseTo(600);
    expect(sampleChoreo(def, 1150).done).toBe(true);
    expect(sampleChoreo(def, 1149).done).toBe(false);
  });
  it('combines timeScale and hitStop', () => {
    const def = base([
      { kind: 'timeScale', atMs: 0, durationMs: 500, factor: 0.5, flash: false },
      { kind: 'hitStop', atMs: 500, ms: 100, axis: 'y', targets: [], flash: false },
    ]);
    expect(realDurationMs(def)).toBeCloseTo(1000 + 500 + 100);
  });
  it('prepareChoreo + sampleClock give the clock of sampleChoreo without new objects (AP-182)', () => {
    const defs = [
      base([]),
      base([
        { kind: 'timeScale', atMs: 0, durationMs: 500, factor: 0.5, flash: false },
        { kind: 'hitStop', atMs: 500, ms: 100, axis: 'y', targets: [], flash: false },
        { kind: 'timeScale', atMs: 700, durationMs: 200, factor: 0.3, flash: false },
        { kind: 'hitStop', atMs: 1000, ms: 200, axis: 'x', targets: [], flash: false },
      ]),
      { ...base([]), durationMs: 0 },
    ];
    for (const def of defs) {
      const clock = prepareChoreo(def);
      expect(clock.realMs).toBe(realDurationMs(def));
      const out = { choreoMs: -1, frozen: true, done: true };
      for (let t = -10; t <= clock.realMs + 20; t += 7.3) {
        const want = sampleChoreo(def, t);
        const got = sampleClock(clock, t, out);
        expect(got).toBe(out);
        expect(got).toEqual({ choreoMs: want.choreoMs, frozen: want.frozen, done: want.done });
      }
    }
  });
});

describe('flashes and reduce effects', () => {
  it('counts flash events in real time inside a 1 s window', () => {
    const def: ChoreoDef = {
      ...moment(),
      events: [flashEvent(0), flashEvent(400), flashEvent(800), flashEvent(1200)],
    };
    expect(countFlashes(def)).toBe(3);
  });
  it('stretches events with timeScale so fewer land in one window', () => {
    const def: ChoreoDef = {
      ...moment(),
      events: [
        { kind: 'timeScale', atMs: 0, durationMs: 1000, factor: 0.5, flash: false },
        flashEvent(0),
        flashEvent(300),
        flashEvent(600),
      ],
    };
    expect(countFlashes(def)).toBe(2);
  });
  it('removes drop events and keeps movement', () => {
    const def: ChoreoDef = {
      ...moment(),
      events: [
        flashEvent(100),
        { kind: 'shake', atMs: 200, flash: false },
        { kind: 'impact', atMs: 300, texture: 'hit', flash: false },
        { kind: 'hitWhite', atMs: 400, targets: [], flash: false },
        { kind: 'particles', atMs: 500, texture: 's', count: 5, flash: true },
        { kind: 'particles', atMs: 600, texture: 's', count: 5, flash: false },
        { kind: 'impact', atMs: 700, texture: 'hit', flash: false, reduce: 'keep' },
        {
          kind: 'text',
          atMs: 800,
          text: 'X',
          color: 'finisher.title',
          flash: false,
          reduce: 'drop',
        },
        { kind: 'hitStop', atMs: 900, ms: 100, axis: 'x', targets: [], flash: false },
      ],
    };
    const r = reduceChoreo(def);
    expect(r.events.map((e) => e.kind)).toEqual(['particles', 'impact', 'hitStop']);
    expect(r.tracks).toBe(def.tracks);
    expect(r.beats).toBe(def.beats);
    expect(countFlashes(r)).toBe(0);
  });
});

describe('validateChoreo', () => {
  it('passes a valid fight moment and valid cinematics', () => {
    expect(validateChoreo(moment(), RIGS, CHOREO_RULES)).toEqual([]);
    expect(validateChoreo(cinematic(4), RIGS, CHOREO_RULES)).toEqual([]);
    expect(validateChoreo(cinematic(40), RIGS, CHOREO_RULES)).toEqual([]);
  });

  const beatCase = (
    phase: 'anticipation' | 'action' | 'hitStop' | 'followThrough',
    durationMs: number,
    final = false,
  ) => {
    const m = moment();
    return { ...m, beats: [{ phase, atMs: 1000, durationMs, final }] };
  };
  it('reports the grid rules', () => {
    expect(rules(beatCase('anticipation', 149))).toContain('anticipation');
    expect(rules(beatCase('anticipation', 601))).toContain('anticipation');
    expect(rules(beatCase('action', 121))).toContain('action');
    expect(rules(beatCase('hitStop', 99))).toContain('hitStop');
    expect(rules(beatCase('hitStop', 201))).toContain('hitStop');
    expect(rules(beatCase('hitStop', 300, true))).not.toContain('hitStop');
    expect(rules(beatCase('hitStop', 301, true))).toContain('hitStop');
    expect(rules(beatCase('followThrough', 199))).toContain('followThrough');
  });

  it('reports flash gap, flash count and extra moment flashes', () => {
    const gap = { ...cinematic(), events: [flashEvent(5000), flashEvent(5300)] };
    expect(rules(gap)).toContain('flashGap');
    const many = { ...cinematic(), events: [0, 300, 600, 900].map(flashEvent) };
    expect(rules(many)).toContain('flashCount');
    const spaced = { ...cinematic(), events: [0, 350, 700, 1050].map(flashEvent) };
    expect(rules(spaced)).toEqual([]);
    const m = moment();
    const extra = { ...m, events: [...m.events, flashEvent(500), flashEvent(2500)] };
    expect(rules(extra)).toContain('momentFlashes');
    const oneExtra = { ...m, events: [...m.events, flashEvent(2500)] };
    expect(rules(oneExtra)).not.toContain('momentFlashes');
  });

  it('reports the budget', () => {
    const part = RIGS.astronaut.parts[0];
    const many: RigDef = {
      id: 'astronaut',
      parts: Array.from({ length: 11 }, (_, i) => ({ ...part, id: `p${i}` })),
    };
    expect(rules(moment(), { ...RIGS, astronaut: many })).toContain('parts');
    const m = moment();
    const images = {
      ...m,
      events: [
        {
          kind: 'afterimage',
          atMs: 0,
          parts: [],
          copies: 5,
          spacingMs: 10,
          fadeMs: 10,
          flash: false,
        } as ChoreoEvent,
      ],
    };
    expect(rules(images)).toContain('afterimages');
    const dust = {
      ...m,
      events: [
        {
          kind: 'particles',
          atMs: 100,
          durationMs: 500,
          texture: 's',
          count: 100,
          flash: false,
        } as ChoreoEvent,
        {
          kind: 'particles',
          atMs: 300,
          durationMs: 500,
          texture: 's',
          count: 60,
          flash: false,
        } as ChoreoEvent,
      ],
    };
    expect(rules(dust)).toContain('particles');
    const apart = {
      ...dust,
      events: [dust.events[0], { ...dust.events[1], atMs: 700 } as ChoreoEvent],
    };
    expect(rules(apart)).not.toContain('particles');
  });

  it('reports rig depth', () => {
    const p = RIGS.astronaut.parts[0];
    const deep: RigDef = {
      id: 'astronaut',
      parts: [
        { ...p, id: 'a' },
        { ...p, id: 'b', parent: 'a' },
        { ...p, id: 'c', parent: 'b' },
      ],
    };
    expect(rules(moment(), { ...RIGS, astronaut: deep })).toContain('rigDepth');
    const flat: RigDef = { id: 'astronaut', parts: deep.parts.slice(0, 2) };
    expect(rules(moment(), { ...RIGS, astronaut: flat })).not.toContain('rigDepth');
  });

  it('reports rotation beyond 20 degrees without freeRotate', () => {
    const m = moment();
    const spin: ChoreoTrack = {
      target: 'rootMonster.body',
      property: 'angle',
      keys: [{ atMs: 0, value: 45, ease: 'linear' }],
    };
    const bad = { ...m, tracks: [spin] };
    expect(rules(bad)).toContain('rotation');
    const free: RigDef = {
      ...RIGS.rootMonster,
      parts: [{ ...RIGS.rootMonster.parts[0], freeRotate: true }],
    };
    expect(rules(bad, { ...RIGS, rootMonster: free })).not.toContain('rotation');
  });

  it('reports non-integer zoom holds and slow zoom transitions', () => {
    const m = moment();
    const zoom = (keys: ChoreoTrack['keys']): ChoreoDef => ({
      ...m,
      tracks: [{ target: 'camera', property: 'zoom', keys }],
    });
    expect(rules(zoom([{ atMs: 0, value: 1.5, ease: 'hold' }]))).toContain('zoom');
    expect(
      rules(
        zoom([
          { atMs: 0, value: 1, ease: 'linear' },
          { atMs: 201, value: 2, ease: 'hold' },
        ]),
      ),
    ).toContain('zoom');
    expect(
      rules(
        zoom([
          { atMs: 0, value: 1, ease: 'linear' },
          { atMs: 200, value: 2, ease: 'hold' },
        ]),
      ),
    ).not.toContain('zoom');
  });

  it('reports real length', () => {
    const m = moment();
    expect(rules({ ...m, durationMs: 2000 })).toContain('length');
    expect(rules({ ...m, durationMs: 3900 })).toContain('length'); // 3900 + 150 stop > 4000
    expect(rules({ ...cinematic(), durationMs: 16000 })).toContain('length');
    expect(rules({ ...cinematic(40), durationMs: 15000 })).toContain('length');
  });

  it('reports shot count and more than one axis flip', () => {
    const c = cinematic();
    expect(rules({ ...c, shots: c.shots?.slice(0, 4) })).toContain('shots');
    expect(rules({ ...cinematic(40), shots: cinematic().shots })).toContain('shots');
    const flips = { ...c, shots: c.shots?.map((s) => ({ ...s, axisFlip: true })) };
    expect(rules(flips)).toContain('axisFlip');
  });

  it('reports unknown rigs and parts', () => {
    expect(rules(moment(), { astronaut: RIGS.astronaut })).toContain('rig');
    const m = moment();
    const ghost: ChoreoTrack = {
      target: 'astronaut.tail',
      property: 'x',
      keys: [{ atMs: 0, value: 1, ease: 'linear' }],
    };
    expect(rules({ ...m, tracks: [ghost] })).toContain('rig');
  });
});

describe('registers', () => {
  it('has 7 rigs: astronaut and root monster with real parts, 5 placeholders, within the budget', () => {
    const ids = Object.keys(REAL_RIGS);
    expect(ids).toHaveLength(7);
    for (const rig of Object.values(REAL_RIGS)) {
      const real = rig.id === 'astronaut' || rig.id === 'rootMonster';
      expect(rig.parts).toHaveLength(real ? (rig.id === 'astronaut' ? 10 : 8) : 1);
      expect(rig.parts.length).toBeLessThanOrEqual(CHOREO_RULES.maxPartsPerRig);
    }
  });
  it('has the 12 choreography ids, only the two root monster entries are set', () => {
    expect(CHOREO_VARIANT_IDS).toHaveLength(12);
    expect(Object.keys(CHOREOS).sort()).toEqual([...CHOREO_VARIANT_IDS].sort());
    for (const id of CHOREO_VARIANT_IDS) {
      expect(CHOREOS[id] === undefined).toBe(id !== 'moment-rootMonster' && id !== 'cinematic-4');
    }
  });
  it('recognises choreography ids', () => {
    expect(isChoreoVariantId('moment-pharaoh')).toBe(true);
    expect(isChoreoVariantId('cinematic-40')).toBe(true);
    expect(isChoreoVariantId('cinematic-5')).toBe(false);
    expect(isChoreoVariantId('stage-1')).toBe(false);
  });
});

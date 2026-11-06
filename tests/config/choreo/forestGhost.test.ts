// Choreographies of the forest ghost (M13, AP-186, brief H-48 part 2b): data rules, storyboard times, the
// effects of the boss and a run through the real choreography player on a fake scene (no Phaser at run time).
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
  CINEMATIC_9,
  GHOST_BEHIND_X,
  HIT_SOUND_KEY,
  MOMENT_FOREST_GHOST,
} from '../../../src/config/choreo/forestGhost';
import { CHOREOS } from '../../../src/config/choreo';
import { CHOREO_RULES } from '../../../src/config/finishers';
import { RIGS } from '../../../src/config/rigs';
import { ASTRONAUT_ANCHORS } from '../../../src/config/rigs/astronaut';
import { THEME } from '../../../src/config/theme';
import {
  countFlashes,
  realDurationMs,
  reduceChoreo,
  sampleTrack,
  validateChoreo,
} from '../../../src/logic/choreo';
import { ChoreoPlayer } from '../../../src/scenes/finisher/choreoPlayer';
import type { ChoreoContext } from '../../../src/scenes/finisher/context';
import { BOSS_FX, type FxApi, type FxEvent } from '../../../src/scenes/finisher/fx';
import {
  CUT_LINE_Y,
  DECOY_CINE_1,
  DECOY_MOMENT_1,
  FOREST_GHOST_FX,
  decoyAt,
  splitShift,
} from '../../../src/scenes/finisher/fx/forestGhost';
import {
  FOREST_GHOST_REF_H,
  HIT_RING_MS,
  ringRadius,
} from '../../../src/scenes/finisher/fx/hitRing';
import { finisherLayout } from '../../../src/scenes/finisher/layout';
import { inkFrame, isSmearPose, silhouetteFrame } from '../../../src/scenes/finisher/rig';
import { debugFinisherData } from '../../../src/scenes/finisher/startData';
import { TextureBank } from '../../../src/scenes/finisher/textures';
import { SOUND_HIT } from '../../../src/scenes/finisher/timing';

const GROUND = THEME.sizePx['size.rig-ground'];
const SMEAR = THEME.motionMs['motion.rig-smear'];
const MOMENT = MOMENT_FOREST_GHOST;
const CINE = CINEMATIC_9;
const BOTH: readonly ChoreoDef[] = [MOMENT, CINE];

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

  it('has the register entries and the variant ids', () => {
    expect(CHOREOS['moment-forestGhost']).toBe(MOMENT);
    expect(CHOREOS['cinematic-9']).toBe(CINE);
    expect(MOMENT.variantId).toBe('moment-forestGhost');
    expect(CINE.variantId).toBe('cinematic-9');
  });

  it('plays 3.5 s (moment) and 15 s (cinematic), also reduced', () => {
    expect(realDurationMs(MOMENT)).toBe(3500);
    expect(realDurationMs(CINE)).toBe(15000);
    expect(realDurationMs(reduceChoreo(MOMENT))).toBe(3500);
    expect(realDurationMs(reduceChoreo(CINE))).toBe(15000);
  });

  it('has exactly one flash: the main hit', () => {
    expect(countFlashes(MOMENT)).toBe(1);
    expect(countFlashes(CINE)).toBe(1);
    expect(MOMENT.events.filter((e) => e.flash)).toHaveLength(1);
    expect(CINE.events.filter((e) => e.flash)).toHaveLength(1);
  });

  it('uses the placeholder sound only on the main hit', () => {
    expect(HIT_SOUND_KEY).toBe(SOUND_HIT);
    for (const def of BOTH) {
      const sounds = events(def, 'sound');
      expect(sounds.map((s) => s.key)).toEqual([HIT_SOUND_KEY]);
      expect(sounds[0].atMs).toBe(events(def, 'hitStop')[0].atMs);
    }
  });

  it('has 5 shots in the cinematic and the title near the end', () => {
    expect(CINE.shots).toHaveLength(5);
    expect(events(CINE, 'text').map((t) => t.text)).toContain('MONDSCHNITT');
    expect(events(MOMENT, 'text').map((t) => t.text)).toEqual(['BEZWUNGEN!']);
  });
});

describe('reduce effects', () => {
  it('drops flash, hit-white, shake and the ring, keeps the cut and the split picture', () => {
    for (const def of BOTH) {
      const reduced = reduceChoreo(def);
      expect(reduced.events.some((e) => e.flash)).toBe(false);
      expect(events(reduced, 'hitWhite')).toHaveLength(0);
      expect(events(reduced, 'shake')).toHaveLength(0);
      expect(fxNamed(reduced, 'hit-ring')).toHaveLength(0);
      expect(events(reduced, 'hitStop')).toHaveLength(1);
    }
    const reduced = reduceChoreo(CINE);
    expect(fxNamed(reduced, 'impact-pair')).toHaveLength(0);
    expect(fxNamed(reduced, 'cut-line')).toHaveLength(1);
    expect(fxNamed(reduced, 'cut-split')).toHaveLength(1);
  });
});

describe('main hit and ring (AP-194, AP-193)', () => {
  it('couples the ring and the hit-white at the same atMs, ring flagged reduce drop', () => {
    const ring = fxNamed(MOMENT, 'hit-ring');
    expect(ring).toHaveLength(1);
    expect(ring[0]).toMatchObject({ flash: false, reduce: 'drop', durationMs: HIT_RING_MS });
    const white = events(MOMENT, 'hitWhite')[0];
    expect(ring[0].atMs).toBe(white.atMs);
    expect(white.targets).toEqual(['forestGhost']);
  });

  it('couples hit-white and the impact pair at the same atMs in the cinematic', () => {
    const pair = fxNamed(CINE, 'impact-pair')[0];
    expect(events(CINE, 'hitWhite').some((w) => w.atMs === pair.atMs)).toBe(true);
    expect(fxNamed(CINE, 'hit-ring')).toHaveLength(0);
  });

  it('keeps the ring clear of the astronaut at the hit (Q-96)', () => {
    const astroX = sampleTrack(track(MOMENT, 'astronaut', 'x'), 1000);
    const ghostX = sampleTrack(track(MOMENT, 'forestGhost', 'x'), 1000);
    expect(typeof astroX).toBe('number');
    expect(ghostX).toBe(GHOST_BEHIND_X);
    const P = THEME.sizePx;
    const steps = THEME.sizeCount['size.rig-hit-ring-steps'];
    const reach =
      ringRadius(FOREST_GHOST_REF_H, 3) +
      (steps - 1) * P['size.rig-hit-ring-step-out'] +
      P['size.rig-hit-ring-ray-max'];
    // The astronaut stands at 170 + 70 behind the cut; the ring ends well before her.
    expect(Number(ghostX) + reach).toBeLessThan(Number(astroX));
  });
});

describe('rules for the data of the rig (PE-252)', () => {
  it.each(BOTH.map((d) => [d.variantId, d] as const))(
    '%s moves the arm children with the arm pose',
    (_id, def) => {
      for (const key of track(def, 'astronaut.arm-front', 'pose').keys) {
        const a =
          ASTRONAUT_ANCHORS['arm-front'][
            key.value as keyof (typeof ASTRONAUT_ANCHORS)['arm-front']
          ];
        expect(sampleTrack(track(def, 'astronaut.raygun', 'x'), key.atMs)).toBe(a.raygun.x);
        expect(sampleTrack(track(def, 'astronaut.raygun', 'y'), key.atMs)).toBe(a.raygun.y);
        for (const child of ['blade', 'blade-arc']) {
          expect(sampleTrack(track(def, `astronaut.${child}`, 'x'), key.atMs)).toBe(a.blade.x);
          expect(sampleTrack(track(def, `astronaut.${child}`, 'y'), key.atMs)).toBe(a.blade.y);
        }
      }
    },
  );

  it.each(BOTH.map((d) => [d.variantId, d] as const))(
    '%s never starts a pose track on a smear pose and lets smear poses stand long enough',
    (_id, def) => {
      for (const t of def.tracks.filter((x) => x.property === 'pose')) {
        expect(isSmearPose(String(t.keys[0].value))).toBe(false);
        t.keys.forEach((k, i) => {
          if (!isSmearPose(String(k.value))) return;
          const next = t.keys[i + 1];
          expect(next).toBeDefined();
          expect(next.atMs - k.atMs).toBeGreaterThanOrEqual(SMEAR);
        });
      }
    },
  );

  it('keeps every track target and pose name inside the rigs, keys sorted', () => {
    for (const def of BOTH) {
      for (const t of def.tracks) {
        const times = t.keys.map((k) => k.atMs);
        expect(times).toEqual([...times].sort((a, b) => a - b));
        expect(new Set(times).size).toBe(times.length);
        if (t.target === 'camera') continue;
        const [rigId, partId] = t.target.split('.');
        const rig: RigDef = RIGS[rigId as 'astronaut' | 'forestGhost'];
        if (!partId) continue;
        const part = rig.parts.find((p) => p.id === partId);
        expect(part, t.target).toBeDefined();
        if (t.property === 'pose' && part?.poses) {
          for (const k of t.keys) {
            if (k.value === 'none') continue;
            expect(Object.keys(part.poses), `${t.target} ${String(k.value)}`).toContain(k.value);
          }
        }
      }
    }
  });

  it('names only effects the boss module (or the built-in slash) provides', () => {
    for (const def of BOTH) {
      for (const e of events(def, 'fx')) {
        expect(e.name === 'slash' || e.name in FOREST_GHOST_FX, e.name).toBe(true);
      }
    }
    expect(BOSS_FX.forestGhost).toBe(FOREST_GHOST_FX);
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
const DATA: FinisherStartData = debugFinisherData(5, 640, 360, false);
const ATLAS = 'finisher-rig-forestGhost';

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

const TEXTURES: Readonly<Record<string, readonly string[]>> = {
  [DATA.boss.texture]: [],
  [DATA.player.texture]: [],
  [ATLAS]: [
    ...rigFrames(RIGS.astronaut),
    ...rigFrames(RIGS.forestGhost),
    ...Array.from({ length: 4 }, (_, i) => `rig-fx-ghost-${i}`),
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
    const camera = { setZoom: () => camera, setScroll: () => camera };
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
    expect(rec.sounds).toEqual([HIT_SOUND_KEY]);
    player.destroy();
  });
});

// ---------------------------------------------------------------- effects of the boss

function fxApi(textures: Readonly<Record<string, readonly string[]>>): {
  api: FxApi;
  rec: FakeRecord;
} {
  const { ctx, rec } = makeContext(textures);
  const fig = (x: number, top: number) => ({
    container: { x, y: GROUND, scaleX: 3, scaleY: 3 },
    top: () => top,
    partIndex: () => 0,
    worldOf: (_i: number, out: { x: number; y: number; scaleX: number; scaleY: number }) => {
      out.x = x;
      out.y = GROUND - 40;
      out.scaleX = -3;
      out.scaleY = 3;
      return out;
    },
    images: [],
    parts: [],
    atlasLoaded: false,
  });
  const figures = { astronaut: fig(240, 240), forestGhost: fig(470, 100) };
  const api = {
    ctx,
    atlas: ATLAS,
    bossScale: 3,
    figure: (id: string) => figures[id as keyof typeof figures] ?? null,
    boss: () => figures.forestGhost,
  } as unknown as FxApi;
  return { api, rec };
}

const fxEvent = (name: string, durationMs?: number, atMs = 0): FxEvent => ({
  kind: 'fx',
  name,
  atMs,
  flash: false,
  ...(durationMs === undefined ? {} : { durationMs }),
});

describe('effects of the boss', () => {
  it('names the effects the choreographies call', () => {
    expect(Object.keys(FOREST_GHOST_FX).sort()).toEqual(
      [
        'cut-line',
        'cut-split',
        'decoy-cine-1',
        'decoy-cine-2',
        'decoy-moment-1',
        'decoy-moment-2',
        'hit-ring',
        'impact-pair',
        'lights',
        'moonlight',
        'portrait',
        'shot-beam',
      ].sort(),
    );
  });

  it('builds every object in the factory and only sets values in update', () => {
    for (const [name, factory] of Object.entries(FOREST_GHOST_FX)) {
      const { api, rec } = fxApi(TEXTURES);
      const inst = factory(api, fxEvent(name, 1000));
      const built = rec.adds;
      inst.start();
      for (let t = 0; t <= 1200; t += 16) inst.update(t, 16);
      inst.stop();
      expect(rec.adds, name).toBe(built);
      inst.destroy();
    }
  });

  it('does nothing without the atlas (placeholder run)', () => {
    for (const name of ['decoy-moment-1', 'moonlight', 'lights']) {
      const { api, rec } = fxApi({});
      const inst = FOREST_GHOST_FX[name](api, fxEvent(name, 500));
      inst.start();
      inst.update(100, 16);
      inst.stop();
      inst.destroy();
      expect(rec.objects, name).toHaveLength(0);
    }
  });

  it('glides a decoy out of the ghost and holds its last waypoint', () => {
    const at = { x: 0, y: 0, alpha: 0 };
    decoyAt(DECOY_MOMENT_1, 0, at);
    expect(at).toEqual({ x: 470, y: GROUND, alpha: 0 });
    decoyAt(DECOY_MOMENT_1, 75, at);
    expect(at.x).toBe(447);
    expect(at.alpha).toBeGreaterThan(0);
    decoyAt(DECOY_MOMENT_1, 5000, at);
    expect(at.x).toBe(370);
    decoyAt(DECOY_CINE_1, 400, at);
    expect(at.x).toBe(330);
  });

  it('shifts the cut picture 14 px at the hit, 18 px later, back to 0', () => {
    expect(splitShift(0)).toBe(14);
    expect(splitShift(1200)).toBe(18);
    expect(splitShift(2400)).toBe(0);
    expect(splitShift(5000)).toBe(0);
    expect(CUT_LINE_Y).toBeLessThan(GROUND);
  });

  it('draws the ring under the figures through hitRingFx', () => {
    const { api } = fxApi(TEXTURES);
    const inst = FOREST_GHOST_FX['hit-ring'](api, fxEvent('hit-ring', HIT_RING_MS, 1000));
    inst.start();
    inst.update(50, 16);
    inst.stop();
    inst.destroy();
  });
});

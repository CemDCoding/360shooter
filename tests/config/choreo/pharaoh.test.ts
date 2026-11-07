// Choreographies of the pharaoh (M13, AP-190): data rules, storyboard times and the effects of the boss.
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
  CINEMATIC_40,
  CINE_GILD,
  CINE_X,
  HIT_SOUND_KEY,
  MOMENT_GILD,
  MOMENT_PHARAOH,
  SHOT_STARTS,
  SLOW_FINAL,
} from '../../../src/config/choreo/pharaoh';
import { CHOREOS } from '../../../src/config/choreo';
import { CHOREO_RULES } from '../../../src/config/finishers';
import { RIGS } from '../../../src/config/rigs';
import { ASTRONAUT_RIG } from '../../../src/config/rigs/astronaut';
import { PHARAOH_GILD_ORDER, PHARAOH_RIG } from '../../../src/config/rigs/pharaoh';
import { THEME } from '../../../src/config/theme';
import {
  prepareChoreo,
  realDurationMs,
  reduceChoreo,
  sampleTrack,
  validateChoreo,
} from '../../../src/logic/choreo';
import { ChoreoPlayer } from '../../../src/scenes/finisher/choreoPlayer';
import type { ChoreoContext } from '../../../src/scenes/finisher/context';
import { BOSS_FX } from '../../../src/scenes/finisher/fx';
import { BOSS_REF_H, ringRadius } from '../../../src/scenes/finisher/fx/hitRing';
import { FLASHBACK, FLASHBACK_BOSSES, PHARAOH_FX } from '../../../src/scenes/finisher/fx/pharaoh';
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
const MOMENT = MOMENT_PHARAOH;
const CINE = CINEMATIC_40;
const BOTH: readonly ChoreoDef[] = [MOMENT, CINE];
const NAMED = BOTH.map((d) => [d.variantId, d] as const);

const track = (def: ChoreoDef, target: string, property: ChoreoTrack['property']): ChoreoTrack => {
  const t = def.tracks.find((x) => x.target === target && x.property === property);
  if (!t) throw new Error(`no track ${target}.${property}`);
  return t;
};

const events = <K extends ChoreoEvent['kind']>(def: ChoreoDef, kind: K) =>
  def.events.filter((e): e is Extract<ChoreoEvent, { kind: K }> => e.kind === kind);

const fxNamed = (def: ChoreoDef, name: string) => events(def, 'fx').filter((e) => e.name === name);

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
    expect(realDurationMs(CINE)).toBe(20000);
    expect(CINE.shots).toHaveLength(6);
  });

  it('is registered', () => {
    expect(CHOREOS['moment-pharaoh']).toBe(MOMENT);
    expect(CHOREOS['cinematic-40']).toBe(CINE);
  });

  it('uses the placeholder sound once, on the hit stop', () => {
    expect(HIT_SOUND_KEY).toBe(SOUND_HIT);
    for (const def of BOTH) {
      const sounds = events(def, 'sound');
      expect(sounds.map((s) => s.key)).toEqual([HIT_SOUND_KEY]);
      expect(sounds[0].atMs).toBe(events(def, 'hitStop')[0].atMs);
    }
  });

  it('drops white, ring, shake and impact pair when reduced', () => {
    for (const def of BOTH) {
      const reduced = reduceChoreo(def);
      expect(reduced.events.some((e) => e.flash)).toBe(false);
      expect(events(reduced, 'hitWhite')).toHaveLength(0);
      expect(events(reduced, 'shake')).toHaveLength(0);
      expect(fxNamed(reduced, 'hit-ring')).toHaveLength(0);
      expect(fxNamed(reduced, 'impact-pair')).toHaveLength(0);
      expect(reduced.tracks).toEqual(def.tracks);
    }
  });
});

describe('fight moment "Raetsel"', () => {
  it('stands the actors from the tokens, boss first', () => {
    expect(MOMENT.actors.map((a) => a.rigId)).toEqual(['pharaoh', 'astronaut']);
    expect(MOMENT.actors[1]).toMatchObject({
      x: THEME.sizePx['size.rig-astro-x-moment'],
      y: GROUND,
    });
    expect(MOMENT.actors[0]).toMatchObject({
      x: THEME.sizePx['size.rig-boss-x-moment'],
      y: GROUND,
    });
  });

  it('hits at 1100 ms with hit stop 200 and slow motion 0.3', () => {
    expect(events(MOMENT, 'hitStop')[0]).toMatchObject({ atMs: 1100, ms: 200 });
    expect(events(MOMENT, 'timeScale')[0]).toMatchObject({ atMs: 1100, factor: 0.3 });
  });

  it('has exactly one flash: boss white 100 ms, with the ring on the same atMs', () => {
    expect(MOMENT.events.filter((e) => e.flash).map((e) => e.kind)).toEqual(['hitWhite']);
    const white = events(MOMENT, 'hitWhite');
    expect(white[0]).toMatchObject({
      atMs: 1100,
      durationMs: THEME.motionMs['motion.rig-hit-white'],
      targets: ['pharaoh'],
    });
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
    expect(fxNamed(MOMENT, 'impact-pair')).toHaveLength(0);
  });

  it('shoots steeply up at the symbol with the arm turned by the fine range', () => {
    expect(sampleTrack(track(MOMENT, 'astronaut.raygun', 'pose'), 1050)).toBe('up45');
    expect(
      Math.abs(sampleTrack(track(MOMENT, 'astronaut.arm-front', 'angle'), 1050) as number),
    ).toBeLessThanOrEqual(THEME.sizeCount['size.rig-fine-rotate']);
  });

  it('turns the spiral round at the hit and draws it in', () => {
    const orb = track(MOMENT, 'pharaoh.orb-ring', 'pose');
    expect(sampleTrack(orb, 1099)).not.toBe(sampleTrack(orb, 1101));
    expect(sampleTrack(track(MOMENT, 'pharaoh.orb-ring', 'alpha'), MOMENT.durationMs)).toBe(0);
  });

  it('shows the riddle and shot beam effects', () => {
    expect(fxNamed(MOMENT, 'riddle')).toHaveLength(1);
    expect(fxNamed(MOMENT, 'shot-beam')).toHaveLength(1);
    expect(events(MOMENT, 'text')[0].text).toBe('BEZWUNGEN!');
  });

  it('keeps the astronaut clear of the ring (Q-96): the ring is not in the cinematic', () => {
    expect(fxNamed(CINE, 'hit-ring')).toHaveLength(0);
    const ring = fxNamed(MOMENT, 'hit-ring')[0];
    const x = sampleTrack(track(MOMENT, 'astronaut', 'x'), ring.atMs) as number;
    const P = THEME.sizePx;
    // Largest ring radius = inner radius + steps outwards + longest ray; the raygun reaches ~50 px forward.
    const outer =
      ringRadius(BOSS_REF_H, THEME.sizeCount['size.rig-scale-boss-moment']) +
      (THEME.sizeCount['size.rig-hit-ring-steps'] - 1) * P['size.rig-hit-ring-step-out'] +
      P['size.rig-hit-ring-ray-max'];
    const bossX = MOMENT.actors[0].x;
    expect(x + 50).toBeLessThan(bossX - outer);
  });

  it('anticipates 700 ms only as two consecutive beats', () => {
    const ants = (MOMENT.beats ?? []).filter((b) => b.phase === 'anticipation');
    expect(ants.length).toBeGreaterThanOrEqual(2);
    for (const b of ants) expect(b.durationMs).toBeLessThanOrEqual(600);
  });
});

describe('gilding from the feet upwards', () => {
  it.each([
    ['moment', MOMENT, MOMENT_GILD],
    ['cinematic', CINE, CINE_GILD],
  ] as const)('%s: half gold robe, then every part in order', (_n, def, g) => {
    expect(PHARAOH_GILD_ORDER[0]).toBe('robe');
    const when = (id: string, value: string) =>
      track(def, `pharaoh.${id}`, 'pose').keys.find((k) => k.value === value)!.atMs;
    const half = when('robe', 'gilded-half');
    const times = PHARAOH_GILD_ORDER.map((id) => when(id, 'gilded'));
    expect(g.times).toHaveLength(PHARAOH_GILD_ORDER.length);
    expect(half).toBeLessThan(times[0]);
    for (let i = 1; i < times.length; i++) expect(times[i]).toBeGreaterThan(times[i - 1]);
  });
});

describe('cinematic level 40 "LETZTER STERN"', () => {
  it('has 6 shots, one axis change at shot 5', () => {
    expect(CINE.shots).toHaveLength(6);
    expect(CINE.shots!.filter((s) => s.axisFlip)).toHaveLength(1);
    expect(CINE.shots![4].axisFlip).toBe(true);
    expect(CINE.shots![4].atMs).toBe(SHOT_STARTS[4]);
  });

  it('mirrors both figures at the axis change and swaps their sides', () => {
    const at = SHOT_STARTS[4];
    expect(sampleTrack(track(CINE, 'astronaut', 'scaleX'), at - 1)).toBe(1);
    expect(sampleTrack(track(CINE, 'astronaut', 'scaleX'), at)).toBe(-1);
    expect(sampleTrack(track(CINE, 'pharaoh', 'scaleX'), at)).toBe(-1);
    expect(sampleTrack(track(CINE, 'pharaoh', 'x'), at)).toBe(CINE_X.astronaut);
  });

  it('hits at 13800 ms with hit stop 200 and the longest slow motion', () => {
    expect(events(CINE, 'hitStop')[0]).toMatchObject({ atMs: 13800, ms: 200 });
    expect(events(CINE, 'timeScale')[0]).toMatchObject({ atMs: 13800, factor: SLOW_FINAL });
    expect(SLOW_FINAL).toBe(0.2);
  });

  it('has the full-screen impact pair as its only flash, on the hit', () => {
    expect(CINE.events.filter((e) => e.flash).map((e) => e.kind)).toEqual(['fx']);
    const pair = fxNamed(CINE, 'impact-pair');
    expect(pair).toHaveLength(1);
    expect(pair[0].atMs).toBe(events(CINE, 'hitStop')[0].atMs);
    expect(fxNamed(CINE, 'hit-ring')).toHaveLength(0);
  });

  it('keeps shot 3 (flashback) without any flash', () => {
    const [from, to] = [SHOT_STARTS[2], SHOT_STARTS[3]];
    const inside = CINE.events.filter((e) => e.atMs >= from && e.atMs < to);
    expect(inside.some((e) => e.flash)).toBe(false);
    expect(fxNamed(CINE, 'flashback')).toEqual([
      expect.objectContaining({ atMs: from, durationMs: to - from, flash: false }),
    ]);
  });

  it('has no flash in the first two shots or the last', () => {
    const early = CINE.events.filter((e) => e.atMs < SHOT_STARTS[2]);
    expect(early.some((e) => e.flash)).toBe(false);
    const late = CINE.events.filter((e) => e.atMs > events(CINE, 'hitStop')[0].atMs);
    expect(late.some((e) => e.flash)).toBe(false);
  });

  it('times the dawn gilding in the last shot', () => {
    expect(CINE_GILD.half).toBeGreaterThan(16700);
    expect(realAt(CINE, track(CINE, 'pharaoh.head', 'pose').keys.at(-1)!.atMs)).toBeGreaterThan(
      16700,
    );
  });
});

describe('smear spacing', () => {
  it.each(NAMED)('%s: smear poses keep their frame time', (_id, def) => {
    for (const t of def.tracks.filter((x) => x.property === 'pose')) {
      expect(isSmearPose(String(t.keys[0].value)), t.target).toBe(false);
      const min = smearMsOf({ id: t.target.split('.')[1] ?? '' });
      t.keys.forEach((k, i) => {
        const next = t.keys[i + 1];
        if (!next) return;
        expect(
          next.atMs - k.atMs,
          `${t.target} ${String(k.value)} at ${k.atMs}`,
        ).toBeGreaterThanOrEqual(min);
      });
    }
  });
});

describe('effects of the pharaoh', () => {
  it('has every effect the choreographies name, in the module of the boss', () => {
    expect(BOSS_FX.pharaoh).toBe(PHARAOH_FX);
    for (const def of BOTH) {
      for (const e of events(def, 'fx')) expect(PHARAOH_FX[e.name], e.name).toBeTypeOf('function');
    }
    expect(PHARAOH_FX['impact-pair']).toBe(ROOT_MONSTER_FX['impact-pair']);
  });

  it('has the flashback for the five defeated bosses in three groups', () => {
    expect(FLASHBACK_BOSSES).toHaveLength(5);
    expect(FLASHBACK.groups.flat().sort()).toEqual([0, 1, 2, 3, 4]);
    expect(FLASHBACK.groups).toHaveLength(3);
  });
});

// ---------------------------------------------------------------- fake scene

interface FakeRecord {
  adds: number;
  sounds: string[];
}

function fakeObject(): unknown {
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
  };
  const proxy: unknown = new Proxy(st, {
    get(t, p) {
      if (typeof p === 'symbol' || p === 'then') return undefined;
      if (p === 'getTextBounds') return () => ({ local: { width: 40, height: 8 } });
      if (p in t) return t[p];
      return (...args: unknown[]) => {
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
        return proxy;
      };
    },
  });
  return proxy;
}

function fakeScene(textures: Readonly<Record<string, readonly string[]>>) {
  const rec: FakeRecord = { adds: 0, sounds: [] };
  const known = new Map<string, Set<string>>(
    Object.entries(textures).map(([k, f]) => [k, new Set(f)]),
  );
  const add = new Proxy(
    {},
    {
      get(_t, p) {
        if (typeof p === 'symbol') return undefined;
        return () => {
          rec.adds += 1;
          return fakeObject();
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

const OWN: Readonly<Record<string, readonly string[]>> = {
  [DATA.boss.texture]: [],
  [DATA.player.texture]: [],
  'finisher-rig-pharaoh': [
    ...rigFrames(ASTRONAUT_RIG),
    ...rigFrames(PHARAOH_RIG),
    ...frames('rig-fx-pharaoh', 5),
    ...frames('rig-prop-riddle', 6),
  ],
  'finisher-portrait': ['0', '1', '2', '3', '4', '5'],
};
/** The atlases of the five defeated bosses, loaded for the flashback. */
const WITH_FLASHBACK: Readonly<Record<string, readonly string[]>> = {
  ...OWN,
  ...Object.fromEntries(
    FLASHBACK_BOSSES.map((id) => [`finisher-rig-${id}`, rigFrames(RIGS[id])] as const),
  ),
};

function makeContext(textures: Readonly<Record<string, readonly string[]>>, reduced = false) {
  const { scene, rec } = fakeScene(textures);
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
    addUi: () => undefined,
  };
  return { ctx, rec };
}

describe('the choreography player plays both choreographies', () => {
  const cases: [string, ChoreoDef, boolean, Readonly<Record<string, readonly string[]>>][] = [
    ['moment', MOMENT, false, OWN],
    ['moment reduced', reduceChoreo(MOMENT), true, OWN],
    ['cinematic', CINE, false, WITH_FLASHBACK],
    ['cinematic reduced', reduceChoreo(CINE), true, WITH_FLASHBACK],
    ['cinematic without the atlases of the other bosses', CINE, false, OWN],
    ['moment without any rig frames', MOMENT, false, { [DATA.boss.texture]: [] }],
  ];

  it.each(cases)(
    '%s runs to the end at 60 fps without creating objects',
    (_name, def, reduced, textures) => {
      const { ctx, rec } = makeContext(textures, reduced);
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
      expect(rec.sounds).toEqual([SOUND_HIT]);
      player.destroy();
    },
  );
});

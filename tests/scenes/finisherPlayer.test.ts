// Choreography player of the finisher scene (M13, AP-182, PE-246, PE-247, PE-248, PE-252, brief H-46).
// Runs the player in Node on a fake scene: every game object is a Proxy that records its calls and keeps
// position, scale, alpha, visibility, texture and frame. No Phaser at run time.
import type Phaser from 'phaser';
import { describe, expect, it } from 'vitest';
import type {
  ChoreoDef,
  ChoreoEvent,
  FinisherStartData,
  RigDef,
  RigPartDef,
  SafeInsets,
} from '../../src/contracts';
import { CHOREO_RULES } from '../../src/config/finishers';
import { RIGS } from '../../src/config/rigs';
import { OPACITY, THEME } from '../../src/config/theme';
import { buildFinisher } from '../../src/logic/finisher';
import { countFlashes, validateChoreo } from '../../src/logic/choreo';
import { ChoreoPlayer, type ChoreoPlayerSource } from '../../src/scenes/finisher/choreoPlayer';
import type { ChoreoContext } from '../../src/scenes/finisher/context';
import { DEBUG_CHOREO } from '../../src/scenes/finisher/debugChoreo';
import { finisherLayout } from '../../src/scenes/finisher/layout';
import {
  atlasKey,
  fineAngle,
  isSmearPose,
  newSmearState,
  resolvePose,
  rigScale,
  silhouetteFrame,
} from '../../src/scenes/finisher/rig';
import { FINISHER_ATLASES } from '../../src/config/assets';
import { atlasToLoad, choreoOf, debugFinisherData } from '../../src/scenes/finisher/startData';
import { TextureBank } from '../../src/scenes/finisher/textures';
import { SOUND_CHARGE } from '../../src/scenes/finisher/timing';
import {
  AFTERIMAGE_ALPHA,
  AFTERIMAGE_COPIES,
  AFTERIMAGE_FADE_MS,
  AFTERIMAGE_FADE_STEPS,
  AFTERIMAGE_GAP_MS,
  afterimageAlpha,
} from '../../src/scenes/finisher/trails';
import sceneSrc from '../../src/scenes/FinisherScene.ts?raw';
import playerSrc from '../../src/scenes/finisher/choreoPlayer.ts?raw';
import rigSrc from '../../src/scenes/finisher/rig.ts?raw';
import trailsSrc from '../../src/scenes/finisher/trails.ts?raw';
import sparksSrc from '../../src/scenes/finisher/sparks.ts?raw';
import shotsSrc from '../../src/scenes/finisher/shots.ts?raw';
import fxSrc from '../../src/scenes/finisher/fx/index.ts?raw';

// ---------------------------------------------------------------- fake scene

/** Calls that need WebGL (tint, FX, pipelines); the Canvas renderer ignores or cannot draw them. */
const WEBGL_ONLY = ['setTint', 'setTintFill', 'preFX', 'postFX', 'setPipeline', 'setPostPipeline'];

interface FakeObject {
  kind: string;
  st: Record<string, unknown>;
  calls: string[];
}

interface FakeRecord {
  objects: FakeObject[];
  /** `scene.add.*` calls (creation of game objects). */
  adds: number;
  /** WebGL-only calls or factories used. */
  webglOnly: string[];
  sounds: string[];
  canvases: string[];
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
  const obj: FakeObject = { kind, st, calls: [] };
  rec.objects.push(obj);
  const proxy: unknown = new Proxy(st, {
    get(t, p) {
      if (typeof p === 'symbol' || p === 'then') return undefined;
      if (WEBGL_ONLY.includes(p)) rec.webglOnly.push(`${kind}.${p}`);
      if (p === 'preFX' || p === 'postFX') return undefined;
      if (p === 'getTextBounds') return () => ({ local: { width: 40, height: 8 } });
      if (p in t) return t[p];
      return (...args: unknown[]) => {
        obj.calls.push(p);
        if (p === 'setPosition') {
          t.x = args[0];
          t.y = args[1] ?? args[0];
        } else if (p === 'setScale') {
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

/** Loaded textures: key to frame names (an entry with frames is an atlas). */
type TextureList = Readonly<Record<string, readonly string[]>>;

function fakeScene(textures: TextureList): { scene: Phaser.Scene; rec: FakeRecord } {
  const rec: FakeRecord = { objects: [], adds: 0, webglOnly: [], sounds: [], canvases: [] };
  const known = new Map<string, Set<string>>(
    Object.entries(textures).map(([k, f]) => [k, new Set(f)]),
  );
  const add = new Proxy(
    {},
    {
      get(_t, p) {
        if (typeof p === 'symbol') return undefined;
        if (p === 'rope' || p === 'particles') rec.webglOnly.push(`add.${p}`);
        return (...args: unknown[]) => {
          rec.adds += 1;
          const init: Record<string, unknown> =
            p === 'image' ? { texture: args[2], frame: args[3] } : {};
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
        rec.canvases.push(k);
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

interface Run {
  player: ChoreoPlayer;
  rec: FakeRecord;
  camera: { zoom: number; scrollX: number; scrollY: number };
}

function makePlayer(
  data: FinisherStartData,
  def: ChoreoDef,
  textures: TextureList,
  source: ChoreoPlayerSource = { rigs: RIGS },
  webgl = false,
): Run {
  const { scene, rec } = fakeScene(textures);
  const camera = { zoom: 1, scrollX: 0, scrollY: 0 };
  const ctx: ChoreoContext = {
    scene,
    data,
    plan: data.plan,
    layout: finisherLayout(640, 360, NO_INSETS, false),
    webgl,
    stageX: 0,
    textures: new TextureBank(scene),
    fontKey: 'font',
    playSound: (key) => {
      rec.sounds.push(key);
    },
    addWorld: () => undefined,
    addUi: () => undefined,
  };
  const cam = {
    setZoom(z?: number) {
      camera.zoom = z ?? 1;
      return cam;
    },
    setScroll(x: number, y?: number) {
      camera.scrollX = x;
      camera.scrollY = y ?? x;
      return cam;
    },
  };
  return { player: new ChoreoPlayer(ctx, def, cam, source), rec, camera };
}

const images = (rec: FakeRecord): FakeObject[] => rec.objects.filter((o) => o.kind === 'image');

// ---------------------------------------------------------------- data

const DATA = debugFinisherData(0, 640, 360, false);
/** Textures of the placeholder run: game sprites and the M10 hit and shard images, no rig atlas. */
const PLACEHOLDER_TEXTURES: TextureList = {
  [DATA.boss.texture]: [],
  [DATA.player.texture]: [],
  'finisher-hit': ['0', '1', '2', '3', '4', '5'],
  'finisher-shards': [],
};

/** Every frame of a rig: pose frames and their `<Bogen>-sil-<Index>` silhouettes. */
function rigFrames(rig: RigDef): string[] {
  return rig.parts.flatMap((p) => {
    const frames = [p.frame, ...Object.values(p.poses ?? {})];
    return [...frames, ...frames.map((f) => silhouetteFrame(p, f))];
  });
}

/** The loaded atlas `finisher-rig-rootMonster` (AP-183 rigs) plus the game sprites and the hit image. */
const RIG_ATLAS = 'finisher-rig-rootMonster';
const RIG_TEXTURES: TextureList = {
  ...PLACEHOLDER_TEXTURES,
  [RIG_ATLAS]: [
    ...rigFrames(RIGS.astronaut),
    ...rigFrames(RIGS.rootMonster),
    ...Array.from({ length: 8 }, (_, i) => `rig-fx-root-${i}`),
  ],
};

function part(id: string, frame: string, extra: Partial<RigPartDef> = {}): RigPartDef {
  return {
    id,
    frame,
    silhouette: frame.replace(/-(\d+)$/, '-sil-$1'),
    originX: 0.5,
    originY: 1,
    x: 0,
    y: 0,
    order: 0,
    ...extra,
  };
}

/** Test figures with poses, drawn from the atlas `finisher-rig-rootMonster`. */
const ATLAS_RIGS: ChoreoPlayerSource['rigs'] = {
  astronaut: {
    id: 'astronaut',
    parts: [
      part('body', 'astro-body-0', { poses: { stand: 'astro-body-0', smear: 'astro-body-3' } }),
    ],
  } satisfies RigDef,
  rootMonster: {
    id: 'rootMonster',
    parts: [part('body', 'root-body-0', { poses: { hurt: 'root-body-2' } })],
  } satisfies RigDef,
};
const ATLAS_TEXTURES: TextureList = {
  'finisher-rig-rootMonster': [
    'astro-body-0',
    'astro-body-3',
    'astro-body-sil-0',
    'astro-body-sil-3',
    'root-body-0',
    'root-body-2',
    'root-body-sil-0',
    'root-body-sil-2',
  ],
};

function choreo(over: Partial<ChoreoDef>): ChoreoDef {
  return {
    variantId: 'moment-rootMonster',
    actors: [
      { rigId: 'astronaut', x: 170, y: 300 },
      { rigId: 'rootMonster', x: 470, y: 300 },
    ],
    durationMs: 1000,
    tracks: [],
    events: [],
    beats: [],
    ...over,
  };
}

/** Plays a player to the end with a fixed frame length; returns the number of frames. */
function playOut(p: ChoreoPlayer, dt: number, each?: () => void): number {
  let n = 0;
  while (!p.done && n < 100000) {
    p.update(dt);
    each?.();
    n++;
  }
  return n;
}

// ---------------------------------------------------------------- tests

describe('debug choreography (AP-183 rigs)', () => {
  it('is valid against the real rigs and uses every event kind exactly once', () => {
    expect(validateChoreo(DEBUG_CHOREO, RIGS, CHOREO_RULES)).toEqual([]);
    // Every part named by tracks and afterimages exists (the player would skip unknown ones silently).
    const known = (target: string): boolean => {
      const [rigId, partId] = target.split('.');
      const rig = RIGS[rigId as keyof typeof RIGS];
      return !!rig && (partId === undefined || rig.parts.some((p) => p.id === partId));
    };
    for (const t of DEBUG_CHOREO.tracks) {
      if (t.target !== 'camera') expect(known(t.target), t.target).toBe(true);
    }
    for (const e of DEBUG_CHOREO.events) {
      if (e.kind === 'afterimage') for (const p of e.parts) expect(known(p), p).toBe(true);
      if (e.kind === 'hitWhite' || e.kind === 'hitStop') {
        for (const p of e.targets) expect(known(p), p).toBe(true);
      }
    }
    // Pose tracks name poses of their part; sparks use a pre-coloured frame of the atlas.
    for (const t of DEBUG_CHOREO.tracks) {
      if (t.property !== 'pose') continue;
      const [rigId, partId] = t.target.split('.');
      const p = RIGS[rigId as keyof typeof RIGS].parts.find((q) => q.id === partId);
      for (const k of t.keys) expect(Object.keys(p?.poses ?? {})).toContain(k.value);
    }
    const sparks = DEBUG_CHOREO.events.find((e) => e.kind === 'particles');
    expect(RIG_TEXTURES[RIG_ATLAS]).toContain(sparks?.kind === 'particles' && sparks.texture);
    const kinds: ChoreoEvent['kind'][] = [
      'hitStop',
      'afterimage',
      'particles',
      'hitWhite',
      'impact',
      'flash',
      'shake',
      'timeScale',
      'text',
      'sound',
      'fx',
    ];
    for (const k of kinds) {
      expect(DEBUG_CHOREO.events.filter((e) => e.kind === k)).toHaveLength(1);
    }
    expect(DEBUG_CHOREO.events).toHaveLength(kinds.length);
    expect(countFlashes(DEBUG_CHOREO)).toBe(1);
  });

  it('is played for ?finisher=0 only; other levels keep the M10 plan', () => {
    expect(choreoOf(DATA.plan)).toBe(DATA.plan.choreo);
    expect(DATA.plan.realMs).toBeGreaterThan(DEBUG_CHOREO.durationMs);
    expect(choreoOf(debugFinisherData(5, 640, 360, false).plan)).toBeNull();
  });
});

describe('M10 fallback', () => {
  it('a plan without choreography plays the M10 steps', () => {
    for (const level of [5, 14, 40]) {
      const plan = buildFinisher(level, { reduceEffects: false, seen: [] });
      expect(plan.choreo).toBeUndefined();
      expect(choreoOf(plan)).toBeNull();
      expect(plan.steps.length).toBeGreaterThan(0);
    }
  });

  it('rejects a choreography without the shape the player needs', () => {
    const plan = DATA.plan;
    const broken = { ...plan, choreo: { ...DEBUG_CHOREO, events: 'x' } };
    expect(choreoOf(broken as unknown as typeof plan)).toBeNull();
    expect(choreoOf({ ...plan, choreo: { ...DEBUG_CHOREO, durationMs: 0 } })).toBeNull();
  });
});

describe('player under Canvas (debug choreography, rig atlas loaded)', () => {
  it('builds every effect without tint, FX or Rope and creates nothing in the update', () => {
    const run = makePlayer(DATA, DEBUG_CHOREO, RIG_TEXTURES);
    const { player, rec } = run;
    expect(player.figures.every((f) => f.atlasLoaded)).toBe(true);
    expect(player.runnerCount).toBe(DEBUG_CHOREO.events.length);
    expect(player.afterimagePools.size).toBe(2);
    for (const pool of player.afterimagePools.values()) expect(pool.images).toHaveLength(3);
    expect(player.sparkPool?.capacity).toBe(CHOREO_RULES.maxParticles);
    expect(rec.canvases).toEqual([]);
    const created = rec.adds;
    const partImages = images(rec)
      .filter((o) => o.st.texture === RIG_ATLAS)
      .slice(0, 18);
    const bossImages = partImages.slice(RIGS.astronaut.parts.length);

    let maxSparks = 0;
    let allWhite = false;
    let flashShown = false;
    let maxZoom = 0;
    const framesSeen = new Set<unknown>();
    playOut(player, 1000 / 60, () => {
      maxSparks = Math.max(maxSparks, player.sparkPool?.alive ?? 0);
      allWhite ||= bossImages.every((o) => /-sil-\d+$/.test(String(o.st.frame)));
      flashShown ||= rec.objects.some((o) => o.kind === 'rectangle' && o.st.visible === true);
      maxZoom = Math.max(maxZoom, run.camera.zoom);
      for (const o of partImages) framesSeen.add(o.st.frame);
    });

    expect(rec.adds).toBe(created);
    expect(rec.webglOnly).toEqual([]);
    expect(maxSparks).toBe(24);
    // Hit-white: every boss part on its `-sil-` frame at once.
    expect(allWhite).toBe(true);
    // Pose and smear frames of the atlas were shown (torso smear, legs, blade growth, cracked trunk).
    for (const f of [
      'rig-astro-torso-2',
      'rig-astro-leg-front-4',
      'rig-astro-blade-2',
      'rig-astro-blade-0',
      'rig-root-trunk-left-1',
      'rig-root-jaw-1',
    ]) {
      expect(framesSeen.has(f), f).toBe(true);
    }
    expect(flashShown).toBe(true);
    expect(maxZoom).toBe(2);
    expect(rec.sounds).toEqual([SOUND_CHARGE]);
    const slash = rec.objects.filter((o) => o.kind === 'graphics');
    expect(slash).toHaveLength(1);
    expect(slash[0].calls.filter((c) => c === 'fillRect')).toHaveLength(2);
    expect(rec.objects.filter((o) => o.kind === 'bitmapText')).toHaveLength(1);
    // Back on the start camera at the end.
    expect(run.camera.zoom).toBe(1);
    player.destroy();
    expect(player.done).toBe(true);
  });

  it('falls back to the game sprites without the atlas (silhouette drawn once, no sparks)', () => {
    const { player, rec } = makePlayer(DATA, DEBUG_CHOREO, PLACEHOLDER_TEXTURES);
    expect(player.figures.some((f) => f.atlasLoaded)).toBe(false);
    expect(player.sparkPool).toBeNull();
    expect(rec.canvases.some((k) => k.startsWith('finisher-rt-sil-'))).toBe(true);
    const created = rec.adds;
    let silShown = false;
    playOut(player, 1000 / 60, () => {
      silShown ||= images(rec).some((o) => String(o.st.texture).startsWith('finisher-rt-sil-'));
    });
    expect(silShown).toBe(true);
    expect(rec.adds).toBe(created);
    expect(rec.webglOnly).toEqual([]);
  });

  it('tints the title only under WebGL', () => {
    const { player, rec } = makePlayer(DATA, DEBUG_CHOREO, RIG_TEXTURES, { rigs: RIGS }, true);
    playOut(player, 1000 / 60);
    expect(rec.webglOnly).toEqual(['bitmapText.setTint']);
  });

  it('takes the same real time at 30 and 60 fps', () => {
    for (const fps of [30, 60]) {
      const dt = 1000 / fps;
      const { player } = makePlayer(DATA, choreoOf(DATA.plan) as ChoreoDef, RIG_TEXTURES);
      expect(player.realMs).toBe(DATA.plan.realMs);
      playOut(player, dt);
      expect(player.elapsedMs).toBeGreaterThanOrEqual(player.realMs);
      expect(player.elapsedMs - player.realMs).toBeLessThan(dt);
      expect(player.choreoMs).toBe((choreoOf(DATA.plan) as ChoreoDef).durationMs);
    }
  });

  it('drops flash, impact, shake and hit-white with "reduce effects"', () => {
    const reduced = debugFinisherData(0, 640, 360, true);
    const def = choreoOf(reduced.plan);
    expect(def).not.toBeNull();
    const kinds = new Set(def?.events.map((e) => e.kind));
    for (const k of CHOREO_RULES.reduceDropKinds) expect(kinds.has(k)).toBe(false);
    const { player, rec } = makePlayer(reduced, def as ChoreoDef, RIG_TEXTURES);
    playOut(player, 1000 / 60);
    expect(rec.objects.some((o) => o.kind === 'rectangle')).toBe(false);
  });
});

describe('afterimages (H-46)', () => {
  it('uses the tokens: 3 copies, alpha 0.55/0.35/0.18, gap 33 ms, fade 150 ms in 3 steps', () => {
    expect(AFTERIMAGE_COPIES).toBe(3);
    expect(AFTERIMAGE_ALPHA).toEqual([0.55, 0.35, 0.18]);
    expect(AFTERIMAGE_GAP_MS).toBe(33);
    expect(AFTERIMAGE_FADE_MS).toBe(150);
    const levels = new Set<number>();
    for (let t = 0; t < AFTERIMAGE_FADE_MS; t++)
      levels.add(afterimageAlpha(0, t, AFTERIMAGE_FADE_MS));
    // Start value plus three steps down (the last one reaches 0).
    expect(levels.size).toBe(AFTERIMAGE_FADE_STEPS + 1);
    expect(levels.has(0)).toBe(true);
    expect(afterimageAlpha(0, AFTERIMAGE_FADE_MS, AFTERIMAGE_FADE_MS)).toBe(0);
  });

  it('copy k trails the part by (k + 1) * 33 ms and fades out after the trail', () => {
    const def = choreo({
      tracks: [
        {
          target: 'astronaut',
          property: 'x',
          keys: [
            { atMs: 0, value: 0, ease: 'linear' },
            { atMs: 1000, value: 1000, ease: 'hold' },
          ],
        },
      ],
      events: [
        {
          kind: 'afterimage',
          atMs: 0,
          durationMs: 400,
          parts: ['astronaut.body'],
          copies: 3,
          spacingMs: AFTERIMAGE_GAP_MS,
          fadeMs: AFTERIMAGE_FADE_MS,
          flash: false,
        },
      ],
    });
    // Local one-part test figures: the part sits on the figure root, so its x is the track value.
    const { player } = makePlayer(DATA, def, PLACEHOLDER_TEXTURES, { rigs: ATLAS_RIGS });
    // 3 ms frames (333 fps): every copy time (267, 234, 201 ms) is a recorded sample.
    for (let i = 0; i < 100; i++) player.update(3);
    const pool = [...player.afterimagePools.values()][0];
    const copies = pool.images as unknown as Record<string, unknown>[];
    copies.forEach((img, k) => {
      expect(img.visible).toBe(true);
      expect(img.alpha).toBe(AFTERIMAGE_ALPHA[k]);
      expect(img.x).toBe(300 - (k + 1) * AFTERIMAGE_GAP_MS);
    });
    for (let i = 0; i < 100 + AFTERIMAGE_FADE_MS + 10; i++) player.update(1);
    for (const img of copies) expect(img.visible).toBe(false);
  });
});

describe('smear poses (H-46 11a)', () => {
  it('a smear pose stands 33 to 66 ms real time, also in slow motion, and is no flash', () => {
    const smearMs = THEME.motionMs['motion.rig-smear'];
    expect(isSmearPose('smear')).toBe(true);
    expect(isSmearPose('arc2')).toBe(true);
    expect(isSmearPose('stand')).toBe(false);
    for (const [fps, sampledMs] of [
      [60, 10],
      [30, 10],
      [60, 200],
      [30, 200],
    ]) {
      const dt = 1000 / fps;
      const st = newSmearState();
      let first = -1;
      let last = -1;
      for (let t = 0; t < 400; t += dt) {
        const sampled = t < sampledMs ? 'smear' : 'stand';
        const shown = resolvePose(st, sampled, 'stand', t, smearMs);
        if (shown === 'smear') {
          if (first < 0) first = t;
          last = t + dt;
        }
      }
      expect(last - first).toBeGreaterThanOrEqual(smearMs);
      expect(last - first).toBeLessThanOrEqual(2 * smearMs + dt);
    }
  });

  it('the player shows the smear frame 33 to 66 ms under slow motion', () => {
    const def = choreo({
      tracks: [
        {
          target: 'astronaut.body',
          property: 'pose',
          keys: [
            { atMs: 0, value: 'stand', ease: 'hold' },
            { atMs: 300, value: 'smear', ease: 'hold' },
            { atMs: 333, value: 'stand', ease: 'hold' },
          ],
        },
      ],
      events: [{ kind: 'timeScale', atMs: 200, durationMs: 400, factor: 0.3, flash: false }],
    });
    expect(countFlashes(def)).toBe(0);
    const { player, rec } = makePlayer(DATA, def, ATLAS_TEXTURES, { rigs: ATLAS_RIGS });
    const astro = images(rec)[0];
    const dt = 1000 / 60;
    let first = -1;
    let last = -1;
    playOut(player, dt, () => {
      if (astro.st.frame === 'astro-body-3') {
        if (first < 0) first = player.elapsedMs;
        last = player.elapsedMs + dt;
      }
    });
    expect(first).toBeGreaterThan(0);
    expect(last - first).toBeGreaterThanOrEqual(33);
    expect(last - first).toBeLessThanOrEqual(66 + dt);
  });
});

describe('hit-white from the -sil- frames (PE-252)', () => {
  it('maps frames to <Bogen>-sil-<Index>', () => {
    const p = part('body', 'root-body-0');
    expect(silhouetteFrame(p, 'root-body-0')).toBe('root-body-sil-0');
    expect(silhouetteFrame(p, 'root-arm-12')).toBe('root-arm-sil-12');
    expect(silhouetteFrame(p, 'root-blade')).toBe(p.silhouette);
  });

  it('shows the silhouette frame of the current pose while hit-white runs', () => {
    const def = choreo({
      tracks: [
        {
          target: 'rootMonster.body',
          property: 'pose',
          keys: [{ atMs: 0, value: 'hurt', ease: 'hold' }],
        },
      ],
      events: [
        { kind: 'hitWhite', atMs: 100, durationMs: 100, targets: ['rootMonster'], flash: false },
      ],
    });
    const { player, rec } = makePlayer(DATA, def, ATLAS_TEXTURES, { rigs: ATLAS_RIGS });
    const boss = images(rec)[1];
    const seen = new Set<unknown>();
    playOut(player, 1000 / 60, () => seen.add(boss.st.frame));
    expect(seen).toEqual(new Set(['root-body-2', 'root-body-sil-2']));
    expect(rec.webglOnly).toEqual([]);
    expect(atlasKey(def)).toBe('finisher-rig-rootMonster');
  });
});

describe('figures and tokens', () => {
  it('scales and fine rotation follow H-46', () => {
    expect(rigScale('astronaut', DEBUG_CHOREO)).toBe(2);
    expect(rigScale('rootMonster', DEBUG_CHOREO)).toBe(3);
    expect(rigScale('rootMonster', { ...DEBUG_CHOREO, variantId: 'cinematic-4' })).toBe(4);
    expect(fineAngle(null, 45)).toBe(20);
    expect(fineAngle({ freeRotate: true }, 45)).toBe(45);
  });

  it('THEME holds every H-46 rig token', () => {
    expect(THEME.colors['finisher.slash'].css).toBe('#ffffff');
    expect(THEME.colors['finisher.slash-rim'].css).toBe('#ff6b8a');
    expect(THEME.sizePx['size.rig-ground']).toBe(300);
    expect(THEME.sizePx['size.rig-slash']).toBe(2);
    expect(THEME.sizePx['size.rig-slash-rim']).toBe(1);
    expect(THEME.sizeCount['size.rig-scale-astronaut']).toBe(2);
    expect(THEME.sizeCount['size.rig-scale-boss-moment']).toBe(3);
    expect(THEME.sizeCount['size.rig-scale-boss-cinematic']).toBe(4);
    expect(THEME.sizeCount['size.rig-afterimages']).toBe(3);
    expect(THEME.sizeCount['size.rig-fine-rotate']).toBe(20);
    expect(THEME.motionMs['motion.rig-smear']).toBe(33);
    expect(THEME.motionMs['motion.rig-afterimage-gap']).toBe(33);
    expect(THEME.motionMs['motion.rig-afterimage-fade']).toBe(150);
    expect(THEME.motionMs['motion.rig-blade-step']).toBe(80);
    expect(OPACITY['rig-afterimage-1']).toBe(0.55);
    expect(OPACITY['rig-afterimage-2']).toBe(0.35);
    expect(OPACITY['rig-afterimage-3']).toBe(0.18);
  });
});

describe('rig atlas loading', () => {
  it('loads the atlas of the boss rig from FINISHER_ATLASES once', () => {
    const atlas = atlasToLoad(DEBUG_CHOREO, () => false);
    expect(atlas).toEqual(FINISHER_ATLASES.find((a) => a.key === RIG_ATLAS));
    expect(atlas?.path).toMatch(/finisher-rig-rootMonster\.png$/);
    expect(atlas?.jsonPath).toMatch(/finisher-rig-rootMonster\.json$/);
    // Loaded already: nothing to do.
    expect(atlasToLoad(DEBUG_CHOREO, (k) => k === RIG_ATLAS)).toBeNull();
    // Not registered (later bosses): nothing to load, the figures show the game sprites.
    const ghost = choreo({
      variantId: 'moment-forestGhost',
      actors: [
        { rigId: 'astronaut', x: 170, y: 300 },
        { rigId: 'forestGhost', x: 470, y: 300 },
      ],
    });
    expect(atlasToLoad(ghost, () => false)).toBeNull();
  });

  it('FinisherScene loads it in preload, only for a choreography', () => {
    expect(sceneSrc).toMatch(
      /preload\(\): void \{[\s\S]*?choreoOf\(plan\)[\s\S]*?atlasToLoad\(def, \(key\) => this\.textures\.exists\(key\)\)[\s\S]*?this\.load\.atlas\(atlas\.key, atlas\.path, atlas\.jsonPath\)/,
    );
  });
});

describe('wiring', () => {
  it('FinisherScene plays a choreography with the player and keeps the M10 path', () => {
    expect(sceneSrc).toMatch(/const choreo = choreoOf\(plan\);\s*if \(choreo\) \{/);
    expect(sceneSrc).toContain('new ChoreoPlayer(ctx, def, main, { rigs: RIGS })');
    expect(sceneSrc).toContain('player.update(');
    expect(sceneSrc).toMatch(/canSkip\(plan, this\.player\.elapsedMs\)\) this\.finish\(\)/);
    expect(sceneSrc).toContain('if (player.done) this.finish()');
    expect(sceneSrc).toContain('this.player?.destroy()');
    expect(sceneSrc).toContain('this.choreoCtx?.textures.destroy()');
    // Cameras go with the camera manager on SHUTDOWN; removing them here would double-destroy.
    expect(sceneSrc).not.toMatch(/cameras\.remove\(/);
    expect(sceneSrc).toContain('this.add.timeline(this.timelineEvents(plan))');
  });

  it('the player modules stay Canvas-safe and Phaser-free at run time', () => {
    for (const src of [playerSrc, rigSrc, trailsSrc, sparksSrc, shotsSrc, fxSrc]) {
      expect(src).not.toMatch(/setTintFill|preFX|postFX|add\.rope|add\.particles|setPipeline/);
      expect(src).not.toMatch(/^import Phaser/m);
    }
    // No allocation per frame: the clock is prepared once, the per-frame loops are index loops.
    expect(playerSrc).toContain('prepareChoreo(def)');
    expect(playerSrc).not.toMatch(/sampleChoreo\(/);
    const update = playerSrc.slice(playerSrc.indexOf('  update(dtMs: number)'));
    expect(update.slice(0, update.indexOf('\n  }\n'))).not.toMatch(/for \(const|forEach|\.map\(/);
    const frame = rigSrc.slice(rigSrc.indexOf('  beginFrame(): void'));
    expect(frame.slice(0, frame.indexOf('\n  }\n'))).not.toMatch(/forEach|for \(const/);
    expect(playerSrc).toMatch(/if \(this\.ctx\.webgl\) label\.setTint\(/);
    expect(playerSrc.match(/setTint\(/g)).toHaveLength(1);
  });
});

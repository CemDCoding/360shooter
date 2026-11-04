// Choreographies of the root monster (M13, AP-184, brief H-46): data rules, storyboard times, the effects of
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
  CINEMATIC_4,
  HIT_SOUND_KEY,
  MOMENT_ROOT_MONSTER,
} from '../../../src/config/choreo/rootMonster';
import { ASTRONAUT_ANCHORS, ASTRONAUT_RIG } from '../../../src/config/rigs/astronaut';
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
import { ChoreoPlayer } from '../../../src/scenes/finisher/choreoPlayer';
import { CHOREO_DEPTH, type ChoreoContext } from '../../../src/scenes/finisher/context';
import {
  BULGE_STAGE_MS,
  HEDGE_STAGE_MS,
  LEAVES,
  PETALS,
  ROOT_MONSTER_FX,
  SPIKE_FADE_ALPHA,
  SPIKE_FADE_MS,
  stageAt,
} from '../../../src/scenes/finisher/fx/rootMonster';
import { BOSS_FX, type FxApi, type FxEvent } from '../../../src/scenes/finisher/fx';
import { finisherLayout } from '../../../src/scenes/finisher/layout';
import { isSmearPose, silhouetteFrame } from '../../../src/scenes/finisher/rig';
import { debugFinisherData } from '../../../src/scenes/finisher/startData';
import { TextureBank } from '../../../src/scenes/finisher/textures';
import { SOUND_HIT } from '../../../src/scenes/finisher/timing';

const GROUND = THEME.sizePx['size.rig-ground'];
const BLADE_STEP = THEME.motionMs['motion.rig-blade-step'];
const SMEAR = THEME.motionMs['motion.rig-smear'];
const MOMENT = MOMENT_ROOT_MONSTER;
const CINE = CINEMATIC_4;
const BOTH: readonly ChoreoDef[] = [MOMENT, CINE];

/** Real time (ms) at which the choreography clock reaches `choreoMs` (start of a hit stop there). */
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
  });

  it.each(BOTH.map((d) => [d.variantId, d] as const))('%s reduced breaks no rule', (_id, def) => {
    const reduced = reduceChoreo(def);
    expect(reduced.events.length).toBeLessThan(def.events.length);
    expect(validateChoreo(reduced, RIGS)).toEqual([]);
  });

  it('plays the real lengths of the brief: moment 3.5 s, cinematic 15 s', () => {
    expect(realDurationMs(MOMENT)).toBe(3500);
    expect(realDurationMs(CINE)).toBe(15000);
    expect(realDurationMs(reduceChoreo(MOMENT))).toBe(3500);
    expect(realDurationMs(reduceChoreo(CINE))).toBe(15000);
  });

  it('has exactly one flash: the main hit', () => {
    expect(MOMENT.events.filter((e) => e.flash)).toHaveLength(1);
    expect(CINE.events.filter((e) => e.flash)).toHaveLength(1);
    expect(countFlashes(MOMENT)).toBe(1);
    expect(countFlashes(CINE)).toBe(1);
  });

  it('removes flash, hit-white, shake and the impact pair when reduced, but keeps the cut line', () => {
    for (const def of BOTH) {
      const reduced = reduceChoreo(def);
      expect(reduced.events.some((e) => e.flash)).toBe(false);
      expect(events(reduced, 'hitWhite')).toHaveLength(0);
      expect(events(reduced, 'shake')).toHaveLength(0);
      expect(events(reduced, 'hitStop')).toHaveLength(1);
      expect(events(reduced, 'timeScale')).toHaveLength(1);
    }
    expect(fxNamed(reduceChoreo(MOMENT), 'slash')).toHaveLength(1);
    expect(fxNamed(reduceChoreo(CINE), 'cut-line')).toHaveLength(1);
    expect(fxNamed(reduceChoreo(CINE), 'impact-pair')).toHaveLength(0);
  });

  it('uses the placeholder sound only on the main hit (PE-237)', () => {
    expect(HIT_SOUND_KEY).toBe(SOUND_HIT);
    for (const def of BOTH) {
      const sounds = events(def, 'sound');
      expect(sounds.map((s) => s.key)).toEqual([HIT_SOUND_KEY]);
      expect(sounds[0].atMs).toBe(events(def, 'hitStop')[0].atMs);
    }
  });
});

describe('fight moment "Rosenschnitt" (table of the brief, boards M1 to M9)', () => {
  it('follows the beat table in real time', () => {
    // Beat lengths are choreography time; the hit stop and the slow motion stretch the last ones.
    const real = (b: (typeof MOMENT.beats)[number]) => [
      realAt(MOMENT, b.atMs),
      b.phase === 'hitStop' ? 1200 : realAt(MOMENT, b.atMs + b.durationMs),
    ];
    const phases = MOMENT.beats.map((b) => [b.phase, ...real(b)]);
    expect(phases).toEqual([
      ['anticipation', 0, 500],
      ['action', 500, 600],
      ['anticipation', 700, 900],
      ['action', 900, 1000],
      ['hitStop', 1000, 1200],
      ['reaction', 1000, 2200],
      ['followThrough', 2200, 3500],
    ]);
  });

  it('has the hit stop (200 ms), slow motion 0.3 for 1000 ms real time and the title at 3000 ms', () => {
    const stop = events(MOMENT, 'hitStop')[0];
    expect(stop).toMatchObject({ ms: 200, axis: 'x', targets: ['rootMonster'] });
    const slow = events(MOMENT, 'timeScale')[0];
    expect(slow.factor).toBe(0.3);
    expect(
      realAt(MOMENT, slow.atMs + (slow.durationMs ?? 0)) - realAt(MOMENT, slow.atMs) - 200,
    ).toBe(1000);
    const title = events(MOMENT, 'text')[0];
    expect(title).toMatchObject({ text: 'BEZWUNGEN!', color: 'finisher.title' });
    expect(realAt(MOMENT, title.atMs)).toBe(3000);
  });

  it('puts the flash and the hit-white into the final hit stop', () => {
    const flash = events(MOMENT, 'flash')[0];
    const white = events(MOMENT, 'hitWhite')[0];
    expect(flash.atMs).toBe(1000);
    expect(white).toMatchObject({ atMs: 1000, durationMs: 200, targets: ['rootMonster'] });
  });

  it('stands the actors on the ground line at x = 170 and 470', () => {
    expect(MOMENT.actors).toEqual([
      { rigId: 'astronaut', x: 170, y: GROUND },
      { rigId: 'rootMonster', x: 470, y: GROUND },
    ]);
  });

  it('jumps back to the ground in the cut: x 372 at the landing', () => {
    expect(sampleTrack(track(MOMENT, 'astronaut', 'y'), 1000)).toBe(GROUND);
    expect(sampleTrack(track(MOMENT, 'astronaut', 'x'), 1000)).toBe(372);
    expect(sampleTrack(track(MOMENT, 'astronaut.leg-front', 'pose'), 1000)).toBe('kneel');
    expect(sampleTrack(track(MOMENT, 'astronaut.arm-front', 'pose'), 1000)).toBe('slash-end');
  });

  it('opens the trunk only after the hit stop and breaks the crown last', () => {
    expect(track(MOMENT, 'rootMonster.trunk-left', 'pose').keys[0]).toMatchObject({
      atMs: 1001,
      value: 'cracked',
    });
    expect(sampleTrack(track(MOMENT, 'rootMonster.trunk-left', 'angle'), 1300)).toBe(-12);
    expect(sampleTrack(track(MOMENT, 'rootMonster.trunk-right', 'angle'), 1700)).toBe(20);
    const crownBent = track(MOMENT, 'rootMonster.crown', 'pose').keys.find(
      (k) => k.value === 'bent',
    );
    const trunkFade = track(MOMENT, 'rootMonster.trunk-left', 'alpha').keys[0];
    const crownFade = track(MOMENT, 'rootMonster.crown', 'alpha').keys[0];
    expect(crownBent && crownBent.atMs).toBeGreaterThan(1001);
    expect(crownFade.atMs).toBeGreaterThan(trunkFade.atMs);
  });
});

describe('cinematic level 4 "WURZELBRECHER" (table of the brief, boards 1a to 5c)', () => {
  it('has 5 shots of 3000 ms real time, no axis flip', () => {
    expect(CINE.shots).toHaveLength(5);
    expect(CINE.shots?.map((s) => realAt(CINE, s.atMs))).toEqual([0, 3000, 6000, 9000, 12000]);
    expect(CINE.shots?.some((s) => s.axisFlip)).toBe(false);
  });

  it('keeps the astronaut left and the boss right at x = 160 and 480', () => {
    expect(CINE.actors).toEqual([
      { rigId: 'astronaut', x: 160, y: GROUND },
      { rigId: 'rootMonster', x: 480, y: GROUND },
    ]);
    for (const a of CINE.actors) expect(a.flipX).toBeUndefined();
  });

  it('zooms in whole steps only: shot 1 on 2, shot 3 from 1 to 2 and back, shot 4 stays on 1', () => {
    const zoom = track(CINE, 'camera', 'zoom');
    expect(zoom.keys.every((k) => Number.isInteger(k.value) && k.ease === 'hold')).toBe(true);
    expect(CINE.shots?.[0].camera.zoom).toBe(2);
    expect(zoom.keys.map((k) => [k.atMs, k.value])).toEqual([
      [0, 2],
      [2600, 1],
      [7000, 2],
      [8200, 1],
    ]);
    expect(CINE.shots?.slice(1).every((s) => s.camera.zoom === 1)).toBe(true);
    // Shot 1: the camera climbs the trunk in about 2.5 s with sine.inOut.
    const climb = track(CINE, 'camera', 'scrollY').keys;
    expect(climb[0]).toMatchObject({ atMs: 0, ease: 'sine.inOut' });
    expect(climb[1].atMs).toBe(2500);
  });

  it('shows the portrait strip in shot 3 and the name before the cut', () => {
    const strip = fxNamed(CINE, 'portrait')[0];
    expect(strip).toMatchObject({ atMs: 6000, durationMs: 1000 });
    const name = events(CINE, 'text').find((e) => e.color === 'finisher.name');
    expect(name).toMatchObject({ text: 'WURZELBRECHER', atMs: 8200, durationMs: 800 });
    const title = events(CINE, 'text').find((e) => e.color === 'finisher.title');
    expect(title?.text).toBe('BEZWUNGEN!');
    expect(realAt(CINE, title?.atMs ?? 0)).toBe(14000);
  });

  it('has the one impact pair (light 100 / dark 100) with slow motion 0.3 for 2200 ms', () => {
    const pair = fxNamed(CINE, 'impact-pair');
    expect(pair).toHaveLength(1);
    expect(pair[0]).toMatchObject({ atMs: 9600, durationMs: 200, flash: true });
    expect(events(CINE, 'impact')).toHaveLength(0);
    expect(events(CINE, 'flash')).toHaveLength(0);
    const stop = events(CINE, 'hitStop')[0];
    expect(stop).toMatchObject({ atMs: 9600, ms: 200 });
    const slow = events(CINE, 'timeScale')[0];
    expect(slow.factor).toBe(0.3);
    expect(realAt(CINE, slow.atMs + (slow.durationMs ?? 0)) - realAt(CINE, slow.atMs) - 200).toBe(
      2200,
    );
    expect(realAt(CINE, slow.atMs)).toBe(9600);
  });

  it('runs the cut line down to the ground + 20 by a boss effect', () => {
    expect(fxNamed(CINE, 'cut-line')).toHaveLength(1);
    expect(fxNamed(CINE, 'slash')).toHaveLength(0);
  });
});

describe('rules for the data of the rig (PE-252, brief H-46)', () => {
  const armTrack = (def: ChoreoDef) => track(def, 'astronaut.arm-front', 'pose');

  it.each(BOTH.map((d) => [d.variantId, d] as const))(
    '%s moves the arm children with the arm pose (ASTRONAUT_ANCHORS)',
    (_id, def) => {
      for (const key of armTrack(def).keys) {
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
        }
        // The blade angle follows the anchor; the guard of the cinematic turns it by hand (-16).
        const angle = sampleTrack(track(def, 'astronaut.blade', 'angle'), at);
        if (!(def === CINE && at === 5300)) expect(angle).toBe(a.blade.angle);
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
    '%s never starts a pose track on a smear pose and lets a smear pose stand 33 to 66 ms',
    (_id, def) => {
      for (const t of def.tracks.filter((x) => x.property === 'pose')) {
        expect(isSmearPose(String(t.keys[0].value))).toBe(false);
        t.keys.forEach((k, i) => {
          if (!isSmearPose(String(k.value))) return;
          const next = t.keys[i + 1];
          expect(next).toBeDefined();
          expect(next.atMs - k.atMs).toBeGreaterThanOrEqual(SMEAR);
          expect(next.atMs - k.atMs).toBeLessThanOrEqual(2 * SMEAR);
        });
      }
    },
  );

  it.each(BOTH.map((d) => [d.variantId, d] as const))(
    '%s shows the blade arc by alpha over its base frame (hidden from the start)',
    (_id, def) => {
      const alpha = track(def, 'astronaut.blade-arc', 'alpha');
      expect(alpha.keys[0].value).toBe(0);
      expect(alpha.keys.every((k) => k.ease === 'hold')).toBe(true);
      const pose = track(def, 'astronaut.blade-arc', 'pose');
      expect(pose.keys[0].value).toBe('none');
      // Every arc key lies at an alpha key that switches the arc on.
      for (const k of pose.keys.filter((x) => x.value !== 'none')) {
        expect(sampleTrack(alpha, k.atMs)).toBe(1);
      }
      expect(sampleTrack(track(def, 'astronaut.blade', 'alpha'), 0)).toBe(0);
    },
  );

  it.each(BOTH.map((d) => [d.variantId, d] as const))(
    '%s grows and retracts the blade in steps of motion.rig-blade-step',
    (_id, def) => {
      const keys = track(def, 'astronaut.blade', 'pose').keys;
      const gap = (from: string, to: string) =>
        keys.some(
          (k, i) =>
            k.value === from &&
            keys[i + 1]?.value === to &&
            keys[i + 1].atMs - k.atMs === BLADE_STEP,
        );
      expect(gap('grow2', 'full')).toBe(true);
      expect(gap('grow2', 'grow1')).toBe(true);
    },
  );

  it('keeps every track target and part name inside the rigs, angles inside the fine range', () => {
    for (const def of BOTH) {
      for (const t of def.tracks) {
        if (t.target === 'camera') continue;
        const [rigId, partId] = t.target.split('.');
        const rig: RigDef = RIGS[rigId as 'astronaut' | 'rootMonster'];
        if (partId) {
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
    }
  });

  it('has sorted keys and names only effects the boss module (or the built-in cut line) provides', () => {
    for (const def of BOTH) {
      for (const t of def.tracks) {
        const times = t.keys.map((k) => k.atMs);
        expect(times).toEqual([...times].sort((a, b) => a - b));
        expect(new Set(times).size).toBe(times.length);
      }
      for (const e of events(def, 'fx')) {
        expect(e.name === 'slash' || e.name in ROOT_MONSTER_FX, e.name).toBe(true);
      }
    }
    expect(BOSS_FX.rootMonster).toBe(ROOT_MONSTER_FX);
  });

  it('draws leaves from images 0 to 5 of rig-fx-root, sparks 6 and 7 only as sparks', () => {
    expect([...LEAVES.frames, ...PETALS.frames].every((f) => f >= 0 && f <= 5)).toBe(true);
    for (const def of BOTH) {
      for (const e of events(def, 'particles')) {
        const n = Number(e.texture.replace('rig-fx-root-', ''));
        expect(Number.isInteger(n) && n >= 0 && n <= 7, e.texture).toBe(true);
      }
    }
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
const ATLAS = 'finisher-rig-rootMonster';

function rigFrames(rig: RigDef): string[] {
  return rig.parts.flatMap((p) => {
    const frames = [p.frame, ...Object.values(p.poses ?? {})];
    return [...frames, ...frames.map((f) => silhouetteFrame(p, f))];
  });
}

const frames = (sheet: string, n: number): string[] =>
  Array.from({ length: n }, (_, i) => `${sheet}-${i}`);

const TEXTURES: Readonly<Record<string, readonly string[]>> = {
  [DATA.boss.texture]: [],
  [DATA.player.texture]: [],
  [ATLAS]: [
    ...rigFrames(RIGS.astronaut),
    ...rigFrames(RIGS.rootMonster),
    ...frames('rig-fx-root', 8),
    ...frames('rig-prop-rosehedge', 3),
    ...frames('rig-fx-ground-bulge', 3),
  ],
  'boss-root-spike': ['0', '1', '2'],
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
    let frames_ = 0;
    while (!player.done && frames_ < 2000) {
      player.update(1000 / 60);
      frames_++;
    }
    expect(player.done).toBe(true);
    expect(frames_).toBeLessThan(2000);
    expect(rec.adds).toBe(built);
    expect(player.runnerCount).toBeGreaterThan(5);
    expect(rec.sounds).toEqual([HIT_SOUND_KEY]);
    player.destroy();
  });

  it('shows the impact pair for 100 ms light and 100 ms dark, nothing when reduced', () => {
    const visibleAt = (def: ChoreoDef, reduced: boolean): { paper: number[]; ink: number[] } => {
      const { ctx, rec } = makeContext(TEXTURES, reduced);
      const camera = { setZoom: () => camera, setScroll: () => camera };
      const player = new ChoreoPlayer(ctx, def, camera, { rigs: RIGS });
      const paper: number[] = [];
      const ink: number[] = [];
      while (!player.done) {
        player.update(10);
        const t = Math.round(player.elapsedMs);
        for (const o of rec.objects) {
          if (o.kind !== 'rectangle' || o.st.visible !== true) continue;
          if (o.st.depth === CHOREO_DEPTH.impact) paper.push(t);
          if (o.st.depth === CHOREO_DEPTH.figure - 5) ink.push(t);
        }
      }
      return { paper, ink };
    };
    const normal = visibleAt(CINE, false);
    expect(Math.min(...normal.paper)).toBeGreaterThanOrEqual(9600);
    expect(Math.max(...normal.paper)).toBeLessThanOrEqual(9700);
    expect(Math.min(...normal.ink)).toBeGreaterThanOrEqual(9700);
    expect(Math.max(...normal.ink)).toBeLessThanOrEqual(9800);
    expect(normal.paper.length).toBeGreaterThanOrEqual(9);
    expect(normal.ink.length).toBeGreaterThanOrEqual(9);
    const reduced = visibleAt(reduceChoreo(CINE), true);
    expect(reduced.paper).toEqual([]);
    expect(reduced.ink).toEqual([]);
  });

  it('moves the camera as in the storyboard: zoom 2 on the roots, 1 in the long shot, 2 on her, 1', () => {
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
  const figures = { astronaut: fig(170, 240), rootMonster: fig(470, 100) };
  const api = {
    ctx,
    atlas: ATLAS,
    bossScale: 3,
    figure: (id: string) => figures[id as keyof typeof figures] ?? null,
    boss: () => figures.rootMonster,
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
  it('names the effects the choreographies call', () => {
    expect(Object.keys(ROOT_MONSTER_FX).sort()).toEqual(
      [
        'cut-line',
        'ground-bulge',
        'impact-pair',
        'leaves',
        'petals',
        'portrait',
        'rose-hedge',
        'root-spike',
      ].sort(),
    );
  });

  it('picks the stage of bulge, hedge and thrust by time', () => {
    expect([0, 100, 150, 329, 330, 900].map((t) => stageAt(BULGE_STAGE_MS, t))).toEqual([
      0, 0, 1, 1, 2, 2,
    ]);
    expect([0, 399, 400, 799, 800].map((t) => stageAt(HEDGE_STAGE_MS, t))).toEqual([0, 0, 1, 1, 2]);
  });

  it('builds every object in the factory and only sets values in update', () => {
    for (const [name, factory] of Object.entries(ROOT_MONSTER_FX)) {
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
    for (const name of ['ground-bulge', 'rose-hedge', 'leaves', 'petals', 'root-spike']) {
      const { api, rec } = fxApi({});
      const inst = ROOT_MONSTER_FX[name](api, fxEvent(name, 500));
      inst.start();
      inst.update(100, 16);
      inst.stop();
      inst.destroy();
      expect(rec.objects, name).toHaveLength(0);
    }
  });

  it('grows the ground bulge under the astronaut, stage 0 to 2', () => {
    const { api, rec } = fxApi(TEXTURES);
    const inst = ROOT_MONSTER_FX['ground-bulge'](api, fxEvent('ground-bulge', 500));
    inst.start();
    inst.update(0, 16);
    const img = rec.objects.find((o) => o.kind === 'image');
    expect(img?.st).toMatchObject({
      x: 170,
      y: GROUND - 40,
      frame: 'rig-fx-ground-bulge-0',
      visible: true,
    });
    inst.update(200, 16);
    expect(img?.st.frame).toBe('rig-fx-ground-bulge-1');
    inst.update(400, 16);
    expect(img?.st.frame).toBe('rig-fx-ground-bulge-2');
    inst.stop();
    expect(img?.st.visible).toBe(false);
  });

  it('lets the root thrust rise out of the ground where she stood, then fades it', () => {
    const { api, rec } = fxApi(TEXTURES);
    const inst = ROOT_MONSTER_FX['root-spike'](api, fxEvent('root-spike', 300));
    inst.start();
    const img = rec.objects.find((o) => o.kind === 'image');
    inst.update(0, 16);
    expect(img?.st).toMatchObject({ x: 170, frame: 0, alpha: 1 });
    inst.update(70, 16);
    expect(img?.st.frame).toBe(2);
    inst.update(SPIKE_FADE_MS, 16);
    expect(img?.st.alpha).toBe(SPIKE_FADE_ALPHA);
  });

  it('blooms the rose hedge on the boss in 3 stages', () => {
    const { api, rec } = fxApi(TEXTURES);
    const inst = ROOT_MONSTER_FX['rose-hedge'](api, fxEvent('rose-hedge', 1300));
    inst.start();
    const img = rec.objects.find((o) => o.kind === 'image');
    inst.update(0, 16);
    expect(img?.st).toMatchObject({ x: 470, frame: 'rig-prop-rosehedge-0' });
    inst.update(450, 16);
    expect(img?.st.frame).toBe('rig-prop-rosehedge-1');
    inst.update(900, 16);
    expect(img?.st.frame).toBe('rig-prop-rosehedge-2');
  });

  it('lets leaves sink and petals rise', () => {
    const run = (name: 'leaves' | 'petals'): number => {
      const { api, rec } = fxApi(TEXTURES);
      const inst = ROOT_MONSTER_FX[name](api, fxEvent(name, 2000));
      inst.start();
      inst.update(1400, 16);
      const first = rec.objects.filter((o) => o.kind === 'image' && o.st.visible === true);
      expect(first.length).toBeGreaterThan(0);
      const y0 = first.map((o) => Number(o.st.y));
      inst.update(1480, 16);
      const moved = first.filter((o) => o.st.visible === true).map((o) => Number(o.st.y));
      const dy = moved.reduce((s, y, i) => s + (y - y0[i]), 0);
      return dy;
    };
    expect(run('leaves')).toBeGreaterThan(0);
    expect(run('petals')).toBeLessThan(0);
  });

  it('draws the cut line from the top of the boss to the ground + 20 px', () => {
    const { api, rec } = fxApi(TEXTURES);
    const inst = ROOT_MONSTER_FX['cut-line'](api, fxEvent('cut-line', 4300));
    inst.start();
    const g = rec.objects.find((o) => o.kind === 'graphics');
    const rects = g?.log.filter((l) => l.name === 'fillRect') ?? [];
    expect(rects).toHaveLength(2);
    for (const r of rects) {
      const [, y, , h] = r.args as number[];
      expect(y + h).toBe(GROUND + 20);
      expect(y).toBe(100);
    }
    expect(g?.st.visible).toBe(true);
  });

  it('switches the impact pair from paper to ink after half of its time', () => {
    const { api, rec } = fxApi(TEXTURES);
    const inst = ROOT_MONSTER_FX['impact-pair'](api, fxEvent('impact-pair', 200, 9600));
    const rects = rec.objects.filter((o) => o.kind === 'rectangle');
    expect(rects).toHaveLength(2);
    inst.start();
    inst.update(50, 16);
    expect(rects.map((r) => r.st.visible)).toEqual([true, false]);
    inst.update(100, 16);
    expect(rects.map((r) => r.st.visible)).toEqual([false, true]);
    inst.stop();
    expect(rects.map((r) => r.st.visible)).toEqual([false, false]);
  });

  it('slides the portrait strip in the screen layer', () => {
    const { api, rec, ui } = fxApi(TEXTURES);
    const inst = ROOT_MONSTER_FX.portrait(api, fxEvent('portrait', 1000));
    expect(ui).toHaveLength(1);
    inst.start();
    const box = rec.objects.find((o) => o.kind === 'container');
    inst.update(0, 16);
    const away = Number(box?.st.x);
    expect(away).toBeLessThan(0);
    inst.update(500, 16);
    expect(box?.st.x).toBe(0);
    inst.update(1000, 16);
    expect(Number(box?.st.x)).toBeGreaterThan(0);
  });
});

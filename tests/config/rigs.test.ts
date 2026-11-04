import { describe, expect, it } from 'vitest';
import { ASSETS, FINISHER_ATLASES } from '../../src/config/assets';
import { CHOREO_RULES } from '../../src/config/finishers';
import { RIGS } from '../../src/config/rigs';
import { ASTRONAUT_ANCHORS } from '../../src/config/rigs/astronaut';
import type { ChoreoDef, RigDef } from '../../src/contracts';
import { validateChoreo } from '../../src/logic/choreo';

// Kein @types/node im Projekt: minimale Typen (Variable verhindert Typaufloesung).
interface SrcPart {
  id: string;
  frame: string;
  silhouette: string;
  poses: Record<string, number>;
  originX: number;
  originY: number;
  x: number;
  y: number;
  order: number;
  parent?: string;
  freeRotate?: boolean;
}
interface SrcRig {
  parts: SrcPart[];
  anchors?: {
    'arm-front': unknown;
    bodyDrop: unknown;
    torsoLean: unknown;
  };
}
interface Mod {
  loadRigs(): { astronaut: SrcRig; rootMonster: SrcRig };
}
const imp = async (name: string): Promise<unknown> => import(/* @vite-ignore */ name);
const fs = (await imp('node:fs')) as { readFileSync(p: URL): { toString(enc: string): string } };
const { loadRigs } = (await imp('../../scripts/build-sprites.mjs')) as Mod;
const src = loadRigs();

const atlas = FINISHER_ATLASES[0] as (typeof FINISHER_ATLASES)[number];
const atlasFrames = new Set(
  Object.keys(
    (
      JSON.parse(
        fs
          .readFileSync(new URL(`../../public/${atlas.jsonPath}`, import.meta.url))
          .toString('utf8'),
      ) as { frames: Record<string, unknown> }
    ).frames,
  ),
);

const ASTRO_ORDER = [
  'pack',
  'arm-back',
  'leg-back',
  'leg-front',
  'torso',
  'helmet',
  'arm-front',
  'blade',
  'raygun',
  'blade-arc',
];
const ROOT_ORDER = [
  'crown',
  'arm-right',
  'roots-right',
  'roots-left',
  'trunk-right',
  'trunk-left',
  'jaw',
  'arm-left',
];

function check(rig: RigDef, source: SrcRig, prefix: string, order: string[]): void {
  expect(rig.parts.map((p) => p.id)).toEqual(order);
  expect(rig.parts.map((p) => p.order)).toEqual(order.map((_, i) => i));
  for (const part of rig.parts) {
    const s = source.parts.find((p) => p.id === part.id) as SrcPart;
    expect(s, part.id).toBeDefined();
    const key = `${prefix}-${part.id}`;
    expect(s.frame).toBe(key);
    // Grundbild und Silhouette nach dem Namensmuster, Pose = Index im Bogen (PE-252)
    expect(part.frame).toBe(`${key}-0`);
    expect(part.silhouette).toBe(`${key}-sil-0`);
    expect(part.poses, part.id).toEqual(
      Object.fromEntries(Object.entries(s.poses).map(([n, i]) => [n, `${key}-${i}`])),
    );
    expect([part.originX, part.originY, part.x, part.y], part.id).toEqual([
      s.originX,
      s.originY,
      s.x,
      s.y,
    ]);
    expect(part.parent, part.id).toBe(s.parent);
    expect(part.order, part.id).toBe(s.order);
    expect(part.freeRotate, part.id).toBe(s.freeRotate);
    // alle Bilder und Silhouetten liegen im Atlas, Pose-Anzahl = Frames im Manifest
    const def = ASSETS.find((a) => a.key === key);
    expect(Object.keys(part.poses ?? {}), part.id).toHaveLength(def?.frames ?? -1);
    for (const img of Object.values(part.poses ?? {})) {
      expect(atlasFrames.has(img), img).toBe(true);
      expect(atlasFrames.has(img.replace(/-(\d+)$/, '-sil-$1')), img).toBe(true);
    }
    expect(atlasFrames.has(part.frame)).toBe(true);
    expect(atlasFrames.has(part.silhouette)).toBe(true);
    expect(part.originX).toBeGreaterThanOrEqual(0);
    expect(part.originX).toBeLessThanOrEqual(1);
    expect(part.originY).toBeGreaterThanOrEqual(0);
    expect(part.originY).toBeLessThanOrEqual(1);
  }
}

describe('astronaut rig (AP-183, H-46)', () => {
  const rig = RIGS.astronaut;
  it('matches PX_RIGS: 10 parts, order, pivots, offsets, poses', () => {
    check(rig, src.astronaut, 'rig-astro', ASTRO_ORDER);
  });
  it('has the agreed parents, roots and free rotation', () => {
    const parent = (id: string): string | undefined => rig.parts.find((p) => p.id === id)?.parent;
    for (const id of ['helmet', 'leg-front', 'leg-back']) expect(parent(id)).toBe('torso');
    for (const id of ['raygun', 'blade', 'blade-arc']) expect(parent(id)).toBe('arm-front');
    for (const id of ['pack', 'arm-back', 'torso', 'arm-front']) expect(parent(id)).toBeUndefined();
    expect(rig.parts.filter((p) => p.freeRotate).map((p) => p.id)).toEqual(['blade', 'blade-arc']);
  });
  it('uses the pose names of the brief', () => {
    const poses = (id: string): string[] =>
      Object.keys(rig.parts.find((p) => p.id === id)?.poses ?? {});
    expect(poses('pack')).toEqual(['rest', 'thrust']);
    expect(poses('arm-back')).toEqual(['rest', 'back', 'up']);
    for (const id of ['leg-back', 'leg-front']) {
      expect(poses(id)).toEqual(['stand', 'crouch', 'tuck', 'kneel', 'smear']);
    }
    expect(poses('torso')).toEqual(['upright', 'lean', 'smear']);
    expect(poses('helmet')).toEqual(['serious', 'dark']);
    expect(poses('arm-front')).toEqual(['rest', 'aim', 'raise', 'slash-end', 'smear']);
    expect(poses('blade')).toEqual(['full', 'grow2', 'grow1']);
    expect(poses('raygun')).toEqual(['a0', 'up45', 'up90', 'back135', 'down45']);
    expect(poses('blade-arc')).toEqual(['arc1', 'arc2']);
  });
});

describe('root monster rig (AP-183, H-46)', () => {
  const rig = RIGS.rootMonster;
  it('matches PX_RIGS: 8 parts, order, pivots, offsets, poses', () => {
    check(rig, src.rootMonster, 'rig-root', ROOT_ORDER);
  });
  it('has the agreed parents and pose names', () => {
    const part = (id: string): RigDef['parts'][number] | undefined =>
      rig.parts.find((p) => p.id === id);
    expect(part('arm-right')?.parent).toBe('trunk-right');
    expect(part('arm-left')?.parent).toBe('trunk-left');
    expect(rig.parts.filter((p) => p.parent).map((p) => p.id)).toEqual(['arm-right', 'arm-left']);
    expect(Object.keys(part('arm-left')?.poses ?? {})).toEqual(['rest', 'raised', 'stab']);
    expect(Object.keys(part('trunk-left')?.poses ?? {})).toEqual(['rest', 'cracked']);
    expect(Object.keys(part('jaw')?.poses ?? {})).toEqual(['closed', 'roar']);
    expect(Object.keys(part('crown')?.poses ?? {})).toEqual(['upright', 'bent']);
  });
});

describe('rig budget (validateChoreo, PE-248)', () => {
  it('passes the rig rules: at most 10 parts and 2 levels', () => {
    const def: ChoreoDef = {
      variantId: 'moment-rootMonster',
      actors: [
        { rigId: 'astronaut', x: 0, y: 0 },
        { rigId: 'rootMonster', x: 0, y: 0 },
      ],
      durationMs: 1000,
      tracks: [],
      events: [],
      beats: [],
    };
    const rigRules = validateChoreo(def, RIGS, CHOREO_RULES).filter((v) =>
      ['rig', 'parts', 'rigDepth'].includes(v.rule),
    );
    expect(rigRules).toEqual([]);
    expect(RIGS.astronaut.parts).toHaveLength(CHOREO_RULES.maxPartsPerRig);
    expect(RIGS.rootMonster.parts).toHaveLength(8);
  });
});

describe('ASTRONAUT_ANCHORS (PE-252)', () => {
  const armPoses = ['rest', 'aim', 'raise', 'slash-end', 'smear'] as const;
  const gunPoses = ['a0', 'up45', 'up90', 'back135', 'down45'];
  const json = (v: unknown): unknown => JSON.parse(JSON.stringify(v));
  it('covers all 5 arm poses and all 5 raygun poses and matches PX_RIGS', () => {
    expect(Object.keys(ASTRONAUT_ANCHORS['arm-front'])).toEqual([...armPoses]);
    expect(Object.keys(ASTRONAUT_ANCHORS.gunAngles)).toEqual(gunPoses);
    expect(Object.keys(ASTRONAUT_ANCHORS.muzzle)).toEqual(gunPoses);
    const raygun = RIGS.astronaut.parts.find((p) => p.id === 'raygun');
    expect(Object.keys(raygun?.poses ?? {})).toEqual(gunPoses);
    const a = src.astronaut.anchors;
    expect(json(ASTRONAUT_ANCHORS['arm-front'])).toEqual(a?.['arm-front']);
    expect(json(ASTRONAUT_ANCHORS.bodyDrop)).toEqual(a?.bodyDrop);
    expect(json(ASTRONAUT_ANCHORS.torsoLean)).toEqual(a?.torsoLean);
    expect(ASTRONAUT_ANCHORS.bodyDrop).toEqual({ crouch: 4, kneel: 4 });
    expect(ASTRONAUT_ANCHORS.torsoLean['arm-front'][0]).toBe(3);
    expect(ASTRONAUT_ANCHORS.torsoLean['arm-back'][0]).toBe(2);
    expect(ASTRONAUT_ANCHORS.torsoLean.pack[0]).toBe(2);
  });
  it('places the blade at hand plus muzzle of the raygun pose of each arm pose', () => {
    for (const p of armPoses) {
      const e = ASTRONAUT_ANCHORS['arm-front'][p];
      const m = ASTRONAUT_ANCHORS.muzzle[e.raygun.pose];
      expect(e.blade.x, p).toBe(e.raygun.x + m[0]);
      expect(e.blade.y, p).toBe(e.raygun.y + m[1]);
    }
  });
  it('keeps the default offsets of the children at the pose "rest"', () => {
    const rest = ASTRONAUT_ANCHORS['arm-front'].rest;
    const part = (id: string): RigDef['parts'][number] | undefined =>
      RIGS.astronaut.parts.find((p) => p.id === id);
    expect([part('raygun')?.x, part('raygun')?.y]).toEqual([rest.raygun.x, rest.raygun.y]);
    expect([part('blade')?.x, part('blade')?.y]).toEqual([rest.blade.x, rest.blade.y]);
  });
});

import { describe, expect, it } from 'vitest';
import { ASSETS, FINISHER_ATLASES } from '../../src/config/assets';
import { CHOREO_RULES } from '../../src/config/finishers';
import { RIGS } from '../../src/config/rigs';
import { ASTRONAUT_RIG, ASTRONAUT_ANCHORS } from '../../src/config/rigs/astronaut';
import { FOREST_GHOST_ANCHORS } from '../../src/config/rigs/forestGhost';
import { GIANT_SAND_WORM_CRUMBLE_STEP_MS } from '../../src/config/rigs/giantSandWorm';
import { GUARDIAN_DOG_ANCHORS } from '../../src/config/rigs/guardianDog';
import { PHARAOH_GILD_ORDER } from '../../src/config/rigs/pharaoh';
import type { ChoreoDef, RigDef, RigId } from '../../src/contracts';
import { validateChoreo } from '../../src/logic/choreo';

// Kein @types/node im Projekt: minimale Typen (Variable verhindert Typaufloesung).
interface SrcPart {
  id: string;
  frame: string;
  silhouette: string;
  ink: string;
  size: [number, number];
  poses: Record<string, number>;
  originX: number;
  originY: number;
  pivotPx: [number, number];
  x: number;
  y: number;
  order: number;
  parent?: string;
  freeRotate?: boolean;
}
interface SrcRig {
  parts: SrcPart[];
  anchors?: Record<string, unknown>;
  gildOrder?: string[];
  crumbleStepMs?: number;
}
interface Mod {
  loadRigs(): Record<RigId, SrcRig>;
}
const imp = async (name: string): Promise<unknown> => import(/* @vite-ignore */ name);
const fs = (await imp('node:fs')) as { readFileSync(p: URL): { toString(enc: string): string } };
const { loadRigs } = (await imp('../../scripts/build-sprites.mjs')) as Mod;
const src = loadRigs();

/** Frames of the atlas of a boss (the astronaut shares the atlas of the Baummonster). */
function atlasFramesOf(rigId: RigId): Set<string> {
  const atlas = FINISHER_ATLASES.find(
    (a) => a.key === `finisher-rig-${rigId === 'astronaut' ? 'rootMonster' : rigId}`,
  );
  expect(atlas, rigId).toBeDefined();
  return new Set(
    Object.keys(
      (
        JSON.parse(
          fs
            .readFileSync(new URL(`../../public/${atlas?.jsonPath}`, import.meta.url))
            .toString('utf8'),
        ) as { frames: Record<string, unknown> }
      ).frames,
    ),
  );
}

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
const GHOST_ORDER = [
  'tail-wisp',
  'antenna-right',
  'antenna-left',
  'arm-right',
  'arm-left',
  'body',
  'face',
];
const STONE_ORDER = [
  'fist-right',
  'body',
  'crystals',
  'face',
  'chunk-1',
  'chunk-2',
  'chunk-3',
  'chunk-4',
  'fist-left',
];
const WORM_ORDER = [
  'tail',
  'seg-7',
  'seg-6',
  'seg-5',
  'seg-4',
  'seg-3',
  'seg-2',
  'seg-1',
  'head',
  'jaw',
];
const DOG_ORDER = [
  'legs-back',
  'legs-front',
  'tail',
  'body',
  'head',
  'jaw',
  'collar',
  'shade-1',
  'shade-2',
  'shade-3',
];
const PHARAOH_ORDER = ['robe', 'collar', 'flail', 'crook', 'head', 'orb-ring'];

/** Compares a rig with its PX_RIGS source: order, pivots, offsets, poses, sizes, atlas images (base, sil, ink). */
function check(rig: RigDef, source: SrcRig, order: string[]): void {
  const atlasFrames = atlasFramesOf(rig.id);
  expect(rig.parts.map((p) => p.id)).toEqual(order);
  expect(source.parts.map((p) => p.id).sort()).toEqual([...order].sort());
  expect(rig.parts.map((p) => p.order)).toEqual(order.map((_, i) => i));
  for (const part of rig.parts) {
    const s = source.parts.find((p) => p.id === part.id) as SrcPart;
    expect(s, part.id).toBeDefined();
    const key = s.frame;
    // Grundbild und Silhouette nach dem Namensmuster, Pose = Index im Bogen (PE-252), Tinte wie die Silhouette
    expect(s.silhouette).toBe(`${key}-sil`);
    expect(s.ink).toBe(`${key}-ink`);
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
    // pixel-exact pivot: origin * size is the drawn pivot (rounded to 3 digits)
    const def = ASSETS.find((a) => a.key === key);
    expect([def?.frameWidth, def?.frameHeight], part.id).toEqual(s.size);
    expect(Math.abs(part.originX * s.size[0] - s.pivotPx[0]), part.id).toBeLessThan(0.5);
    expect(Math.abs(part.originY * s.size[1] - s.pivotPx[1]), part.id).toBeLessThan(0.5);
    // alle Bilder, Silhouetten und Tinten-Bilder liegen im Atlas, Pose-Anzahl = Frames im Manifest
    expect(Object.keys(part.poses ?? {}), part.id).toHaveLength(def?.frames ?? -1);
    for (const img of Object.values(part.poses ?? {})) {
      expect(atlasFrames.has(img), img).toBe(true);
      expect(atlasFrames.has(img.replace(/-(\d+)$/, '-sil-$1')), img).toBe(true);
      expect(atlasFrames.has(img.replace(/-(\d+)$/, '-ink-$1')), img).toBe(true);
    }
    expect(atlasFrames.has(part.frame)).toBe(true);
    expect(atlasFrames.has(part.silhouette)).toBe(true);
    expect(part.originX).toBeGreaterThanOrEqual(0);
    expect(part.originX).toBeLessThanOrEqual(1);
    expect(part.originY).toBeGreaterThanOrEqual(0);
    expect(part.originY).toBeLessThanOrEqual(1);
  }
}

const poseNames = (rig: RigDef, id: string): string[] =>
  Object.keys(rig.parts.find((p) => p.id === id)?.poses ?? {});
const parentOf = (rig: RigDef, id: string): string | undefined =>
  rig.parts.find((p) => p.id === id)?.parent;
const json = (v: unknown): unknown => JSON.parse(JSON.stringify(v));

describe('astronaut rig (AP-183, AP-185, H-46, H-48)', () => {
  const rig = RIGS.astronaut;
  it('matches PX_RIGS: 10 parts, order, pivots, offsets, poses', () => {
    check(rig, src.astronaut, ASTRO_ORDER);
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
    expect(poses('blade')).toEqual(['full', 'grow2', 'grow1', 'spear']);
    expect(poses('raygun')).toEqual(['a0', 'up45', 'up90', 'back135', 'down45']);
    expect(poses('blade-arc')).toEqual(['arc1', 'arc2', 'hammer']);
  });
});

describe('astronaut blade sizes (AP-185, Brief Annahme 2a)', () => {
  it('has the new sizes and pivots of blade and blade-arc', () => {
    const blade = ASTRONAUT_RIG.parts.find((p) => p.id === 'blade');
    const arc = ASTRONAUT_RIG.parts.find((p) => p.id === 'blade-arc');
    expect([blade?.originX, blade?.originY]).toEqual([0.018, 0.556]);
    expect([arc?.originX, arc?.originY]).toEqual([0.27, 0.7]);
    const size = (k: string): number[] => {
      const d = ASSETS.find((a) => a.key === k);
      return [d?.frameWidth ?? 0, d?.frameHeight ?? 0];
    };
    expect(size('rig-astro-blade')).toEqual([56, 9]);
    expect(size('rig-astro-blade-arc')).toEqual([63, 50]);
  });
});

describe('root monster rig (AP-183, H-46)', () => {
  const rig = RIGS.rootMonster;
  it('matches PX_RIGS: 8 parts, order, pivots, offsets, poses', () => {
    check(rig, src.rootMonster, ROOT_ORDER);
  });
  it('has the agreed parents and pose names', () => {
    expect(parentOf(rig, 'arm-right')).toBe('trunk-right');
    expect(parentOf(rig, 'arm-left')).toBe('trunk-left');
    expect(rig.parts.filter((p) => p.parent).map((p) => p.id)).toEqual(['arm-right', 'arm-left']);
    expect(poseNames(rig, 'arm-left')).toEqual(['rest', 'raised', 'stab']);
    expect(poseNames(rig, 'trunk-left')).toEqual(['rest', 'cracked']);
    expect(poseNames(rig, 'jaw')).toEqual(['closed', 'roar']);
    expect(poseNames(rig, 'crown')).toEqual(['upright', 'bent']);
  });
});

describe('forest ghost rig (AP-185, H-48)', () => {
  const rig = RIGS.forestGhost;
  it('matches PX_RIGS: 7 parts', () => {
    check(rig, src.forestGhost, GHOST_ORDER);
    expect(rig.parts).toHaveLength(7);
  });
  it('has the agreed parents and pose names', () => {
    expect(rig.parts.filter((p) => p.parent === 'body')).toHaveLength(6);
    expect(poseNames(rig, 'body')).toEqual(['rest', 'stretch', 'dissolve1', 'dissolve2', 'trug']);
    expect(poseNames(rig, 'face')).toEqual(['rest', 'wail', 'trug']);
  });
  it('exports the anchors of PX_RIGS', () => {
    expect(json(FOREST_GHOST_ANCHORS)).toEqual(json(src.forestGhost.anchors));
  });
});

describe('giant stone rig (AP-185, H-48)', () => {
  const rig = RIGS.giantStone;
  it('matches PX_RIGS: 9 parts incl. two fists and four chunks', () => {
    check(rig, src.giantStone, STONE_ORDER);
    expect(rig.parts).toHaveLength(9);
  });
  it('has the agreed parents and pose names', () => {
    expect(rig.parts.filter((p) => p.parent).map((p) => p.id)).toEqual(['crystals', 'face']);
    expect(poseNames(rig, 'body')).toEqual(['rest', 'cracked1', 'cracked2', 'cracked3']);
    expect(poseNames(rig, 'fist-left')).toEqual(['rest', 'raised', 'punch', 'frozen']);
  });
});

describe('sand worm rig (AP-185, H-48)', () => {
  const rig = RIGS.giantSandWorm;
  it('matches PX_RIGS: 10 parts, seven segments share one sheet', () => {
    check(rig, src.giantSandWorm, WORM_ORDER);
    expect(rig.parts).toHaveLength(10);
    const segs = rig.parts.filter((p) => p.id.startsWith('seg-'));
    expect(segs).toHaveLength(7);
    expect(new Set(segs.map((p) => p.frame)).size).toBe(1);
    expect(parentOf(rig, 'jaw')).toBe('head');
  });
  it('exports the crumble step of PX_RIGS', () => {
    expect(GIANT_SAND_WORM_CRUMBLE_STEP_MS).toBe(src.giantSandWorm.crumbleStepMs);
  });
});

describe('guardian dog rig (AP-185, H-48)', () => {
  const rig = RIGS.guardianDog;
  it('matches PX_RIGS: 10 parts, three shadow heads share one sheet', () => {
    check(rig, src.guardianDog, DOG_ORDER);
    expect(rig.parts).toHaveLength(10);
    const shades = rig.parts.filter((p) => p.id.startsWith('shade-'));
    expect(shades).toHaveLength(3);
    expect(new Set(shades.map((p) => p.frame)).size).toBe(1);
  });
  it('has the agreed pose names and the anchors of PX_RIGS', () => {
    expect(poseNames(rig, 'head')).toEqual(['rest', 'low', 'sleep', 'stone']);
    expect(poseNames(rig, 'collar')).toEqual(['rest', 'dark', 'broken', 'stone']);
    expect(json(GUARDIAN_DOG_ANCHORS)).toEqual(json(src.guardianDog.anchors));
  });
});

describe('pharaoh rig (AP-185, H-48)', () => {
  const rig = RIGS.pharaoh;
  it('matches PX_RIGS: 6 parts without arms', () => {
    check(rig, src.pharaoh, PHARAOH_ORDER);
    expect(rig.parts).toHaveLength(6);
    expect(rig.parts.some((p) => p.id.startsWith('arm'))).toBe(false);
    expect(poseNames(rig, 'flail')).toEqual(['rest', 'raised', 'gilded']);
  });
  it('exports the gild order of PX_RIGS, all of them real parts', () => {
    expect([...PHARAOH_GILD_ORDER]).toEqual(src.pharaoh.gildOrder);
    for (const id of PHARAOH_GILD_ORDER) expect(rig.parts.some((p) => p.id === id)).toBe(true);
  });
});

describe('rig budget (validateChoreo, PE-248)', () => {
  it('passes the rig rules for every rig: at most 10 parts and 2 levels', () => {
    const bosses = [
      'rootMonster',
      'forestGhost',
      'giantStone',
      'giantSandWorm',
      'guardianDog',
      'pharaoh',
    ] as const;
    for (const boss of bosses) {
      const def: ChoreoDef = {
        variantId: `moment-${boss}`,
        actors: [
          { rigId: 'astronaut', x: 0, y: 0 },
          { rigId: boss, x: 0, y: 0 },
        ],
        durationMs: 1000,
        tracks: [],
        events: [],
        beats: [],
      };
      const rigRules = validateChoreo(def, RIGS, CHOREO_RULES).filter((v) =>
        ['rig', 'parts', 'rigDepth'].includes(v.rule),
      );
      expect(rigRules, boss).toEqual([]);
    }
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

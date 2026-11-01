import { describe, expect, it } from 'vitest';
import { getPet } from '../../../src/config/pets';
import { PetCompanion } from '../../../src/entities/pets/PetCompanion';
import type { PetWorld } from '../../../src/entities/pets/Pet';
import { CRACK_MS, HATCH_MS } from '../../../src/entities/pets/petLogic';
import { SNOWBALL_POOL_MAX, SnowballPool } from '../../../src/entities/pets/Snowball';
import { addPetXp, petStats, type PetRound } from '../../../src/logic/pets';

// The pet entities only use `import type Phaser`: a small fake scene is enough to follow the state changes.

interface FakeObj {
  kind: string;
  key?: string;
  destroyed: boolean;
  visible: boolean;
  frame: { name: string | number };
  [k: string]: unknown;
}

function fakeScene() {
  const objects: FakeObj[] = [];
  const make = (kind: string, key?: string): FakeObj => {
    const o: FakeObj = { kind, key, destroyed: false, visible: true, frame: { name: 0 } };
    const proxy: FakeObj = new Proxy(o, {
      get(t, p: string) {
        if (p in t) return t[p];
        if (p === 'destroy') return () => ((t.destroyed = true), undefined);
        if (p === 'setVisible') return (v: boolean) => ((t.visible = v), proxy);
        if (p === 'setFrame') return (f: number) => ((t.frame = { name: f }), proxy);
        if (p === 'setPosition') return (x: number, y: number) => ((t.x = x), (t.y = y), proxy);
        if (p === 'texture') return { key: t.key };
        if (p === 'scene') return undefined;
        return () => proxy;
      },
    });
    objects.push(proxy);
    return proxy;
  };
  const scene = {
    textures: { exists: () => true },
    anims: { exists: () => false, create: () => undefined, generateFrameNumbers: () => [] },
    add: {
      sprite: (_x: number, _y: number, key: string) => make('sprite', key),
      graphics: () => make('graphics'),
    },
  };
  return { scene: scene as never, objects };
}

const player = { x: 320, y: 180, flipX: false, depth: 10 };

function world(round: PetRound, enemies: { x: number; y: number }[] = []) {
  const log = { damage: 0, heal: 0, slow: 0 };
  const w: PetWorld<{ x: number; y: number }> = {
    player,
    enemies,
    stats: petStats(getPet('penguin'), round.powerUps, 10),
    radiusOf: () => 6,
    damage: (_e, a) => {
      log.damage += a;
    },
    slow: () => {
      log.slow += 1;
    },
    heal: (hp) => {
      log.heal += hp;
    },
  };
  return { w, log };
}

const ROUND: PetRound = { phase: 'egg', xp: 0, xpToNext: 5, powerUps: 0, expected: 30 };

describe('PetCompanion', () => {
  it('starts as an egg, hatches after cracks and burst, then fights', () => {
    const { scene, objects } = fakeScene();
    const c = new PetCompanion(scene, getPet('penguin'), null, player);
    c.setRound(ROUND);
    const egg = objects.find((o) => o.key === 'egg-penguin');
    expect(egg).toBeDefined();
    const { w } = world(ROUND);
    c.update(16, w);
    expect(c.hatched).toBe(false);
    const hatched = addPetXp(ROUND, 5);
    expect(hatched.phase).toBe('hatched');
    c.setRound(hatched);
    c.update(CRACK_MS, w);
    expect(objects.some((o) => o.key === 'pet-hatch')).toBe(true);
    expect(c.hatched).toBe(false);
    c.update(HATCH_MS, w);
    c.update(16, w);
    expect(c.hatched).toBe(true);
    expect(egg?.destroyed).toBe(true);
    expect(objects.some((o) => o.key === 'pet-penguin')).toBe(true);
  });

  it('puts the pet armour on top and removes everything on destroy', () => {
    const { scene, objects } = fakeScene();
    const c = new PetCompanion(scene, getPet('bee'), 'petgear-bee-hell', player);
    c.setRound({ ...ROUND, phase: 'hatched' });
    const { w } = world(ROUND);
    for (let i = 0; i < 40; i++) c.update(16, w);
    expect(c.hatched).toBe(true);
    expect(objects.some((o) => o.key === 'petgear-bee-hell')).toBe(true);
    c.destroy();
    expect(objects.every((o) => o.destroyed)).toBe(true);
  });

  it('capybara heals through the world every 10 s and damages enemies in the aura', () => {
    const { scene } = fakeScene();
    const def = getPet('capybara');
    const c = new PetCompanion(scene, def, null, player);
    c.setRound({ ...ROUND, phase: 'hatched' });
    const enemy = { x: 300, y: 190 };
    const log = { damage: 0, heal: 0, slow: 0 };
    const w: PetWorld<typeof enemy> = {
      player,
      enemies: [enemy],
      stats: petStats(def, 0, 10),
      radiusOf: () => 6,
      damage: (_e, a) => void (log.damage += a),
      slow: () => void (log.slow += 1),
      heal: (hp) => void (log.heal += hp),
    };
    for (let i = 0; i < 40; i++) c.update(16, w);
    for (let i = 0; i < 100; i++) c.update(100, w);
    expect(log.heal).toBe(2);
    expect(log.slow).toBeGreaterThan(0);
    expect(log.damage).toBeGreaterThan(0);
  });
});

describe('SnowballPool', () => {
  it('keeps at most SNOWBALL_POOL_MAX balls and reuses released ones', () => {
    const { scene, objects } = fakeScene();
    const pool = new SnowballPool<{ x: number; y: number }>(scene, false);
    const far = { x: 10000, y: 0 };
    for (let i = 0; i < SNOWBALL_POOL_MAX + 3; i++) pool.throw(0, 0, far, 1, 8);
    expect(pool.liveCount).toBe(SNOWBALL_POOL_MAX);
    expect(objects.filter((o) => o.key === 'pet-snowball')).toHaveLength(SNOWBALL_POOL_MAX);
    const near = { x: 5, y: 0 };
    const hits: unknown[] = [];
    pool.update(
      16,
      [near],
      1,
      () => 6,
      (e) => hits.push(e),
    );
    expect(hits.length).toBe(SNOWBALL_POOL_MAX);
    expect(pool.liveCount).toBe(0);
    pool.throw(0, 0, near, 1, 8);
    expect(objects.filter((o) => o.key === 'pet-snowball')).toHaveLength(SNOWBALL_POOL_MAX);
    pool.destroy();
    expect(objects.every((o) => o.destroyed)).toBe(true);
  });
});

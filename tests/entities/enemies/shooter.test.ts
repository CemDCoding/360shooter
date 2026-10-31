import { describe, expect, it, vi } from 'vitest';
import { MIN_TELEGRAPH_MS } from '../../../src/config/bosses';
import { ENEMIES, SHOOTER_WINDUP } from '../../../src/config/enemies';
import type { EnemyId } from '../../../src/contracts';
import { ForestWitch } from '../../../src/entities/enemies/ForestWitch';
import { WitchBoltPool } from '../../../src/entities/enemies/WitchBoltPool';
import {
  DEFAULT_PROJECTILE_KEY,
  MAGNIFIER_BEAM_KEY,
} from '../../../src/entities/enemies/projectileTexture';
import { CENTER, sceneOf, simulate } from './helpers';
import { makeScene } from './phaserStub';

vi.mock('phaser', () => import('./phaserStub'));

type Textures = Record<string, [number, number]>;
const BASE: Textures = { 'witch-bolt': [8, 8] };
const WITH_BRIEF: Textures = { ...BASE, 'mummy-wrap': [16, 8], 'camel-spit': [8, 8] };

function setup(textures: Textures = BASE) {
  const scene = makeScene(textures);
  const pool = new WitchBoltPool(sceneOf(scene));
  const make = (id: EnemyId) => {
    const e = new ForestWitch(sceneOf(scene), id, { center: CENTER, boltPool: pool });
    // Inside keepDistance, so it shoots without walking first.
    e.spawn(CENTER.x + ENEMIES[id].projectile!.keepDistance - 10, CENTER.y);
    return e;
  };
  return { scene, pool, make };
}

/** Runs until the first bolt is active; returns the elapsed time. */
function untilShot(e: ForestWitch, pool: WitchBoltPool, maxMs = 10_000): number {
  let t = 0;
  while (!pool.bolts.some((b) => b.active) && t < maxMs) {
    simulate(e, 16);
    t += 16;
  }
  return t;
}

describe('generic shooter (AP-101)', () => {
  it('the forest witch still fires a witch bolt without a status effect', () => {
    const { pool, make } = setup();
    const witch = make('forestWitch');
    const t = untilShot(witch, pool);
    expect(t).toBeLessThanOrEqual(ENEMIES.forestWitch.projectile!.intervalMs + 16);
    const bolt = pool.bolts[0]!;
    expect(bolt.spriteKey).toBe(DEFAULT_PROJECTILE_KEY);
    expect(bolt.onHit).toBeUndefined();
    expect(bolt.damage).toBe(ENEMIES.forestWitch.projectile!.damage);
  });

  it('the mummy wrap carries the slow of the config and its own sprite once loaded', () => {
    const { pool, make } = setup(WITH_BRIEF);
    untilShot(make('mummy'), pool);
    const bolt = pool.bolts[0]!;
    expect(bolt.onHit).toEqual(ENEMIES.mummy.projectile!.onHit);
    expect(bolt.onHit?.slow?.durationMs).toBe(2000);
    expect(bolt.spriteKey).toBe('mummy-wrap');
  });

  it('falls back to the witch bolt while the brief sprites are not in the manifest (AP-106)', () => {
    const { pool, make } = setup(BASE);
    untilShot(make('mummy'), pool);
    expect(pool.bolts[0]!.spriteKey).toBe(DEFAULT_PROJECTILE_KEY);
    expect(pool.bolts[0]!.onHit).toEqual(ENEMIES.mummy.projectile!.onHit);
  });

  it('the archaeologist shoots a drawn magnifier beam (transition, PE-133)', () => {
    const { scene, pool, make } = setup();
    untilShot(make('archaeologist'), pool);
    expect(scene.generated).toEqual([MAGNIFIER_BEAM_KEY]);
    expect(pool.bolts[0]!.spriteKey).toBe(MAGNIFIER_BEAM_KEY);
    expect(pool.bolts[0]!.onHit).toEqual(ENEMIES.archaeologist.projectile!.onHit);
    // A second archaeologist reuses the texture.
    make('archaeologist');
    expect(scene.generated).toHaveLength(1);
  });

  it('a revived bolt keeps nothing of its last shooter (onHit and sprite)', () => {
    const { pool, make } = setup(WITH_BRIEF);
    const mummy = make('mummy');
    untilShot(mummy, pool);
    const bolt = pool.bolts[0]!;
    expect(bolt.onHit).toBeDefined();
    bolt.despawn();
    // Read after despawn: the scene despawns the bolt before it applies the hit (AP-102).
    expect(bolt.onHit).toBeDefined();
    mummy.despawn();

    const witch = make('forestWitch');
    untilShot(witch, pool);
    expect(pool.bolts).toHaveLength(1);
    expect(pool.bolts[0]).toBe(bolt);
    expect(bolt.onHit).toBeUndefined();
    expect(bolt.spriteKey).toBe(DEFAULT_PROJECTILE_KEY);
  });

  it('WitchBoltPool hands sprite and onHit through to the bolt', () => {
    const { pool } = setup(WITH_BRIEF);
    const onHit = { poison: { dps: 1, durationMs: 100 } };
    const bolt = pool.fire(0, 0, 10, 0, 3, 100, { spriteKey: 'camel-spit', onHit });
    expect(bolt.onHit).toBe(onHit);
    expect(bolt.spriteKey).toBe('camel-spit');
    bolt.despawn();
    const again = pool.fire(0, 0, 10, 0, 3, 100);
    expect(again).toBe(bolt);
    expect(again.onHit).toBeUndefined();
    expect(again.spriteKey).toBe(DEFAULT_PROJECTILE_KEY);
  });

  it('the camel holds its full-cheeks frame at least 700 ms before every spit', () => {
    const windup = SHOOTER_WINDUP.camel!;
    expect(windup.ms).toBeGreaterThanOrEqual(MIN_TELEGRAPH_MS);
    const { pool, make } = setup(WITH_BRIEF);
    const camel = make('camel');
    const shots: number[] = [];
    let windupStart = -1;
    const windups: number[] = [];
    let wasWinding = false;
    for (let t = 0; t < 10_000; t += 16) {
      const before = pool.bolts.filter((b) => b.active).length;
      simulate(camel, 16);
      if (camel.isWindingUp && !wasWinding) windupStart = t;
      if (camel.isWindingUp)
        expect((camel as unknown as { frameIndex?: number }).frameIndex).toBe(windup.frame);
      if (!camel.isWindingUp && wasWinding) windups.push(t - windupStart);
      wasWinding = camel.isWindingUp;
      const now = pool.bolts.filter((b) => b.active).length;
      if (now > before) shots.push(t);
      for (const b of pool.bolts) b.despawn();
    }
    expect(shots.length).toBeGreaterThanOrEqual(3);
    expect(windups.length).toBe(shots.length);
    for (const w of windups) expect(w).toBeGreaterThanOrEqual(MIN_TELEGRAPH_MS - 16);
    // Balancing unchanged: one shot per intervalMs after the first.
    const interval = ENEMIES.camel.projectile!.intervalMs;
    for (let i = 1; i < shots.length; i += 1) {
      expect(shots[i]! - shots[i - 1]!).toBeGreaterThanOrEqual(interval - 32);
      expect(shots[i]! - shots[i - 1]!).toBeLessThanOrEqual(interval + 32);
    }
    expect(pool.bolts[0]!.spriteKey).toBe('camel-spit');
  });

  it('the camel starts fresh after the pool revives it during a wind-up', () => {
    const { pool, make } = setup(WITH_BRIEF);
    const camel = make('camel');
    while (!camel.isWindingUp) simulate(camel, 16);
    camel.despawn();
    camel.spawn(CENTER.x + 100, CENTER.y);
    expect(camel.isWindingUp).toBe(false);
    expect(pool.bolts.some((b) => b.active)).toBe(false);
  });
});

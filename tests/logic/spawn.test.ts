import { describe, expect, it } from 'vitest';
import { getLevel } from '../../src/config';
import type { EnemyId, LevelDef } from '../../src/contracts';
import { SpawnDirector, type SpawnRequest } from '../../src/logic/spawn';

/** Kleine deterministische Test-RNG (mulberry32). */
function testRng(seed: number): { next(): number } {
  let a = seed >>> 0;
  return {
    next() {
      a = (a + 0x6d2b79f5) >>> 0;
      let t = a;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    },
  };
}

function lvl(id: number): LevelDef {
  const l = getLevel(id);
  if (!l) throw new Error('level missing');
  return l;
}

function run(level: LevelDef, seconds: number, alive = 0, seed = 1): SpawnRequest[] {
  const d = new SpawnDirector(level, testRng(seed), 600);
  const out: SpawnRequest[] = [];
  for (let t = 0; t < seconds * 1000; t += 100) out.push(...d.tick(100, alive));
  return out;
}

describe('SpawnDirector', () => {
  it('level 0 spawns only trees', () => {
    const spawns = run(lvl(0), 180);
    expect(spawns.length).toBeGreaterThan(50);
    expect(spawns.every((s) => s.enemyId === 'cursedTree')).toBe(true);
  });

  it('level 12 spawns all four enemy types', () => {
    const ids = new Set<EnemyId>(run(lvl(12), 180).map((s) => s.enemyId));
    expect(ids.size).toBe(4);
  });

  it('respects maxEnemies', () => {
    const level = lvl(0);
    expect(run(level, 60, level.maxEnemies)).toHaveLength(0);
    const d = new SpawnDirector(level, testRng(2), 600);
    const spawns = d.tick(100_000, level.maxEnemies - 2);
    expect(spawns).toHaveLength(2);
  });

  it('uses the configured radius and an even angle distribution', () => {
    const spawns = run(lvl(12), 180, 0, 42);
    const buckets = [0, 0, 0, 0];
    for (const s of spawns) {
      expect(s.radius).toBe(600);
      expect(s.angle).toBeGreaterThanOrEqual(0);
      expect(s.angle).toBeLessThan(Math.PI * 2);
      buckets[Math.floor((s.angle / (Math.PI * 2)) * 4)] += 1;
    }
    for (const b of buckets) {
      expect(b / spawns.length).toBeGreaterThan(0.15);
      expect(b / spawns.length).toBeLessThan(0.35);
    }
  });

  it('is deterministic for the same seed', () => {
    expect(run(lvl(5), 30, 0, 7)).toEqual(run(lvl(5), 30, 0, 7));
  });

  it('interval shrinks to 0.6x over the round', () => {
    const level = lvl(0);
    const d = new SpawnDirector(level, testRng(1), 600);
    expect(d.currentIntervalMs).toBe(level.spawnIntervalMs);
    d.tick(level.durationSec * 1000, 999);
    expect(d.currentIntervalMs).toBeCloseTo(level.spawnIntervalMs * 0.6);
  });

  it('ignores invalid dt and empty pools', () => {
    const d = new SpawnDirector(lvl(0), testRng(1), 600);
    expect(d.tick(-1, 0)).toEqual([]);
    expect(d.tick(Number.NaN, 0)).toEqual([]);
    const empty = new SpawnDirector({ ...lvl(0), enemyPool: [] }, testRng(1), 600);
    expect(empty.tick(10_000, 0)).toEqual([]);
  });
});

import { describe, expect, it } from 'vitest';
import { getLevel } from '../../src/config';
import type { EnemyId, LevelDef } from '../../src/contracts';
import {
  OPENING_RADIUS_FACTOR,
  SpawnDirector,
  openingCount,
  type SpawnRequest,
} from '../../src/logic/spawn';

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
    expect(spawns).toHaveLength(2); // Eroeffnungswelle gekappt, danach voll
  });

  it('uses the configured radius and an even angle distribution', () => {
    const all = run(lvl(12), 180, 0, 42);
    const spawns = all.slice(openingCount(lvl(12)));
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

  it('opens the round with an evenly spread wave on the opening radius (AP-56)', () => {
    for (const id of [0, 12, 20]) {
      const level = lvl(id);
      const d = new SpawnDirector(level, testRng(3), 600);
      const first = d.tick(100, 0);
      expect(first).toHaveLength(openingCount(level));
      expect(first.length).toBeGreaterThanOrEqual(3);
      expect(first.length).toBeLessThanOrEqual(8);
      const step = (Math.PI * 2) / first.length;
      first.forEach((s, i) => {
        expect(s.radius).toBeCloseTo(600 * OPENING_RADIUS_FACTOR, 9);
        expect(s.angle).toBeGreaterThanOrEqual(0);
        expect(s.angle).toBeLessThan(Math.PI * 2);
        const diff = (s.angle - first[0].angle + Math.PI * 2) % (Math.PI * 2);
        expect(diff).toBeCloseTo(i * step, 6);
      });
    }
    expect(openingCount(lvl(0))).toBe(4);
    expect(openingCount(lvl(20))).toBe(8);
  });

  it('opening wave happens exactly once and is limited by maxEnemies', () => {
    const level = lvl(0);
    const d = new SpawnDirector(level, testRng(4), 600);
    expect(d.tick(100, 0)).toHaveLength(openingCount(level));
    expect(d.tick(100, 0)).toHaveLength(0);
    const tight = new SpawnDirector(level, testRng(4), 600);
    expect(tight.tick(100, level.maxEnemies - 2)).toHaveLength(2);
    const full = new SpawnDirector(level, testRng(4), 600);
    expect(full.tick(100, level.maxEnemies)).toHaveLength(0);
    expect(full.tick(100, 0).filter((s) => s.radius < 600)).toHaveLength(0);
  });

  it('regular spawns start after a full interval on the full radius', () => {
    const level = lvl(0);
    const spawns = run(level, 10);
    const regular = spawns.slice(openingCount(level));
    expect(regular.length).toBeGreaterThan(0);
    expect(regular.every((s) => s.radius === 600)).toBe(true);
    const d = new SpawnDirector(level, testRng(1), 600);
    d.tick(100, 0);
    expect(d.tick(level.spawnIntervalMs - 500, 0)).toHaveLength(0);
  });

  it('is deterministic for the same seed', () => {
    expect(run(lvl(5), 30, 0, 7)).toEqual(run(lvl(5), 30, 0, 7));
    const a = new SpawnDirector(lvl(5), testRng(9), 600).tick(100, 0);
    expect(a).toEqual(new SpawnDirector(lvl(5), testRng(9), 600).tick(100, 0));
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

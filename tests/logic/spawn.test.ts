import { describe, expect, it, vi } from 'vitest';
import { ENEMIES, LEVEL_SCALING, getLevel } from '../../src/config';
import { EnemyPool } from '../../src/entities/enemies/createEnemy';
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

// Minimal stand-ins for the enemy classes: EnemyPool.spawn only needs spawn(), hp, active and def.
const { FakeEnemy, defs } = vi.hoisted(() => {
  const defs: Record<string, { id: string; hp: number }> = {};
  class FakeEnemy {
    active = false;
    hp = 0;
    readonly def: { id: string; hp: number };
    constructor(_scene: unknown, id: string) {
      this.def = defs[id];
    }
    spawn(): void {
      this.active = true;
      this.hp = this.def.hp;
    }
  }
  return { FakeEnemy, defs };
});
vi.mock('../../src/entities/enemies/ChaseEnemy', () => ({ ChaseEnemy: FakeEnemy }));
vi.mock('../../src/entities/enemies/AuraEnemy', () => ({ AuraEnemy: FakeEnemy }));
vi.mock('../../src/entities/enemies/ForestWitch', () => ({ ForestWitch: FakeEnemy }));

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

  it('halves the normal spawn rate while the boss is active (PE-18)', () => {
    const level = lvl(12);
    const count = (boss: boolean): number => {
      const d = new SpawnDirector(level, testRng(5), 600);
      d.tick(1, 0); // opening wave
      let n = 0;
      for (let t = 0; t < 120_000; t += 100) n += d.tick(100, 0, boss).length;
      return n;
    };
    const normal = count(false);
    const withBoss = count(true);
    expect(withBoss / normal).toBeGreaterThan(0.45);
    expect(withBoss / normal).toBeLessThan(0.55);
  });
});

describe('spawn density of level 0 to 4 (AP-91)', () => {
  /** Zeitpunkte aller Spawns einer Runde, Schritt 20 ms. */
  function spawnTimes(level: LevelDef, seed: number): number[] {
    const d = new SpawnDirector(level, testRng(seed), 600);
    const times: number[] = [];
    for (let t = 0; t < level.durationSec * 1000; t += 20) {
      for (let k = d.tick(20, 0).length; k > 0; k--) times.push(t);
    }
    return times;
  }

  it('has no gap longer than 1.6 s between two spawns in level 0 to 4', () => {
    for (let id = 0; id <= 4; id++) {
      const times = spawnTimes(lvl(id), 11);
      let last = 0;
      let maxGap = 0;
      for (const t of times) {
        maxGap = Math.max(maxGap, t - last);
        last = t;
      }
      // 1,5 s Spawn-Abstand plus eine Tick-Breite Messfehler.
      expect(maxGap, `level ${id}`).toBeLessThanOrEqual(1600);
    }
  });

  it('spawns more enemies per minute with every level (0 to 20)', () => {
    let prev = 0;
    for (let id = 0; id <= 20; id++) {
      const level = lvl(id);
      const perMin = spawnTimes(level, 5).length / (level.durationSec / 60);
      expect(perMin, `level ${id}`).toBeGreaterThan(prev);
      prev = perMin;
    }
  });
});

describe('EnemyPool.spawn hit point scaling (AP-90, AP-91)', () => {
  Object.assign(defs, ENEMIES);
  const pool = (): EnemyPool => new EnemyPool({} as never, {});

  it('keeps the base hit points without a scale', () => {
    expect(pool().spawn('cursedTree', 0, 0).hp).toBe(ENEMIES.cursedTree.hp);
  });

  it('multiplies and rounds the hit points, never below 1', () => {
    const p = pool();
    expect(p.spawn('cursedTree', 0, 0, { hp: 0.46 }).hp).toBe(23);
    expect(p.spawn('zombieSquirrel', 0, 0, { hp: 0.8 }).hp).toBe(6); // 6,4 rounds down
    expect(p.spawn('forestSpirit', 0, 0, { hp: 0.001 }).hp).toBe(1);
  });

  it('a reused enemy does not keep the scale of its last life', () => {
    const p = pool();
    const first = p.spawn('cursedTree', 0, 0, { hp: 0.5 });
    expect(first.hp).toBe(25);
    first.active = false;
    const again = p.spawn('cursedTree', 0, 0);
    expect(again).toBe(first);
    expect(again.hp).toBe(ENEMIES.cursedTree.hp);
  });

  it('gives the cursed tree whole, falling hit points in level 0 to 4 and the base value from level 5', () => {
    let prev = 0;
    for (let id = 0; id <= 4; id++) {
      const hp = pool().spawn('cursedTree', 0, 0, LEVEL_SCALING[id]).hp;
      expect(hp, `level ${id}`).toBeGreaterThan(prev);
      expect(hp, `level ${id}`).toBeLessThan(ENEMIES.cursedTree.hp);
      prev = hp;
    }
    // Ab Level 5 (AP-95) ebenfalls skaliert, gerundet mit Minimum 1.
    for (let id = 5; id <= 20; id++) {
      const expected = Math.max(1, Math.round(ENEMIES.cursedTree.hp * LEVEL_SCALING[id].hp));
      expect(pool().spawn('cursedTree', 0, 0, LEVEL_SCALING[id]).hp, `level ${id}`).toBe(expected);
    }
    expect(pool().spawn('cursedTree', 0, 0, LEVEL_SCALING[5]).hp).toBeGreaterThan(prev);
  });
});

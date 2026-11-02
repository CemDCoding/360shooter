import { describe, expect, it, vi } from 'vitest';
import { ENEMIES, LEVEL_SCALING, getLevel } from '../../src/config';
import { EnemyPool } from '../../src/entities/enemies/createEnemy';
import type { EnemyId, LevelDef } from '../../src/contracts';
import {
  FIRST_APPEARANCE_BY,
  MAX_RUN,
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
  it('level 0 spawns only the forest pool, the tree is the most frequent type (AP-97, AP-166: mixed pool 56 / 22 / 22)', () => {
    const spawns = run(lvl(0), 180);
    expect(spawns.length).toBeGreaterThan(50);
    const allowed = new Set<EnemyId>(['cursedTree', 'boar', 'bear']);
    expect(spawns.every((s) => allowed.has(s.enemyId))).toBe(true);
    const count = (id: EnemyId): number => spawns.filter((s) => s.enemyId === id).length;
    expect(count('cursedTree')).toBeGreaterThan(count('boar'));
    expect(count('cursedTree')).toBeGreaterThan(count('bear'));
    expect(count('cursedTree') / spawns.length).toBeGreaterThan(0.45);
  });

  it('level 12 spawns all enemy types of its pool', () => {
    const ids = new Set<EnemyId>(run(lvl(12), 180).map((s) => s.enemyId));
    expect(ids).toEqual(new Set(lvl(12).enemyPool.map((e) => e.enemyId)));
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
    // AP-127: Level 0 hat 38 statt 25 Max. Gegner, 15 % davon sind 6 (vorher 4).
    expect(openingCount(lvl(0))).toBe(6);
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

  it('has no gap longer than 1.1 s between two spawns in level 0 to 4 (AP-127)', () => {
    for (let id = 0; id <= 4; id++) {
      const times = spawnTimes(lvl(id), 11);
      let last = 0;
      let maxGap = 0;
      for (const t of times) {
        maxGap = Math.max(maxGap, t - last);
        last = t;
      }
      // Spawn-Abstand (seit AP-127 hoechstens 1,0 s) plus eine Tick-Breite Messfehler.
      expect(maxGap, `level ${id}`).toBeLessThanOrEqual(1100);
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
      expect(hp, `level ${id}`).toBeGreaterThanOrEqual(15); // AP-166: floor of the tree hp after scaling
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

describe('SpawnDirector: variety in level 0 to 2 (AP-166, PE-207)', () => {
  const SEEDS = Array.from({ length: 20 }, (_, i) => i + 1);
  const types = (level: LevelDef): number => new Set(level.enemyPool.map((e) => e.enemyId)).size;
  const longestRun = (spawns: SpawnRequest[]): number => {
    let best = 0;
    let cur = 0;
    let prev: EnemyId | null = null;
    for (const s of spawns) {
      cur = s.enemyId === prev ? cur + 1 : 1;
      prev = s.enemyId;
      best = Math.max(best, cur);
    }
    return best;
  };

  it('shows every available type in the first 30 s and never more than 3 of a type in a row', () => {
    for (const id of [0, 1, 2]) {
      const level = lvl(id);
      for (const seed of SEEDS) {
        const spawns = run(level, 30, 0, seed);
        expect(
          new Set(spawns.map((s) => s.enemyId)).size,
          `level ${id} seed ${seed}`,
        ).toBeGreaterThanOrEqual(types(level));
        expect(longestRun(spawns), `level ${id} seed ${seed}`).toBeLessThanOrEqual(MAX_RUN);
      }
    }
  });

  it('puts every type into the opening wave when it is large enough', () => {
    for (const id of [0, 1, 2]) {
      const level = lvl(id);
      expect(openingCount(level)).toBeGreaterThanOrEqual(types(level));
      for (const seed of SEEDS) {
        const d = new SpawnDirector(level, testRng(seed), 600);
        const opening = d.tick(1, 0).slice(0, openingCount(level));
        expect(new Set(opening.map((s) => s.enemyId)).size, `level ${id} seed ${seed}`).toBe(
          types(level),
        );
      }
    }
  });

  it('spawns a type that has not come yet at the latest as the 8th spawn, even with a one-enemy opening wave', () => {
    const level = lvl(1);
    for (const seed of SEEDS) {
      // Only one free slot at the start: the opening wave is cut to 1 spawn, the rest comes from the timer.
      const d = new SpawnDirector(level, testRng(seed), 600);
      const out: SpawnRequest[] = [...d.tick(1, level.maxEnemies - 1)];
      for (let t = 0; out.length < FIRST_APPEARANCE_BY && t < 60_000; t += 100) {
        out.push(...d.tick(100, 0));
      }
      const firstEight = out.slice(0, FIRST_APPEARANCE_BY).map((s) => s.enemyId);
      expect(new Set(firstEight).size, `seed ${seed}`).toBe(types(level));
    }
  });

  it('keeps the long-run shares within 2 percentage points of the pool weights (5000 draws per level)', () => {
    for (const id of [0, 1, 2]) {
      const level = lvl(id);
      const total = level.enemyPool.reduce((s, e) => s + e.weight, 0);
      const counts = new Map<EnemyId, number>();
      const d = new SpawnDirector(level, testRng(99), 600);
      let n = 0;
      while (n < 5000) {
        for (const s of d.tick(100, 0)) {
          counts.set(s.enemyId, (counts.get(s.enemyId) ?? 0) + 1);
          n += 1;
        }
      }
      for (const e of level.enemyPool) {
        const share = (counts.get(e.enemyId) ?? 0) / n;
        expect(Math.abs(share - e.weight / total), `${e.enemyId} level ${id}`).toBeLessThanOrEqual(
          0.02,
        );
        expect(share, `${e.enemyId} level ${id}`).toBeGreaterThanOrEqual(0.1);
      }
    }
  });

  it('leaves level 3 and up on independent weighted draws (long runs still occur, no extra random numbers)', () => {
    expect(longestRun(run(lvl(3), 300, 0, 5))).toBeGreaterThan(MAX_RUN);
    let calls = 0;
    const d = new SpawnDirector(
      lvl(3),
      {
        next: () => {
          calls += 1;
          return 0.5;
        },
      },
      600,
    );
    d.tick(1, 0);
    expect(calls).toBe(1 + openingCount(lvl(3)));
  });

  it('keeps the SpawnRequest shape and the tick signature', () => {
    const d = new SpawnDirector(lvl(0), testRng(3), 600);
    const [first] = d.tick(100, 0, false);
    expect(Object.keys(first).sort()).toEqual(['angle', 'enemyId', 'radius']);
  });
});

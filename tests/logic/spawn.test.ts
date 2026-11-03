import { describe, expect, it, vi } from 'vitest';
import { ENEMIES, LEVEL_SCALING, getLevel } from '../../src/config';
import { EnemyPool } from '../../src/entities/enemies/createEnemy';
import type { EliteRules, EnemyId, EnemyRole, LevelDef } from '../../src/contracts';
import { LEVELS } from '../../src/config/levels';
import {
  BANK_SEC,
  BOSS_WARNING_SEC,
  BUDGET_MARGIN,
  ELITE_RULES,
  FILL_INTERVAL_MS,
  PEAK_SEC,
  RELAX_SEC,
  ROLE_CAPS,
  ROLE_CAP_HEADROOM,
  WAVE_PLANS,
  cyclesOf,
} from '../../src/config/waves';
import {
  FIRST_APPEARANCE_BY,
  MAX_RUN,
  MIN_INTERVAL_FACTOR,
  OPENING_RADIUS_FACTOR,
  SpawnDirector,
  openingCount,
  pacingCurve,
  pacingFactorAt,
  pacingPhaseAt,
  type SpawnRequest,
  type WavePhase,
} from '../../src/logic/spawn';
import { eventSchedule as eventScheduleOf } from '../../src/logic/spawnEvents';

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
    // AP-175: field at the minimum occupancy, so no fill spawn comes in between.
    const d = new SpawnDirector(level, testRng(1), 600);
    d.tick(100, 0);
    expect(d.tick(level.spawnIntervalMs - 500, d.minimumAlive)).toHaveLength(0);
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
      for (let t = 0; t < 120_000; t += 100) n += d.tick(100, d.minimumAlive, boss).length;
      return n;
    };
    const normal = count(false);
    const withBoss = count(true);
    expect(withBoss / normal).toBeGreaterThan(0.45);
    expect(withBoss / normal).toBeLessThan(0.55);
  });
});

describe('spawn density of level 0 to 4 (AP-91)', () => {
  /** Zeitpunkte aller Spawns einer Runde, Schritt 20 ms; `alive` lebende Gegner (Standard: Mindestbelegung). */
  function spawnTimes(level: LevelDef, seed: number, alive?: number): number[] {
    const d = new SpawnDirector(level, testRng(seed), 600);
    const times: number[] = [];
    for (let t = 0; t < level.durationSec * 1000; t += 20) {
      for (let k = d.tick(20, alive ?? d.minimumAlive).length; k > 0; k--) times.push(t);
    }
    return times;
  }

  // AP-175: the relax phase pauses on purpose (RS-01.1); an empty field is filled by the minimum occupancy.
  it('has no gap longer than 1.1 s between two spawns in level 0 to 4 while the field is empty (AP-127, AP-175)', () => {
    for (let id = 0; id <= 4; id++) {
      const times = spawnTimes(lvl(id), 11, 0);
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

  it('keeps the SpawnRequest shape (plus elite, AP-175) and the tick signature', () => {
    const d = new SpawnDirector(lvl(0), testRng(3), 600);
    const [first] = d.tick(100, 0, false);
    expect(Object.keys(first).sort()).toEqual(['angle', 'elite', 'enemyId', 'radius']);
    expect(SpawnDirector.prototype.tick.length).toBe(2);
  });
});

describe('SpawnDirector: wave rhythm (M12, AP-175, RS-01.1, RS-01.2, RS-01.4)', () => {
  interface Living {
    id: EnemyId;
    elite: boolean;
  }
  interface Spawned extends SpawnRequest {
    t: number;
    phase: WavePhase;
  }
  interface SimResult {
    spawns: Spawned[];
    maxRole: Record<EnemyRole, number>;
    capViolations: number;
    belowMinAlive: number;
    eliteShareViolations: number;
    budgetMin: number;
  }
  const ROLE_LIST: EnemyRole[] = ['melee', 'fast', 'shooter', 'tank', 'aura'];
  const roleOf = (id: EnemyId): EnemyRole => ENEMIES[id].role ?? 'melee';
  const zeroRoles = (): Record<EnemyRole, number> =>
    Object.fromEntries(ROLE_LIST.map((r) => [r, 0])) as Record<EnemyRole, number>;

  /**
   * A small world: the player kills one random living enemy every `killEveryMs`. With `report` the scene tells the
   * director about each removal (exact role caps), otherwise only the living count reaches the director.
   */
  function simulate(
    level: LevelDef,
    opts: { killEveryMs: number; report?: boolean; seed?: number; rules?: EliteRules },
  ): SimResult {
    const seed = opts.seed ?? 1;
    const d = new SpawnDirector(level, testRng(seed), 600, opts.rules);
    const killRng = testRng(seed + 1000);
    const world: Living[] = [];
    const spawns: Spawned[] = [];
    const maxRole = zeroRoles();
    let capViolations = 0;
    const dt = 50;
    const windowMs = (level.durationSec - BOSS_WARNING_SEC) * 1000;
    const floor = Math.min(d.minimumAlive, level.maxEnemies);
    let belowMinAlive = 0;
    let reached = false;
    let belowSince = -1;
    let eliteShareViolations = 0;
    let budgetMin = Number.POSITIVE_INFINITY;
    let nextKill = opts.killEveryMs;
    for (let t = 0; t < level.durationSec * 1000; t += dt) {
      if (t >= nextKill) {
        nextKill += opts.killEveryMs;
        if (world.length > 0) {
          const [gone] = world.splice(Math.floor(killRng.next() * world.length), 1);
          if (opts.report) d.noteRemoved(gone.id, gone.elite);
        }
      }
      const reqs = d.tick(dt, world.length);
      const phase = d.phase;
      for (const r of reqs) {
        world.push({ id: r.enemyId, elite: r.elite === true });
        spawns.push({ ...r, t, phase });
        if (r.elite) {
          const elites = world.filter((w) => w.elite).length;
          if (elites > (opts.rules ?? ELITE_RULES).maxShare * world.length + 1e-9) {
            eliteShareViolations += 1;
          }
        }
      }
      const counts = zeroRoles();
      for (const w of world) counts[roleOf(w.id)] += 1;
      for (const r of ROLE_LIST) maxRole[r] = Math.max(maxRole[r], counts[r]);
      // A spawned role may not exceed its cap (the cap only grows with the field, so checking after the tick holds).
      for (const r of reqs) {
        const role = roleOf(r.enemyId);
        if (opts.report && counts[role] > d.roleCap(role)) capViolations += 1;
      }
      // Counted once the field has reached the minimum (the opening wave is smaller, the fill needs a moment).
      if (world.length >= floor) reached = true;
      // A kill right after a fill may leave the field one short until the next fill slot (FILL_INTERVAL_MS).
      if (reached && t + dt < windowMs && world.length < floor) {
        if (belowSince < 0) belowSince = t;
        if (t - belowSince > FILL_INTERVAL_MS) belowMinAlive += 1;
      } else belowSince = -1;
      budgetMin = Math.min(budgetMin, d.threatBudget);
    }
    return { spawns, maxRole, capViolations, belowMinAlive, eliteShareViolations, budgetMin };
  }

  /** Spawns of a round with the linear base ramp before AP-175 (same count as the balance model). */
  function baseRampCount(level: LevelDef): number {
    const durMs = level.durationSec * 1000;
    let t = level.spawnIntervalMs;
    let n = Math.min(openingCount(level), level.maxEnemies);
    while (t < durMs) {
      n += 1;
      t += level.spawnIntervalMs * (1 - (1 - MIN_INTERVAL_FACTOR) * Math.min(1, t / durMs));
    }
    return n;
  }

  it('runs build-up, peak and relax per cycle, 3 cycles in 3 minutes, 5 in 5 minutes, the last ends at the boss warning', () => {
    for (const level of [lvl(0), lvl(3), lvl(12), lvl(40)]) {
      const d = new SpawnDirector(level, testRng(1), 600);
      const runs: { phase: WavePhase; from: number; cycle: number }[] = [];
      for (let t = 100; t <= level.durationSec * 1000; t += 100) {
        d.tick(100, d.minimumAlive);
        if (runs.length === 0 || runs[runs.length - 1].phase !== d.phase) {
          runs.push({ phase: d.phase, from: t, cycle: d.cycle });
        }
      }
      const cycles = cyclesOf(level.durationSec);
      expect(cycles, `level ${level.id}`).toBe(level.durationSec === 180 ? 3 : 5);
      const want: WavePhase[] = [];
      for (let c = 0; c < cycles; c++) want.push('build', 'peak', 'relax');
      want.push('boss');
      expect(
        runs.map((r) => r.phase),
        `level ${level.id}`,
      ).toEqual(want);
      expect(runs.filter((r) => r.phase === 'build').map((r) => r.cycle)).toEqual(
        Array.from({ length: cycles }, (_, c) => c),
      );
      const boss = runs[runs.length - 1];
      expect(
        Math.abs(boss.from - (level.durationSec - BOSS_WARNING_SEC) * 1000),
      ).toBeLessThanOrEqual(100);
      expect(boss.cycle).toBe(-1);
      for (let i = 0; i < runs.length - 1; i++) {
        const len = runs[i + 1].from - runs[i].from;
        if (runs[i].phase === 'peak') {
          expect(Math.abs(len - PEAK_SEC * 1000)).toBeLessThanOrEqual(100);
        }
        if (runs[i].phase === 'relax') expect(len).toBeGreaterThanOrEqual(RELAX_SEC * 1000 - 100);
      }
    }
  });

  it('puts every planned event of WAVE_PLANS into a peak (fits AP-176)', () => {
    for (const level of LEVELS) {
      const curve = pacingCurve(level);
      for (const e of WAVE_PLANS[level.id].events) {
        expect(pacingPhaseAt(curve, e.atSec), `level ${level.id} at ${e.atSec}`).toBe('peak');
      }
    }
  });

  it('peak is the highest rate, relax runs at relaxRate, every cycle is higher, the boss phase keeps the base ramp', () => {
    for (const level of LEVELS) {
      const c = pacingCurve(level);
      const { cycleSec, peakSec, relaxRate } = c.pacing;
      let lastPeak = 0;
      for (let k = 0; k < c.cycles; k++) {
        const start = k * cycleSec;
        const buildEnd = pacingFactorAt(c, start + c.buildSec - 0.01);
        const buildStart = pacingFactorAt(c, start + 0.01);
        const peak = pacingFactorAt(c, start + c.buildSec + peakSec / 2);
        const relax = pacingFactorAt(c, start + c.buildSec + peakSec + 1);
        expect(buildEnd, `level ${level.id} cycle ${k}`).toBeGreaterThan(buildStart);
        expect(peak, `level ${level.id} cycle ${k}`).toBeGreaterThan(buildEnd);
        expect(relax).toBe(relaxRate);
        expect(peak, `level ${level.id} cycle ${k}`).toBeGreaterThan(lastPeak);
        lastPeak = peak;
      }
      expect(pacingFactorAt(c, c.windowSec + 1)).toBe(1);
    }
  });

  it('keeps the spawns per minute of every level within 5 percent of the base ramp', () => {
    for (const level of LEVELS) {
      const d = new SpawnDirector(level, testRng(level.id + 1), 600);
      let n = 0;
      for (let t = 0; t < level.durationSec * 1000; t += 50) n += d.tick(50, d.minimumAlive).length;
      const ratio = n / baseRampCount(level);
      expect(ratio, `level ${level.id}`).toBeGreaterThan(0.95);
      expect(ratio, `level ${level.id}`).toBeLessThan(1.05);
    }
  });

  it('never drops below the minimum occupancy (except at the cap), also in the relax phase', () => {
    for (const id of [0, 2, 5, 12, 25, 40]) {
      const level = lvl(id);
      expect(WAVE_PLANS[id].minAlive).toBeGreaterThan(0);
      const res = simulate(level, { killEveryMs: 400, report: true, seed: id + 3 });
      expect(res.belowMinAlive, `level ${id}`).toBe(0);
    }
  });

  it('fills at most one enemy per 250 ms', () => {
    const level = lvl(12);
    const d = new SpawnDirector(level, testRng(8), 600);
    d.tick(1, level.maxEnemies); // no opening wave
    let fills = 0;
    for (let t = 0; t < 10_000; t += 10) fills += d.tick(10, 0).length;
    // 10 s at 4 per second; the regular spawns are taken from the schedule ahead (none extra).
    expect(fills).toBeLessThanOrEqual(10_000 / FILL_INTERVAL_MS + 2);
    expect(fills).toBeGreaterThanOrEqual(10_000 / FILL_INTERVAL_MS - 2);
  });

  it('role cap = max(ROLE_CAPS, ROLE_CAP_HEADROOM x pool share x living), roles without an entry have none', () => {
    const level = lvl(0);
    const d = new SpawnDirector(level, testRng(1), 600);
    // Small field: the fixed cap of RS-01.4 applies.
    expect(d.roleCap('tank')).toBe(ROLE_CAPS.tank);
    expect(d.roleCap('melee')).toBe(Number.POSITIVE_INFINITY);
    const total = level.enemyPool.reduce((s, e) => s + e.weight, 0);
    const tankShare =
      level.enemyPool
        .filter((e) => ENEMIES[e.enemyId].role === 'tank')
        .reduce((s, e) => s + e.weight, 0) / total;
    // Nobody dies: the field fills up to the level cap.
    let alive = 0;
    for (let t = 0; t < 90_000; t += 50) alive += d.tick(50, alive).length;
    expect(alive).toBeGreaterThan(20);
    expect(d.roleCap('tank')).toBe(
      Math.max(ROLE_CAPS.tank ?? 0, Math.ceil(ROLE_CAP_HEADROOM * tankShare * (alive + 1))),
    );
    expect(d.roleCap('tank')).toBeGreaterThan(ROLE_CAPS.tank ?? 0);
  });

  it('never exceeds a role cap, with exact reports and with the estimate from the living count', () => {
    for (const id of [0, 2, 5, 12, 20, 21, 26, 31, 40]) {
      const level = lvl(id);
      const res = simulate(level, { killEveryMs: 1500, report: true, seed: id + 5 });
      expect(res.capViolations, `level ${id}`).toBe(0);
      // Without reports the director spreads the deaths evenly; its own count stays under the caps.
      const d = new SpawnDirector(level, testRng(id), 600);
      let alive = 0;
      for (let t = 0; t < 120_000; t += 50) {
        const before = ROLE_LIST.map((r) => d.roleAlive(r));
        alive = Math.max(0, alive + d.tick(50, alive).length - (t % 1000 === 0 ? 3 : 0));
        ROLE_LIST.forEach((r, i) => {
          // A role only grows while it is under its cap.
          if (d.roleAlive(r) > before[i] + 1e-9) {
            expect(d.roleAlive(r), `level ${id} ${r}`).toBeLessThanOrEqual(d.roleCap(r) + 1e-9);
          }
        });
      }
    }
  });

  /** Spawn shares of a level over `seeds` simulated rounds with exact reports. */
  // Shipped config (elites on, AP-178): the pool weights of AP-166 are about regular spawns, so elites are not counted.
  function shares(level: LevelDef, killEveryMs: number, seeds = 6): Map<EnemyId, number> {
    const counts = new Map<EnemyId, number>();
    let n = 0;
    for (let seed = 1; seed <= seeds; seed++) {
      for (const s of simulate(level, { killEveryMs, report: true, seed }).spawns) {
        if (s.elite) continue;
        counts.set(s.enemyId, (counts.get(s.enemyId) ?? 0) + 1);
        n += 1;
      }
    }
    for (const [id, c] of counts) counts.set(id, c / n);
    return counts;
  }

  it('keeps the shares of AP-166 within 2 percentage points with rhythm, budget and caps while the tank cap is not full (level 0, fast player)', () => {
    const level = lvl(0);
    const total = level.enemyPool.reduce((s, e) => s + e.weight, 0);
    const got = shares(level, 400);
    for (const e of level.enemyPool) {
      expect(Math.abs((got.get(e.enemyId) ?? 0) - e.weight / total), e.enemyId).toBeLessThanOrEqual(
        0.02,
      );
    }
  });

  /** Largest deviation (percentage points) of the spawn shares from the pool weights, over three kill speeds. */
  function worstShareDeviation(level: LevelDef, seeds: number): { pp: number; at: string } {
    const total = level.enemyPool.reduce((s, e) => s + e.weight, 0);
    let worst = { pp: 0, at: '' };
    // Fast, medium and slow player: the field stays thin, fills up or sits at the level cap.
    for (const f of [0.8, 1.5, 3]) {
      const got = shares(level, level.spawnIntervalMs * f, seeds);
      for (const e of level.enemyPool) {
        const pp = Math.abs((got.get(e.enemyId) ?? 0) - e.weight / total) * 100;
        if (pp > worst.pp) worst = { pp, at: `level ${level.id} kill x${f} ${e.enemyId}` };
      }
    }
    return worst;
  }

  it('level 0 to 2 (tree, boar, bear) with a full field: the tank cap grows with the field, shares stay within 2 pp of AP-166', () => {
    for (const id of [0, 1, 2]) {
      const worst = worstShareDeviation(lvl(id), 20);
      expect(worst.pp, worst.at).toBeLessThanOrEqual(2);
    }
  }, 120_000);

  it('every level from 3 on (shooter, aura and tank caps) keeps the shares of AP-166 within 2 pp', () => {
    for (const level of LEVELS.slice(3)) {
      const worst = worstShareDeviation(level, 6);
      // 2 pp of AP-166 plus 0.5 pp: living elites (3 % of the spawns) take role-cap slots, so a full field (kill x3)
      // gives the regular rest a little less room (measured worst case 2.24 pp, level 9). AP-178.
      expect(worst.pp, worst.at).toBeLessThanOrEqual(2.5);
    }
  }, 300_000);

  it('spends saved threat budget in the peaks and never goes below zero', () => {
    // Level 3 and 4: forest pool, no role cap full at the minimum occupancy, so the budget decides.
    for (const id of [3, 4]) {
      const level = lvl(id);
      const d = new SpawnDirector(level, testRng(id), 600);
      const atStart: number[] = [];
      const atEnd: number[] = [];
      let prev: WavePhase = d.phase;
      for (let t = 0; t < level.durationSec * 1000; t += 50) {
        d.tick(50, d.minimumAlive);
        expect(d.threatBudget).toBeGreaterThanOrEqual(0);
        if (d.phase === 'peak' && prev !== 'peak') atStart.push(d.threatBudget);
        if (d.phase !== 'peak' && prev === 'peak') atEnd.push(d.threatBudget);
        prev = d.phase;
      }
      expect(atStart.length).toBe(cyclesOf(level.durationSec));
      atStart.forEach((b, i) => expect(atEnd[i], `level ${id} cycle ${i}`).toBeLessThan(b));
      expect(simulate(level, { killEveryMs: 300, seed: id }).budgetMin).toBeGreaterThanOrEqual(0);
    }
    // The income grows with the level (denser spawns, BUDGET_MARGIN x mean cost per spawn).
    expect(BUDGET_MARGIN).toBeGreaterThan(1);
    expect(BANK_SEC).toBeGreaterThan(0);
    const start = (id: number): number => new SpawnDirector(lvl(id), testRng(1), 600).threatBudget;
    expect(start(40)).toBeGreaterThan(start(0));
  });

  it('marks no elite while the rules are switched off, and in the default rules before fromLevel', () => {
    expect(ELITE_RULES.enabled).toBe(true);
    const NO_ELITES: EliteRules = { ...ELITE_RULES, enabled: false };
    for (const id of [0, 3, 12, 40]) {
      const res = simulate(lvl(id), { killEveryMs: 500, seed: id, rules: NO_ELITES });
      expect(res.spawns.some((s) => s.elite)).toBe(false);
    }
    for (const id of [0, 1, 2]) {
      const res = simulate(lvl(id), { killEveryMs: 500, seed: id });
      expect(res.spawns.some((s) => s.elite)).toBe(false);
    }
  });

  it('marks elites when enabled: from fromLevel, single ones, preferably in peaks, at most maxShare of the living', () => {
    const rules: EliteRules = { ...ELITE_RULES, enabled: true };
    expect(
      simulate(lvl(rules.fromLevel - 1), { killEveryMs: 700, rules }).spawns.some((s) => s.elite),
    ).toBe(false);
    let peakSpawns = 0;
    let peakElites = 0;
    let otherSpawns = 0;
    let otherElites = 0;
    for (const id of [rules.fromLevel, 12, 30, 40]) {
      const res = simulate(lvl(id), { killEveryMs: 700, report: true, rules, seed: id });
      expect(res.eliteShareViolations, `level ${id}`).toBe(0);
      const elites = res.spawns.filter((s) => s.elite).length;
      expect(elites, `level ${id}`).toBeGreaterThan(0);
      expect(elites / res.spawns.length, `level ${id}`).toBeLessThanOrEqual(rules.maxShare);
      for (const s of res.spawns) {
        if (s.phase === 'peak') {
          peakSpawns += 1;
          if (s.elite) peakElites += 1;
        } else {
          otherSpawns += 1;
          if (s.elite) otherElites += 1;
        }
      }
    }
    expect(peakElites / peakSpawns).toBeGreaterThan(otherElites / otherSpawns);
  });

  it('allocates nothing per frame: the output array is reused and stays empty without spawns', () => {
    const level = lvl(12);
    const d = new SpawnDirector(level, testRng(2), 600);
    const first = d.tick(16, level.maxEnemies);
    expect(d.tick(16, level.maxEnemies)).toBe(first);
    expect(first).toHaveLength(0);
  });

  it('is deterministic for the same seed with the rhythm and the budget', () => {
    const a = simulate(lvl(21), { killEveryMs: 500, seed: 4 }).spawns;
    const b = simulate(lvl(21), { killEveryMs: 500, seed: 4 }).spawns;
    expect(a).toEqual(b);
  });

  describe('spawn events (AP-177, RS-01.3, PE-228)', () => {
    const ARENA = { width: 640, height: 360 };
    interface EventRun {
      announced: { t: number; eventId: number; kind: string; angles: readonly number[] }[];
      fired: Map<number, { t: number; angles: number[] }>;
      ended: { t: number; eventId: number }[];
      total: number;
      maxAlive: number;
    }
    /** Runs a round with the arena; the field holds `alive` enemies (or the real count if `world`). */
    function runEvents(
      level: LevelDef,
      dt: number,
      opts: { seed?: number; killEveryMs?: number } = {},
    ): EventRun {
      const d = new SpawnDirector(level, testRng(opts.seed ?? 3), 600, ELITE_RULES, ARENA);
      const run: EventRun = { announced: [], fired: new Map(), ended: [], total: 0, maxAlive: 0 };
      let alive = 0;
      let nextKill = opts.killEveryMs ?? 400;
      for (let t = 0; t < level.durationSec * 1000; t += dt) {
        if (t >= nextKill) {
          nextKill += opts.killEveryMs ?? 400;
          alive = Math.max(0, alive - 1);
        }
        const reqs = d.tick(dt, alive, t >= (level.durationSec - BOSS_WARNING_SEC) * 1000);
        for (const a of d.eventAnnouncements) run.announced.push({ t, ...a });
        for (const id of d.endedEvents) run.ended.push({ t, eventId: id });
        for (const r of reqs) {
          if (r.eventId !== undefined) {
            const f = run.fired.get(r.eventId) ?? { t, angles: [] };
            f.angles.push(r.angle);
            run.fired.set(r.eventId, f);
          }
        }
        alive += reqs.length;
        run.total += reqs.length;
        run.maxAlive = Math.max(run.maxAlive, alive);
      }
      return run;
    }
    const angleDiff = (a: number, b: number): number => {
      const d = Math.abs(a - b) % (Math.PI * 2);
      return Math.min(d, Math.PI * 2 - d);
    };
    const withEvents = LEVELS.filter((l) => WAVE_PLANS[l.id].events.length > 0);

    it('has levels with events to test', () => {
      expect(withEvents.length).toBeGreaterThan(0);
    });

    it('announces every event before its spawns, never in the same tick, also with a long frame', () => {
      for (const dt of [16, 50, 2500]) {
        for (const level of withEvents.slice(0, 6)) {
          const run = runEvents(level, dt);
          expect(run.announced.length, `level ${level.id}`).toBeGreaterThan(0);
          for (const a of run.announced) {
            const f = run.fired.get(a.eventId);
            if (f) expect(f.t, `level ${level.id} dt ${dt}`).toBeGreaterThan(a.t);
          }
          for (const [id] of run.fired) {
            expect(run.announced.some((a) => a.eventId === id)).toBe(true);
          }
        }
      }
    });

    it('fires an event no earlier than announceMs after the announcement and ends each event once', () => {
      const level = withEvents[0];
      const run = runEvents(level, 16);
      for (const a of run.announced) {
        const f = run.fired.get(a.eventId);
        const sched = eventScheduleOf(level.id)[a.eventId];
        if (f) expect(f.t + 16).toBeGreaterThanOrEqual(sched.fireMs);
        expect(run.ended.filter((e) => e.eventId === a.eventId)).toHaveLength(1);
      }
    });

    it('marks the direction the group comes from: swarm and pincer angles match their spawns', () => {
      let checked = 0;
      for (const level of withEvents) {
        const run = runEvents(level, 50);
        for (const a of run.announced) {
          const f = run.fired.get(a.eventId);
          if (!f) continue;
          if (a.kind === 'ring') {
            expect(a.angles).toHaveLength(0);
            continue;
          }
          expect(a.angles).toHaveLength(a.kind === 'pincer' ? 2 : 1);
          if (a.kind === 'pincer')
            expect(angleDiff(a.angles[0], a.angles[1])).toBeCloseTo(Math.PI, 5);
          for (const s of f.angles) {
            const near = Math.min(...a.angles.map((m) => angleDiff(m, s)));
            expect(near, `level ${level.id} ${a.kind}`).toBeLessThan(Math.PI / 2);
          }
          checked += 1;
        }
      }
      expect(checked).toBeGreaterThan(0);
    });

    it('counts event spawns against the regular ones: spawns per minute stay within 5 percent', () => {
      for (const level of LEVELS) {
        const d = new SpawnDirector(level, testRng(level.id + 1), 600, ELITE_RULES, ARENA);
        let n = 0;
        for (let t = 0; t < level.durationSec * 1000; t += 50)
          n += d.tick(50, d.minimumAlive).length;
        const ratio = n / baseRampCount(level);
        expect(ratio, `level ${level.id}`).toBeGreaterThan(0.95);
        expect(ratio, `level ${level.id}`).toBeLessThan(1.05);
      }
    });

    it('never exceeds maxEnemies with events', () => {
      for (const level of withEvents) {
        const run = runEvents(level, 50, { killEveryMs: 200 });
        expect(run.maxAlive, `level ${level.id}`).toBeLessThanOrEqual(level.maxEnemies);
      }
    });

    it('drops events in the boss phase: no announcement and no spawn after the boss warning', () => {
      for (const level of withEvents) {
        const run = runEvents(level, 50);
        const bossMs = (level.durationSec - BOSS_WARNING_SEC) * 1000;
        for (const a of run.announced) expect(a.t).toBeLessThan(bossMs);
        for (const [, f] of run.fired) expect(f.t).toBeLessThan(bossMs);
      }
    });

    it('runs no events without an arena (existing callers unchanged)', () => {
      const level = withEvents[0];
      const d = new SpawnDirector(level, testRng(3), 600);
      for (let t = 0; t < level.durationSec * 1000; t += 50) {
        for (const r of d.tick(50, 0)) expect(r.eventId).toBeUndefined();
        expect(d.eventAnnouncements).toHaveLength(0);
      }
    });

    it('reuses the announcement and ended arrays (no allocation per frame)', () => {
      const d = new SpawnDirector(withEvents[0], testRng(3), 600, ELITE_RULES, ARENA);
      d.tick(16, 0);
      const a = d.eventAnnouncements;
      const e = d.endedEvents;
      d.tick(16, 0);
      expect(d.eventAnnouncements).toBe(a);
      expect(d.endedEvents).toBe(e);
    });
  });
});

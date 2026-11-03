import { describe, expect, it } from 'vitest';
import { ENEMIES } from '../../src/config';
import { LEVELS } from '../../src/config/levels';
import { ELITE_RULES } from '../../src/config/waves';
import type { EliteRules, EnemyId } from '../../src/contracts';
import { SpawnDirector } from '../../src/logic/spawn';
import { eliteHpFactor, referencePressure } from '../../src/logic/balanceModel';
import { enemyScaleFor } from '../../src/logic/scaling';

// AP-178: elites are pressure-neutral in the balance model (eliteHpFactor = 1). This test measures it with the
// real SpawnDirector: spawn count and hp sum of a round with and without elites (kill speeds from a thin field to a
// full one, 6 seeds), so the elite share in the model is backed by numbers and not only by an upper bound.

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

interface Totals {
  spawns: number;
  hp: number;
  elites: number;
}

function run(levelId: number, rules: EliteRules, killEveryMs: number, seed: number): Totals {
  const level = LEVELS[levelId];
  const d = new SpawnDirector(level, testRng(seed), 600, rules);
  const killRng = testRng(seed + 1000);
  const hpScale = enemyScaleFor(levelId).hp;
  const world: { id: EnemyId; elite: boolean }[] = [];
  const total: Totals = { spawns: 0, hp: 0, elites: 0 };
  let nextKill = killEveryMs;
  for (let t = 0; t < level.durationSec * 1000; t += 50) {
    if (t >= nextKill) {
      nextKill += killEveryMs;
      if (world.length > 0) {
        const [gone] = world.splice(Math.floor(killRng.next() * world.length), 1);
        d.noteRemoved(gone.id, gone.elite);
      }
    }
    for (const r of d.tick(50, world.length)) {
      const elite = r.elite === true;
      world.push({ id: r.enemyId, elite });
      total.spawns += 1;
      total.hp += ENEMIES[r.enemyId].hp * hpScale * (elite ? rules.hpMul : 1);
      if (elite) total.elites += 1;
    }
  }
  return total;
}

function sum(levelId: number, rules: EliteRules): Totals {
  const level = LEVELS[levelId];
  const acc: Totals = { spawns: 0, hp: 0, elites: 0 };
  for (const f of [0.8, 1.5, 3]) {
    for (let seed = 1; seed <= 6; seed++) {
      const t = run(levelId, rules, level.spawnIntervalMs * f, seed);
      acc.spawns += t.spawns;
      acc.hp += t.hp;
      acc.elites += t.elites;
    }
  }
  return acc;
}

describe('elites and the balance model (AP-178, measured with the SpawnDirector)', () => {
  it('replaces regular spawns one for one: the spawn count is the same, the hp per round grows by 3 to 9 %, the share stays below maxShare', () => {
    const off: EliteRules = { ...ELITE_RULES, enabled: false };
    for (const id of [3, 4, 12, 30, 39, 40]) {
      const a = sum(id, off);
      const b = sum(id, ELITE_RULES);
      const share = b.elites / b.spawns;
      expect(b.elites, `level ${id}`).toBeGreaterThan(0);
      expect(share, `level ${id}`).toBeLessThanOrEqual(ELITE_RULES.maxShare);
      // Measured (levels 3, 4, 12, 30, 39, 40): spawns x1.000, hp x1.046 to x1.084, share 2.4 to 3.6 %.
      expect(b.spawns / a.spawns, `level ${id} spawns`).toBeCloseTo(1, 2);
      expect(b.hp / a.hp, `level ${id} hp`).toBeGreaterThan(1.03);
      expect(b.hp / a.hp, `level ${id} hp`).toBeLessThan(1.1);
    }
  }, 120_000);

  it('keeps the model neutral on purpose: eliteHpFactor is 1 although the measured hp grows (no room in the bands)', () => {
    for (const id of [0, 3, 4, 12, 30, 39, 40]) expect(eliteHpFactor(id)).toBe(1);
    // Level 40 sits at 1.799 of at most 1.8: a measured +5.7 % would break the band (AP-168, Q-81).
    expect(referencePressure(40)).toBeGreaterThan(1.79);
    expect(referencePressure(40)).toBeLessThanOrEqual(1.8);
  });
});

import { describe, expect, it } from 'vitest';
import { ENEMIES, ITEMS, LEVELS, WEAPON_BASE } from '../../src/config';
import type { LevelDef, WeaponStacks } from '../../src/contracts';
import { computeWeaponStats } from '../../src/logic/weapon';
import { MIN_INTERVAL_FACTOR } from '../../src/logic/spawn';

/** Annahme: Gegner starten etwa so weit vom Zentrum (Diagonale/2 + Rand der 640x360-Arena). */
const SPAWN_RADIUS = 380;
const MAX_STACKS: WeaponStacks = { fireRate: 5, damage: 5, size: 5 };
const HALF_STACKS: WeaponStacks = { fireRate: 2, damage: 2, size: 2 };
const NO_STACKS: WeaponStacks = { fireRate: 0, damage: 0, size: 0 };

function dps(stacks: WeaponStacks): number {
  const w = computeWeaponStats(WEAPON_BASE, stacks, ITEMS);
  return w.fireRatePerSec * w.damage;
}

/** Gegnerschaden pro Sekunde, wenn er die Astronautin erreicht hat. */
function threatDps(enemyId: keyof typeof ENEMIES): number {
  const e = ENEMIES[enemyId];
  if (e.aura) return e.aura.dps;
  if (e.projectile) return (e.projectile.damage * 1000) / e.projectile.intervalMs;
  return e.contactDamage;
}

interface Metrics {
  /** Durchschnittliche Spawns pro Minute (Intervall sinkt ueber die Runde auf 60 %). */
  spawnsPerMin: number;
  /** Gesamt-HP aller neu erscheinenden Gegner pro Minute. */
  enemyHpPerMin: number;
  /** Noetige Treffer-DPS, um alle Gegner zu besiegen (HP pro Sekunde). */
  hpPerSec: number;
  /** HP pro Sekunde geteilt durch Basis-DPS. >1 heisst: ohne Items nicht zu schaffen. */
  pressure: number;
  /** Schaden pro Minute, wenn die Astronautin nichts abschiesst (freier Durchlauf). */
  freeRunDamagePerMin: number;
}

function metrics(level: LevelDef): Metrics {
  const total = level.enemyPool.reduce((s, e) => s + e.weight, 0);
  const meanHp = level.enemyPool.reduce((s, e) => s + (e.weight / total) * ENEMIES[e.enemyId].hp, 0);

  const durMs = level.durationSec * 1000;
  let t = level.spawnIntervalMs;
  let spawned = 0;
  let freeDamage = 0;
  let allSpawns = 0;
  while (t < durMs) {
    allSpawns += 1;
    if (spawned < level.maxEnemies) {
      spawned += 1;
      for (const entry of level.enemyPool) {
        const arrive = (SPAWN_RADIUS / ENEMIES[entry.enemyId].speed) * 1000;
        const left = Math.max(0, durMs - t - arrive) / 1000;
        freeDamage += (entry.weight / total) * threatDps(entry.enemyId) * left;
      }
    }
    const progress = Math.min(1, t / durMs);
    t += level.spawnIntervalMs * (1 - (1 - MIN_INTERVAL_FACTOR) * progress);
  }
  const minutes = level.durationSec / 60;
  const spawnsPerMin = allSpawns / minutes;
  const enemyHpPerMin = spawnsPerMin * meanHp;
  return {
    spawnsPerMin,
    enemyHpPerMin,
    hpPerSec: enemyHpPerMin / 60,
    pressure: enemyHpPerMin / 60 / dps(NO_STACKS),
    freeRunDamagePerMin: freeDamage / minutes,
  };
}

const M = LEVELS.map(metrics);
const batchOf = (id: number) => LEVELS[id].batch;

describe('balance: player damage', () => {
  it('items raise dps step by step', () => {
    expect(dps(NO_STACKS)).toBeLessThan(dps(HALF_STACKS));
    expect(dps(HALF_STACKS)).toBeLessThan(dps(MAX_STACKS));
    expect(dps(MAX_STACKS) / dps(NO_STACKS)).toBeGreaterThan(3);
  });
});

describe('balance: difficulty curve', () => {
  it('pressure (enemy HP per second vs. base dps) rises strictly with every level', () => {
    for (let i = 1; i < M.length; i++) {
      expect(M[i].pressure, `level ${i}`).toBeGreaterThan(M[i - 1].pressure);
    }
  });

  it('level 0 is easy: base weapon clearly outdamages the enemy HP stream', () => {
    expect(M[0].pressure).toBeLessThanOrEqual(0.4);
  });

  it('level 20 is demanding but fair: base weapon not enough, full items clearly enough', () => {
    expect(M[20].pressure).toBeGreaterThan(1.2);
    expect(M[20].hpPerSec).toBeLessThan(dps(HALF_STACKS));
    expect(M[20].hpPerSec).toBeLessThan(dps(MAX_STACKS) / 2);
  });

  it('spawn density rises with every level', () => {
    for (let i = 1; i < M.length; i++) {
      expect(M[i].spawnsPerMin, `level ${i}`).toBeGreaterThan(M[i - 1].spawnsPerMin);
    }
  });

  it.each([
    [4, 5],
    [9, 10],
  ])('batch jump %i -> %i is noticeable but not abrupt', (a, b) => {
    expect(batchOf(a)).not.toBe(batchOf(b));
    const jump = M[b].pressure / M[a].pressure;
    expect(jump).toBeGreaterThanOrEqual(1.1);
    expect(jump).toBeLessThanOrEqual(1.5);
    // Der Sprung ist groesser als jeder normale Schritt in den beiden Batches.
    for (const batch of [batchOf(a), batchOf(b)]) {
      for (let i = 1; i < M.length; i++) {
        if (batchOf(i) === batch && batchOf(i - 1) === batch) {
          expect(jump).toBeGreaterThan(M[i].pressure / M[i - 1].pressure);
        }
      }
    }
  });

  it('5-minute levels are more demanding than 3-minute levels of the same batch', () => {
    for (const a of LEVELS) {
      for (const b of LEVELS) {
        if (a.batch === b.batch && a.durationSec === 180 && b.durationSec === 300) {
          expect(M[b.id].pressure, `${b.id} vs ${a.id}`).toBeGreaterThan(M[a.id].pressure);
          expect(M[b.id].freeRunDamagePerMin).toBeGreaterThan(M[a.id].freeRunDamagePerMin);
        }
      }
    }
  });

  it('covers all 21 levels', () => {
    expect(M).toHaveLength(21);
  });
});

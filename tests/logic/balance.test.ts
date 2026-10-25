import { describe, expect, it } from 'vitest';
import {
  COIN_RULES,
  ENEMIES,
  ITEMS,
  ITEM_RULES,
  LEVELS,
  PLAYER,
  RAPID_FIRE_MAX_PER_SEC,
  WEAPON_BASE,
} from '../../src/config';
import type { ActivePowers, LevelDef } from '../../src/contracts';
import { MAX_UPGRADE_LEVEL } from '../../src/contracts';
import { upgradeCost } from '../../src/logic/upgrades';
import { computeWeaponStats } from '../../src/logic/weapon';
import { MIN_INTERVAL_FACTOR } from '../../src/logic/spawn';

/** Annahme: Gegner starten etwa so weit vom Zentrum (Diagonale/2 + Rand der 640x360-Arena). */
const SPAWN_RADIUS = 380;
const FACTORS_BASE = { weaponFireRateMult: 1, weaponDamageMult: 1 };
const power = (doubleShotStage: number, rapidFireMsLeft = 0): ActivePowers => ({
  doubleShotStage,
  shieldLeft: 0,
  rapidFireMsLeft,
});

/** Schaden pro Sekunde (alle Schuesse zusammen, volle Trefferquote) mit Items. */
function dps(doubleShotStage: number, rapidFire = false): number {
  const w = computeWeaponStats(
    WEAPON_BASE,
    FACTORS_BASE,
    power(doubleShotStage, rapidFire ? 1 : 0),
  );
  return w.fireRatePerSec * w.damage * (w.shotCount ?? 1);
}
const BASE_DPS = dps(0);

const itemDef = (id: string) => ITEMS.find((i) => i.id === id)!;

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
  const meanHp = level.enemyPool.reduce(
    (s, e) => s + (e.weight / total) * ENEMIES[e.enemyId].hp,
    0,
  );

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
    pressure: enemyHpPerMin / 60 / BASE_DPS,
    freeRunDamagePerMin: freeDamage / minutes,
  };
}

const M = LEVELS.map(metrics);
/** Gewonnenes Level: alle Gegner besiegt. Anzahl Spawns wie in `metrics`. */
function spawnCount(level: LevelDef): number {
  const durMs = level.durationSec * 1000;
  let t = level.spawnIntervalMs;
  let n = 0;
  while (t < durMs) {
    n += 1;
    t += level.spawnIntervalMs * (1 - (1 - MIN_INTERVAL_FACTOR) * Math.min(1, t / durMs));
  }
  return n;
}

/** Gold je gewonnenem Level = Gegnerzahl x Muenz-Drop-Chance x mittlerer Muenzwert. */
function goldOf(level: LevelDef): number {
  const total = level.enemyPool.reduce((s, e) => s + e.weight, 0);
  const meanCoin = level.enemyPool.reduce(
    (s, e) => s + (e.weight / total) * (ENEMIES[e.enemyId].coinValue ?? 0),
    0,
  );
  return spawnCount(level) * COIN_RULES.dropChance * meanCoin;
}

/** Anteil der Rundenzeit mit Dauerfeuer, wenn jedes Item aufgesammelt wird und nichts ueberlappt. */
function rapidFireUptime(level: LevelDef): number {
  const share = itemDef('rapidFire').dropWeight / ITEMS.reduce((s, i) => s + i.dropWeight, 0);
  const drops = spawnCount(level) * ITEM_RULES.dropChance * share;
  return Math.min(1, (drops * (itemDef('rapidFire').durationMs ?? 0)) / (level.durationSec * 1000));
}

const GOLD = LEVELS.map(goldOf);
const GOLD_MEAN = GOLD.reduce((a, b) => a + b, 0) / GOLD.length;
const TRACKS = ['weaponFireRate', 'weaponDamage', 'playerMaxHp', 'playerTurnSpeed'] as const;
const trackCost = (track: (typeof TRACKS)[number]): number => {
  let sum = 0;
  for (let k = 0; k < MAX_UPGRADE_LEVEL; k++) sum += upgradeCost(track, k) ?? 0;
  return sum;
};

const batchOf = (id: number) => LEVELS[id].batch;

describe('balance: player damage', () => {
  it('items raise dps step by step', () => {
    expect(dps(0)).toBeLessThan(dps(1));
    expect(dps(1)).toBeLessThan(dps(2));
    expect(dps(2)).toBeLessThan(dps(2, true));
    expect(dps(2) / dps(0)).toBeCloseTo(3, 5);
  });

  it('double shot, shield and rapid fire are noticeable but not dominant', () => {
    // Doppelschuss: Stufe 1 spuerbar (mindestens +50 %), Stufe 2 hoechstens das Dreifache.
    expect(dps(1) / BASE_DPS).toBeGreaterThanOrEqual(1.5);
    expect(dps(2) / BASE_DPS).toBeLessThanOrEqual(3);
    // Schild-Puffer: hoechstens 1,5-mal die Lebenspunkte, mindestens die Haelfte.
    const shield = itemDef('shield');
    const buffer = shield.perStack * shield.maxStacks;
    expect(buffer).toBeLessThanOrEqual(PLAYER.maxHp * 1.5);
    expect(buffer).toBeGreaterThanOrEqual(PLAYER.maxHp * 0.5);
    // Dauerfeuer: fuer sich spuerbar, im Mittel ueber die Runde (Level 20) weniger als +100 %.
    expect(RAPID_FIRE_MAX_PER_SEC / WEAPON_BASE.fireRatePerSec).toBeGreaterThan(2);
    const uptime = rapidFireUptime(LEVELS[20]);
    expect(uptime).toBeGreaterThan(0.1);
    expect(1 + uptime * (dps(0, true) / BASE_DPS - 1)).toBeLessThan(2);
  });
});

describe('balance: gold and upgrades', () => {
  it('mean gold per won level is about 45', () => {
    expect(GOLD_MEAN).toBeGreaterThanOrEqual(43);
    expect(GOLD_MEAN).toBeLessThanOrEqual(47);
  });

  it('late levels pay more gold than early levels (5-minute levels pay more than 3-minute ones)', () => {
    expect(GOLD[20]).toBeGreaterThan(GOLD[0] * 5);
    expect(Math.min(...GOLD)).toBeGreaterThan(5);
  });

  it('level 10 of one upgrade is reached after 15 to 20 levels at mean gold', () => {
    for (const track of TRACKS) {
      const levels = trackCost(track) / GOLD_MEAN;
      expect(levels, track).toBeGreaterThanOrEqual(15);
      expect(levels, track).toBeLessThanOrEqual(20);
    }
  });

  it('all four upgrades at level 10 cost about 2800 gold together', () => {
    const total = TRACKS.reduce((s, t) => s + trackCost(t), 0);
    expect(total).toBeGreaterThanOrEqual(2700);
    expect(total).toBeLessThanOrEqual(2900);
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

  it('level 20 is demanding but fair: base weapon not enough, double shot clearly enough', () => {
    expect(M[20].pressure).toBeGreaterThanOrEqual(0.9);
    expect(M[20].hpPerSec).toBeLessThan(dps(1));
    expect(M[20].hpPerSec).toBeLessThan(dps(2) / 2);
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
    expect(jump).toBeGreaterThanOrEqual(1.08);
    expect(jump).toBeLessThanOrEqual(a === 4 ? 1.12 : 1.1);
    // Der Sprung ist groesser als jeder normale Schritt im neuen Batch (Level 0-4 sind Festwerte).
    for (const batch of [batchOf(b)]) {
      for (let i = 1; i < M.length; i++) {
        if (batchOf(i) === batch && batchOf(i - 1) === batch) {
          expect(jump).toBeGreaterThan(M[i].pressure / M[i - 1].pressure);
        }
      }
    }
  });

  it('from level 5 every step is at most +10 percent, level 4 to 5 at most +12 percent', () => {
    expect(M[5].pressure / M[4].pressure).toBeLessThanOrEqual(1.12);
    for (let i = 6; i < M.length; i++) {
      const step = M[i].pressure / M[i - 1].pressure;
      expect(step, `level ${i}`).toBeGreaterThan(1);
      expect(step, `level ${i}`).toBeLessThanOrEqual(1.1);
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

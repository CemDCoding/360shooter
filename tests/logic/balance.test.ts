import { describe, expect, it } from 'vitest';
import {
  COIN_RULES,
  ENEMIES,
  ITEMS,
  ITEM_RULES,
  LEVELS,
  LEVEL_SCALING,
  PLAYER,
  RAPID_FIRE_MAX_PER_SEC,
  WEAPON_BASE,
} from '../../src/config';
import type { ActivePowers, LevelDef } from '../../src/contracts';
import { MAX_UPGRADE_LEVEL } from '../../src/contracts';
import { upgradeCost } from '../../src/logic/upgrades';
import { computeWeaponStats } from '../../src/logic/weapon';
import { MIN_INTERVAL_FACTOR, openingCount } from '../../src/logic/spawn';

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
function threatDps(enemyId: keyof typeof ENEMIES, contactScale = 1): number {
  const e = ENEMIES[enemyId];
  if (e.aura) return e.aura.dps;
  if (e.projectile) return (e.projectile.damage * 1000) / e.projectile.intervalMs;
  return e.contactDamage * contactScale;
}

/** Lebenspunkte eines Gegners im Level, gerundet wie in `EnemyPool.spawn` (AP-90, AP-91). */
const scaledHp = (enemyId: keyof typeof ENEMIES, levelId: number): number =>
  Math.max(1, Math.round(ENEMIES[enemyId].hp * LEVEL_SCALING[levelId].hp));

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
    (s, e) => s + (e.weight / total) * scaledHp(e.enemyId, level.id),
    0,
  );

  const durMs = level.durationSec * 1000;
  let t = level.spawnIntervalMs;
  let spawned = 0;
  let freeDamage = 0;
  // Die Eroeffnungswelle (AP-56) zaehlt als Spawns mit; sie erscheint am Rundenstart.
  let allSpawns = Math.min(openingCount(level), level.maxEnemies);
  while (t < durMs) {
    allSpawns += 1;
    if (spawned < level.maxEnemies) {
      spawned += 1;
      for (const entry of level.enemyPool) {
        const arrive = (SPAWN_RADIUS / ENEMIES[entry.enemyId].speed) * 1000;
        const left = Math.max(0, durMs - t - arrive) / 1000;
        freeDamage +=
          (entry.weight / total) * threatDps(entry.enemyId, LEVEL_SCALING[level.id].contact) * left;
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
  let n = Math.min(openingCount(level), level.maxEnemies);
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
  return spawnCount(level) * COIN_RULES.dropChance * LEVEL_SCALING[level.id].coin * meanCoin;
}

/** Erfahrung je gewonnenem Level = Gegnerzahl x mittlere Erfahrung x Faktor (AP-91). */
function xpOf(level: LevelDef): number {
  const total = level.enemyPool.reduce((s, e) => s + e.weight, 0);
  const meanXp = level.enemyPool.reduce(
    (s, e) => s + (e.weight / total) * ENEMIES[e.enemyId].xp,
    0,
  );
  return spawnCount(level) * meanXp * LEVEL_SCALING[level.id].xp;
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

  it('gold and xp per level of level 0 to 4 stay at the old pace despite the denser spawns (AP-91, Q-51)', () => {
    // Werte vor AP-91: Gold = 72, 79, 86, 163, 182 Gegner x 0,08, Erfahrung = Gegner x 5.
    const goldBefore = [5.76, 6.32, 6.88, 13.04, 14.56];
    const xpBefore = [360, 395, 430, 815, 910];
    for (let i = 0; i < 5; i++) {
      expect(GOLD[i] / goldBefore[i], `gold ${i}`).toBeGreaterThan(0.97);
      expect(GOLD[i] / goldBefore[i], `gold ${i}`).toBeLessThan(1.03);
      expect(xpOf(LEVELS[i]) / xpBefore[i], `xp ${i}`).toBeGreaterThan(0.95);
      expect(xpOf(LEVELS[i]) / xpBefore[i], `xp ${i}`).toBeLessThan(1.05);
    }
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

  it('level 0 is easy but not trivial (AP-56): pressure 0.45 to 0.55', () => {
    expect(M[0].pressure).toBeGreaterThanOrEqual(0.45);
    expect(M[0].pressure).toBeLessThanOrEqual(0.55);
  });

  it('level 4 (end of the first batch) has pressure 0.72 to 0.80 (AP-56)', () => {
    expect(M[4].pressure).toBeGreaterThanOrEqual(0.72);
    expect(M[4].pressure).toBeLessThanOrEqual(0.8);
  });

  it('level 20 is demanding but fair: base weapon not enough, double shot clearly enough', () => {
    expect(M[20].pressure).toBeGreaterThanOrEqual(0.95);
    expect(M[20].pressure).toBeLessThanOrEqual(1.25);
    expect(M[20].hpPerSec).toBeLessThan(dps(1));
    expect(M[20].hpPerSec).toBeLessThan(dps(2) / 2);
  });

  it('spawn density rises with every level', () => {
    for (let i = 1; i < M.length; i++) {
      expect(M[i].spawnsPerMin, `level ${i}`).toBeGreaterThan(M[i - 1].spawnsPerMin);
    }
  });

  it('level 0 to 4 have at least 1.5 times the spawns per minute of before AP-91', () => {
    // Vorher (AP-56): 24,0 / 26,3 / 28,7 / 32,6 / 36,4 Spawns pro Minute. Zielwert jetzt etwa das Doppelte.
    const before = [24.0, 26.3, 28.7, 32.6, 36.4];
    for (let i = 0; i < 5; i++) {
      expect(M[i].spawnsPerMin / before[i], `level ${i}`).toBeGreaterThanOrEqual(1.5);
    }
  });

  it('level 5 to 20 have about 1.3 times the spawns per minute of after AP-91 (AP-95)', () => {
    // Stand nach AP-91 (Spawns pro Minute, Level 5 bis 20).
    const before = [
      69.7, 72.0, 75.0, 77.8, 81.0, 98.3, 99.3, 100.7, 102.0, 103.3, 104.7, 106.4, 107.8, 109.4,
      111.0, 112.4,
    ];
    for (let i = 5; i < 21; i++) {
      const ratio = M[i].spawnsPerMin / before[i - 5];
      expect(ratio, `level ${i}`).toBeGreaterThanOrEqual(1.27);
      expect(ratio, `level ${i}`).toBeLessThanOrEqual(1.35);
    }
  });

  it('gold and xp per level of level 5 to 20 stay at the pace after AP-91 despite the denser spawns (AP-95, Q-51)', () => {
    const before = [
      69.7, 72.0, 75.0, 77.8, 81.0, 98.3, 99.3, 100.7, 102.0, 103.3, 104.7, 106.4, 107.8, 109.4,
      111.0, 112.4,
    ];
    for (let i = 5; i < 21; i++) {
      const oldCount = (before[i - 5] * LEVELS[i].durationSec) / 60;
      const ratioGold = (spawnCount(LEVELS[i]) * LEVEL_SCALING[i].coin) / oldCount;
      const ratioXp = (spawnCount(LEVELS[i]) * LEVEL_SCALING[i].xp) / oldCount;
      const ratioContact = (spawnCount(LEVELS[i]) * LEVEL_SCALING[i].contact) / oldCount;
      for (const r of [ratioGold, ratioXp, ratioContact]) {
        expect(r, `level ${i}`).toBeGreaterThan(0.96);
        expect(r, `level ${i}`).toBeLessThan(1.04);
      }
    }
  });

  it('level 0 to 4 are denser than before but stay below level 5 (jump 4 -> 5 stays)', () => {
    expect(M[4].spawnsPerMin).toBeLessThan(M[5].spawnsPerMin);
  });

  it('total contact damage of level 0 to 4 (enemy count x contact factor) stays within 5 percent of before AP-91', () => {
    // Gegnerzahl vor AP-91: 72 / 79 / 86 / 163 / 182, Kontaktfaktor damals 1.
    const before = [72, 79, 86, 163, 182];
    for (let i = 0; i < 5; i++) {
      const ratio = (spawnCount(LEVELS[i]) * LEVEL_SCALING[i].contact) / before[i];
      expect(ratio, `level ${i}`).toBeGreaterThan(0.95);
      expect(ratio, `level ${i}`).toBeLessThanOrEqual(1.05);
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
    // Der Sprung ist groesser als jeder normale Schritt im neuen Batch (Level 0-4 sind keine Festwerte mehr, AP-56).
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

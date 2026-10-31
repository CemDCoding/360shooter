import { describe, expect, it } from 'vitest';
import {
  CHARGE_TRIGGER_DISTANCE,
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
import type { ActivePowers, BatchId, EnemyId, EnemyPoolEntry, LevelDef } from '../../src/contracts';
import { MAX_UPGRADE_LEVEL } from '../../src/contracts';
import { upgradeCost, upgradeFactors } from '../../src/logic/upgrades';
import { computeWeaponStats } from '../../src/logic/weapon';
import { MIN_INTERVAL_FACTOR, openingCount } from '../../src/logic/spawn';

/** Stufe 10 einer Upgrade-Spur nach 15 bis 20 Spiel-Leveln (PE-50, PE-83), gilt fuer Level 0 bis 20. */
const UPGRADE_STAGE_10 = 10;
/** Erstes Level der Wueste (M5). Level 0 bis 20 haben die Baender aus AP-56, AP-91 und AP-95. */
const M5_FIRST = 21;

/** Annahme: Gegner starten etwa so weit vom Zentrum (Diagonale/2 + Rand der 640x360-Arena). */
const SPAWN_RADIUS = 380;
/**
 * Annahme (AP-105): Etwa die Haelfte der Kampfzeit dreht sich die Spielerin zum naechsten Ziel. Ein Wickel der Mumie
 * (Drehung verlangsamt) kostet in dieser Zeit Schaden pro Sekunde.
 */
const AIM_SHARE = 0.5;
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

/** Faktor auf den Schaden pro Sekunde der Grundwaffe, wenn Feuerrate und Schaden auf Stufe `stage` sind. */
function upgradeDpsFactor(stage: number): number {
  const f = upgradeFactors({
    weaponFireRate: stage,
    weaponDamage: stage,
    playerMaxHp: 0,
    playerTurnSpeed: 0,
  });
  const w = computeWeaponStats(WEAPON_BASE, f, power(0));
  return (w.fireRatePerSec * w.damage) / BASE_DPS;
}

/**
 * Annahme der Plan-Vorgabe (AP-105): Stufe 10 auf den Schadens-Spuren bei Level 21, Stufe 15 bei Level 40,
 * dazwischen linear. Nur Feuerrate und Schaden wirken auf den Druck.
 */
const assumedStage = (levelId: number): number => 10 + (5 * (levelId - M5_FIRST)) / 19;

const itemDef = (id: string) => ITEMS.find((i) => i.id === id)!;

/**
 * Wirksame Lebenspunkte je Lebenspunkt (AP-105). Ansturm und Eingraben machen einen Gegner schwerer zu besiegen,
 * der Wickel der Mumie senkt den Schaden der Spielerin. Gift steckt in `threatDps`.
 */
function pressureFactor(enemyId: EnemyId): number {
  const e = ENEMIES[enemyId];
  let f = 1;
  if (e.charge) {
    // Ansturm: die letzten CHARGE_TRIGGER_DISTANCE Pixel legt der Gegner im Sprint zurueck, die Zeit zum Abschiessen sinkt.
    const c = e.charge;
    const approach = SPAWN_RADIUS / e.speed;
    const walk = CHARGE_TRIGGER_DISTANCE / e.speed;
    const dash = c.telegraphMs / 1000 + CHARGE_TRIGGER_DISTANCE / c.dashSpeed;
    f *= approach / (approach - Math.max(0, walk - dash));
    // Rollen: waehrend des Anlaufs nimmt der Gegner nur `dashDamageFactor` Schaden.
    const dashShare = c.dashMs / (c.telegraphMs + c.dashMs + c.cooldownMs);
    f *= 1 / (1 - (1 - c.dashDamageFactor) * dashShare);
  }
  if (e.burrow) {
    // Eingraben: abgetaucht unverwundbar, die Haelfte dieser Zeit geht der Spielerin verloren (die andere trifft sie andere Gegner).
    const b = e.burrow;
    f *= 1 + 0.5 * (b.underMs / (b.underMs + b.surfaceMs));
  }
  const slow = e.projectile?.onHit?.slow;
  if (slow && e.projectile) {
    // Wickel: so lange verlangsamt dreht die Spielerin langsamer und verliert Schaden (Anteil AIM_SHARE).
    const uptime = Math.min(1, slow.durationMs / e.projectile.intervalMs);
    f *= 1 / (1 - (1 - slow.turnFactor) * AIM_SHARE * uptime);
  }
  return f;
}

/** Gegnerschaden pro Sekunde, wenn er die Astronautin erreicht hat (Gift und Wickel eingerechnet, AP-105). */
function threatDps(enemyId: EnemyId, contactScale = 1): number {
  const e = ENEMIES[enemyId];
  if (e.aura) return e.aura.dps;
  if (e.projectile) {
    const shot = (e.projectile.damage * 1000) / e.projectile.intervalMs;
    const slow = e.projectile.onHit?.slow;
    const uptime = slow ? Math.min(1, slow.durationMs / e.projectile.intervalMs) : 0;
    return shot * (1 + (slow ? (1 - slow.turnFactor) * uptime : 0));
  }
  return e.contactDamage * contactScale + (e.onHit?.poison?.dps ?? 0);
}

/** Lebenspunkte eines Gegners im Level, gerundet wie in `EnemyPool.spawn` (AP-90, AP-91). */
const scaledHp = (enemyId: EnemyId, levelId: number): number =>
  Math.max(1, Math.round(ENEMIES[enemyId].hp * LEVEL_SCALING[levelId].hp));

const poolMean = (pool: readonly EnemyPoolEntry[], value: (id: EnemyId) => number): number => {
  const total = pool.reduce((s, e) => s + e.weight, 0);
  return pool.reduce((s, e) => s + (e.weight / total) * value(e.enemyId), 0);
};

interface Metrics {
  /** Durchschnittliche Spawns pro Minute (Intervall sinkt ueber die Runde auf 60 %). */
  spawnsPerMin: number;
  /** Gesamt-HP aller neu erscheinenden Gegner pro Minute (wirksame HP, siehe `pressureFactor`). */
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
  const meanHp = poolMean(level.enemyPool, (id) => scaledHp(id, level.id) * pressureFactor(id));

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

/** Alle 41 Level (AP-105). */
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
function goldOf(level: LevelDef, pool: readonly EnemyPoolEntry[] = level.enemyPool): number {
  const meanCoin = poolMean(pool, (id) => ENEMIES[id].coinValue ?? 0);
  return spawnCount(level) * COIN_RULES.dropChance * LEVEL_SCALING[level.id].coin * meanCoin;
}

/** Erfahrung je gewonnenem Level = Gegnerzahl x mittlere Erfahrung x Faktor (AP-91). */
function xpOf(level: LevelDef, pool: readonly EnemyPoolEntry[] = level.enemyPool): number {
  const meanXp = poolMean(pool, (id) => ENEMIES[id].xp);
  return spawnCount(level) * meanXp * LEVEL_SCALING[level.id].xp;
}

/** Anteil der Rundenzeit mit Dauerfeuer, wenn jedes Item aufgesammelt wird und nichts ueberlappt. */
function rapidFireUptime(level: LevelDef): number {
  const share = itemDef('rapidFire').dropWeight / ITEMS.reduce((s, i) => s + i.dropWeight, 0);
  const drops = spawnCount(level) * ITEM_RULES.dropChance * share;
  return Math.min(1, (drops * (itemDef('rapidFire').durationMs ?? 0)) / (level.durationSec * 1000));
}

const GOLD = LEVELS.map((l) => goldOf(l));
/** Gold-Mittel ueber Level 0 bis 20 (Band 43 bis 47, PE-83). */
const GOLD_MEAN = GOLD.slice(0, M5_FIRST).reduce((a, b) => a + b, 0) / M5_FIRST;
/** Gold aller gewonnenen Level 0 bis `id`. */
const goldUpTo = (id: number): number => GOLD.slice(0, id + 1).reduce((a, b) => a + b, 0);
const TRACKS = ['weaponFireRate', 'weaponDamage', 'playerMaxHp', 'playerTurnSpeed'] as const;
/** Preis einer Spur von Stufe 0 bis Stufe `stage`. */
const trackCost = (track: (typeof TRACKS)[number], stage = UPGRADE_STAGE_10): number => {
  let sum = 0;
  for (let k = 0; k < stage; k++) sum += upgradeCost(track, k) ?? 0;
  return sum;
};

const batchOf = (id: number) => LEVELS[id].batch;

/** Spawn-Pools vor M5 (AP-97): nur Baum, Hexe, Eichhoernchen und Waldgeist, Anteile wie vorher. */
const POOL_BEFORE_M5: Partial<Record<BatchId, EnemyPoolEntry[]>> = {
  forest: [{ enemyId: 'cursedTree', weight: 10 }],
  forestNight: [
    { enemyId: 'cursedTree', weight: 10 },
    { enemyId: 'forestWitch', weight: 5 },
    { enemyId: 'zombieSquirrel', weight: 8 },
  ],
  elfForest: [
    { enemyId: 'cursedTree', weight: 10 },
    { enemyId: 'forestWitch', weight: 5 },
    { enemyId: 'zombieSquirrel', weight: 8 },
    { enemyId: 'forestSpirit', weight: 4 },
  ],
};
/** Druck je Level 0 bis 20 vor M5 (Tabelle in docs/balancing.md nach AP-95). */
const PRESSURE_BEFORE_M5 = [
  0.5, 0.54, 0.61, 0.67, 0.76, 0.84, 0.87, 0.9, 0.94, 0.98, 1.07, 1.08, 1.09, 1.11, 1.12, 1.14,
  1.16, 1.17, 1.19, 1.21, 1.23,
];

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

  it('upgrades of fire rate and damage multiply the dps (stage 10 = 4x, stage 15 = 6.25x)', () => {
    expect(upgradeDpsFactor(0)).toBeCloseTo(1, 9);
    expect(upgradeDpsFactor(UPGRADE_STAGE_10)).toBeCloseTo(4, 9);
    expect(upgradeDpsFactor(MAX_UPGRADE_LEVEL)).toBeCloseTo(6.25, 9);
  });
});

describe('balance: gold and upgrades', () => {
  it('mean gold per won level 0 to 20 is about 45', () => {
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

  it('stage 15 of one upgrade is reached at about level 35 with the gold of all won levels (AP-105, PE-129)', () => {
    for (const track of TRACKS) {
      const cost = trackCost(track, MAX_UPGRADE_LEVEL);
      expect(goldUpTo(33), track).toBeLessThan(cost);
      expect(goldUpTo(36), track).toBeGreaterThanOrEqual(cost);
    }
  });

  it('the gold of level 0 to 40 pays both damage tracks to about stage 14 (assumption 15 at level 40, AP-105)', () => {
    const both = (stage: number) =>
      trackCost('weaponFireRate', stage) + trackCost('weaponDamage', stage);
    expect(goldUpTo(40)).toBeGreaterThanOrEqual(both(MAX_UPGRADE_LEVEL - 1));
    expect(goldUpTo(40)).toBeLessThan(both(MAX_UPGRADE_LEVEL));
    // Bei Level 21 reicht das Gold fuer Stufe 8 auf beiden Spuren (Annahme 10 braucht Wiederholungen, siehe Doku).
    expect(goldUpTo(20)).toBeGreaterThanOrEqual(both(8));
  });

  it('gold per level of level 21 to 40 rises inside each batch and stays above level 20 for 5-minute levels', () => {
    for (let i = M5_FIRST + 1; i < LEVELS.length; i++) {
      if (batchOf(i) === batchOf(i - 1) && LEVELS[i].durationSec === LEVELS[i - 1].durationSec) {
        expect(GOLD[i], `level ${i}`).toBeGreaterThan(GOLD[i - 1]);
      }
      if (LEVELS[i].durationSec === 300) expect(GOLD[i], `level ${i}`).toBeGreaterThan(GOLD[20]);
    }
  });
});

describe('balance: boar, bear and fairy in level 0 to 20 (PE-125, AP-105)', () => {
  it('pressure of every level 0 to 20 stays within 4 percent of before M5', () => {
    for (let i = 0; i < M5_FIRST; i++) {
      const ratio = M[i].pressure / PRESSURE_BEFORE_M5[i];
      expect(ratio, `level ${i}`).toBeGreaterThanOrEqual(0.96);
      expect(ratio, `level ${i}`).toBeLessThanOrEqual(1.04);
    }
  });

  it('gold and xp of every level 0 to 20 stay within 4 percent of the old pools', () => {
    for (let i = 0; i < M5_FIRST; i++) {
      const old = POOL_BEFORE_M5[batchOf(i)]!;
      for (const [name, ratio] of [
        ['gold', goldOf(LEVELS[i]) / goldOf(LEVELS[i], old)],
        ['xp', xpOf(LEVELS[i]) / xpOf(LEVELS[i], old)],
      ] as const) {
        expect(ratio, `${name} level ${i}`).toBeGreaterThanOrEqual(0.96);
        expect(ratio, `${name} level ${i}`).toBeLessThanOrEqual(1.04);
      }
    }
  });

  it('counts charge, burrow and wrap as harder to kill and poison and wrap as extra damage', () => {
    expect(pressureFactor('boar')).toBeGreaterThan(1);
    expect(pressureFactor('armadillo')).toBeGreaterThan(pressureFactor('boar'));
    expect(pressureFactor('sandWorm')).toBeGreaterThan(1);
    expect(pressureFactor('mummy')).toBeGreaterThan(1);
    expect(pressureFactor('cursedTree')).toBe(1);
    expect(threatDps('snake')).toBeGreaterThan(ENEMIES.snake.contactDamage);
    const wrap = ENEMIES.mummy.projectile!;
    expect(threatDps('mummy')).toBeGreaterThan((wrap.damage * 1000) / wrap.intervalMs);
  });
});

describe('balance: difficulty curve', () => {
  it('pressure (enemy HP per second vs. base dps) rises strictly with every level 0 to 40', () => {
    expect(M).toHaveLength(41);
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

  it('spawn density rises with every level 0 to 40', () => {
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
    [20, 21],
    [25, 26],
    [30, 31],
  ])('batch jump %i -> %i is noticeable but not abrupt', (a, b) => {
    expect(batchOf(a)).not.toBe(batchOf(b));
    const jump = M[b].pressure / M[a].pressure;
    expect(jump).toBeGreaterThanOrEqual(1.08);
    expect(jump).toBeLessThanOrEqual(a === 4 ? 1.12 : 1.1);
    // Der Sprung ist groesser als jeder normale Schritt im neuen Batch (Level 0-4 sind keine Festwerte mehr, AP-56).
    for (let i = 1; i < M.length; i++) {
      if (batchOf(i) === batchOf(b) && batchOf(i - 1) === batchOf(b)) {
        expect(jump, `step ${i}`).toBeGreaterThan(M[i].pressure / M[i - 1].pressure);
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
});

describe('balance: level 21 to 40 (AP-105, PE-129)', () => {
  /** Druck mit der angenommenen Upgrade-Stufe auf Feuerrate und Schaden. */
  const upgradedPressure = (id: number, stage = assumedStage(id)) =>
    M[id].pressure / upgradeDpsFactor(stage);

  it('makes the enemies stronger rather than more: hp factor above 0.77 and rising, spawns grow slowly', () => {
    for (let i = M5_FIRST; i < LEVELS.length; i++) {
      expect(LEVEL_SCALING[i].hp, `level ${i}`).toBeGreaterThan(0.77);
      expect(LEVEL_SCALING[i].hp, `level ${i}`).toBeGreaterThan(LEVEL_SCALING[i - 1].hp);
    }
    // Die Gegnerzahl je Minute waechst von Level 20 bis 40 um hoechstens 30 %, der Druck um mehr als das Dreifache.
    expect(M[40].spawnsPerMin / M[20].spawnsPerMin).toBeLessThanOrEqual(1.3);
    expect(M[40].pressure / M[20].pressure).toBeGreaterThan(3);
  });

  it('with the assumed upgrades (stage 10 at level 21 to 15 at level 40) pressure rises and ends near level 20', () => {
    for (let i = M5_FIRST + 1; i < LEVELS.length; i++) {
      expect(upgradedPressure(i), `level ${i}`).toBeGreaterThan(upgradedPressure(i - 1));
    }
    expect(upgradedPressure(M5_FIRST)).toBeLessThan(1);
    expect(upgradedPressure(40)).toBeGreaterThanOrEqual(0.8);
    expect(upgradedPressure(40)).toBeLessThanOrEqual(1.25);
  });

  it('stays fair for a player who wins every level once (stage 8 at level 21, stage 14 at level 40)', () => {
    expect(upgradedPressure(M5_FIRST, 8)).toBeLessThan(1);
    expect(upgradedPressure(40, MAX_UPGRADE_LEVEL - 1)).toBeLessThanOrEqual(1.25);
    // Mit Doppelschuss Stufe 2 reicht es in Level 40 deutlich.
    expect(M[40].hpPerSec).toBeLessThan((dps(2) * upgradeDpsFactor(MAX_UPGRADE_LEVEL - 1)) / 2);
  });
});

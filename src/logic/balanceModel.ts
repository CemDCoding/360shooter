// Referenzmodell der Spielerin (M11, AP-167, PE-208, RS-05.1): reine Rechnung, ohne Phaser und ohne Zufall.
// Alle Zahlen kommen aus src/config (Annahmen und Baender: config/balanceTargets.ts). Das Modell aendert das Spiel nicht,
// es misst nur. Erklaerung und Tabelle: docs/balancing.md, Abschnitt "Referenzspielerin und Ziel-Baender (M11)".
import { BALANCE_BANDS, REFERENCE_PLAYER, type Band } from '../config/balanceTargets';
import { BOSSES } from '../config/bosses';
import { GOLD_KEEP_ON_LOSS, COIN_RULES } from '../config/coins';
import { ENEMIES, CHARGE_TRIGGER_DISTANCE } from '../config/enemies';
import { BATCH_STARTS, LEVELS, LEVEL_COUNT, MAX_ENEMIES_WANTED } from '../config/levels';
import { getPet } from '../config/pets';
import { LEVEL_SCALING } from '../config/scaling';
import { COST_BASE, COST_GROWTH, UPGRADES } from '../config/upgrades';
import { WEAPON_BASE } from '../config/weapon';
import type { BossId, EnemyId, EnemyPoolEntry, LevelDef, PetId, UpgradeLevels } from '../contracts';
import { MAX_UPGRADE_LEVEL } from '../contracts';
import { availableAttacks, bossForLevel, scaledHp, variantForLevel } from './boss';
import { petStats } from './pets';
import { MIN_INTERVAL_FACTOR, openingCount } from './spawn';
import { tierFor } from './tier';

const clampLevel = (levelId: number): number =>
  Math.min(LEVEL_COUNT - 1, Math.max(0, Math.floor(levelId) || 0));

const poolMean = (pool: readonly EnemyPoolEntry[], value: (id: EnemyId) => number): number => {
  const total = pool.reduce((s, e) => s + e.weight, 0);
  return pool.reduce((s, e) => s + (e.weight / total) * value(e.enemyId), 0);
};

/** Anteil der gewuenschten Gegner, den die Obergrenze zulaesst (AP-127), hoechstens 1. */
const capShare = (level: LevelDef): number =>
  Math.min(1, level.maxEnemies / MAX_ENEMIES_WANTED[level.id]);

/** Lebenspunkte mit Level-Faktor und Gegnerstufe, gerundet wie beim Spawn. */
const tieredHp = (enemyId: EnemyId, levelId: number): number =>
  Math.max(
    1,
    Math.round(ENEMIES[enemyId].hp * LEVEL_SCALING[levelId].hp * tierFor(levelId).hpFactor),
  );

/**
 * Wirksame Lebenspunkte je Lebenspunkt (Ansturm, Rollen, Eingraben, Wickel). Gleiche Rechnung wie in
 * `tests/logic/balance.test.ts` (`pressureFactor`), damit der Druck vergleichbar bleibt.
 */
function pressureFactor(enemyId: EnemyId): number {
  const e = ENEMIES[enemyId];
  let f = 1;
  if (e.charge) {
    const c = e.charge;
    const approach = REFERENCE_PLAYER.spawnRadiusPx / e.speed;
    const walk = CHARGE_TRIGGER_DISTANCE / e.speed;
    const dash = c.telegraphMs / 1000 + CHARGE_TRIGGER_DISTANCE / c.dashSpeed;
    f *= approach / (approach - Math.max(0, walk - dash));
    const dashShare = c.dashMs / (c.telegraphMs + c.dashMs + c.cooldownMs);
    f *= 1 / (1 - (1 - c.dashDamageFactor) * dashShare);
  }
  if (e.burrow) {
    const b = e.burrow;
    f *= 1 + 0.5 * (b.underMs / (b.underMs + b.surfaceMs));
  }
  const slow = e.projectile?.onHit?.slow;
  if (slow && e.projectile) {
    const uptime = Math.min(1, slow.durationMs / e.projectile.intervalMs);
    f *= 1 / (1 - (1 - slow.turnFactor) * REFERENCE_PLAYER.aimShare * uptime);
  }
  return f;
}

/** Spawns je Runde ohne Obergrenze (Eroeffnungswelle plus Spawns, Abstand sinkt auf `MIN_INTERVAL_FACTOR`). */
function rawSpawns(level: LevelDef): number {
  const durMs = level.durationSec * 1000;
  let t = level.spawnIntervalMs;
  let n = Math.min(openingCount(level), level.maxEnemies);
  while (t < durMs) {
    n += 1;
    t += level.spawnIntervalMs * (1 - (1 - MIN_INTERVAL_FACTOR) * Math.min(1, t / durMs));
  }
  return n;
}

/** Druck ohne Upgrades: HP aller neuen Gegner je Sekunde durch die Basis-DPS der Waffe (Definition "Kennzahlen"). */
export function basePressure(levelId: number): number {
  const level = LEVELS[clampLevel(levelId)];
  const minutes = level.durationSec / 60;
  const meanHp = poolMean(level.enemyPool, (id) => tieredHp(id, level.id) * pressureFactor(id));
  const hpPerMin = (rawSpawns(level) / minutes) * capShare(level) * meanHp;
  return hpPerMin / 60 / (WEAPON_BASE.fireRatePerSec * WEAPON_BASE.damage);
}

/** Gold je gewonnener Runde = Gegnerzahl (nach Obergrenze) x Muenz-Chance x Level-Faktor x mittlerer Muenzwert. */
export function goldPerWin(levelId: number): number {
  const id = clampLevel(levelId);
  goldCache[id] ??= computeGoldPerWin(id);
  return goldCache[id];
}

const goldCache: number[] = [];

function computeGoldPerWin(levelId: number): number {
  const level = LEVELS[levelId];
  const meanCoin = poolMean(level.enemyPool, (id) => ENEMIES[id].coinValue ?? 0);
  return (
    rawSpawns(level) *
    capShare(level) *
    COIN_RULES.dropChance *
    LEVEL_SCALING[level.id].coin *
    meanCoin
  );
}

/** Gold in der Tasche vor Level `levelId`: alle Siege davor, ab `lossesFromLevel` je Level plus eine Niederlage. */
export function referenceGoldBefore(levelId: number): number {
  let gold = 0;
  for (let i = 0; i < clampLevel(levelId); i++) {
    const win = goldPerWin(i);
    gold += i >= REFERENCE_PLAYER.lossesFromLevel ? win * (1 + GOLD_KEEP_ON_LOSS) : win;
  }
  return gold;
}

/** Preis von Stufe k auf k + 1 (gleiche Formel wie `upgradeCost`, hier ohne Rundung, damit Teilstufen glatt sind). */
const stepCost = (k: number): number => Math.round(COST_BASE * COST_GROWTH ** k);

/** Stufe (mit Nachkommastelle) einer Spur, die `gold` bezahlt: ganze Stufen plus Teil der naechsten. */
export function stageForGold(gold: number): number {
  let left = Math.max(0, gold);
  for (let k = 0; k < MAX_UPGRADE_LEVEL; k++) {
    const cost = stepCost(k);
    if (left < cost) return k + left / cost;
    left -= cost;
  }
  return MAX_UPGRADE_LEVEL;
}

/** Upgrade-Stufen der Referenzspielerin vor Level `levelId` (mit Nachkommastelle, siehe `stageForGold`). */
export function referenceLoadout(levelId: number): UpgradeLevels {
  const id = clampLevel(levelId);
  loadoutCache[id] ??= computeLoadout(id);
  return loadoutCache[id];
}

const loadoutCache: UpgradeLevels[] = [];

function computeLoadout(levelId: number): UpgradeLevels {
  const gold = referenceGoldBefore(levelId);
  const damage = stageForGold(gold * REFERENCE_PLAYER.damageTrackGoldShare);
  const other = stageForGold((gold * REFERENCE_PLAYER.otherTracksGoldShare) / 2);
  return {
    weaponFireRate: damage,
    weaponDamage: damage,
    playerMaxHp: other,
    playerTurnSpeed: other,
  };
}

/** Faktor auf Schaden je Sekunde durch Feuerrate und Schaden (beide multiplikativ, +10 % je Stufe). */
export function damageFactor(loadout: UpgradeLevels): number {
  return (
    (1 + UPGRADES.weaponFireRate.perLevel * loadout.weaponFireRate) *
    (1 + UPGRADES.weaponDamage.perLevel * loadout.weaponDamage)
  );
}

/** Referenz-Druck: Druck ohne Upgrades durch den Schadens-Faktor der Referenzspielerin. */
export function referencePressure(levelId: number): number {
  return basePressure(levelId) / damageFactor(referenceLoadout(levelId));
}

/** Gold je Minute einer gewonnenen Runde. */
export function goldPerMinute(levelId: number): number {
  const level = LEVELS[clampLevel(levelId)];
  return goldPerWin(level.id) / (level.durationSec / 60);
}

export interface DpsOptions {
  /** Pet mit allen Power-ups dazurechnen (Standard: kein Pet). */
  pet?: PetId | null;
  /** Mittleren Doppelschuss einrechnen (Standard: ja). */
  doubleShot?: boolean;
}

/** Schaden je Sekunde der Spielerin (Laser) gegen den Boss, ohne Pet. */
function laserDps(levelId: number, doubleShot: boolean): number {
  const l = referenceLoadout(levelId);
  const rate =
    WEAPON_BASE.fireRatePerSec * (1 + UPGRADES.weaponFireRate.perLevel * l.weaponFireRate);
  const hit = WEAPON_BASE.damage * (1 + UPGRADES.weaponDamage.perLevel * l.weaponDamage);
  return (
    rate *
    hit *
    REFERENCE_PLAYER.bossHitRate *
    (doubleShot ? REFERENCE_PLAYER.doubleShotMeanFactor : 1)
  );
}

/** Laserschaden eines Treffers der Referenzspielerin (Basis fuer `petStats`). */
function laserHit(levelId: number): number {
  return (
    WEAPON_BASE.damage *
    (1 + UPGRADES.weaponDamage.perLevel * referenceLoadout(levelId).weaponDamage)
  );
}

/** Schaden je Sekunde des Pets gegen ein Ziel (den Boss), Pet trifft immer. */
export function petDps(levelId: number, petId: PetId): number {
  const def = getPet(petId);
  const s = petStats(def, REFERENCE_PLAYER.petPowerUps, laserHit(levelId));
  switch (def.role) {
    case 'sting':
      return s.count * (1000 / s.cooldownMs) * s.damage;
    case 'snowball':
      return (1000 / s.cooldownMs) * s.damage;
    case 'aura':
      return s.damage;
  }
}

/** Gesamtschaden je Sekunde der Referenzspielerin gegen den Boss. */
export function referenceDps(levelId: number, opts: DpsOptions = {}): number {
  const laser = laserDps(levelId, opts.doubleShot ?? true);
  return opts.pet ? laser + petDps(levelId, opts.pet) : laser;
}

/** Lebenspunkte des Bosses im Level. */
export function bossHp(levelId: number): number {
  const id = clampLevel(levelId);
  return scaledHp(bossForLevel(id)!, variantForLevel(id));
}

/** Kampfdauer der Referenzspielerin in Sekunden = Boss-HP / Referenz-DPS. */
export function bossDuration(levelId: number, opts: DpsOptions = {}): number {
  return bossHp(levelId) / referenceDps(levelId, opts);
}

/** Anteil des Pets am Gesamtschaden gegen den Boss (Pet-DPS durch Gesamt-DPS mit Pet). */
export function petShare(
  levelId: number,
  petId: PetId,
  opts: Pick<DpsOptions, 'doubleShot'> = {},
): number {
  const pet = petDps(levelId, petId);
  return pet / (pet + laserDps(levelId, opts.doubleShot ?? true));
}

/**
 * Wie oft ein Angriff in einem Kampf der Dauer `seconds` erscheint. Der erste Warnbeginn liegt nach der Abklingzeit,
 * danach vergehen Warnzeit plus Abklingzeit (der Zaehler laeuft ab der Ausfuehrung). Der Angriff zaehlt, wenn er
 * innerhalb des Kampfes ausgefuehrt wird.
 */
export function attackCount(cooldownMs: number, telegraphMs: number, seconds: number): number {
  const t = seconds * 1000;
  if (t < cooldownMs + telegraphMs) return 0;
  return Math.floor((t - cooldownMs - telegraphMs) / (cooldownMs + telegraphMs)) + 1;
}

/** Angriffe des Bosses im Level (ohne Opt-in-Angriffe, die erst eine Klasse freischaltet). */
export function levelAttacks(levelId: number) {
  const id = clampLevel(levelId);
  return availableAttacks(bossForLevel(id)!, variantForLevel(id));
}

/**
 * Anteil der Ankuendigungen an der Kampfdauer: Summe (Anzahl x Warnzeit) der Angriffe des Levels innerhalb der
 * Kampfdauer der Referenzspielerin (ohne Pet) durch die Kampfdauer. Die Angriffe laufen einzeln hintereinander, die
 * Summe ist also eine obere Naeherung, wenn Angriffe gleichzeitig bereit waeren.
 */
export function announceShare(bossId: BossId, levelId: number): number {
  const id = clampLevel(levelId);
  const seconds = bossDuration(id);
  const attacks = availableAttacks(BOSSES[bossId], variantForLevel(id));
  const announced = attacks.reduce(
    (sum, a) => sum + attackCount(a.cooldownMs, a.telegraphMs, seconds) * (a.telegraphMs / 1000),
    0,
  );
  return announced / seconds;
}

/** Zielband der Boss-Dauer eines Levels: linear von Batch-Start zu Batch-Ende, Level 40 eigenes Band. */
export function bossDurationBand(levelId: number): Band {
  const id = clampLevel(levelId);
  if (id === LEVEL_COUNT - 1) return BALANCE_BANDS.bossDurationFinal;
  let at = 0;
  for (let i = 0; i < BATCH_STARTS.length; i++) if (id >= BATCH_STARTS[i].first) at = i;
  const first = BATCH_STARTS[at].first;
  const last = (BATCH_STARTS[at + 1]?.first ?? LEVEL_COUNT) - 1;
  const t = last > first ? (id - first) / (last - first) : 0;
  const a = BALANCE_BANDS.bossDurationBatchStart;
  const b = BALANCE_BANDS.bossDurationBatchEnd;
  return { min: a.min + (b.min - a.min) * t, max: a.max + (b.max - a.max) * t };
}

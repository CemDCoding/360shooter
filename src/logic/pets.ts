// Pet-Logik (M8, AP-139, PE-168, PE-170, PE-179): reine Funktionen ohne Phaser. Werte aus config/pets.ts.
import { PET_RULES } from '../config/pets';
import type { CapybaraDef, LevelDef, PetDef, PetRoundState } from '../contracts';
import { MIN_INTERVAL_FACTOR, openingCount } from './spawn';

/** Leisten-Zustand der Runde; `expected` ist die erwartete Gegnerzahl (Basis fuer alle Ziele). */
export interface PetRound extends PetRoundState {
  expected: number;
}

export interface PetStats {
  /** Schaden pro Treffer (Capybara: pro Sekunde). */
  damage: number;
  /** Tempo in px/s (nur Biene, sonst 0). */
  speedPxPerSec: number;
  /** Abstand zwischen zwei Aktionen in ms (Biene: Stiche, Pinguin: Schneebaelle; Capybara: 0). */
  cooldownMs: number;
  /** Aura-Radius in px (Capybara) bzw. Radiusfaktor des Schneeballs (Pinguin); sonst 0. */
  radius: number;
  /** Anzahl der Bienen (Biene: 1 + Zusatz; sonst 0). */
  count: number;
  slow: number;
  slowMs: number;
}

export interface Located {
  x: number;
  y: number;
}

/**
 * Erwartete Gegnerzahl ohne Boss: Eroeffnungswelle plus Spawns ueber die Dauer.
 * Das Intervall sinkt linear auf MIN_INTERVAL_FACTOR; Integral von 1/(1-(1-m)p) ueber p in [0,1].
 */
export function expectedEnemies(level: LevelDef): number {
  const durationMs = level.durationSec * 1000;
  if (!(durationMs > 0) || !(level.spawnIntervalMs > 0)) return 0;
  const k = 1 - MIN_INTERVAL_FACTOR;
  const rateFactor = k > 0 ? -Math.log(MIN_INTERVAL_FACTOR) / k : 1;
  const spawned = (durationMs / level.spawnIntervalMs) * rateFactor;
  return Math.max(0, Math.floor(spawned) + openingCount(level));
}

function target(expected: number, fraction: number): number {
  return Math.max(1, Math.ceil(expected * fraction));
}

export function createPetRound(level: LevelDef): PetRound {
  const expected = expectedEnemies(level);
  return {
    phase: 'egg',
    xp: 0,
    xpToNext: target(expected, PET_RULES.hatchFraction),
    powerUps: 0,
    expected,
  };
}

/** Erfahrung eines Gegners fuer die Leiste: 1, ein Boss zaehlt bossWeight. */
export function killWeight(isBoss: boolean): number {
  return isBoss ? PET_RULES.bossWeight : 1;
}

/** Fuellt die Leiste (kills = gewichtete besiegte Gegner). Gibt einen neuen Zustand zurueck. */
export function addPetXp(state: PetRound, kills: number): PetRound {
  if (!Number.isFinite(kills) || kills <= 0) return state;
  const next: PetRound = { ...state };
  if (next.phase === 'hatched' && next.powerUps >= PET_RULES.maxPowerUps) {
    next.xp = next.xpToNext;
    return next;
  }
  next.xp += kills;
  while (next.xp >= next.xpToNext) {
    if (next.phase === 'egg') {
      next.phase = 'hatched';
    } else {
      next.powerUps += 1;
    }
    next.xp -= next.xpToNext;
    next.xpToNext = target(next.expected, PET_RULES.powerUpFraction);
    if (next.powerUps >= PET_RULES.maxPowerUps) {
      next.xp = next.xpToNext;
      break;
    }
  }
  return next;
}

/** Leistenfuellung 0..1. */
export function petBarFraction(state: PetRoundState): number {
  return state.xpToNext > 0 ? Math.min(1, Math.max(0, state.xp / state.xpToNext)) : 1;
}

/** Werte des Pets; ohne Pet (def null) alles 0. */
export function petStats(def: PetDef | null, powerUps: number, laserDamage: number): PetStats {
  const zero: PetStats = {
    damage: 0,
    speedPxPerSec: 0,
    cooldownMs: 0,
    radius: 0,
    count: 0,
    slow: 0,
    slowMs: 0,
  };
  if (!def) return zero;
  const n = Math.min(PET_RULES.maxPowerUps, Math.max(0, Math.floor(powerUps) || 0));
  const dmgMul = Math.pow(PET_RULES.powerUpDamageMul, n);
  const spdMul = Math.pow(PET_RULES.powerUpSpeedMul, n);
  const laser = Math.max(0, laserDamage);
  switch (def.role) {
    case 'sting':
      return {
        ...zero,
        damage: laser * def.damageFraction * dmgMul,
        speedPxPerSec: def.speedPxPerSec * spdMul,
        cooldownMs: 1000 / def.stingsPerSec / spdMul,
        count: 1 + (n >= 1 ? def.extraBees : 0),
      };
    case 'snowball':
      return {
        ...zero,
        damage: laser * def.damageFraction * dmgMul,
        cooldownMs: def.intervalMs / spdMul,
        radius: n >= 1 ? def.radiusMul : 1,
        slow: def.slow,
        slowMs: def.slowMs,
      };
    case 'aura':
      return {
        ...zero,
        damage: laser * def.damageFractionPerSec * dmgMul,
        radius: def.auraRadiusPx * (n >= 1 ? def.auraRadiusMul : 1),
        slow: def.slow,
      };
  }
}

/** Naechstes Ziel (Biene, Pinguin); null bei leerer Liste. Bei Gleichstand gewinnt der erste. */
export function nearestTarget<T extends Located>(from: Located, enemies: readonly T[]): T | null {
  let best: T | null = null;
  let bestD = Infinity;
  for (const e of enemies) {
    const d = (e.x - from.x) ** 2 + (e.y - from.y) ** 2;
    if (d < bestD) {
      bestD = d;
      best = e;
    }
  }
  return best;
}

/** Boss-Koerper aus Sicht des Pets (AP-164, PE-205): BossBase passt strukturell. */
export interface PetBossPart extends Located {
  readonly active: boolean;
  readonly isInvulnerable: boolean;
}

/** Lebender, verwundbarer Boss-Teil: nur so einer ist ein Pet-Ziel (Geist-Phase und Tote nicht). */
export function isBossTarget(part: PetBossPart): boolean {
  return part.active && !part.isInvulnerable;
}

/**
 * Fuellt `out` (wiederverwendet, kein Muell je Frame) mit den aktiven Pool-Gegnern und den lebenden,
 * verwundbaren Boss-Teilen (AP-164, PE-205). In der Boss-Runde ist der Pool leer: ohne die Boss-Teile
 * hatte das Pet kein Ziel.
 */
export function collectPetTargets<
  E extends Located & { readonly active: boolean },
  B extends PetBossPart,
>(out: (E | B)[], pool: readonly E[], bossParts: readonly B[]): void {
  out.length = 0;
  for (const e of pool) if (e.active) out.push(e);
  for (const b of bossParts) if (isBossTarget(b)) out.push(b);
}

/** Alle Gegner in der Aura (Rand zaehlt mit). */
export function inAura<T extends Located>(
  center: Located,
  radius: number,
  enemies: readonly T[],
): T[] {
  if (!(radius > 0)) return [];
  const r2 = radius * radius;
  return enemies.filter((e) => (e.x - center.x) ** 2 + (e.y - center.y) ** 2 <= r2);
}

/** Heil-Takt des Capybaras: tick(dtMs) liefert die faellige Heilung (HP) seit dem letzten Aufruf. */
export class HealTimer {
  private elapsedMs = 0;
  constructor(private readonly def: Pick<CapybaraDef, 'healHp' | 'healIntervalMs'>) {}

  tick(dtMs: number): number {
    if (!Number.isFinite(dtMs) || dtMs <= 0 || !(this.def.healIntervalMs > 0)) return 0;
    this.elapsedMs += dtMs;
    let heal = 0;
    while (this.elapsedMs >= this.def.healIntervalMs) {
      this.elapsedMs -= this.def.healIntervalMs;
      heal += this.def.healHp;
    }
    return heal;
  }

  reset(): void {
    this.elapsedMs = 0;
  }
}

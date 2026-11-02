import { BOSS_SPAWN_RATE_FACTOR } from '../config/bosses';
import { MIX_LAST_LEVEL } from '../config/levels';
import type { EnemyId, LevelDef } from '../contracts';

/** Minimale RNG-Schnittstelle: Zahl in [0, 1). */
export interface SpawnRng {
  next(): number;
}

export interface SpawnRequest {
  enemyId: EnemyId;
  /** Radiant, 0..2*PI */
  angle: number;
  radius: number;
}

/** Faktor auf das Spawn-Intervall am Rundenende (Start: 1,0). */
export const MIN_INTERVAL_FACTOR = 0.6;

/** Most enemies of the same type in a row in level 0 to 2 (AP-166, PE-207). */
export const MAX_RUN = 3;

/** Every available type has spawned at the latest at this spawn of the round (AP-166, PE-207). */
export const FIRST_APPEARANCE_BY = 8;

/** Tokens per bag of the variety rule: share resolution of 1 % (AP-166). */
const BAG_TOKENS = 100;

/** Radius der Eroeffnungswelle als Anteil des Spawn-Radius (Startwert, angenommen; AP-56). */
export const OPENING_RADIUS_FACTOR = 0.65;

/** Anzahl der Gegner der Eroeffnungswelle: 15 % von maxEnemies, mindestens 3, hoechstens 8. */
export function openingCount(level: LevelDef): number {
  return Math.min(8, Math.max(3, Math.round(level.maxEnemies * 0.15)));
}

export class SpawnDirector {
  private openingDone = false;
  private elapsedMs = 0;
  private cooldownMs: number;
  private readonly totalWeight: number;
  private readonly durationMs: number;
  // Variety rule state (AP-166); allocated once, no per-call allocations.
  private readonly varied: boolean;
  private readonly active: number[] = [];
  private readonly quota: number[] = [];
  private readonly left: number[];
  private readonly seen: boolean[];
  private unseen: number;
  private spawned = 0;
  private lastIndex = -1;
  private run = 0;

  /**
   * @param spawnRadius Ring knapp ausserhalb des Sichtfelds (Pixel vom Zentrum)
   */
  constructor(
    private readonly level: LevelDef,
    private readonly rng: SpawnRng,
    private readonly spawnRadius: number,
  ) {
    this.durationMs = level.durationSec * 1000;
    this.totalWeight = level.enemyPool.reduce((s, e) => s + Math.max(0, e.weight), 0);
    this.cooldownMs = level.spawnIntervalMs;
    // Variety rule (AP-166, PE-207): only level 0 to 2 with at least two types. Level 3 and up draw independently as before.
    for (let j = 0; j < level.enemyPool.length; j++) {
      if (level.enemyPool[j].weight > 0) this.active.push(j);
    }
    this.varied = level.id <= MIX_LAST_LEVEL && this.active.length >= 2;
    for (const j of this.active) {
      this.quota.push(
        Math.max(1, Math.round((level.enemyPool[j].weight / this.totalWeight) * BAG_TOKENS)),
      );
    }
    this.left = this.quota.slice();
    this.seen = this.active.map(() => false);
    this.unseen = this.active.length;
  }

  /** Aktuelles Intervall: sinkt linear von x1,0 auf x0,6 ueber die Rundendauer. */
  get currentIntervalMs(): number {
    const progress = this.durationMs > 0 ? Math.min(1, this.elapsedMs / this.durationMs) : 1;
    return this.level.spawnIntervalMs * (1 - (1 - MIN_INTERVAL_FACTOR) * progress);
  }

  /** @param bossActive true while the boss lives: normal spawns come at half the rate (PE-18). */
  tick(dtMs: number, aliveCount: number, bossActive = false): SpawnRequest[] {
    const out: SpawnRequest[] = [];
    if (!Number.isFinite(dtMs) || dtMs <= 0 || this.totalWeight <= 0) return out;
    this.elapsedMs += dtMs;
    this.cooldownMs -= dtMs;
    let alive = aliveCount;
    if (!this.openingDone) {
      // Eroeffnungswelle: genau einmal, sofort, gleichmaessig auf dem Ring verteilt.
      this.openingDone = true;
      const n = Math.max(0, Math.min(openingCount(this.level), this.level.maxEnemies - alive));
      if (n > 0) {
        const start = this.rng.next() * Math.PI * 2;
        for (let i = 0; i < n; i++) {
          out.push({
            enemyId: this.pickEnemy(n - i),
            angle: (start + (i * Math.PI * 2) / n) % (Math.PI * 2),
            radius: this.spawnRadius * OPENING_RADIUS_FACTOR,
          });
        }
        alive += n;
      }
    }
    while (this.cooldownMs <= 0) {
      if (alive >= this.level.maxEnemies) {
        // Kein Aufstauen: verpasste Spawns werden nicht nachgeholt.
        this.cooldownMs = 0;
        break;
      }
      this.cooldownMs += bossActive
        ? this.currentIntervalMs / BOSS_SPAWN_RATE_FACTOR
        : this.currentIntervalMs;
      out.push({
        enemyId: this.pickEnemy(),
        angle: this.rng.next() * Math.PI * 2,
        radius: this.spawnRadius,
      });
      alive += 1;
    }
    return out;
  }

  /** @param openingLeft spawns of the opening wave still to place including this one (0 outside the opening). */
  private pickEnemy(openingLeft = 0): EnemyId {
    if (!this.varied) return this.pickWeighted();
    let k = -1;
    if (this.unseen > 0) {
      // Every type shows up early: spread over the opening wave, at the latest at spawn FIRST_APPEARANCE_BY.
      const force =
        openingLeft > 0
          ? this.rng.next() * openingLeft < this.unseen
          : this.spawned >= FIRST_APPEARANCE_BY - 1;
      if (force) {
        let r = Math.floor(this.rng.next() * this.unseen);
        for (let j = 0; j < this.active.length; j++) {
          if (this.seen[j]) continue;
          if (r-- === 0) {
            k = j;
            break;
          }
        }
        if (this.left[k] <= 0) this.refillBag();
        this.left[k] -= 1;
      }
    }
    if (k < 0) k = this.drawFromBag();
    if (k === this.lastIndex) this.run += 1;
    else {
      this.lastIndex = k;
      this.run = 1;
    }
    if (!this.seen[k]) {
      this.seen[k] = true;
      this.unseen -= 1;
    }
    this.spawned += 1;
    return this.level.enemyPool[this.active[k]].enemyId;
  }

  private refillBag(): void {
    for (let j = 0; j < this.left.length; j++) this.left[j] += this.quota[j];
  }

  /**
   * Draws from the "bag" (remaining tokens per type, refilled when empty): the long-run shares equal the pool shares,
   * and a type that already came MAX_RUN times in a row is skipped. Leftover tokens are never discarded, so the
   * shares stay unbiased.
   */
  private drawFromBag(): number {
    const blocked = this.run >= MAX_RUN ? this.lastIndex : -1;
    let sum = 0;
    for (let j = 0; j < this.left.length; j++) if (j !== blocked) sum += this.left[j];
    if (sum <= 0) {
      this.refillBag();
      for (let j = 0; j < this.left.length; j++) if (j !== blocked) sum += this.left[j];
    }
    let r = this.rng.next() * sum;
    let pick = -1;
    for (let j = 0; j < this.left.length; j++) {
      if (j === blocked) continue;
      pick = j;
      r -= this.left[j];
      if (r < 0) break;
    }
    this.left[pick] -= 1;
    return pick;
  }

  private pickWeighted(): EnemyId {
    let r = this.rng.next() * this.totalWeight;
    for (const entry of this.level.enemyPool) {
      r -= Math.max(0, entry.weight);
      if (r < 0) return entry.enemyId;
    }
    return this.level.enemyPool[this.level.enemyPool.length - 1].enemyId;
  }
}

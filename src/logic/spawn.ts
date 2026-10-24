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

export class SpawnDirector {
  private elapsedMs = 0;
  private cooldownMs: number;
  private readonly totalWeight: number;
  private readonly durationMs: number;

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
  }

  /** Aktuelles Intervall: sinkt linear von x1,0 auf x0,6 ueber die Rundendauer. */
  get currentIntervalMs(): number {
    const progress = this.durationMs > 0 ? Math.min(1, this.elapsedMs / this.durationMs) : 1;
    return this.level.spawnIntervalMs * (1 - (1 - MIN_INTERVAL_FACTOR) * progress);
  }

  tick(dtMs: number, aliveCount: number): SpawnRequest[] {
    const out: SpawnRequest[] = [];
    if (!Number.isFinite(dtMs) || dtMs <= 0 || this.totalWeight <= 0) return out;
    this.elapsedMs += dtMs;
    this.cooldownMs -= dtMs;
    let alive = aliveCount;
    while (this.cooldownMs <= 0) {
      if (alive >= this.level.maxEnemies) {
        // Kein Aufstauen: verpasste Spawns werden nicht nachgeholt.
        this.cooldownMs = 0;
        break;
      }
      this.cooldownMs += this.currentIntervalMs;
      out.push({
        enemyId: this.pickEnemy(),
        angle: this.rng.next() * Math.PI * 2,
        radius: this.spawnRadius,
      });
      alive += 1;
    }
    return out;
  }

  private pickEnemy(): EnemyId {
    let r = this.rng.next() * this.totalWeight;
    for (const entry of this.level.enemyPool) {
      r -= Math.max(0, entry.weight);
      if (r < 0) return entry.enemyId;
    }
    return this.level.enemyPool[this.level.enemyPool.length - 1].enemyId;
  }
}

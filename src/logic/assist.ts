import {
  ASSIST_FREE_LOSSES,
  ASSIST_PER_STAGE,
  MAX_ASSIST_LOSSES,
  MAX_ASSIST_STAGE,
} from '../config/assist';
import { BATCH_STARTS, batchOf } from '../config/levels';
import { referencePressure } from './balanceModel';

/** Faktoren eines Versuchs (1 = unveraendert). */
export interface AssistFactors {
  enemyHp: number;
  spawnInterval: number;
  bossHp: number;
  bossDamage: number;
}

export const NO_ASSIST: AssistFactors = { enemyHp: 1, spawnInterval: 1, bossHp: 1, bossDamage: 1 };

/** Stufe 0 bis 3 aus den Niederlagen in Folge. */
export function assistStage(losses: number): number {
  if (!Number.isFinite(losses)) return 0;
  return Math.min(MAX_ASSIST_STAGE, Math.max(0, Math.floor(losses) - ASSIST_FREE_LOSSES));
}

function firstLevelOfBatch(levelId: number): number {
  const batch = batchOf(levelId);
  return BATCH_STARTS.find((s) => s.batch === batch)?.first ?? levelId;
}

/**
 * Faktoren der Stufe. Untergrenze: der Referenz-Druck (HP je Sekunde) faellt nie unter den des ersten Levels im
 * Batch; reicht der Faktor dafuer nicht, wird der HP-Faktor angehoben (Spawn-Abstand und Boss bleiben).
 */
export function assistFactors(levelId: number, stage: number): AssistFactors {
  const s = Math.min(MAX_ASSIST_STAGE, Math.max(0, Math.floor(stage)));
  if (s === 0) return NO_ASSIST;
  const spawnInterval = ASSIST_PER_STAGE.spawnInterval ** s;
  let enemyHp = ASSIST_PER_STAGE.enemyHp ** s;
  let spacing = spawnInterval;
  const floor = referencePressure(firstLevelOfBatch(levelId));
  const base = referencePressure(levelId);
  if (base > 0) {
    // Pressure ratio = enemyHp / spacing; it may not fall below floor / base.
    const minRatio = Math.min(1, floor / base);
    const needed = minRatio * spacing;
    if (needed > 1) {
      // The HP factor alone cannot hold the floor: leave HP alone and shorten the spacing instead.
      enemyHp = 1;
      spacing = 1 / minRatio;
    } else {
      enemyHp = Math.max(enemyHp, needed);
    }
  }
  return {
    enemyHp,
    spawnInterval: spacing,
    bossHp: ASSIST_PER_STAGE.bossHp ** s,
    bossDamage: ASSIST_PER_STAGE.bossDamage ** s,
  };
}

/** Referenz-Druck des Levels mit den Faktoren (HP je Sekunde: HP-Faktor durch Spawn-Abstand). */
export function assistedPressure(levelId: number, f: AssistFactors): number {
  return (referencePressure(levelId) * f.enemyHp) / f.spawnInterval;
}

/** Neue Niederlagen-Tabelle nach einem Ergebnis; Sieg entfernt den Eintrag. Die Eingabe bleibt unveraendert. */
export function recordResult(
  losses: Readonly<Record<string, number>> | undefined,
  levelId: number,
  result: 'win' | 'loss',
): Record<string, number> {
  const next = { ...(losses ?? {}) };
  const key = String(levelId);
  if (result === 'win') delete next[key];
  else next[key] = Math.min(MAX_ASSIST_LOSSES, (next[key] ?? 0) + 1);
  return next;
}

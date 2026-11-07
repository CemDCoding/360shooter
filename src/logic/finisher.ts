// Pure logic of the boss finisher sequences (M10 AP-158, M13 choreographies, AP-191 cleanup, PE-203).
// No Phaser, no wall clock: all times are sequence time in ms.
import { FINISHER_RULES } from '../config/finishers';
import { CHOREOS } from '../config/choreo';
import { BATCH_STARTS, BOSS_OF_BATCH, LEVEL_COUNT, batchOf } from '../config/levels';
import { MAP_FINAL_LEVELS } from '../config/shop';
import type { ChoreoDef, ChoreoVariantId, FinisherPlan, FinisherStage } from '../contracts';
import { isChoreoVariantId, realDurationMs, reduceChoreo } from './choreo';

/** Choreographies a plan is built from; tests pass their own data. */
export interface FinisherSource {
  choreos: Readonly<Partial<Record<ChoreoVariantId, ChoreoDef | undefined>>>;
}

export const DEFAULT_FINISHER_SOURCE: FinisherSource = { choreos: CHOREOS };

export interface BuildFinisherOptions {
  reduceEffects: boolean;
  seen: readonly string[];
}

function assertLevel(levelId: number): void {
  if (!Number.isInteger(levelId) || levelId < 0 || levelId >= LEVEL_COUNT) {
    throw new RangeError(`finisher: invalid level id ${levelId}`);
  }
}

/** Stage 1 to 6 of a level (index of its batch). */
export function finisherStage(levelId: number): FinisherStage {
  assertLevel(levelId);
  let stage = 1;
  BATCH_STARTS.forEach((b, i) => {
    if (levelId >= b.first) stage = i + 1;
  });
  return stage as FinisherStage;
}

/** True for the last level of every batch (4, 9, 20, 25, 30, 40). */
export function isBatchFinale(levelId: number): boolean {
  return MAP_FINAL_LEVELS.includes(levelId);
}

/** Choreography variant of a level: `cinematic-<Level>` for a batch finale, else `moment-<BossId>` (M13). */
export function choreoVariantId(levelId: number): ChoreoVariantId {
  assertLevel(levelId);
  return isBatchFinale(levelId)
    ? (`cinematic-${levelId}` as ChoreoVariantId)
    : (`moment-${BOSS_OF_BATCH[batchOf(levelId)]}` as ChoreoVariantId);
}

/** An id that may be stored in `seenFinishers`: a choreography id (the M10 ids `stage-*`/`finale-*` are dropped, PE-251 d). */
export const isSeenFinisherId = isChoreoVariantId;

/** Sequence for the boss defeat of a level: the choreography of its variant, normal or reduced. */
export function buildFinisher(
  levelId: number,
  options: BuildFinisherOptions,
  source: FinisherSource = DEFAULT_FINISHER_SOURCE,
): FinisherPlan {
  assertLevel(levelId);
  const variantId = choreoVariantId(levelId);
  const def = source.choreos[variantId];
  if (!def) throw new RangeError(`finisher: no choreography for level ${levelId}`);
  const choreo = options.reduceEffects ? reduceChoreo(def) : def;
  const realMs = realDurationMs(choreo);
  const wasSeen = options.seen.includes(variantId);
  return {
    variantId,
    stage: finisherStage(levelId),
    totalMs: realMs,
    reduced: options.reduceEffects,
    choreo,
    realMs,
    skipFromMs: wasSeen ? FINISHER_RULES.skipLockMs : FINISHER_RULES.skipFirstViewMs,
  };
}

/** New list of seen variants: valid choreography ids only, no duplicates, `variantId` added when valid. */
export function markSeen(seen: readonly string[], variantId: string): ChoreoVariantId[] {
  const out: ChoreoVariantId[] = [];
  for (const v of [...seen, variantId]) {
    if (isSeenFinisherId(v) && !out.includes(v)) out.push(v);
  }
  return out;
}

/** Skipping is allowed from `plan.skipFromMs` (3 s on first view, PE-234). */
export function canSkip(plan: FinisherPlan, elapsedMs: number): boolean {
  return elapsedMs >= plan.skipFromMs;
}

// Pure logic of the boss finisher sequences (M10, AP-158, RS-04.1, RS-04.4, RS-04.5, PE-203).
// No Phaser, no wall clock: all times are sequence time in ms.
import {
  FINISHER_FINALES,
  FINISHER_RULES,
  FINISHER_STAGES,
  type FinisherTemplate,
} from '../config/finishers';
import { BATCH_STARTS, LEVEL_COUNT } from '../config/levels';
import { MAP_FINAL_LEVELS } from '../config/shop';
import {
  FINISHER_VARIANT_IDS,
  type FinisherPlan,
  type FinisherStage,
  type FinisherStep,
  type FinisherVariantId,
} from '../contracts';

/** Templates a plan is built from; tests pass their own data. */
export interface FinisherSource {
  stages: Readonly<Record<FinisherStage, FinisherTemplate>>;
  finales: Readonly<Record<number, FinisherTemplate>>;
}

export const DEFAULT_FINISHER_SOURCE: FinisherSource = {
  stages: FINISHER_STAGES,
  finales: FINISHER_FINALES,
};

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

export function finisherVariantId(levelId: number): FinisherVariantId {
  assertLevel(levelId);
  return isBatchFinale(levelId)
    ? (`finale-${levelId}` as FinisherVariantId)
    : (`stage-${finisherStage(levelId)}` as FinisherVariantId);
}

export function isFinisherVariantId(value: unknown): value is FinisherVariantId {
  return typeof value === 'string' && (FINISHER_VARIANT_IDS as readonly string[]).includes(value);
}

/**
 * Effective hold time (ms) per frame of a `frames` block, one entry per frame (0 = frame is dropped).
 * Without `holdsMs` every frame lasts 1000 / fps.
 */
export function frameHolds(step: FinisherStep, reduced: boolean): number[] {
  const count = Math.max(0, Math.floor(step.frameCount ?? 0));
  const base = Array.from({ length: count }, (_, i) => {
    const h = step.holdsMs?.[i];
    if (h !== undefined) return h;
    return step.fps && step.fps > 0 ? 1000 / step.fps : 0;
  });
  if (!reduced || !step.reducedHoldsMs) return base;
  return base.map((h, i) => step.reducedHoldsMs?.[i] ?? h);
}

function sum(values: readonly number[]): number {
  return values.reduce((a, b) => a + b, 0);
}

/** A frame whose reduced hold time is 0 is an impact frame. */
function isImpactFrame(step: FinisherStep, i: number): boolean {
  return step.reducedHoldsMs?.[i] === 0;
}

interface HoldChange {
  /** Start of the frame in the unreduced timeline. */
  start: number;
  delta: number;
}

/** Plan of one template: select, reduce, sort, total. */
export function buildPlanFromTemplate(
  template: FinisherTemplate,
  options: BuildFinisherOptions,
): FinisherPlan {
  const { reduceEffects, seen } = options;
  let steps: FinisherStep[] = template.steps
    .filter((s) => !(s.block === 'frames' && !s.frameCount))
    .filter((s) => !(reduceEffects && FINISHER_RULES.reducedRemoves.includes(s.block)))
    .map((s) => ({ ...s }));

  let totalMs = template.totalMs;
  if (reduceEffects) {
    const changes: HoldChange[] = [];
    for (const s of steps) {
      if (s.block !== 'frames' || !s.reducedHoldsMs) continue;
      const normal = frameHolds(s, false);
      const reduced = frameHolds(s, true);
      let start = s.atMs;
      normal.forEach((h, i) => {
        changes.push({ start, delta: reduced[i] - h });
        start += h;
      });
    }
    const shiftAt = (t: number): number =>
      sum(changes.filter((c) => c.start < t).map((c) => c.delta));
    steps = steps.map((s) => {
      const end = s.atMs + s.durationMs;
      const atMs = s.atMs + shiftAt(s.atMs);
      const durationMs =
        s.block === 'frames' && s.reducedHoldsMs
          ? sum(frameHolds(s, true))
          : end + shiftAt(end) - atMs;
      return { ...s, atMs, durationMs };
    });
    totalMs += sum(changes.map((c) => c.delta));
  }
  steps.sort((a, b) => a.atMs - b.atMs);
  totalMs = Math.max(totalMs, ...steps.map((s) => s.atMs + s.durationMs));

  return {
    variantId: template.variantId,
    stage: template.stage,
    isFinale: template.isFinale,
    steps,
    totalMs,
    skippable: seen.includes(template.variantId),
    reduced: reduceEffects,
  };
}

/** Sequence for the boss defeat of a level (stage or batch finale). */
export function buildFinisher(
  levelId: number,
  options: BuildFinisherOptions,
  source: FinisherSource = DEFAULT_FINISHER_SOURCE,
): FinisherPlan {
  assertLevel(levelId);
  const template = isBatchFinale(levelId)
    ? source.finales[levelId]
    : source.stages[finisherStage(levelId)];
  if (!template) throw new RangeError(`finisher: no template for level ${levelId}`);
  return buildPlanFromTemplate(template, options);
}

/** New list of seen variants: valid ids only, no duplicates, `variantId` added when valid. */
export function markSeen(seen: readonly string[], variantId: string): FinisherVariantId[] {
  const out: FinisherVariantId[] = [];
  for (const v of [...seen, variantId]) {
    if (isFinisherVariantId(v) && !out.includes(v)) out.push(v);
  }
  return out;
}

export function canSkip(plan: FinisherPlan, elapsedMs: number): boolean {
  return plan.skippable && elapsedMs >= FINISHER_RULES.skipLockMs;
}

/** Start times of all flash events: flash blocks and runs of impact frames in `frames` blocks. */
function flashStarts(steps: readonly FinisherStep[], reduced: boolean): number[] {
  const starts: number[] = [];
  for (const s of steps) {
    if (FINISHER_RULES.flashBlocks.includes(s.block)) starts.push(s.atMs);
  }
  if (reduced) return starts; // impact frames are dropped, they play no part
  const blocks = steps
    .filter((s) => s.block === 'frames' && s.frameCount)
    .sort((a, b) => a.atMs - b.atMs);
  let prevImpactEnd: number | null = null;
  for (const b of blocks) {
    const holds = frameHolds(b, false);
    const blockEnd = Math.max(b.atMs + sum(holds), b.atMs + b.durationMs);
    let t = b.atMs;
    // A run goes on over a block border when the next block follows directly.
    let inRun: boolean = prevImpactEnd !== null && b.atMs <= prevImpactEnd + 50;
    holds.forEach((h, i) => {
      if (isImpactFrame(b, i)) {
        if (!inRun) starts.push(t);
        inRun = true;
      } else {
        inRun = false;
      }
      t += h;
    });
    prevImpactEnd = inRun ? blockEnd : null;
  }
  return starts;
}

/** Highest number of flash events that start inside one sliding window [t, t + windowMs). */
export function maxFlashesInWindow(
  steps: readonly FinisherStep[],
  windowMs: number,
  reduced = false,
): number {
  const starts = flashStarts(steps, reduced).sort((a, b) => a - b);
  let max = 0;
  for (let i = 0; i < starts.length; i++) {
    let n = 0;
    for (let j = i; j < starts.length && starts[j] < starts[i] + windowMs; j++) n++;
    max = Math.max(max, n);
  }
  return max;
}

/** WCAG 2.3.1: at most `flashMaxPerWindow` flashes in any window. */
export function isFlashSafe(plan: FinisherPlan): boolean {
  return (
    maxFlashesInWindow(plan.steps, FINISHER_RULES.flashWindowMs, plan.reduced) <=
    FINISHER_RULES.flashMaxPerWindow
  );
}

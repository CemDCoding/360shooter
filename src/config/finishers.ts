// Boss finisher sequences (M10, RS-04.1 to RS-04.5, PE-196 to PE-200).
// All numbers of the sequences live here. Colour values are theme token keys `finisher.*`.
import type { FinisherRules, FinisherStage, FinisherStep, FinisherVariantId } from '../contracts';
import { BATCH_STARTS, BOSS_OF_BATCH } from './levels';

/** Start values, hand test H-40. */
export const FINISHER_RULES: FinisherRules = {
  flashMaxPerWindow: 3,
  flashWindowMs: 1000,
  skipLockMs: 400,
  reducedRemoves: ['impactFrame', 'flash', 'shake'],
  flashBlocks: ['impactFrame', 'flash'],
  maxParticles: 120,
};

/** Placeholder texts, AP-159 takes the final texts from the design brief H-39. */
export const FINISHER_TITLE = 'BESIEGT!';
export const FINISHER_FINALE_TITLE = 'ENDE!';

export interface FinisherTemplate {
  variantId: FinisherVariantId;
  stage: FinisherStage;
  isFinale: boolean;
  totalMs: number;
  steps: readonly FinisherStep[];
}

const STAGE_TOTAL_MS: Readonly<Record<FinisherStage, number>> = {
  1: 2000,
  2: 2500,
  3: 3000,
  4: 3500,
  5: 4000,
  6: 4000,
};

/** Steps of one stage; stage n contains every block kind of stage n - 1. */
function stageSteps(stage: FinisherStage): FinisherStep[] {
  const total = STAGE_TOTAL_MS[stage];
  const steps: FinisherStep[] = [
    { block: 'hitstop', atMs: 0, durationMs: 120 },
    { block: 'zoom', atMs: 0, durationMs: 600, strength: 0.5 },
    { block: 'shake', atMs: 0, durationMs: 900, strength: 0.6 },
    { block: 'title', atMs: 1000, durationMs: 1000, text: FINISHER_TITLE },
  ];
  if (stage >= 2) {
    steps.push({ block: 'slowmo', atMs: 120, durationMs: 900, strength: 0.7 });
    steps.push({ block: 'letterbox', atMs: 0, durationMs: total, color: 'finisher.letterbox' });
  }
  if (stage >= 3) {
    steps.push({ block: 'speedlines', atMs: 200, durationMs: 1600, strength: 0.7 });
    steps.push({ block: 'bgColor', atMs: 0, durationMs: total, color: `finisher.bg-${stage}` });
  }
  if (stage >= 4) {
    steps.push({ block: 'impactFrame', atMs: 150, durationMs: 120, color: 'finisher.impact-dark' });
    steps.push({
      block: 'cutIn',
      atMs: 400,
      durationMs: 1200,
      texture: 'finisher-cutin-astronaut',
    });
  }
  if (stage >= 5) {
    steps.push({ block: 'panels', atMs: 1000, durationMs: 1200, strength: 0.7 });
    steps.push({ block: 'particles', atMs: 1200, durationMs: 1600, strength: 0.7 });
    steps.push({ block: 'shatter', atMs: 1500, durationMs: 1500, strength: 0.7 });
  }
  if (stage >= 6) {
    steps.push({ block: 'flash', atMs: 1400, durationMs: 100, color: 'finisher.flash' });
    // Longest decay of all stages: the shatter runs to the end.
    const i = steps.findIndex((s) => s.block === 'shatter');
    steps[i] = { block: 'shatter', atMs: 1500, durationMs: 2500, strength: 1 };
  }
  return steps;
}

function stageTemplate(stage: FinisherStage): FinisherTemplate {
  return {
    variantId: `stage-${stage}` as FinisherVariantId,
    stage,
    isFinale: false,
    totalMs: STAGE_TOTAL_MS[stage],
    steps: stageSteps(stage),
  };
}

/** Stages 1 to 6 (Wald, Wald bei Nacht, Elfenwald, Wueste, Pyramiden, Oase). */
export const FINISHER_STAGES: Readonly<Record<FinisherStage, FinisherTemplate>> = {
  1: stageTemplate(1),
  2: stageTemplate(2),
  3: stageTemplate(3),
  4: stageTemplate(4),
  5: stageTemplate(5),
  6: stageTemplate(6),
};

/** Total duration (ms) of the finale of the last level of every batch. */
const FINALE_TOTAL_MS: Readonly<Record<number, number>> = {
  4: 5000,
  9: 6000,
  20: 6000,
  25: 7000,
  30: 8000,
  40: 11000,
};

/** Start of the replaced middle part: later steps move behind the frames block. */
const FINALE_FRAMES_AT_MS = 1000;

function finaleTemplate(levelId: number, totalMs: number): FinisherTemplate {
  let stage = 1 as FinisherStage;
  let bossId = BOSS_OF_BATCH[BATCH_STARTS[0].batch];
  BATCH_STARTS.forEach((b, i) => {
    if (levelId >= b.first) {
      stage = (i + 1) as FinisherStage;
      bossId = BOSS_OF_BATCH[b.batch];
    }
  });
  const stageTotal = STAGE_TOTAL_MS[stage];
  const delta = totalMs - stageTotal;
  const steps: FinisherStep[] = stageSteps(stage).map((s) => {
    if (s.atMs === 0 && s.durationMs === stageTotal) return { ...s, durationMs: totalMs };
    if (s.atMs >= FINALE_FRAMES_AT_MS) {
      const moved: FinisherStep = { ...s, atMs: s.atMs + delta };
      if (s.block === 'title') moved.text = FINISHER_FINALE_TITLE;
      return moved;
    }
    return s;
  });
  // Placeholder: frameCount 0 means the block is skipped until AP-159 enters the real values.
  steps.push({
    block: 'frames',
    atMs: FINALE_FRAMES_AT_MS,
    durationMs: delta,
    texture: `finisher-final-${bossId}`,
    frameCount: 0,
    fps: 0,
  });
  steps.sort((a, b) => a.atMs - b.atMs);
  return {
    variantId: `finale-${levelId}` as FinisherVariantId,
    stage,
    isFinale: true,
    totalMs,
    steps,
  };
}

/** Batch finales per level id (4, 9, 20, 25, 30, 40). */
export const FINISHER_FINALES: Readonly<Record<number, FinisherTemplate>> = Object.fromEntries(
  Object.entries(FINALE_TOTAL_MS).map(([id, ms]) => [Number(id), finaleTemplate(Number(id), ms)]),
);

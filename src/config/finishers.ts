// Boss finisher sequences (M10, RS-04.1 to RS-04.5, PE-196 to PE-200, PE-203).
// Values follow the design brief H-39; all numbers of the sequences live here.
// Colour values are theme token keys `finisher.*`.
import type { FinisherRules, FinisherStage, FinisherStep, FinisherVariantId } from '../contracts';

/** Start values, hand test H-40. */
export const FINISHER_RULES: FinisherRules = {
  flashMaxPerWindow: 3,
  flashWindowMs: 1000,
  skipLockMs: 400,
  reducedRemoves: ['impactFrame', 'flash', 'shake'],
  flashBlocks: ['impactFrame', 'flash'],
  maxParticles: 120,
};

/** Title shown after the defeat (design brief H-39, decision 11a). */
export const FINISHER_TITLE = 'BEZWUNGEN!';

/** Name of the final blow per finale level (design brief H-39, decision 11a). */
export const FINISHER_NAMES: Readonly<Record<number, string>> = {
  4: 'WURZELBRECHER',
  9: 'MONDSCHNITT',
  20: 'STERNENHAMMER',
  25: 'SONNENSPEER',
  30: 'GRABESLICHT',
  40: 'LETZTER STERN',
};

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

const STAGE_BG: Readonly<Record<FinisherStage, string>> = {
  1: 'finisher.bg-forest',
  2: 'finisher.bg-night',
  3: 'finisher.bg-elf',
  4: 'finisher.bg-desert',
  5: 'finisher.bg-pyramid',
  6: 'finisher.bg-oasis',
};

/** Start (ms after the boss death) and length of the hit image per stage. */
const HIT_AT_MS: Readonly<Record<FinisherStage, number>> = {
  1: 120,
  2: 520,
  3: 520,
  4: 1100,
  5: 1100,
  6: 1100,
};
const HIT_MS: Readonly<Record<FinisherStage, number>> = {
  1: 400,
  2: 480,
  3: 480,
  4: 500,
  5: 500,
  6: 500,
};
const TITLE_AT_MS: Readonly<Record<FinisherStage, number>> = {
  1: 1000,
  2: 1500,
  3: 2000,
  4: 2300,
  5: 2900,
  6: 3000,
};

/** Steps of one stage; stage n contains every block kind of stage n - 1 (table "Ablauf der Stufen"). */
function stageSteps(stage: FinisherStage): FinisherStep[] {
  const total = STAGE_TOTAL_MS[stage];
  const hitAt = HIT_AT_MS[stage];
  const hitMs = HIT_MS[stage];
  const steps: FinisherStep[] = [
    { block: 'hitstop', atMs: 0, durationMs: 120 },
    { block: 'flash', atMs: 0, durationMs: 120, color: 'finisher.paper' },
    { block: 'zoom', atMs: 0, durationMs: 120, strength: 1 },
    {
      block: 'frames',
      atMs: hitAt,
      durationMs: hitMs,
      texture: 'finisher-hit',
      frameCount: 1,
      firstFrame: stage - 1,
      holdsMs: [hitMs],
    },
    // The shake follows the hit image.
    { block: 'shake', atMs: hitAt + hitMs, durationMs: 300, strength: 0.6 },
    {
      block: 'title',
      atMs: TITLE_AT_MS[stage],
      durationMs: total - TITLE_AT_MS[stage],
      text: FINISHER_TITLE,
      titleKind: 'title',
      color: 'finisher.title',
    },
  ];
  if (stage >= 2) {
    steps.push({ block: 'letterbox', atMs: 0, durationMs: total, color: 'finisher.letterbox' });
    steps.push({ block: 'slowmo', atMs: 120, durationMs: 780, strength: 0.3 });
  }
  if (stage >= 3) {
    steps.push({ block: 'bgColor', atMs: 120, durationMs: total - 120, color: STAGE_BG[stage] });
    steps.push({
      block: 'speedlines',
      atMs: 120,
      durationMs: 880,
      strength: 0.7,
      color: 'finisher.speedline',
    });
  }
  if (stage >= 4) {
    steps.push({
      block: 'cutIn',
      atMs: 200,
      durationMs: 600,
      texture: 'finisher-portrait',
      firstFrame: stage - 1,
    });
    // One block is one light-dark pair (2 x 100 ms).
    steps.push({ block: 'impactFrame', atMs: 900, durationMs: 200, color: 'finisher.ink' });
  }
  if (stage >= 5) {
    steps.push({ block: 'panels', atMs: 1000, durationMs: 800, strength: 0.7 });
    steps.push({ block: 'particles', atMs: 2200, durationMs: 800, strength: 0.7 });
    steps.push({ block: 'shatter', atMs: 2200, durationMs: 600, strength: 0.7 });
  }
  if (stage >= 6) {
    // Second pair at least 400 ms after the first, longest decay of all stages.
    steps.push({ block: 'impactFrame', atMs: 1700, durationMs: 200, color: 'finisher.ink' });
    const i = steps.findIndex((s) => s.block === 'shatter');
    steps[i] = { block: 'shatter', atMs: 2200, durationMs: 900, strength: 1 };
  }
  steps.sort((a, b) => a.atMs - b.atMs);
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

/** Length of the cut-in before the picture sequence, and how long the last title stays after it. */
const FINALE_CUTIN_MS = 600;
const FINALE_TAIL_MS = 600;

/** Hold times (ms) per picture of the finales, picture 0 first (design brief H-39). */
const HOLDS_4 = [500, 300, 300, 200, 300, 400, 100, 100, 300, 400, 900];
const HOLDS_9 = [600, 400, 300, 200, 400, 500, 100, 100, 400, 600, 1000];
const HOLDS_20 = [600, 400, 300, 200, 400, 500, 100, 100, 400, 600, 1000];
const HOLDS_25 = [700, 400, 400, 250, 400, 600, 100, 100, 500, 700, 1300];
const HOLDS_30 = [800, 500, 400, 250, 500, 700, 100, 100, 600, 900, 1500];
const HOLDS_40 = [
  900, 900, 500, 300, 300, 200, 400, 400, 100, 100, 700, 400, 500, 100, 500, 600, 800, 1600,
];

const sum = (values: readonly number[]): number => values.reduce((a, b) => a + b, 0);

/** Hold times with "reduce effects": impact pictures drop out, listed pictures hold longer. */
function reducedHolds(
  holds: readonly number[],
  impact: readonly number[],
  longer: readonly number[],
): number[] {
  return holds.map((h, i) => (impact.includes(i) ? 0 : longer.includes(i) ? h + 200 : h));
}

interface FrameSheet {
  texture: string;
  holds: readonly number[];
  reduced: readonly number[];
}

/** Finale of one level: letterbox, cut-in, picture sequence (one or two sheets), name and title. */
function finaleTemplate(
  levelId: number,
  stage: FinisherStage,
  sheets: readonly FrameSheet[],
  nameFrame: number,
  titleFrame: number,
): FinisherTemplate {
  const steps: FinisherStep[] = [];
  const frameStarts: number[] = [];
  let at = FINALE_CUTIN_MS;
  for (const sheet of sheets) {
    // A sheet starts where the previous one ends, without a gap.
    steps.push({
      block: 'frames',
      atMs: at,
      durationMs: sum(sheet.holds),
      texture: sheet.texture,
      frameCount: sheet.holds.length,
      holdsMs: sheet.holds,
      reducedHoldsMs: sheet.reduced,
    });
    for (const h of sheet.holds) {
      frameStarts.push(at);
      at += h;
    }
  }
  const totalMs = at + FINALE_TAIL_MS;
  steps.push({ block: 'letterbox', atMs: 0, durationMs: totalMs, color: 'finisher.letterbox' });
  steps.push({
    block: 'cutIn',
    atMs: 0,
    durationMs: FINALE_CUTIN_MS,
    texture: 'finisher-portrait',
    firstFrame: stage - 1,
  });
  // Name and title never show at the same time: the name ends where the title starts.
  steps.push({
    block: 'title',
    atMs: frameStarts[nameFrame],
    durationMs: frameStarts[titleFrame] - frameStarts[nameFrame],
    text: FINISHER_NAMES[levelId],
    titleKind: 'name',
    color: 'finisher.name',
  });
  steps.push({
    block: 'title',
    atMs: frameStarts[titleFrame],
    durationMs: totalMs - frameStarts[titleFrame],
    text: FINISHER_TITLE,
    titleKind: 'title',
    color: 'finisher.title',
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

/** Levels 4 to 30: 11 pictures, picture 6 and 7 are impact pictures, picture 5 holds 200 ms longer. */
function simpleFinale(
  levelId: number,
  stage: FinisherStage,
  holds: readonly number[],
): FinisherTemplate {
  const sheet = {
    texture: `finisher-finale-${levelId}`,
    holds,
    reduced: reducedHolds(holds, [6, 7], [5]),
  };
  return finaleTemplate(levelId, stage, [sheet], 5, 10);
}

const HOLDS_40A = HOLDS_40.slice(0, 9);
const HOLDS_40B = HOLDS_40.slice(9);

/** Batch finales per level id (4, 9, 20, 25, 30, 40). */
export const FINISHER_FINALES: Readonly<Record<number, FinisherTemplate>> = {
  4: simpleFinale(4, 1, HOLDS_4),
  9: simpleFinale(9, 2, HOLDS_9),
  20: simpleFinale(20, 3, HOLDS_20),
  25: simpleFinale(25, 4, HOLDS_25),
  30: simpleFinale(30, 5, HOLDS_30),
  // Level 40: two sheets directly one after the other (pictures 0 to 8 | 9 to 17). Pictures 8, 9
  // and 13 are impact pictures, pictures 7 and 12 hold 200 ms longer with "reduce effects".
  40: finaleTemplate(
    40,
    6,
    [
      {
        texture: 'finisher-finale-40a',
        holds: HOLDS_40A,
        reduced: reducedHolds(HOLDS_40A, [8], [7]),
      },
      {
        texture: 'finisher-finale-40b',
        holds: HOLDS_40B,
        reduced: reducedHolds(HOLDS_40B, [0, 4], [3]),
      },
    ],
    12,
    17,
  ),
};

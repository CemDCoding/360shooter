// Contracts of the boss finisher sequences (M10, RS-04.1, PE-196 to PE-200).
// No Phaser imports: plain data only. Numbers live in src/config/finishers.ts.

/** Building blocks of a finisher sequence. `impactFrame` and `flash` are the flash blocks (RS-04.5). */
export type FinisherBlock =
  | 'hitstop'
  | 'slowmo'
  | 'zoom'
  | 'shake'
  | 'letterbox'
  | 'speedlines'
  | 'bgColor'
  | 'impactFrame'
  | 'flash'
  | 'cutIn'
  | 'panels'
  | 'particles'
  | 'shatter'
  | 'title'
  | 'frames';

/** One timed step of a sequence. */
export interface FinisherStep {
  block: FinisherBlock;
  /** Start relative to the sequence start (ms), at least 0. */
  atMs: number;
  durationMs: number;
  /** Intensity 0..1. */
  strength?: number;
  /** Theme token key `finisher.*`, never a raw colour. */
  color?: string;
  /** Texture key (cut-in portrait, frame strip). */
  texture?: string;
  /** Number of hand-drawn frames of a `frames` block, 0 = block is skipped. */
  frameCount?: number;
  fps?: number;
  /** Title text. */
  text?: string;
}

export type FinisherStage = 1 | 2 | 3 | 4 | 5 | 6;

export type FinisherVariantId =
  | 'stage-1'
  | 'stage-2'
  | 'stage-3'
  | 'stage-4'
  | 'stage-5'
  | 'stage-6'
  | 'finale-4'
  | 'finale-9'
  | 'finale-20'
  | 'finale-25'
  | 'finale-30'
  | 'finale-40';

export const FINISHER_VARIANT_IDS: readonly FinisherVariantId[] = [
  'stage-1',
  'stage-2',
  'stage-3',
  'stage-4',
  'stage-5',
  'stage-6',
  'finale-4',
  'finale-9',
  'finale-20',
  'finale-25',
  'finale-30',
  'finale-40',
];

/** A ready sequence for one boss defeat. */
export interface FinisherPlan {
  variantId: FinisherVariantId;
  stage: FinisherStage;
  isFinale: boolean;
  steps: readonly FinisherStep[];
  totalMs: number;
  skippable: boolean;
  /** True when "reduce effects" was applied to the steps. */
  reduced: boolean;
}

/** A sprite shown by the sequence (boss or player). */
export interface FinisherActor {
  texture: string;
  frame?: string | number;
  x: number;
  y: number;
  scale: number;
  flipX?: boolean;
}

export const FINISHER_SCENE_KEY = 'FinisherScene';

/** Data passed to the finisher scene. `result` is only missing for the debug start. */
export interface FinisherStartData<R = unknown> {
  plan: FinisherPlan;
  levelId: number;
  bossId: string;
  boss: FinisherActor;
  player: FinisherActor;
  result?: R;
}

/** Fixed rules for all sequences (RS-04.4, RS-04.5). */
export interface FinisherRules {
  /** At most this many flash blocks inside one window (WCAG 2.3.1). */
  flashMaxPerWindow: number;
  flashWindowMs: number;
  /** Skip is ignored during the first ms. */
  skipLockMs: number;
  /** Blocks removed by "reduce effects". */
  reducedRemoves: readonly FinisherBlock[];
  flashBlocks: readonly FinisherBlock[];
  maxParticles: number;
}

// Contracts of the boss finisher sequences (M10 plan and M13 choreography, RS-04.1, PE-196 to PE-200, PE-241).
// No Phaser imports: plain data only. Numbers live in src/config/finishers.ts.
import type { BossId } from './boss';

export type FinisherStage = 1 | 2 | 3 | 4 | 5 | 6;

/** A ready sequence for one boss defeat: always a choreography (M13). */
export interface FinisherPlan {
  variantId: ChoreoVariantId;
  /** Batch index 1..6 (frame of the hit image and the portrait). */
  stage: FinisherStage;
  /** Real length (ms), equals `realMs`. */
  totalMs: number;
  /** True when "reduce effects" was applied to the choreography. */
  reduced: boolean;
  /** Choreography to play; with "reduce effects" already reduced. */
  choreo: ChoreoDef;
  /** Real length (ms) of `choreo` including `timeScale` and `hitStop`. */
  realMs: number;
  /** Time (ms) from which skipping is allowed (PE-234). */
  skipFromMs: number;
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

/** Fixed rules for the skip lock of all sequences (RS-04.4, PE-234). */
export interface FinisherRules {
  /** Skip is ignored during the first ms of a variant seen before. */
  skipLockMs: number;
  /** Skip is ignored during the first ms when the variant is seen for the first time (M13, PE-234). */
  skipFirstViewMs: number;
}

// ---------------------------------------------------------------------------
// Rig and choreography (M13, AP-181, RS-06.1, PE-244 to PE-251). The M10 blocks and variant ids are gone (AP-191).
// All times are in ms, never in frames (RS-06.5). Numbers live in src/config/finishers.ts.
// ---------------------------------------------------------------------------

/** A figure: the astronaut or one of the bosses. */
export type RigId = 'astronaut' | BossId;

/** One part of a figure (a drawn image with a pivot). */
export interface RigPartDef {
  /** Unique within the rig. */
  id: string;
  /** Frame of the part image in the finisher atlas. */
  frame: string;
  /** Further drawn images of the part per key pose (pose name to frame), switched by the `pose` track. */
  poses?: Readonly<Record<string, string>>;
  /** Pre-drawn white frame used for the hit-white effect (RS-06.3). */
  silhouette: string;
  /** Pivot of the part, 0..1 of the part image. */
  originX: number;
  originY: number;
  /** Offset in pixels to the parent part, or to the figure origin without `parent`. */
  x: number;
  y: number;
  /** Parent part id. At most one level deep: a part with a `parent` is itself never a parent. */
  parent?: string;
  /** Draw order, may be changed by an `order` track. */
  order: number;
  /** True for small or fast parts (blade, splinter) that may be rotated freely (RS-06.4). */
  freeRotate?: boolean;
}

/** A figure made of parts. */
export interface RigDef {
  id: RigId;
  /** At most `ChoreoRules.maxPartsPerRig` parts. */
  parts: readonly RigPartDef[];
}

/** Fight-moment variant per boss. */
export type MomentVariantId = `moment-${BossId}`;

/** Level of a batch finale (last level of a batch). */
export type CinematicLevel = 4 | 9 | 20 | 25 | 30 | 40;

/** Cinematic variant per batch finale. */
export type CinematicVariantId = `cinematic-${CinematicLevel}`;

/** The 12 choreography variants: 6 fight moments and 6 cinematics. */
export type ChoreoVariantId = MomentVariantId | CinematicVariantId;

export const CHOREO_VARIANT_IDS: readonly ChoreoVariantId[] = [
  'moment-rootMonster',
  'moment-forestGhost',
  'moment-giantStone',
  'moment-giantSandWorm',
  'moment-guardianDog',
  'moment-pharaoh',
  'cinematic-4',
  'cinematic-9',
  'cinematic-20',
  'cinematic-25',
  'cinematic-30',
  'cinematic-40',
];

/**
 * Easing curve of the segment that starts at a key. Formulas as in Phaser; `stepped` jumps in `steps` levels
 * (Phaser `Stepped`), `hold` keeps the key value until the next key.
 */
export type ChoreoEase =
  | 'linear'
  | 'sine.inOut'
  | 'sine.out'
  | 'expo.in'
  | 'expo.out'
  | 'back.out'
  | 'elastic.out'
  | 'stepped'
  | 'hold';

/** Property of a track: part or figure properties, or camera properties for the target `camera`. */
export type ChoreoProperty =
  | 'x'
  | 'y'
  | 'angle'
  | 'scaleX'
  | 'scaleY'
  | 'alpha'
  | 'pose'
  | 'order'
  | 'scrollX'
  | 'scrollY'
  | 'zoom';

/** One key frame of a track. */
export interface ChoreoKey {
  /** Choreography time (ms), keys of a track are sorted ascending. */
  atMs: number;
  /** Number, or a pose name for the `pose` property. */
  value: number | string;
  /** Curve towards the next key. */
  ease: ChoreoEase;
  /** Number of levels for `stepped`, at least 1. */
  steps?: number;
}

/** Key frames of one property of one target. `pose` and `order` are discrete: they hold like `hold`. */
export interface ChoreoTrack {
  /** `<rigId>.<partId>`, a rig id (whole figure root) or `camera`. */
  target: string;
  property: ChoreoProperty;
  keys: readonly ChoreoKey[];
}

/** Fields all events share. */
export interface ChoreoEventBase {
  /** Start in choreography time (ms). */
  atMs: number;
  /** Duration (ms) where the kind needs one. */
  durationMs?: number;
  /** Intensity 0..1. */
  strength?: number;
  /** True for a large-area brightness change (counts for the flash rule, section 5). */
  flash: boolean;
  /** `drop` = removed by "reduce effects". Default: `drop` for `flash`, `impact`, `shake`, `hitWhite` and every flash event. */
  reduce?: 'drop' | 'keep';
}

/** Event of a choreography, one variant per `kind`. */
export type ChoreoEvent =
  | (ChoreoEventBase & {
      kind: 'hitStop';
      /** Real time (ms) the choreography clock stands still. */
      ms: number;
      /** Shake axis of the hit target (horizontal on the ground, vertical in the air). */
      axis: 'x' | 'y';
      /** Targets that shake with a decaying strength. */
      targets: readonly string[];
    })
  | (ChoreoEventBase & {
      kind: 'afterimage';
      /** Targets (`<rigId>.<partId>`) that leave copies. */
      parts: readonly string[];
      /** 2 to `maxAfterimagesPerPart` copies. */
      copies: number;
      /** Distance in ms between two copies. */
      spacingMs: number;
      /** Fade-out time (ms) of a copy. */
      fadeMs: number;
    })
  | (ChoreoEventBase & {
      kind: 'particles';
      /** Pre-coloured image. */
      texture: string;
      count: number;
      /** Place, or a target to follow. */
      at?: { x: number; y: number };
      follow?: string;
    })
  | (ChoreoEventBase & { kind: 'hitWhite'; targets: readonly string[] })
  | (ChoreoEventBase & { kind: 'impact'; texture: string })
  | (ChoreoEventBase & { kind: 'flash'; color?: string })
  | (ChoreoEventBase & { kind: 'shake' })
  | (ChoreoEventBase & {
      kind: 'timeScale';
      /** Speed of the choreography clock, 1 = normal, 0.3 = slow motion. `durationMs` (choreography time) is required. */
      factor: number;
    })
  | (ChoreoEventBase & {
      kind: 'text';
      text: string;
      /** Theme token key `finisher.*`, never a raw colour. */
      color: string;
    })
  | (ChoreoEventBase & { kind: 'sound'; key: string })
  | (ChoreoEventBase & { kind: 'fx'; name: string });

export type ChoreoEventKind = ChoreoEvent['kind'];

/** Phases of a hit. */
export type ChoreoBeatPhase = 'anticipation' | 'action' | 'hitStop' | 'reaction' | 'followThrough';

/** Phase of a hit. Beats control nothing, they only feed the grid test (RS-06.2). */
export interface ChoreoBeat {
  phase: ChoreoBeatPhase;
  atMs: number;
  durationMs: number;
  /** True for the phases of the final hit. */
  final?: boolean;
}

/** Camera state at the start of a shot. */
export interface ChoreoCamera {
  scrollX: number;
  scrollY: number;
  zoom: number;
}

/** Shot of a cinematic. */
export interface ChoreoShot {
  atMs: number;
  camera: ChoreoCamera;
  /** Camera crosses the action axis here (at most once per sequence, RS-06.6). */
  axisFlip?: boolean;
}

/** Start position of a figure. The astronaut stands left, the boss right (RS-06.6). */
export interface ChoreoActor {
  rigId: RigId;
  x: number;
  y: number;
  flipX?: boolean;
}

/** A complete choreography. */
export interface ChoreoDef {
  variantId: ChoreoVariantId;
  actors: readonly ChoreoActor[];
  /** Length in choreography time (ms); the real length follows from `timeScale` and `hitStop`. */
  durationMs: number;
  /** Cinematic only. */
  shots?: readonly ChoreoShot[];
  tracks: readonly ChoreoTrack[];
  events: readonly ChoreoEvent[];
  beats: readonly ChoreoBeat[];
}

/** A min/max range in ms. */
export interface ChoreoLength {
  minMs: number;
  maxMs: number;
}

/** Fixed rules for all choreographies, checked by `validateChoreo` (RS-06.2, RS-06.4, RS-06.5). */
export interface ChoreoRules {
  /** Grid (PE-245). */
  anticipationMinMs: number;
  bossAnticipationMaxMs: number;
  actionMaxMs: number;
  hitStopMinMs: number;
  hitStopMaxMs: number;
  finalHitStopMaxMs: number;
  followThroughMinMs: number;
  /** Minimum real distance between two flash events. */
  flashMinGapMs: number;
  /** Flash events in a fight moment besides the main hit. */
  momentMaxExtraFlashes: number;
  /** At most this many flash events inside one window (WCAG 2.3.1, section 5). */
  flashMaxPerWindow: number;
  flashWindowMs: number;
  /** Budget (PE-248). */
  maxPartsPerRig: number;
  maxAfterimagesPerPart: number;
  maxParticles: number;
  /** Levels of parts: 2 = parts and their children. */
  maxRigDepth: number;
  /** Rotation (PE-247). */
  maxFineRotationDeg: number;
  zoomTransitionMaxMs: number;
  /** Real lengths. */
  momentRealMs: ChoreoLength;
  cinematicRealMs: ChoreoLength;
  /** Cinematic of level 40. */
  finalCinematicRealMs: ChoreoLength;
  cinematicShots: number;
  finalCinematicShots: number;
  /** Event kinds removed by default with "reduce effects". */
  reduceDropKinds: readonly ChoreoEventKind[];
}

/** Rule that a choreography broke. */
export type ChoreoRuleId =
  | 'anticipation'
  | 'action'
  | 'hitStop'
  | 'followThrough'
  | 'flashGap'
  | 'flashCount'
  | 'momentFlashes'
  | 'parts'
  | 'afterimages'
  | 'particles'
  | 'rigDepth'
  | 'rotation'
  | 'zoom'
  | 'length'
  | 'shots'
  | 'axisFlip'
  | 'rig';

export interface ChoreoViolation {
  rule: ChoreoRuleId;
  message: string;
}

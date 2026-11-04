import { describe, expect, it } from 'vitest';
import {
  FINISHER_FINALES,
  FINISHER_RULES,
  FINISHER_STAGES,
  type FinisherTemplate,
} from '../../src/config/finishers';
import { BOSS_OF_BATCH, LEVEL_COUNT, batchOf } from '../../src/config/levels';
import {
  CHOREO_VARIANT_IDS,
  FINISHER_VARIANT_IDS,
  type ChoreoDef,
  type ChoreoVariantId,
  type FinisherPlan,
  type FinisherStep,
} from '../../src/contracts';
import {
  DEFAULT_FINISHER_SOURCE,
  buildFinisher,
  buildPlanFromTemplate,
  canSkip,
  choreoVariantId,
  isSeenFinisherId,
  finisherStage,
  finisherVariantId,
  frameHolds,
  isBatchFinale,
  isFinisherVariantId,
  isFlashSafe,
  markSeen,
  maxFlashesInWindow,
  type FinisherSource,
} from '../../src/logic/finisher';

const NONE = { reduceEffects: false, seen: [] as string[] };
const REDUCED = { reduceEffects: true, seen: [] as string[] };

const HOLD4 = [500, 300, 300, 200, 300, 400, 100, 100, 300, 400, 900];
const RED4 = [500, 300, 300, 200, 300, 600, 0, 0, 300, 400, 900];
const HOLD40 = [
  900, 900, 500, 300, 300, 200, 400, 400, 100, 100, 700, 400, 500, 100, 500, 600, 800, 1600,
];
const RED40 = [900, 900, 500, 300, 300, 200, 400, 600, 0, 0, 700, 400, 700, 0, 500, 600, 800, 1600];

function frameStart(holds: number[], at: number, i: number): number {
  return at + holds.slice(0, i).reduce((a, b) => a + b, 0);
}

/** Level 4 like in brief H-39: 11 frames, name at frame 5, title at frame 10. */
function template4(): FinisherTemplate {
  const at = 1000;
  return {
    variantId: 'finale-4',
    stage: 4,
    isFinale: true,
    totalMs: 5000,
    steps: [
      { block: 'letterbox', atMs: 0, durationMs: 5000, color: 'finisher.letterbox' },
      { block: 'cutIn', atMs: 0, durationMs: 600 },
      {
        block: 'frames',
        atMs: at,
        durationMs: 3800,
        texture: 't',
        frameCount: 11,
        holdsMs: HOLD4,
        reducedHoldsMs: RED4,
      },
      {
        block: 'title',
        atMs: frameStart(HOLD4, at, 5),
        durationMs: 800,
        titleKind: 'name',
        text: 'X',
      },
      { block: 'zoom', atMs: frameStart(HOLD4, at, 8), durationMs: 300, strength: 0.5 },
      { block: 'title', atMs: frameStart(HOLD4, at, 10), durationMs: 900, text: 'BEZWUNGEN!' },
      { block: 'shake', atMs: frameStart(HOLD4, at, 6), durationMs: 200, strength: 0.5 },
    ],
  };
}

/** Level 40: two frames blocks one after the other (frames 0-8 and 9-17). */
function template40(): FinisherTemplate {
  const at = 1000;
  const a = HOLD40.slice(0, 9);
  const b = HOLD40.slice(9);
  const aRed = RED40.slice(0, 9);
  const bRed = RED40.slice(9);
  const aSum = a.reduce((x, y) => x + y, 0);
  const bAt = at + aSum;
  return {
    variantId: 'finale-40',
    stage: 6,
    isFinale: true,
    totalMs: 11000,
    steps: [
      { block: 'letterbox', atMs: 0, durationMs: 11000 },
      {
        block: 'frames',
        atMs: at,
        durationMs: aSum,
        frameCount: 9,
        holdsMs: a,
        reducedHoldsMs: aRed,
      },
      {
        block: 'frames',
        atMs: bAt,
        durationMs: 4200,
        frameCount: 9,
        holdsMs: b,
        reducedHoldsMs: bRed,
      },
      {
        block: 'title',
        atMs: frameStart(HOLD40, at, 12),
        durationMs: 500,
        titleKind: 'name',
        text: 'N',
      },
      { block: 'title', atMs: frameStart(HOLD40, at, 17), durationMs: 1600, text: 'BEZWUNGEN!' },
    ],
  };
}

function source(): FinisherSource {
  const finales: Record<number, FinisherTemplate> = { ...FINISHER_FINALES };
  finales[4] = template4();
  finales[40] = template40();
  return { stages: FINISHER_STAGES, finales };
}

function find(plan: FinisherPlan, pred: (s: FinisherStep) => boolean): FinisherStep {
  const s = plan.steps.find(pred);
  if (!s) throw new Error('step not found');
  return s;
}

describe('stage and finale selection', () => {
  it('maps all 41 levels to the right stage and variant', () => {
    const stageOf = (id: number): number =>
      id <= 4 ? 1 : id <= 9 ? 2 : id <= 20 ? 3 : id <= 25 ? 4 : id <= 30 ? 5 : 6;
    const finales = [4, 9, 20, 25, 30, 40];
    for (let id = 0; id < LEVEL_COUNT; id++) {
      expect(finisherStage(id)).toBe(stageOf(id));
      expect(isBatchFinale(id)).toBe(finales.includes(id));
      expect(finisherVariantId(id)).toBe(
        finales.includes(id) ? `finale-${id}` : `stage-${stageOf(id)}`,
      );
    }
  });

  it('knows the batch borders', () => {
    expect([4, 5, 9, 10, 20, 21, 25, 26, 30, 31, 40].map(finisherStage)).toEqual([
      1, 2, 2, 3, 3, 4, 4, 5, 5, 6, 6,
    ]);
  });

  it('rejects invalid level ids', () => {
    expect(() => finisherStage(-1)).toThrow(RangeError);
    expect(() => finisherStage(41)).toThrow(RangeError);
    expect(() => buildFinisher(1.5, NONE)).toThrow(RangeError);
  });

  it('validates variant ids', () => {
    for (const id of FINISHER_VARIANT_IDS) expect(isFinisherVariantId(id)).toBe(true);
    expect(isFinisherVariantId('finale-5')).toBe(false);
    expect(isFinisherVariantId(3)).toBe(false);
  });

  it('builds the stage or finale for the level', () => {
    expect(buildFinisher(0, NONE).variantId).toBe('stage-1');
    const f = buildFinisher(9, NONE);
    expect(f.variantId).toBe('finale-9');
    expect(f.isFinale).toBe(true);
    expect(f.stage).toBe(2);
  });
});

describe('seen, skip', () => {
  it('marks seen without duplicates and invalid ids', () => {
    expect(markSeen(['stage-1'], 'stage-1')).toEqual(['stage-1']);
    expect(markSeen(['stage-1', 'bad', 'stage-1'], 'finale-4')).toEqual(['stage-1', 'finale-4']);
    expect(markSeen([], 'nope')).toEqual([]);
  });

  it('is skippable only after the variant was seen, and not during the lock', () => {
    const first = buildFinisher(0, NONE);
    expect(first.skippable).toBe(false);
    expect(canSkip(first, 5000)).toBe(false);
    const again = buildFinisher(0, { reduceEffects: false, seen: ['stage-1'] });
    expect(again.skippable).toBe(true);
    expect(canSkip(again, FINISHER_RULES.skipLockMs - 1)).toBe(false);
    expect(canSkip(again, FINISHER_RULES.skipLockMs)).toBe(true);
  });
});

describe('plan building', () => {
  it('does not mutate the config and sorts by atMs', () => {
    const before = JSON.stringify(FINISHER_STAGES);
    const plan = buildFinisher(25, REDUCED);
    expect(JSON.stringify(FINISHER_STAGES)).toBe(before);
    const times = plan.steps.map((s) => s.atMs);
    expect(times).toEqual([...times].sort((a, b) => a - b));
  });

  it('keeps the frames block of the finale and its duration (frameCount 0 blocks are dropped by the builder)', () => {
    const plan = buildFinisher(4, NONE);
    expect(plan.steps.some((s) => s.block === 'frames')).toBe(true);
    expect(plan.totalMs).toBe(FINISHER_FINALES[4].totalMs);
    expect(plan.totalMs).toBeGreaterThan(FINISHER_STAGES[1].totalMs);
  });

  it('reduces: no impactFrame, flash, shake, but zoom and slowmo stay', () => {
    const full = buildFinisher(35, NONE);
    expect(full.steps.some((s) => s.block === 'impactFrame')).toBe(true);
    expect(full.steps.some((s) => s.block === 'flash')).toBe(true);
    const red = buildFinisher(35, REDUCED);
    expect(red.reduced).toBe(true);
    for (const b of ['impactFrame', 'flash', 'shake'] as const) {
      expect(red.steps.some((s) => s.block === b)).toBe(false);
    }
    for (const b of ['zoom', 'slowmo'] as const) {
      expect(red.steps.some((s) => s.block === b)).toBe(true);
    }
  });
});

describe('frame hold times', () => {
  it('uses 1000 / fps without holdsMs', () => {
    expect(
      frameHolds({ block: 'frames', atMs: 0, durationMs: 0, frameCount: 3, fps: 10 }, false),
    ).toEqual([100, 100, 100]);
    expect(
      frameHolds({ block: 'frames', atMs: 0, durationMs: 0, frameCount: 0, fps: 0 }, true),
    ).toEqual([]);
  });

  it('uses holdsMs and reducedHoldsMs', () => {
    const s = template4().steps[2];
    expect(frameHolds(s, false)).toEqual(HOLD4);
    expect(frameHolds(s, true)).toEqual(RED4);
  });

  it('level 4: reduced without frames 6/7, name stays at frame 5, title at the last frame', () => {
    const src = source();
    const full = buildFinisher(4, NONE, src);
    const red = buildFinisher(4, REDUCED, src);
    const fr = find(red, (s) => s.block === 'frames');
    expect(fr.durationMs).toBe(3800);
    expect(find(full, (s) => s.block === 'frames').durationMs).toBe(3800);
    // name starts when frame 5 starts in both plans
    expect(find(red, (s) => s.titleKind === 'name').atMs).toBe(frameStart(HOLD4, 1000, 5));
    // zoom (frame 8) moves by +200 (frame 5) - 200 (frames 6, 7) = 0
    expect(find(red, (s) => s.block === 'zoom').atMs).toBe(frameStart(HOLD4, 1000, 8));
    expect(find(red, (s) => s.text === 'BEZWUNGEN!').atMs).toBe(frameStart(RED4, 1000, 10));
    expect(red.totalMs).toBe(full.totalMs);
    expect(red.steps.some((s) => s.block === 'shake')).toBe(false);
    expect(find(full, (s) => s.block === 'shake').atMs).toBe(frameStart(HOLD4, 1000, 6));
  });

  it('level 40: reduced without frames 8/9/13, name stays at frame 12', () => {
    const src = source();
    const full = buildFinisher(40, NONE, src);
    const red = buildFinisher(40, REDUCED, src);
    const [a, b] = red.steps.filter((s) => s.block === 'frames');
    expect(a.durationMs).toBe(frameHolds(a, true).reduce((x, y) => x + y, 0));
    // block a: 4000 ms, frame 7 +200, frame 8 -100 (frame 9 belongs to block b)
    expect(a.durationMs).toBe(4100);
    expect(b.atMs).toBe(a.atMs + a.durationMs);
    expect(find(red, (s) => s.titleKind === 'name').atMs).toBe(frameStart(RED40, 1000, 12));
    expect(find(red, (s) => s.text === 'BEZWUNGEN!').atMs).toBe(frameStart(RED40, 1000, 17));
    const delta = RED40.reduce((x, y) => x + y, 0) - HOLD40.reduce((x, y) => x + y, 0);
    expect(red.totalMs).toBe(full.totalMs + delta);
    expect(delta).toBe(100);
  });
});

describe('flash safety', () => {
  const impact = (atMs: number): FinisherStep => ({ block: 'impactFrame', atMs, durationMs: 100 });

  it('counts a sliding window over flash blocks', () => {
    expect(maxFlashesInWindow([impact(0), impact(300), impact(600)], 1000)).toBe(3);
    expect(maxFlashesInWindow([impact(0), impact(300), impact(600), impact(900)], 1000)).toBe(4);
    expect(maxFlashesInWindow([impact(0), impact(1000), impact(2000)], 1000)).toBe(1);
    // the dense group sits in the middle, a fixed grid would miss it
    expect(
      maxFlashesInWindow([impact(0), impact(700), impact(900), impact(1200), impact(1800)], 1000),
    ).toBe(3);
  });

  it('counts impact frames of frames blocks, a run is one event', () => {
    const frames = (atMs: number, red: number[]): FinisherStep => ({
      block: 'frames',
      atMs,
      durationMs: 0,
      frameCount: red.length,
      holdsMs: red.map(() => 100),
      reducedHoldsMs: red,
    });
    // frames 1 and 2 are one run, frame 4 another one
    const steps = [frames(0, [100, 0, 0, 100, 0, 100])];
    expect(maxFlashesInWindow(steps, 1000)).toBe(2);
    // four runs in 1 s
    expect(maxFlashesInWindow([frames(0, [0, 100, 0, 100, 0, 100, 0, 100])], 1000)).toBe(4);
    expect(maxFlashesInWindow([frames(0, [0, 100, 0, 100, 0, 100, 0, 100])], 1000, true)).toBe(0);
  });

  it('level 40 test data: frames 8 and 9 are one event, frame 13 another', () => {
    const plan = buildFinisher(40, NONE, source());
    expect(maxFlashesInWindow(plan.steps, 1000)).toBe(1);
    expect(maxFlashesInWindow(plan.steps, 100000)).toBe(2);
  });

  it('a dense impact sequence is not flash safe', () => {
    const steps = [impact(0), impact(200), impact(400), impact(600)];
    const plan: FinisherPlan = {
      variantId: 'stage-4',
      stage: 4,
      isFinale: false,
      steps,
      totalMs: 1000,
      skippable: false,
      reduced: false,
    };
    expect(isFlashSafe(plan)).toBe(false);
    expect(isFlashSafe({ ...plan, steps: steps.slice(0, 3) })).toBe(true);
  });

  it('every plan of every level is flash safe (with and without frames, reduced or not)', () => {
    const withFrames = source();
    for (const src of [undefined, withFrames]) {
      for (let id = 0; id < LEVEL_COUNT; id++) {
        for (const opt of [NONE, REDUCED]) {
          const plan = src ? buildFinisher(id, opt, src) : buildFinisher(id, opt);
          expect(isFlashSafe(plan), `level ${id} reduce ${opt.reduceEffects}`).toBe(true);
          expect(plan.totalMs).toBeGreaterThan(0);
        }
      }
    }
  });

  it('builds from a template directly', () => {
    const plan = buildPlanFromTemplate(template4(), REDUCED);
    expect(plan.reduced).toBe(true);
  });
});

describe('choreography plan (M13, AP-181)', () => {
  const choreo = (variantId: ChoreoVariantId): ChoreoDef => ({
    variantId,
    actors: [],
    durationMs: 3000,
    tracks: [],
    events: [
      { kind: 'hitStop', atMs: 1000, ms: 200, axis: 'x', targets: [], flash: false },
      { kind: 'flash', atMs: 1000, flash: true },
      { kind: 'particles', atMs: 1500, texture: 's', count: 5, flash: false },
    ],
    beats: [],
  });
  const all = Object.fromEntries(CHOREO_VARIANT_IDS.map((id) => [id, choreo(id)]));
  const withChoreos = { ...DEFAULT_FINISHER_SOURCE, choreos: all };

  it('chooses cinematic-<level> for finales and moment-<boss> otherwise, for levels 0 to 40', () => {
    const ids = new Set<string>();
    for (let id = 0; id < LEVEL_COUNT; id++) {
      const expected = isBatchFinale(id)
        ? `cinematic-${id}`
        : `moment-${BOSS_OF_BATCH[batchOf(id)]}`;
      expect(choreoVariantId(id)).toBe(expected);
      const plan = buildFinisher(id, NONE, withChoreos);
      expect(plan.variantId).toBe(expected);
      expect(plan.choreo?.variantId).toBe(expected);
      expect(plan.realMs).toBe(3200);
      expect(plan.totalMs).toBe(3200);
      ids.add(expected);
    }
    expect(choreoVariantId(0)).toBe('moment-rootMonster');
    expect(choreoVariantId(4)).toBe('cinematic-4');
    expect(choreoVariantId(40)).toBe('cinematic-40');
    expect(ids.size).toBe(12);
  });

  it('falls back to the unchanged M10 plan without a choreography', () => {
    for (let id = 0; id < LEVEL_COUNT; id++) {
      const plan = buildFinisher(id, NONE);
      expect(plan).toEqual(
        buildFinisher(id, NONE, { ...DEFAULT_FINISHER_SOURCE, choreos: undefined }),
      );
      expect(plan.choreo).toBeUndefined();
      expect(plan.realMs).toBeUndefined();
      expect(plan.variantId).toBe(finisherVariantId(id));
    }
  });

  it('reduces the choreography with "reduce effects"', () => {
    const plan = buildFinisher(1, REDUCED, withChoreos);
    expect(plan.reduced).toBe(true);
    expect(plan.choreo?.events.map((e) => e.kind)).toEqual(['hitStop', 'particles']);
  });

  it('allows skipping at the first view only from 3 s, later after the lock', () => {
    const first = buildFinisher(1, NONE, withChoreos);
    expect(FINISHER_RULES.skipFirstViewMs).toBe(3000);
    expect(canSkip(first, 2999)).toBe(false);
    expect(canSkip(first, 3000)).toBe(true);
    const seen = { reduceEffects: false, seen: ['moment-rootMonster'] };
    const again = buildFinisher(1, seen, withChoreos);
    expect(canSkip(again, FINISHER_RULES.skipLockMs - 1)).toBe(false);
    expect(canSkip(again, FINISHER_RULES.skipLockMs)).toBe(true);
    // an M10 id does not count as seen for the choreography
    const oldSeen = buildFinisher(1, { reduceEffects: false, seen: ['stage-1'] }, withChoreos);
    expect(canSkip(oldSeen, 1000)).toBe(false);
  });

  it('accepts old and new ids as seen', () => {
    expect(isSeenFinisherId('stage-1')).toBe(true);
    expect(isSeenFinisherId('moment-pharaoh')).toBe(true);
    expect(isSeenFinisherId('cinematic-9')).toBe(true);
    expect(isSeenFinisherId('cinematic-10')).toBe(false);
    expect(markSeen(['stage-1', 'moment-pharaoh', 'bad'], 'cinematic-40')).toEqual([
      'stage-1',
      'moment-pharaoh',
      'cinematic-40',
    ]);
  });
});

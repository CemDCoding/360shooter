import { describe, expect, it } from 'vitest';
import { FINISHER_RULES } from '../../src/config/finishers';
import { CHOREOS } from '../../src/config/choreo';
import { BOSS_OF_BATCH, LEVEL_COUNT, batchOf } from '../../src/config/levels';
import { CHOREO_VARIANT_IDS, type ChoreoDef, type ChoreoVariantId } from '../../src/contracts';
import {
  DEFAULT_FINISHER_SOURCE,
  buildFinisher,
  canSkip,
  choreoVariantId,
  finisherStage,
  isBatchFinale,
  isSeenFinisherId,
  markSeen,
} from '../../src/logic/finisher';

const NONE = { reduceEffects: false, seen: [] as string[] };
const REDUCED = { reduceEffects: true, seen: [] as string[] };

describe('stage and variant selection', () => {
  it('maps all 41 levels to the right stage, finale flag and choreography id', () => {
    const stageOf = (id: number): number =>
      id <= 4 ? 1 : id <= 9 ? 2 : id <= 20 ? 3 : id <= 25 ? 4 : id <= 30 ? 5 : 6;
    const finales = [4, 9, 20, 25, 30, 40];
    const ids = new Set<string>();
    for (let id = 0; id < LEVEL_COUNT; id++) {
      expect(finisherStage(id)).toBe(stageOf(id));
      expect(isBatchFinale(id)).toBe(finales.includes(id));
      const expected = finales.includes(id)
        ? `cinematic-${id}`
        : `moment-${BOSS_OF_BATCH[batchOf(id)]}`;
      expect(choreoVariantId(id)).toBe(expected);
      ids.add(expected);
    }
    expect(ids.size).toBe(12);
    expect(choreoVariantId(0)).toBe('moment-rootMonster');
    expect(choreoVariantId(4)).toBe('cinematic-4');
    expect(choreoVariantId(40)).toBe('cinematic-40');
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
});

describe('choreography plan (M13, AP-181, AP-191)', () => {
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
  const withChoreos = { choreos: all };

  it('builds the choreography of the level with its real length', () => {
    for (let id = 0; id < LEVEL_COUNT; id++) {
      const plan = buildFinisher(id, NONE, withChoreos);
      expect(plan.variantId).toBe(choreoVariantId(id));
      expect(plan.choreo.variantId).toBe(plan.variantId);
      expect(plan.stage).toBe(finisherStage(id));
      expect(plan.realMs).toBe(3200);
      expect(plan.totalMs).toBe(3200);
      expect(plan.reduced).toBe(false);
    }
  });

  it('plays the registered choreography by default, for every level', () => {
    expect(DEFAULT_FINISHER_SOURCE.choreos).toBe(CHOREOS);
    for (let id = 0; id < LEVEL_COUNT; id++) {
      expect(buildFinisher(id, NONE).choreo).toBe(CHOREOS[choreoVariantId(id)]);
    }
  });

  it('throws when the register has no choreography for the level (no M10 fallback)', () => {
    expect(() => buildFinisher(0, NONE, { choreos: {} })).toThrow(RangeError);
    expect(() => buildFinisher(0, NONE, { choreos: { 'moment-rootMonster': undefined } })).toThrow(
      RangeError,
    );
  });

  it('reduces the choreography with "reduce effects"', () => {
    const plan = buildFinisher(1, REDUCED, withChoreos);
    expect(plan.reduced).toBe(true);
    expect(plan.choreo.events.map((e) => e.kind)).toEqual(['hitStop', 'particles']);
  });

  it('does not mutate the registered choreography', () => {
    const before = JSON.stringify(CHOREOS);
    buildFinisher(25, REDUCED);
    expect(JSON.stringify(CHOREOS)).toBe(before);
  });
});

describe('seen, skip', () => {
  const plan = (seen: string[]) => buildFinisher(1, { reduceEffects: false, seen }, onlyOne());

  function onlyOne() {
    const def: ChoreoDef = {
      variantId: 'moment-rootMonster',
      actors: [],
      durationMs: 3000,
      tracks: [],
      events: [],
      beats: [],
    };
    return { choreos: { 'moment-rootMonster': def } };
  }

  it('allows skipping at the first view only from 3 s, later after the lock', () => {
    const first = plan([]);
    expect(FINISHER_RULES.skipFirstViewMs).toBe(3000);
    expect(canSkip(first, 2999)).toBe(false);
    expect(canSkip(first, 3000)).toBe(true);
    const again = plan(['moment-rootMonster']);
    expect(canSkip(again, FINISHER_RULES.skipLockMs - 1)).toBe(false);
    expect(canSkip(again, FINISHER_RULES.skipLockMs)).toBe(true);
  });

  it('an old M10 id does not count as seen', () => {
    expect(canSkip(plan(['stage-1']), 1000)).toBe(false);
  });

  it('accepts only choreography ids as seen and drops the M10 ids', () => {
    expect(isSeenFinisherId('stage-1')).toBe(false);
    expect(isSeenFinisherId('finale-4')).toBe(false);
    expect(isSeenFinisherId('moment-pharaoh')).toBe(true);
    expect(isSeenFinisherId('cinematic-9')).toBe(true);
    expect(isSeenFinisherId('cinematic-10')).toBe(false);
    expect(isSeenFinisherId(3)).toBe(false);
    expect(
      markSeen(['stage-1', 'moment-pharaoh', 'bad', 'moment-pharaoh'], 'cinematic-40'),
    ).toEqual(['moment-pharaoh', 'cinematic-40']);
    expect(markSeen([], 'nope')).toEqual([]);
  });
});

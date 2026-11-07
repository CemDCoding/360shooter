import { describe, expect, it } from 'vitest';
import { CHOREOS } from '../../src/config/choreo';
import { CHOREO_RULES, FINISHER_RULES } from '../../src/config/finishers';
import { RIGS } from '../../src/config/rigs';
import { CHOREO_VARIANT_IDS, type ChoreoDef, type ChoreoVariantId } from '../../src/contracts';
import {
  countFlashes,
  dropsWhenReduced,
  realDurationMs,
  reduceChoreo,
  validateChoreo,
} from '../../src/logic/choreo';
import { buildFinisher } from '../../src/logic/finisher';

const ENTRIES = CHOREO_VARIANT_IDS.map((id) => [id] as const);

/** One level per variant: the moment of each boss and the six batch finales. */
const LEVEL_OF: Readonly<Record<ChoreoVariantId, number>> = {
  'moment-rootMonster': 0,
  'moment-forestGhost': 5,
  'moment-giantStone': 10,
  'moment-giantSandWorm': 21,
  'moment-guardianDog': 26,
  'moment-pharaoh': 31,
  'cinematic-4': 4,
  'cinematic-9': 9,
  'cinematic-20': 20,
  'cinematic-25': 25,
  'cinematic-30': 30,
  'cinematic-40': 40,
};

function defOf(id: ChoreoVariantId): ChoreoDef {
  const def = CHOREOS[id];
  if (!def) throw new Error(`no choreography ${id}`);
  return def;
}

describe('FINISHER_RULES and CHOREO_RULES (AP-157, AP-181, AP-191)', () => {
  it('keeps only the skip lock; the flash window lives in CHOREO_RULES only', () => {
    expect(FINISHER_RULES).toEqual({ skipLockMs: 400, skipFirstViewMs: 3000 });
    expect(CHOREO_RULES.flashMaxPerWindow).toBe(3);
    expect(CHOREO_RULES.flashWindowMs).toBe(1000);
  });
});

describe('all 12 choreographies: grid, flash and budget (AP-191, RS-06.2, PE-241)', () => {
  it('has exactly 12 variants and every one is registered', () => {
    expect(CHOREO_VARIANT_IDS).toHaveLength(12);
    expect(Object.keys(CHOREOS).sort()).toEqual([...CHOREO_VARIANT_IDS].sort());
    for (const id of CHOREO_VARIANT_IDS) {
      expect(CHOREOS[id], id).toBeDefined();
      expect(CHOREOS[id]?.variantId).toBe(id);
    }
  });

  it.each(ENTRIES)('%s passes validateChoreo (normal)', (id) => {
    expect(validateChoreo(defOf(id), RIGS)).toEqual([]);
  });

  it.each(ENTRIES)('%s passes validateChoreo (reduced)', (id) => {
    expect(validateChoreo(reduceChoreo(defOf(id)), RIGS)).toEqual([]);
  });

  it.each(ENTRIES)('%s has at most 3 flash events per second, normal and reduced', (id) => {
    const def = defOf(id);
    const reduced = reduceChoreo(def);
    expect(countFlashes(def)).toBeLessThanOrEqual(CHOREO_RULES.flashMaxPerWindow);
    expect(countFlashes(reduced)).toBeLessThanOrEqual(CHOREO_RULES.flashMaxPerWindow);
    expect(countFlashes(reduced)).toBeLessThanOrEqual(countFlashes(def));
  });

  it.each(ENTRIES)('%s: reducing removes every flash, impact, shake and hit-white event', (id) => {
    const reduced = reduceChoreo(defOf(id));
    for (const e of reduced.events) {
      expect(['flash', 'impact', 'shake', 'hitWhite']).not.toContain(e.kind);
      expect(dropsWhenReduced(e)).toBe(false);
    }
  });

  it.each(ENTRIES)('%s: the plan is the choreography with its real length', (id) => {
    for (const reduceEffects of [false, true]) {
      const plan = buildFinisher(LEVEL_OF[id], { reduceEffects, seen: [] });
      expect(plan.variantId).toBe(id);
      expect(plan.reduced).toBe(reduceEffects);
      expect(plan.realMs).toBe(realDurationMs(plan.choreo));
      expect(plan.totalMs).toBe(plan.realMs);
    }
  });
});

describe('data checks the validator does not make (review note AP-181, AP-191)', () => {
  it.each(ENTRIES)(
    '%s: flash events are flagged, keys are sorted, factors and copies are in range',
    (id) => {
      const def = defOf(id);
      for (const e of def.events) {
        if (e.kind === 'flash') expect(e.flash, `${id} flash at ${e.atMs}`).toBe(true);
        if (e.flash) expect(e.reduce, `${id} flash at ${e.atMs}`).not.toBe('keep');
        if (e.kind === 'timeScale') expect(e.factor).toBeGreaterThan(0);
        if (e.kind === 'afterimage') {
          expect(e.copies).toBeGreaterThanOrEqual(2);
          expect(e.copies).toBeLessThanOrEqual(CHOREO_RULES.maxAfterimagesPerPart);
        }
      }
      for (const t of def.tracks) {
        for (let i = 1; i < t.keys.length; i++) {
          expect(t.keys[i].atMs, `${id} ${t.target}.${t.property}`).toBeGreaterThanOrEqual(
            t.keys[i - 1].atMs,
          );
        }
      }
      for (const s of def.shots ?? []) expect(Number.isInteger(s.camera.zoom), id).toBe(true);
    },
  );
});

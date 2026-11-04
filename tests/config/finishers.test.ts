import { describe, expect, it } from 'vitest';
import { DEFAULT_FINISHER_SOURCE, buildFinisher, isFlashSafe } from '../../src/logic/finisher';
import { FINISHER_VARIANT_IDS, type FinisherBlock, type FinisherStep } from '../../src/contracts';
import {
  FINISHER_FINALES,
  FINISHER_NAMES,
  FINISHER_RULES,
  FINISHER_STAGES,
  type FinisherTemplate,
} from '../../src/config';

/** M10 plans without the choreography register. */
const M10 = { ...DEFAULT_FINISHER_SOURCE, choreos: undefined };

const STAGES = [1, 2, 3, 4, 5, 6] as const;
const FINALE_LEVELS = [4, 9, 20, 25, 30, 40];
const ALL: FinisherTemplate[] = [
  ...STAGES.map((s) => FINISHER_STAGES[s]),
  ...FINALE_LEVELS.map((l) => FINISHER_FINALES[l]),
];

const kinds = (steps: readonly FinisherStep[]): Set<FinisherBlock> =>
  new Set(steps.map((s) => s.block));

describe('FINISHER_RULES (AP-157, RS-04.4, RS-04.5)', () => {
  it('has the agreed start values', () => {
    expect(FINISHER_RULES.flashMaxPerWindow).toBe(3);
    expect(FINISHER_RULES.flashWindowMs).toBe(1000);
    expect(FINISHER_RULES.skipLockMs).toBe(400);
    expect(FINISHER_RULES.maxParticles).toBe(120);
    expect(FINISHER_RULES.reducedRemoves).toEqual(['impactFrame', 'flash', 'shake']);
    expect(FINISHER_RULES.flashBlocks).toEqual(['impactFrame', 'flash']);
  });
});

describe('finisher variants (AP-157, PE-197, PE-198)', () => {
  it('covers exactly the 12 variant ids', () => {
    expect(FINISHER_VARIANT_IDS).toHaveLength(12);
    expect(ALL.map((t) => t.variantId).sort()).toEqual([...FINISHER_VARIANT_IDS].sort());
  });

  it('each stage contains all block kinds of the previous stage', () => {
    for (let s = 2; s <= 6; s++) {
      const prev = kinds(FINISHER_STAGES[(s - 1) as 1].steps);
      const cur = kinds(FINISHER_STAGES[s as 2].steps);
      for (const k of prev) expect(cur.has(k)).toBe(true);
      if (s < 6) expect(cur.size).toBeGreaterThan(prev.size);
    }
  });

  it('keeps stage durations in the band of the brief H-39', () => {
    const want = { 1: 2000, 2: 2500, 3: 3000, 4: 3500, 5: 4000, 6: 4000 } as const;
    for (const s of STAGES) {
      expect(Math.abs(FINISHER_STAGES[s].totalMs - want[s])).toBeLessThanOrEqual(500);
    }
  });

  it('keeps finale durations in the band and level 40 in 10 to 12 s', () => {
    const want: Record<number, number> = { 4: 5000, 9: 6000, 20: 6000, 25: 7000, 30: 8000 };
    for (const l of Object.keys(want).map(Number)) {
      expect(Math.abs(FINISHER_FINALES[l].totalMs - want[l])).toBeLessThanOrEqual(500);
    }
    expect(FINISHER_FINALES[40].totalMs).toBe(10500);
    expect(FINISHER_FINALES[40].totalMs).toBeGreaterThanOrEqual(10000);
    expect(FINISHER_FINALES[40].totalMs).toBeLessThanOrEqual(12000);
  });

  it('stages show the hit image of their boss and use the stage background', () => {
    const bg = ['forest', 'night', 'elf', 'desert', 'pyramid', 'oasis'];
    for (const s of STAGES) {
      const steps = FINISHER_STAGES[s].steps;
      const hit = steps.find((x) => x.block === 'frames');
      expect(hit).toMatchObject({ texture: 'finisher-hit', frameCount: 1, firstFrame: s - 1 });
      expect(hit?.holdsMs?.[0]).toBe(hit?.durationMs);
      expect(steps.find((x) => x.block === 'title')?.text).toBe('BEZWUNGEN!');
      if (s >= 3)
        expect(steps.find((x) => x.block === 'bgColor')?.color).toBe(`finisher.bg-${bg[s - 1]}`);
      if (s >= 4) {
        expect(steps.find((x) => x.block === 'cutIn')).toMatchObject({
          texture: 'finisher-portrait',
          firstFrame: s - 1,
        });
      }
    }
    const pairs = FINISHER_STAGES[6].steps.filter((x) => x.block === 'impactFrame');
    expect(pairs).toHaveLength(2);
    expect(pairs[1].atMs - pairs[0].atMs).toBeGreaterThanOrEqual(400);
    expect(pairs.every((p) => p.durationMs === 200)).toBe(true);
  });

  it('finales follow the brief: sheets, holds, name and title (AP-159)', () => {
    const textures: Record<number, string[]> = {
      4: ['finisher-finale-4'],
      9: ['finisher-finale-9'],
      20: ['finisher-finale-20'],
      25: ['finisher-finale-25'],
      30: ['finisher-finale-30'],
      40: ['finisher-finale-40a', 'finisher-finale-40b'],
    };
    const stageOf: Record<number, number> = { 4: 1, 9: 2, 20: 3, 25: 4, 30: 5, 40: 6 };
    const sums: Record<number, number> = {
      4: 3800,
      9: 4600,
      20: 4600,
      25: 5450,
      30: 6350,
      40: 9300,
    };
    for (const l of FINALE_LEVELS) {
      const f = FINISHER_FINALES[l];
      expect(f.isFinale).toBe(true);
      expect(f.stage).toBe(stageOf[l]);
      const frames = f.steps.filter((s) => s.block === 'frames');
      expect(frames.map((s) => s.texture)).toEqual(textures[l]);
      let end = 600;
      for (const fr of frames) {
        expect(fr.atMs).toBe(end); // no gap between sheets
        expect(fr.holdsMs).toHaveLength(fr.frameCount ?? -1);
        expect(fr.reducedHoldsMs).toHaveLength(fr.frameCount ?? -1);
        expect(fr.durationMs).toBe(fr.holdsMs?.reduce((a, b) => a + b, 0));
        end += fr.durationMs;
      }
      expect(end - 600).toBe(sums[l]);
      const titles = f.steps.filter((s) => s.block === 'title');
      expect(titles.map((t) => t.titleKind)).toEqual(['name', 'title']);
      expect(titles[0].text).toBe(FINISHER_NAMES[l]);
      expect(titles[1].text).toBe('BEZWUNGEN!');
      expect(titles[0].atMs + titles[0].durationMs).toBeLessThanOrEqual(titles[1].atMs);
      expect(f.steps.find((s) => s.block === 'cutIn')).toMatchObject({ atMs: 0, durationMs: 600 });
    }
    expect(FINISHER_NAMES).toEqual({
      4: 'WURZELBRECHER',
      9: 'MONDSCHNITT',
      20: 'STERNENHAMMER',
      25: 'SONNENSPEER',
      30: 'GRABESLICHT',
      40: 'LETZTER STERN',
    });
  });

  it('level 40 has two sheets of 9 pictures with the impact pictures 8, 9 and 13', () => {
    const [a, b] = FINISHER_FINALES[40].steps.filter((s) => s.block === 'frames');
    expect(a.frameCount).toBe(9);
    expect(b.frameCount).toBe(9);
    expect(a.atMs + a.durationMs).toBe(b.atMs);
    const reduced = [...(a.reducedHoldsMs ?? []), ...(b.reducedHoldsMs ?? [])];
    expect(reduced.flatMap((h, i) => (h === 0 ? [i] : []))).toEqual([8, 9, 13]);
    expect(reduced[7]).toBe(600);
    expect(reduced[12]).toBe(700);
  });

  it('stage 6 uses every block kind', () => {
    expect(kinds(FINISHER_STAGES[6].steps).size).toBe(15);
    expect(FINISHER_STAGES[6].steps.length).toBeGreaterThan(FINISHER_STAGES[5].steps.length);
  });
});

describe('finisher step validity (AP-157)', () => {
  it('has sane timing, strength and token colours', () => {
    for (const t of ALL) {
      for (const s of t.steps) {
        expect(s.atMs).toBeGreaterThanOrEqual(0);
        expect(s.durationMs).toBeGreaterThan(0);
        expect(s.atMs + s.durationMs).toBeLessThanOrEqual(t.totalMs);
        if (s.strength !== undefined) {
          expect(s.strength).toBeGreaterThanOrEqual(0);
          expect(s.strength).toBeLessThanOrEqual(1);
        }
        if (s.color !== undefined) expect(s.color).toMatch(/^finisher\.[a-z0-9-]+$/);
        if (s.block === 'title') expect(s.text).toBeTruthy();
      }
    }
  });

  it('has at most 3 flash blocks in any 1 s window (simple check)', () => {
    const { flashBlocks, flashMaxPerWindow, flashWindowMs } = FINISHER_RULES;
    for (const t of ALL) {
      const flashes = t.steps.filter((s) => flashBlocks.includes(s.block));
      for (const a of flashes) {
        const n = flashes.filter((b) => b.atMs >= a.atMs && b.atMs < a.atMs + flashWindowMs).length;
        expect(n).toBeLessThanOrEqual(flashMaxPerWindow);
      }
    }
  });
});

describe('finisher plans from the brief H-39 (AP-159)', () => {
  const levels = [0, 4, 5, 9, 10, 20, 21, 25, 26, 30, 31, 40];

  it('every plan is flash-safe with and without reduceEffects', () => {
    for (const l of levels) {
      for (const reduceEffects of [false, true]) {
        const plan = buildFinisher(l, { reduceEffects, seen: [] });
        expect(isFlashSafe(plan)).toBe(true);
      }
    }
  });

  it('finale plans keep their bands and reduced plans stay shorter or equal in blocks', () => {
    const want: Record<number, number> = {
      4: 5000,
      9: 6000,
      20: 6000,
      25: 7000,
      30: 8000,
      40: 10500,
    };
    for (const l of FINALE_LEVELS) {
      const plan = buildFinisher(l, { reduceEffects: false, seen: [] }, M10);
      expect(Math.abs(plan.totalMs - want[l])).toBeLessThanOrEqual(500);
      const red = buildFinisher(l, { reduceEffects: true, seen: [] }, M10);
      const names = red.steps.filter((s) => s.block === 'title').map((s) => s.titleKind);
      expect(names).toEqual(['name', 'title']);
      expect(red.steps.some((s) => ['impactFrame', 'flash', 'shake'].includes(s.block))).toBe(
        false,
      );
    }
  });
});

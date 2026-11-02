import { describe, expect, it } from 'vitest';
import { FINISHER_VARIANT_IDS, type FinisherBlock, type FinisherStep } from '../../src/contracts';
import {
  FINISHER_FINALES,
  FINISHER_RULES,
  FINISHER_STAGES,
  type FinisherTemplate,
} from '../../src/config';

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
      expect(cur.size).toBeGreaterThan(prev.size);
    }
  });

  it('keeps stage durations in the band of the short form', () => {
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
    expect(FINISHER_FINALES[40].totalMs).toBeGreaterThanOrEqual(10000);
    expect(FINISHER_FINALES[40].totalMs).toBeLessThanOrEqual(12000);
  });

  it('finales use the stage of their batch, a frames placeholder and the finale title', () => {
    const stageOf: Record<number, number> = { 4: 1, 9: 2, 20: 3, 25: 4, 30: 5, 40: 6 };
    for (const l of FINALE_LEVELS) {
      const f = FINISHER_FINALES[l];
      expect(f.isFinale).toBe(true);
      expect(f.stage).toBe(stageOf[l]);
      const frames = f.steps.filter((s) => s.block === 'frames');
      expect(frames).toHaveLength(1);
      expect(frames[0].frameCount).toBe(0);
      expect(frames[0].texture).toMatch(/^finisher-final-[A-Za-z]+$/);
      expect(f.steps.find((s) => s.block === 'title')?.text).toBe('ENDE!');
      // All block kinds of the stage stay in the finale.
      for (const k of kinds(FINISHER_STAGES[f.stage].steps))
        expect(kinds(f.steps).has(k)).toBe(true);
    }
    expect(
      new Set(
        FINALE_LEVELS.map(
          (l) => FINISHER_FINALES[l].steps.find((s) => s.block === 'frames')?.texture,
        ),
      ).size,
    ).toBe(6);
  });

  it('stage 6 uses every block kind except frames', () => {
    expect(kinds(FINISHER_STAGES[6].steps).size).toBe(14);
    expect(kinds(FINISHER_STAGES[6].steps).has('frames')).toBe(false);
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

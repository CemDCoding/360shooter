import { describe, expect, it, vi } from 'vitest';
import type { ParryGroup } from '../../../src/entities/bosses/hazards';
import type { ParryCircleState } from '../../../src/logic/parry';

// ParryOverlay.ts imports Phaser for the drawing class only; the display state is pure.
vi.mock('phaser', () => ({ default: {} }));

const { ParryViewState, openCircleLook, WORD_COLOR, wordScale } =
  await import('../../../src/entities/ParryOverlay');

describe('word size (brief H-37: Funk 2x, pop only as a short pulse)', () => {
  it('"LOS!" (no pop) stays 2x with and without reduced motion', () => {
    expect(wordScale(null, false)).toBe(2);
    expect(wordScale(null, true)).toBe(2);
  });

  it('graded words pop one step for motion.fast, then 2x; reduced motion never pops', () => {
    expect(wordScale(0, false)).toBe(3);
    expect(wordScale(80, false)).toBe(2);
    expect(wordScale(400, false)).toBe(2);
    expect(wordScale(0, true)).toBe(2);
  });
});

// AP-151: M9 words, motif of "PARRY!" and the sound cues of the overlay (never the only information).
const c = (over: Partial<ParryCircleState>): ParryCircleState => ({
  index: 0,
  angleDeg: 0,
  hitAtMs: 1000,
  result: null,
  ...over,
});
const group = (
  id: number,
  attackId: string,
  circles: ParryCircleState[],
  elapsedMs: number,
): ParryGroup => ({
  id,
  attackId,
  circles,
  elapsedMs,
});

describe('ParryViewState M9', () => {
  it('pebble cue when a sequence circle lights up, beat cue on every beat, once each', () => {
    const s = new ParryViewState();
    const circles = [
      c({ index: 0, kind: 'sequence', order: 1, previewAtMs: 100 }),
      c({ index: 1, kind: 'beat', hitAtMs: 300 }),
    ];
    s.sync([group(1, 'orbFan', circles, 50)]);
    expect(s.takeCues()).toEqual([]);
    s.sync([group(1, 'orbFan', circles, 150)]);
    expect(s.takeCues()).toEqual(['pebble']);
    s.sync([group(1, 'orbFan', circles, 400)]);
    expect(s.takeCues()).toEqual(['beat']);
    s.sync([group(1, 'orbFan', circles, 500)]);
    expect(s.takeCues()).toEqual([]);
  });

  it('words: touched decoy "TRUG!", hold too early "ZU FRÜH", avoided decoy silent', () => {
    const s = new ParryViewState();
    const circles = [
      c({ index: 0, kind: 'decoy', result: 'miss', tapped: true }),
      c({ index: 1, kind: 'hold', result: 'miss' }),
      c({ index: 2, kind: 'decoy', result: 'perfect' }),
    ];
    s.sync([{ ...group(2, 'decoys', circles, 900), notes: { 1: 'early' } }]);
    const views = [...s.entries.values()][0].views;
    expect(views.map((v) => v.word)).toEqual(['TRUG!', 'ZU FRÜH', null]);
    expect(WORD_COLOR['TRUG!']).toBe('game.parry-miss');
    expect(WORD_COLOR['LOS!']).toBe('hud.text');
  });

  it('PARRY! carries the motif of its attack; attacks without one show none', () => {
    const s = new ParryViewState();
    const hit = [c({ result: 'perfect' })];
    s.finish({
      group: group(3, 'roll', hit, 1000),
      blocked: true,
      damageFactor: 0,
      perfectCount: 1,
    });
    s.finish({
      group: group(4, 'burrow', hit, 1000),
      blocked: true,
      damageFactor: 0,
      perfectCount: 1,
    });
    expect(s.burstMotifs).toEqual([3, null]);
    s.advance(10_000);
    expect(s.bursts).toEqual([]);
    expect(s.burstMotifs).toEqual([]);
  });

  it('a dragged circle keeps its latest state; decoys have no closing ring', () => {
    const s = new ParryViewState();
    const drag = c({ kind: 'drag', target: { angleDeg: 90, distancePx: 56 } });
    s.sync([{ ...group(5, 'quarrel', [drag], 600), drags: { 0: { x: 1, y: 2 } } }]);
    const e = [...s.entries.values()][0];
    expect(e.drags[0]).toEqual({ x: 1, y: 2 });
    const decoy = {
      index: 0,
      angleDeg: 0,
      hitAtMs: 1000,
      grade: null,
      shownMs: 0,
      circle: c({ kind: 'decoy' }),
    };
    expect(openCircleLook(decoy, 600)).toEqual({ shown: true, ringScale: null });
  });

  it('a sequence circle shows from its light-up, before the approach of its ring', () => {
    const seq = c({ kind: 'sequence', order: 2, previewAtMs: 100, hitAtMs: 2000 });
    const v = { index: 0, angleDeg: 0, hitAtMs: 2000, grade: null, shownMs: 0, circle: seq };
    expect(openCircleLook(v, 50).shown).toBe(false);
    expect(openCircleLook(v, 150)).toEqual({ shown: true, ringScale: null });
  });
});

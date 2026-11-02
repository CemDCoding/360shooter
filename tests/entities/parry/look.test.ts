import { describe, expect, it } from 'vitest';
import type { ParryCircleState } from '../../../src/logic/parry';
import {
  BEAT_DOT,
  beatDotRects,
  beatsDone,
  bracketRects,
  decoyFade,
  flagShown,
  holdFilled,
  holdSegmentArc,
  KEYLINE,
  keylineOffsets,
  keylineRect,
  linkDots,
  ringKeylines,
  resultWord,
  sleepRise,
  symbolLit,
  targetBoxR,
} from '../../../src/entities/parry/look';

// AP-151: pure look rules of the M9 building blocks (brief H-37).
const c = (over: Partial<ParryCircleState>): ParryCircleState => ({
  index: 0,
  angleDeg: 0,
  hitAtMs: 1000,
  result: null,
  ...over,
});

describe('result words (brief H-37 10a)', () => {
  it('decoy: touched "TRUG!", avoided silent', () => {
    expect(resultWord(c({ kind: 'decoy', result: 'miss', tapped: true }), [], undefined)).toBe(
      'TRUG!',
    );
    expect(resultWord(c({ kind: 'decoy', result: 'perfect' }), [], undefined)).toBeNull();
  });

  it('choice: wrong tap "FALSCH", right tap its grade, the rest of the round silent', () => {
    const right = c({
      index: 0,
      kind: 'choice',
      group: 1,
      correct: true,
      result: 'good',
      tapped: true,
    });
    const other = c({ index: 1, kind: 'choice', group: 1, result: 'good' });
    expect(resultWord(right, [right, other], undefined)).toBe('GUT');
    expect(resultWord(other, [right, other], undefined)).toBeNull();
    const wrong = c({ index: 1, kind: 'choice', group: 1, result: 'miss', tapped: true });
    expect(resultWord(wrong, [wrong], undefined)).toBe('FALSCH');
    const missed = c({ kind: 'choice', group: 2, correct: true, result: 'miss' });
    expect(resultWord(missed, [missed], undefined)).toBe('VERFEHLT');
  });

  it('notes: wrong order "FALSCH", hold released too early "ZU FRÜH"', () => {
    expect(resultWord(c({ kind: 'sequence', result: 'miss' }), [], 'wrong')).toBe('FALSCH');
    expect(resultWord(c({ kind: 'hold', result: 'miss' }), [], 'early')).toBe('ZU FRÜH');
    expect(resultWord(c({ kind: 'hold', result: 'perfect' }), [], 'early')).toBe('PERFEKT');
    expect(resultWord(c({ result: null }), [], undefined)).toBeNull();
  });
});

describe('hold ring', () => {
  const hold = c({
    kind: 'hold',
    hitAtMs: 1000,
    releaseAtMs: 1400,
    pressedAtMs: 1000,
    holding: true,
  });

  it('fills 8 steps linearly over the hold time', () => {
    expect(holdFilled(hold, 1000)).toBe(0);
    expect(holdFilled(hold, 1200)).toBe(4);
    expect(holdFilled(hold, 1400)).toBe(8);
    expect(holdFilled(hold, 2000)).toBe(8);
    expect(holdFilled(c({ kind: 'hold' }), 1200)).toBeNull();
    expect(holdFilled(c({ kind: 'tap', pressedAtMs: 1000 }), 1200)).toBeNull();
  });

  it('steps run clockwise from the top with a gap', () => {
    const first = holdSegmentArc(0);
    expect(first.start).toBeGreaterThan(-Math.PI / 2);
    expect(first.end).toBeLessThan(-Math.PI / 2 + Math.PI / 4);
    expect(holdSegmentArc(1).start).toBeGreaterThan(first.end);
  });
});

describe('drag target', () => {
  it('box half size 24, 20 after the selection (reduced: at once)', () => {
    expect(targetBoxR(null, false)).toBe(24);
    expect(targetBoxR(40, false)).toBe(22);
    expect(targetBoxR(80, false)).toBe(20);
    expect(targetBoxR(0, true)).toBe(20);
  });

  it('eight bracket arms in the corners of the box', () => {
    const r = bracketRects(100, 100, 24);
    expect(r).toHaveLength(8);
    expect(r[0]).toEqual([76, 76, 6, 2]);
    expect(r[7]).toEqual([122, 118, 2, 6]);
  });

  it('dotted link from circle edge + 3 to box edge + 2, every 4 px', () => {
    const dots = linkDots({ x: 0, y: 0 }, { x: 100, y: 0 }, 24);
    expect(dots[0]).toEqual({ x: 23, y: 0 });
    expect(dots[dots.length - 1]).toEqual({ x: 74, y: 0 });
    expect(linkDots({ x: 0, y: 0 }, { x: 30, y: 0 }, 24)).toEqual([]);
    expect(linkDots({ x: 0, y: 0 }, { x: 0, y: 0 }, 24)).toEqual([]);
  });
});

describe('beat, sequence, decoy, sleep', () => {
  it('beat dots fill from each beat on and sit centred 24 below the astronaut', () => {
    const beats = [c({ kind: 'beat', hitAtMs: 400 }), c({ kind: 'beat', hitAtMs: 800 })];
    expect(beatsDone(beats, 500)).toBe(1);
    const rects = beatDotRects({ x: 100, y: 100 }, 3);
    expect(rects.map((r) => r.x)).toEqual([90, 98, 106]);
    expect(rects[0].y).toBe(100 + 24 - BEAT_DOT / 2);
  });

  it('sequence flag from the light-up until graded; symbol lit for previewStepMs', () => {
    const s = c({ kind: 'sequence', order: 1, previewAtMs: 200 });
    expect(flagShown(s, 100)).toBe(false);
    expect(flagShown(s, 200)).toBe(true);
    expect(flagShown({ ...s, result: 'good' }, 300)).toBe(false);
    expect(symbolLit(s, 250)).toBe(true);
    expect(symbolLit(s, 500)).toBe(false);
  });

  it('avoided decoy fades over motion.base; the z rises 6 px; reduced motion still', () => {
    expect(decoyFade(0, false)).toBe(1);
    expect(decoyFade(150, false)).toBe(0);
    expect(decoyFade(0, true)).toBe(0);
    expect(sleepRise(400, false)).toBe(6);
    expect(sleepRise(400, true)).toBe(0);
  });
});

describe('keylines (AP-173, brief H-41 3a)', () => {
  it('1 px ink directly outside and inside a 2 px ring: ink, phosphor, ink', () => {
    expect(KEYLINE).toBe(1);
    // Circle: edge 18-20 px, ink 20-21 and 17-18.
    expect(ringKeylines(20, 2)).toEqual({ outer: 20.5, inner: 17.5 });
    // Approach ring at scale 1.5: edge 28-30.
    expect(ringKeylines(30, 2)).toEqual({ outer: 30.5, inner: 27.5 });
  });

  it('bracket bars get an ink rectangle 1 px larger on every side', () => {
    const bars = bracketRects(100, 100, 24, undefined, 2);
    for (const r of bars) {
      const [x, y, w, h] = keylineRect(r);
      expect([x, y, w, h]).toEqual([r[0] - 1, r[1] - 1, r[2] + 2, r[3] + 2]);
    }
  });

  it('sprite edges get four ink copies shifted by 1 px', () => {
    expect(keylineOffsets()).toEqual([
      [-1, 0],
      [1, 0],
      [0, -1],
      [0, 1],
    ]);
  });
});

import { describe, expect, it, vi } from 'vitest';
import { PARRY_RULES } from '../../src/config/parry';
import type { ParryPatternDef } from '../../src/contracts';
import { ParryTracker } from '../../src/entities/bosses/hazards';
import { circlePosition, targetPosition, type ParryCircleState } from '../../src/logic/parry';

// ParryOverlay.ts imports Phaser for the drawing class only; isDragSelected is pure.
vi.mock('phaser', () => ({ default: {} }));
const { isDragSelected } = await import('../../src/entities/ParryOverlay');

// AP-151: the M9 building blocks in the boss tracker (pointer by pointer, play time, words noted for display).
const center = { x: 320, y: 180 };
const TELEGRAPH = 3000;
const rng = () => {
  let i = 0;
  const seq = [0.1, 0.5, 0.9, 0.3, 0.7];
  return { next: () => seq[i++ % seq.length] };
};
const source = (pattern: ParryPatternDef) => ({
  parryCircles: pattern.steps.length,
  parryPattern: pattern,
});
const open = (pattern: ParryPatternDef, easy = false) => {
  const t = new ParryTracker();
  t.open('test', source(pattern), TELEGRAPH, rng(), easy);
  return t;
};
const runTo = (t: ParryTracker, ms: number) => t.tick(ms - t.groups[0].elapsedMs);
const circle = (t: ParryTracker, i: number) => t.groups[0].circles[i];
const at = (c: ParryCircleState) => circlePosition(c, center, PARRY_RULES);

describe('ParryTracker hold (AP-151)', () => {
  const pattern: ParryPatternDef = { steps: [{ kind: 'hold', symbol: 'rose', holdMs: 450 }] };

  it('press and hold to the release moment: graded on release, pointer let go', () => {
    const t = open(pattern);
    const c = circle(t, 0);
    runTo(t, c.hitAtMs);
    expect(t.press(at(c), center, 1)?.grade).toBeNull();
    expect(t.holds(1)).toBe(true);
    runTo(t, c.releaseAtMs ?? 0);
    t.release(1, at(c), center);
    expect(circle(t, 0).result).toBe('perfect');
    expect(t.holds(1)).toBe(false);
  });

  it('early release waits for a second tap ("ZU FRÜH" noted until the second tap comes in time)', () => {
    const t = open(pattern);
    const c = circle(t, 0);
    runTo(t, c.hitAtMs);
    t.press(at(c), center, 1);
    runTo(t, c.hitAtMs + 50);
    t.release(1, at(c), center);
    expect(circle(t, 0).result).toBeNull();
    expect(t.groups[0].notes?.[0]).toBe('early');
    runTo(t, c.releaseAtMs ?? 0);
    expect(t.press(at(c), center)?.grade).toBe('perfect');
    expect(t.groups[0].notes?.[0]).toBeUndefined();
  });

  it('a second tap long before the release moment is a miss marked too early', () => {
    const t = open(pattern);
    const c = circle(t, 0);
    runTo(t, c.hitAtMs);
    t.press(at(c), center);
    runTo(t, c.hitAtMs + 10);
    expect(t.press(at(c), center)?.grade).toBe('miss');
    expect(t.groups[0].notes?.[0]).toBe('early');
  });

  it('cancel (pointer went up in the pause) lets go without a grade', () => {
    const t = open(pattern);
    const c = circle(t, 0);
    runTo(t, c.hitAtMs);
    t.press(at(c), center, 3);
    t.cancel(3);
    expect(t.holds(3)).toBe(false);
    expect(circle(t, 0).result).toBeNull();
  });
});

describe('ParryTracker decoy (AP-151)', () => {
  const pattern: ParryPatternDef = {
    steps: [
      { kind: 'tap', symbol: 'ghost' },
      { kind: 'decoy', symbol: 'mist' },
    ],
  };
  const decoyIndex = (t: ParryTracker) => t.groups[0].circles.findIndex((c) => c.kind === 'decoy');
  const real = (t: ParryTracker) => t.groups[0].circles.find((c) => c.kind !== 'decoy');

  it('an untouched decoy is avoided: blocked if the real circle was hit', () => {
    const t = open(pattern);
    const r = real(t);
    if (!r) throw new Error('no real circle');
    runTo(t, r.hitAtMs);
    t.press(at(r), center);
    runTo(t, TELEGRAPH);
    const out = t.resolve('test');
    expect(out?.blocked).toBe(true);
    expect(out?.group.circles.find((c) => c.kind === 'decoy')?.result).toBe('perfect');
  });

  it('a touched decoy counts as a miss and breaks the block', () => {
    const t = open(pattern);
    const d = circle(t, decoyIndex(t));
    runTo(t, d.hitAtMs);
    expect(t.press(at(d), center)?.grade).toBe('miss');
    expect(circle(t, decoyIndex(t)).tapped).toBe(true);
    runTo(t, TELEGRAPH);
    expect(t.resolve('test')?.blocked).toBe(false);
  });
});

describe('ParryTracker sequence (AP-151)', () => {
  const pattern: ParryPatternDef = {
    steps: [
      { kind: 'sequence', symbol: 'pebble' },
      { kind: 'sequence', symbol: 'pebble' },
    ],
  };

  it('a press out of order is noted as wrong', () => {
    const t = open(pattern);
    const first = t.groups[0].circles.find((c) => c.order === 1);
    const second = t.groups[0].circles.find((c) => c.order === 2);
    if (!first || !second) throw new Error('no sequence');
    expect(first.angleDeg).not.toBe(second.angleDeg);
    // While the first one is still open, the second one is already shown (it lit up in the announcement).
    runTo(t, first.hitAtMs);
    t.press(at(second), center);
    expect(t.groups[0].notes?.[second.index]).toBe('wrong');
  });
});

describe('ParryTracker choice (AP-151)', () => {
  const pattern: ParryPatternDef = {
    steps: [
      { kind: 'choice', symbol: 'legs4', correct: true },
      { kind: 'choice', symbol: 'legs2' },
    ],
  };

  it('the wrong circle is a miss noted as wrong; the round is decided', () => {
    const t = open(pattern);
    const wrong = t.groups[0].circles.find((c) => c.correct !== true);
    if (!wrong) throw new Error('no wrong circle');
    runTo(t, wrong.hitAtMs);
    expect(t.press(at(wrong), center)?.grade).toBe('miss');
    expect(t.groups[0].notes?.[wrong.index]).toBe('wrong');
    expect(t.groups[0].circles.every((c) => c.result !== null)).toBe(true);
  });
});

describe('ParryTracker drag (AP-151)', () => {
  const pattern: ParryPatternDef = { steps: [{ kind: 'drag', symbol: 'pebble' }] };

  it('drag to the target: the circle follows the pointer and is graded on release', () => {
    const t = open(pattern);
    const c = circle(t, 0);
    const target = targetPosition(c, center);
    if (!target) throw new Error('no target');
    runTo(t, c.hitAtMs);
    expect(t.press(at(c), center, 2)?.grade).toBeNull();
    expect(t.holds(2)).toBe(true);
    t.move(2, { x: 1, y: 2 });
    expect(t.groups[0].drags?.[0]).toEqual({ x: 1, y: 2 });
    t.release(2, target, center);
    expect(circle(t, 0).result).not.toBeNull();
    expect(t.groups[0].drags?.[0]).toBeUndefined();
  });

  it('grabbed from the press on (no flicker); a release without a move still selects', () => {
    const t = open(pattern);
    const c = circle(t, 0);
    runTo(t, c.hitAtMs);
    const p = at(c);
    t.press(p, center, 2);
    // Right after the press: grabbed at the press point, not "selected by tap".
    expect(t.groups[0].drags?.[0]).toEqual({ x: p.x, y: p.y });
    expect(isDragSelected(circle(t, 0), t.groups[0].drags)).toBe(false);
    t.move(2, { x: p.x + 3, y: p.y + 4 });
    expect(t.groups[0].drags?.[0]).toEqual({ x: p.x + 3, y: p.y + 4 });
    expect(isDragSelected(circle(t, 0), t.groups[0].drags)).toBe(false);
    // Second circle: release without any move = tap replacement (selected).
    const u = open(pattern);
    const d = circle(u, 0);
    runTo(u, d.hitAtMs);
    u.press(at(d), center, 5);
    u.release(5, at(d), center);
    expect(u.groups[0].drags?.[0]).toBeUndefined();
    expect(isDragSelected(circle(u, 0), u.groups[0].drags)).toBe(true);
  });

  it('a press without a pointer (M7 tap) selects at once', () => {
    const t = open(pattern);
    const c = circle(t, 0);
    runTo(t, c.hitAtMs);
    t.press(at(c), center);
    expect(isDragSelected(circle(t, 0), t.groups[0].drags)).toBe(true);
  });

  it('release on the circle selects it; a tap on the target then drops it (replacement)', () => {
    const t = open(pattern);
    const c = circle(t, 0);
    const target = targetPosition(c, center);
    if (!target) throw new Error('no target');
    runTo(t, c.hitAtMs);
    t.press(at(c), center, 2);
    t.release(2, at(c), center);
    expect(circle(t, 0).pressedAtMs).toBeDefined();
    expect(circle(t, 0).result).toBeNull();
    expect(t.press(target, center)?.grade).not.toBeNull();
  });

  it('release elsewhere puts the circle back, still open', () => {
    const t = open(pattern);
    const c = circle(t, 0);
    runTo(t, c.hitAtMs);
    t.press(at(c), center, 2);
    t.release(2, { x: 0, y: 0 }, center);
    expect(circle(t, 0).result).toBeNull();
    expect(circle(t, 0).pressedAtMs).toBeUndefined();
  });

  it('cancel drops the following position without a grade', () => {
    const t = open(pattern);
    const c = circle(t, 0);
    runTo(t, c.hitAtMs);
    t.press(at(c), center, 4);
    t.move(4, { x: 5, y: 5 });
    t.cancel(4);
    expect(t.groups[0].drags?.[0]).toBeUndefined();
    expect(circle(t, 0).result).toBeNull();
  });
});

describe('ParryTracker easy parry and anchors (AP-151)', () => {
  it('easy turns every task into a plain tap', () => {
    const t = open(
      {
        steps: [
          { kind: 'hold', symbol: 'rose', holdMs: 450 },
          { kind: 'drag', symbol: 'pebble' },
        ],
      },
      true,
    );
    expect(t.groups[0].circles.every((c) => (c.kind ?? 'tap') === 'tap')).toBe(true);
  });

  it('the anchor hook moves circles and drag targets; invalid anchors are ignored', () => {
    const t = new ParryTracker();
    t.open(
      'test',
      source({ steps: [{ kind: 'drag', symbol: 'rope' }, { kind: 'tap' }] }),
      TELEGRAPH,
      rng(),
      false,
      (c) =>
        c.kind === 'drag'
          ? { angleDeg: 90, target: { angleDeg: 180, distancePx: 40 } }
          : { angleDeg: Number.NaN },
    );
    const [drag, tap] = t.groups[0].circles;
    expect(drag.angleDeg).toBe(90);
    expect(drag.target).toEqual({ angleDeg: 180, distancePx: 40 });
    expect(Number.isFinite(tap.angleDeg)).toBe(true);
  });
});

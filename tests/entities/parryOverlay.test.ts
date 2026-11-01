import { describe, expect, it, vi } from 'vitest';
import type { ParryGroup, ParryOutcome } from '../../src/entities/bosses/hazards';

// ParryOverlay.ts imports Phaser for the drawing class only; the display state and geometry are pure.
vi.mock('phaser', () => ({ default: {} }));

const {
  BURST_END_R,
  BURST_START_R,
  CHECK_PIXELS,
  CROSS_PIXELS,
  GRADE_STYLE,
  PARRY_DEPTH,
  ParryViewState,
  STAR_PIXELS,
  WORD_OFFSET,
  burstRadius,
  circleCenter,
  clampBox,
  openCircleLook,
  wordCenter,
} = await import('../../src/entities/ParryOverlay');
const { THEME } = await import('../../src/config/theme');
const { PARRY_RULES } = await import('../../src/config/parry');

const FEEDBACK = THEME.motionMs['motion.parry-feedback'];
const BURST = THEME.motionMs['motion.parry-burst'];
const ARENA = { width: 640, height: 360 };
const PLAYER = { x: 320, y: 180 };

function group(id: number, results: (null | 'perfect' | 'good' | 'miss')[], elapsedMs = 0) {
  return {
    id,
    attackId: 'roll',
    elapsedMs,
    circles: results.map((result, index) => ({
      index,
      angleDeg: index * 120,
      hitAtMs: 500 + index * 300,
      result,
    })),
  } satisfies ParryGroup;
}

function outcome(g: ParryGroup, blocked: boolean): ParryOutcome {
  return { group: g, blocked, damageFactor: blocked ? 0 : 1, perfectCount: 0 };
}

describe('ParryOverlay geometry (brief H-33)', () => {
  it('places the circle 56 px from the astronaut in its direction', () => {
    const c = circleCenter(PLAYER, 0);
    expect(c).toEqual({ x: PLAYER.x + PARRY_RULES.distanceFromPlayerPx, y: PLAYER.y });
    expect(PARRY_RULES.distanceFromPlayerPx).toBe(THEME.sizePx['size.parry-distance']);
  });

  it('puts the word 34 px further out, away from the astronaut', () => {
    const p = wordCenter(PLAYER, 90, { w: 40, h: 22 }, ARENA);
    expect(p.x).toBeCloseTo(PLAYER.x);
    expect(p.y).toBeCloseTo(PLAYER.y + PARRY_RULES.distanceFromPlayerPx + WORD_OFFSET);
  });

  it('keeps the word inside the arena', () => {
    const size = { w: 60, h: 22 };
    const p = wordCenter({ x: 30, y: 20 }, 225, size, ARENA);
    expect(p.x - size.w / 2).toBeGreaterThanOrEqual(0);
    expect(p.y - size.h / 2).toBeGreaterThanOrEqual(0);
    const q = clampBox({ x: 700, y: 400 }, size, ARENA);
    expect(q.x + size.w / 2).toBeLessThanOrEqual(ARENA.width);
    expect(q.y + size.h / 2).toBeLessThanOrEqual(ARENA.height);
  });

  it('grows the shield ring from 20 to 40, reduced motion keeps 40', () => {
    expect(BURST_START_R).toBe(THEME.sizePx['size.parry-radius']);
    expect(BURST_END_R).toBe(2 * THEME.sizePx['size.parry-radius']);
    expect(burstRadius(0, false)).toBe(20);
    expect(burstRadius(BURST / 2, false)).toBe(30);
    expect(burstRadius(BURST, false)).toBe(40);
    expect(burstRadius(0, true)).toBe(40);
  });

  it('shows a circle only from hitAtMs - approach on; the ring shrinks to the edge at the hit', () => {
    const v = { index: 0, angleDeg: 0, hitAtMs: 1000, grade: null, shownMs: 0 };
    expect(openCircleLook(v, 199).shown).toBe(false);
    expect(openCircleLook(v, 200)).toEqual({ shown: true, ringScale: PARRY_RULES.ringStartScale });
    expect(openCircleLook(v, 1000)).toEqual({ shown: true, ringScale: 1 });
    // After the hit the circle stays (still gradable within goodWindowMs), the ring is gone.
    expect(openCircleLook(v, 1100)).toEqual({ shown: true, ringScale: null });
  });

  it('uses word and shape per grade, never colour alone, and no red warning colour', () => {
    expect(GRADE_STYLE.perfect.word).toBe('PERFEKT');
    expect(GRADE_STYLE.good.word).toBe('GUT');
    expect(GRADE_STYLE.miss.word).toBe('VERFEHLT');
    for (const s of Object.values(GRADE_STYLE))
      expect(s.color.startsWith('game.parry-')).toBe(true);
    for (const rows of [CHECK_PIXELS, CROSS_PIXELS]) {
      expect(rows).toHaveLength(7);
      for (const r of rows) expect(r).toHaveLength(7);
    }
    expect(STAR_PIXELS).toHaveLength(8);
    expect(THEME.colors['game.parry-circle'].num).not.toBe(THEME.colors['red.300'].num);
  });

  it('lies over boss projectiles and the player', () => {
    expect(PARRY_DEPTH).toBeGreaterThan(10);
  });
});

describe('ParryViewState (feedback timing)', () => {
  it('a graded circle shows its word for motion.parry-feedback, then circle and word vanish', () => {
    const s = new ParryViewState();
    s.sync([group(1, [null, null])]);
    s.sync([group(1, ['good', null])]);
    const e = s.entries.get(1);
    expect(e?.views[0].grade).toBe('good');
    s.advance(FEEDBACK - 1);
    expect(s.entries.get(1)?.views).toHaveLength(2);
    s.advance(1);
    expect(s.entries.get(1)?.views.map((v) => v.index)).toEqual([1]);
  });

  it('a group that vanished without an impact (boss died) disappears at once', () => {
    const s = new ParryViewState();
    s.sync([group(1, ['perfect', null])]);
    s.sync([]);
    expect(s.isEmpty).toBe(true);
  });

  it('at the impact open circles become "missed"; blocked starts PARRY! for motion.parry-burst', () => {
    const s = new ParryViewState();
    const g = group(2, ['perfect', 'good']);
    s.sync([g]);
    s.finish(outcome(g, true));
    s.sync([]); // the boss no longer lists the group: the feedback runs on
    expect(s.bursts).toEqual([0]);
    s.advance(FEEDBACK);
    expect(s.entries.size).toBe(0);
    expect(s.bursts).toHaveLength(1);
    s.advance(BURST - FEEDBACK);
    expect(s.isEmpty).toBe(true);

    const m = group(3, ['good', null]);
    s.sync([m]);
    s.finish(
      outcome(
        { ...m, circles: m.circles.map((c) => ({ ...c, result: c.result ?? 'miss' })) },
        false,
      ),
    );
    expect(s.entries.get(3)?.views.map((v) => v.grade)).toEqual(['good', 'miss']);
    expect(s.bursts).toHaveLength(0);
  });

  it('keeps two overlapping groups apart and clear() removes everything', () => {
    const s = new ParryViewState();
    s.sync([group(4, [null]), group(5, [null, null])]);
    expect([...s.entries.keys()]).toEqual([4, 5]);
    s.finish(outcome(group(4, ['perfect']), true));
    s.clear();
    expect(s.isEmpty).toBe(true);
  });

  it('stands still without play time (pause)', () => {
    const s = new ParryViewState();
    s.sync([group(6, ['miss'])]);
    s.advance(0);
    s.advance(Number.NaN);
    expect(s.entries.get(6)?.views[0].shownMs).toBe(0);
  });
});

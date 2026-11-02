import { describe, expect, it } from 'vitest';
import { PARRY_FOCUS } from '../../src/config/parry';
import { OPACITY, THEME } from '../../src/config/theme';
import {
  EFFECT_RANK,
  FOCUS_DIM_DEPTH,
  FocusFade,
  FocusSwitch,
  GROUND_RANK,
  LOW_RANK,
  MIN_SWITCH_MS,
  allowsNewParticle,
  createFocusView,
  dimAlpha,
  isNeutral,
  lowAlphaAt,
  rankAlpha,
  type EffectRank,
} from '../../src/logic/effectRank';

// AP-173 (brief H-41 "Effekt-Rangfolge", "Fokus-Ablauf"): pure ranking, opacity and switching of the focus.
const NEAR = THEME.sizePx['size.focus-near'];

describe('PARRY_FOCUS refers to the design tokens only', () => {
  it('takes every value from the tokens', () => {
    expect(PARRY_FOCUS.nearPx).toBe(110);
    expect(PARRY_FOCUS.inMs).toBe(THEME.motionMs['motion.focus-in']);
    expect(PARRY_FOCUS.outMs).toBe(THEME.motionMs['motion.focus-out']);
    expect(PARRY_FOCUS.holdMs).toBe(THEME.motionMs['motion.focus-hold']);
    expect(PARRY_FOCUS.holdMs).toBe(600);
    expect(PARRY_FOCUS.inMs).toBeLessThanOrEqual(120);
    expect(PARRY_FOCUS.outMs).toBeLessThanOrEqual(120);
    expect(PARRY_FOCUS.steps).toBe(3);
    expect(THEME.motionEasing['motion.pixel']).toBe(`steps(${PARRY_FOCUS.steps})`);
    expect(PARRY_FOCUS.dim).toBe(OPACITY['focus-dim']);
    expect(PARRY_FOCUS.dimColor).toBe('game.focus-dim');
    expect(PARRY_FOCUS.lowNear).toBe(OPACITY['focus-low-near']);
    expect(PARRY_FOCUS.lowFar).toBe(OPACITY['focus-low-far']);
    expect(PARRY_FOCUS.lowReduced).toBe(OPACITY['focus-low-reduced']);
  });
});

describe('effect ranks (brief H-41 table)', () => {
  it('sorts every kind into its rank', () => {
    const byRank = (r: EffectRank) =>
      Object.entries(EFFECT_RANK)
        .filter(([, v]) => v === r)
        .map(([k]) => k)
        .sort();
    expect(byRank(0)).toEqual(
      [
        'hintBoard',
        'hud',
        'marker',
        'parryCircle',
        'parryFeedback',
        'parryLabel',
        'parryRing',
      ].sort(),
    );
    expect(byRank(1)).toEqual(['bossAttack', 'enemyShot', 'telegraph']);
    expect(byRank(2)).toEqual(['gearBody', 'player']);
    expect(byRank(3)).toEqual(['boss', 'enemy', 'item']);
    expect(byRank(4)).toEqual(
      ['coin', 'fireRing', 'gearRing', 'laser', 'particle', 'pet', 'petAura', 'petShot'].sort(),
    );
    expect(byRank(5)).toEqual(['arenaDeco', 'ground']);
    expect(LOW_RANK).toBe(4);
    expect(GROUND_RANK).toBe(5);
  });

  it('ranks 0 to 3 and 5 stay at 100 % in and out of focus, with and without reduced effects', () => {
    for (const rank of [0, 1, 2, 3, 5] as const) {
      for (const level of [0, 0.5, 1]) {
        for (const reduce of [false, true]) {
          expect(rankAlpha(rank, 0, level, reduce)).toBe(1);
          expect(rankAlpha(rank, 500, level, reduce)).toBe(1);
        }
      }
    }
  });

  it('rank 4 in focus: 40 % up to focus-near, 70 % beyond (tokens)', () => {
    expect(rankAlpha(4, 0, 1, false)).toBe(OPACITY['focus-low-near']);
    expect(rankAlpha(4, NEAR, 1, false)).toBe(0.4);
    expect(rankAlpha(4, NEAR + 1, 1, false)).toBe(OPACITY['focus-low-far']);
    expect(rankAlpha(4, 400, 1, false)).toBe(0.7);
  });

  it('rank 4 without focus is 100 %, in between it follows the stepped level', () => {
    expect(rankAlpha(4, 0, 0, false)).toBe(1);
    expect(rankAlpha(4, 0, 1 / 3, false)).toBeCloseTo(0.8);
    expect(rankAlpha(4, 400, 2 / 3, false)).toBeCloseTo(0.8);
  });

  it('"EFFEKTE REDUZIEREN": rank 4 at 25 % everywhere, with or without focus', () => {
    for (const level of [0, 1 / 3, 1])
      for (const d of [0, NEAR, 400])
        expect(rankAlpha(4, d, level, true)).toBe(OPACITY['focus-low-reduced']);
    expect(OPACITY['focus-low-reduced']).toBe(0.25);
  });

  it('the ink layer has 35 % at full focus and none without', () => {
    expect(dimAlpha(1)).toBe(OPACITY['focus-dim']);
    expect(dimAlpha(1)).toBe(0.35);
    expect(dimAlpha(0)).toBe(0);
    expect(dimAlpha(2)).toBe(0.35);
    expect(dimAlpha(Number.NaN)).toBe(0);
  });

  it('the ink layer lies right above the floor (-100) and below every other object', () => {
    const MAP_FLOOR_DEPTH = -100; // MapBackground.ts: DEPTH
    const PHARAOH_STORM_DEPTH = -50; // lowest boss attack (Pharaoh.ts: STORM_DEPTH)
    const CAPYBARA_AURA_DEPTH = -1; // lowest pet effect (Capybara.ts: AURA_DEPTH)
    expect(FOCUS_DIM_DEPTH).toBeGreaterThan(MAP_FLOOR_DEPTH);
    expect(FOCUS_DIM_DEPTH).toBeLessThan(PHARAOH_STORM_DEPTH);
    expect(FOCUS_DIM_DEPTH).toBeLessThan(CAPYBARA_AURA_DEPTH);
  });

  it('lowAlphaAt measures the distance to the astronaut; no new particles near her in focus', () => {
    const v = createFocusView();
    v.x = 100;
    v.y = 100;
    expect(isNeutral(v)).toBe(true);
    expect(lowAlphaAt(v, 300, 100)).toBe(1);
    expect(allowsNewParticle(v, 100, 100)).toBe(true);
    v.level = 1;
    expect(isNeutral(v)).toBe(false);
    expect(lowAlphaAt(v, 100 + NEAR, 100)).toBe(0.4);
    expect(lowAlphaAt(v, 100 + NEAR + 1, 100)).toBe(0.7);
    expect(allowsNewParticle(v, 150, 100)).toBe(false);
    expect(allowsNewParticle(v, 100 + NEAR + 1, 100)).toBe(true);
    v.level = 0;
    v.reduce = true;
    expect(isNeutral(v)).toBe(false);
    expect(lowAlphaAt(v, 100, 100)).toBe(0.25);
  });
});

describe('FocusFade (motion.focus-in/-out, 3 steps)', () => {
  it('reaches full focus in 120 ms in exactly 3 steps, and back', () => {
    const f = new FocusFade();
    const seen: number[] = [];
    for (let t = 0; t < 200; t += 10) seen.push(f.step(true, 10, false));
    expect([...new Set(seen)]).toEqual([0, 1 / 3, 2 / 3, 1]);
    expect(seen.indexOf(1) * 10 + 10).toBeLessThanOrEqual(PARRY_FOCUS.inMs);
    const out: number[] = [];
    for (let t = 0; t < 200; t += 10) out.push(f.step(false, 10, false));
    expect([...new Set(out)]).toEqual([1, 2 / 3, 1 / 3, 0]);
    expect(out.indexOf(0) * 10 + 10).toBeLessThanOrEqual(PARRY_FOCUS.outMs);
  });

  it('jumps at once with reduced motion', () => {
    const f = new FocusFade();
    expect(f.step(true, 16, true)).toBe(1);
    expect(f.step(false, 16, true)).toBe(0);
  });

  it('never jumps back when the direction changes in the middle', () => {
    const f = new FocusFade();
    f.step(true, 50, false);
    const mid = f.level;
    expect(mid).toBeCloseTo(1 / 3);
    expect(f.step(false, 1, false)).toBeLessThanOrEqual(mid);
    f.reset();
    expect(f.level).toBe(0);
  });
});

describe('FocusSwitch (focus-hold, at most one switch per second)', () => {
  it('is on while busy and stays on focus-hold after it', () => {
    const s = new FocusSwitch();
    expect(s.update(16, false)).toBe(false);
    expect(s.update(16, true)).toBe(true);
    for (let t = 0; t < 1200; t += 16) s.update(16, true);
    let t = 0;
    while (s.update(16, false)) t += 16;
    expect(t).toBeGreaterThanOrEqual(PARRY_FOCUS.holdMs - 16);
    expect(t).toBeLessThan(PARRY_FOCUS.holdMs + 16);
  });

  it('a circle that follows within focus-hold keeps the focus on (no switch)', () => {
    const s = new FocusSwitch();
    for (let t = 0; t < 1500; t += 16) s.update(16, true);
    for (let t = 0; t < 500; t += 16) expect(s.update(16, false)).toBe(true);
    for (let t = 0; t < 800; t += 16) expect(s.update(16, true)).toBe(true);
  });

  it('switches at most once per second for any busy pattern (photosensitivity)', () => {
    let seed = 7;
    const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
    const s = new FocusSwitch();
    let last = s.active;
    let lastSwitch = Number.NEGATIVE_INFINITY;
    let busy = false;
    for (let t = 0; t < 120_000; t += 16) {
      if (rnd() < 0.05) busy = !busy;
      const on = s.update(16, busy);
      if (on !== last) {
        expect(t - lastSwitch).toBeGreaterThanOrEqual(MIN_SWITCH_MS);
        lastSwitch = t;
        last = on;
      }
    }
    expect(MIN_SWITCH_MS).toBe(1000);
  });

  it('reset() turns it off at once, without the hold', () => {
    const s = new FocusSwitch();
    s.update(16, true);
    s.reset();
    expect(s.active).toBe(false);
    expect(s.update(16, false)).toBe(false);
  });
});

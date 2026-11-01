import { describe, expect, it } from 'vitest';
import { THEME } from '../../../src/config/theme';
import {
  ActionTimer,
  BEE_OFFSET_Y,
  BeeMind,
  CRACK_MS,
  dottedRing,
  EGG_FRAME_CRACKS,
  eggFrame,
  HATCH_MS,
  HatchSequence,
  PET_OFFSET_X,
  PET_OFFSET_Y,
  petAnchor,
  petChangedPayload,
  petGearKeyFor,
  SNOWBALL_MAX_MS,
  STING_REACH,
  steamPuffs,
  stepSnowball,
  stepTowards,
  type SnowballState,
} from '../../../src/entities/pets/petLogic';

const P = { x: 320, y: 180 };

describe('pet place beside the astronaut (brief H-35)', () => {
  it('uses the size tokens 22 / 8', () => {
    expect(PET_OFFSET_X).toBe(THEME.sizePx['size.pet-offset-x']);
    expect(PET_OFFSET_Y).toBe(THEME.sizePx['size.pet-offset-y']);
    expect(PET_OFFSET_X).toBe(22);
    expect(PET_OFFSET_Y).toBe(8);
  });

  it('sits on the side opposite the aim', () => {
    // Facing right (no mirroring): pet on the left; mirrored: on the right.
    expect(petAnchor(P, false, 'penguin')).toEqual({ x: 298, y: 188 });
    expect(petAnchor(P, true, 'capybara')).toEqual({ x: 342, y: 188 });
  });

  it('lifts the bee to -10 and spreads a second bee', () => {
    expect(petAnchor(P, false, 'bee')).toEqual({ x: 298, y: 180 + BEE_OFFSET_Y });
    const second = petAnchor(P, false, 'bee', 1);
    expect(second.x).toBeLessThan(298);
    expect(second).not.toEqual(petAnchor(P, false, 'bee'));
  });
});

describe('stepTowards', () => {
  it('moves by speed x time and never overshoots', () => {
    expect(stepTowards({ x: 0, y: 0 }, { x: 100, y: 0 }, 200, 100)).toEqual({ x: 20, y: 0 });
    expect(stepTowards({ x: 0, y: 0 }, { x: 5, y: 0 }, 200, 100)).toEqual({ x: 5, y: 0 });
    expect(stepTowards({ x: 0, y: 0 }, { x: 100, y: 0 }, 200, -5)).toEqual({ x: 0, y: 0 });
  });
});

describe('egg frames', () => {
  it('rests below 80 %, wobbles 1/2 at 4 fps from 80 %, cracks at 100 %', () => {
    expect(eggFrame(0, 0, false)).toBe(0);
    expect(eggFrame(0.79, 1000, false)).toBe(0);
    expect(eggFrame(0.8, 0, false)).toBe(1);
    expect(eggFrame(0.8, 250, false)).toBe(2);
    expect(eggFrame(0.9, 500, false)).toBe(1);
    expect(eggFrame(1, 0, false)).toBe(EGG_FRAME_CRACKS);
  });

  it('does not wobble with reduced motion, the cracks stay', () => {
    expect(eggFrame(0.95, 250, true)).toBe(0);
    expect(eggFrame(1, 250, true)).toBe(3);
    expect(eggFrame(NaN, 0, false)).toBe(0);
  });
});

describe('HatchSequence', () => {
  it('goes egg -> crack -> burst (motion.hatch) -> pet on play time', () => {
    expect(HATCH_MS).toBe(THEME.motionMs['motion.hatch']);
    const h = new HatchSequence();
    expect(h.tick(1000)).toBe('egg');
    h.start(false);
    expect(h.stage).toBe('crack');
    expect(h.tick(CRACK_MS - 1)).toBe('crack');
    expect(h.tick(1)).toBe('burst');
    expect(h.tick(HATCH_MS - 1)).toBe('burst');
    expect(h.tick(1)).toBe('pet');
    expect(h.tick(1000)).toBe('pet');
  });

  it('skips the picture with reduced motion and ignores a second start', () => {
    const h = new HatchSequence();
    h.start(true);
    expect(h.stage).toBe('pet');
    h.start(false);
    expect(h.stage).toBe('pet');
  });

  it('survives one long frame', () => {
    const h = new HatchSequence();
    h.start(false);
    expect(h.tick(CRACK_MS + HATCH_MS + 5)).toBe('pet');
  });
});

describe('ActionTimer', () => {
  it('acts at once with a target, then once per cooldown', () => {
    const t = new ActionTimer();
    expect(t.tick(16, 400, true)).toBe(true);
    expect(t.tick(200, 400, true)).toBe(false);
    expect(t.tick(200, 400, true)).toBe(true);
  });

  it('waits ready without a target', () => {
    const t = new ActionTimer();
    expect(t.tick(1000, 400, false)).toBe(false);
    expect(t.ready).toBe(true);
    expect(t.tick(16, 400, true)).toBe(true);
    expect(t.tick(16, 0, true)).toBe(false);
  });
});

describe('BeeMind', () => {
  const home = { x: 0, y: 0 };

  it('flies to the nearest enemy and stings when close, then waits for the cooldown', () => {
    const near = { x: 30, y: 0 };
    const far = { x: 200, y: 0 };
    const bee = new BeeMind<typeof near>(home);
    let s = bee.step(50, home, [far, near], 220, 400);
    expect(s.target).toBe(near);
    expect(s.stung).toBeNull();
    expect(s.x).toBeCloseTo(11);
    s = bee.step(100, home, [far, near], 220, 400);
    expect(Math.abs(near.x - s.x)).toBeLessThanOrEqual(STING_REACH);
    expect(s.stung).toBe(near);
    // Cooldown: the next sting waits 400 ms.
    s = bee.step(100, home, [near], 220, 400);
    expect(s.stung).toBeNull();
    s = bee.step(300, home, [near], 220, 400);
    expect(s.stung).toBe(near);
  });

  it('returns home without enemies and drops a dead target', () => {
    const e = { x: 50, y: 0 };
    const bee = new BeeMind<typeof e>(home);
    bee.step(100, home, [e], 220, 400);
    const s = bee.step(1000, home, [], 220, 400);
    expect(s.target).toBeNull();
    expect({ x: s.x, y: s.y }).toEqual(home);
  });

  it('avoids the first bee target when there is another enemy', () => {
    const a = { x: 10, y: 0 };
    const b = { x: 60, y: 0 };
    const bee = new BeeMind<typeof a>(home);
    expect(bee.step(16, home, [a, b], 220, 400, a).target).toBe(b);
    const solo = new BeeMind<typeof a>(home);
    expect(solo.step(16, home, [a], 220, 400, a).target).toBe(a);
  });
});

describe('stepSnowball', () => {
  const r = (e: { r: number }) => e.r;
  const ball = (): SnowballState => ({ x: 0, y: 0, tx: 0, ty: 0, ageMs: 0 });

  it('homes on the target and reports the hit', () => {
    const e = { x: 100, y: 0, r: 6 };
    const b = ball();
    expect(stepSnowball(b, e, [e], 100, 4, r)).toBeNull();
    expect(b.x).toBeGreaterThan(0);
    let res: unknown = null;
    for (let i = 0; i < 20 && res === null; i++) res = stepSnowball(b, e, [e], 50, 4, r);
    expect(res).toBe(e);
  });

  it('a bigger ball hits from further away', () => {
    // The ball flies away from the enemy (target point far left), so only the hit radius decides.
    const e = { x: 14, y: 0, r: 6 };
    const away = (): SnowballState => ({ x: 0, y: 0, tx: -500, ty: 0, ageMs: 0 });
    expect(stepSnowball(away(), null, [e], 0, 4, r)).toBeNull();
    expect(stepSnowball(away(), null, [e], 0, 4 * 2, r)).toBe(e);
  });

  it('vanishes after reaching the last point of a dead target, or when too old', () => {
    const b = { x: 0, y: 0, tx: 10, ty: 0, ageMs: 0 };
    expect(stepSnowball(b, null, [], 1000, 4, r)).toBe('gone');
    const old = { x: 0, y: 0, tx: 1000, ty: 0, ageMs: SNOWBALL_MAX_MS - 1 };
    expect(stepSnowball(old, null, [], 16, 4, r)).toBe('gone');
  });
});

describe('aura pictures', () => {
  it('places 4 steam puffs that rise and stand still with reduced motion', () => {
    const a = steamPuffs(4, 70, 0, false);
    const b = steamPuffs(4, 70, 400, false);
    expect(a).toHaveLength(4);
    expect(a.some((p, i) => p.dy !== b[i].dy)).toBe(true);
    expect(steamPuffs(4, 70, 0, true)).toEqual(steamPuffs(4, 70, 999, true));
    for (const p of a) expect(p.alphaFactor).toBeGreaterThanOrEqual(0);
  });

  it('draws the ring 2 on, 2 off at whole pixels and grows with the radius', () => {
    const small = dottedRing(70);
    const big = dottedRing(91);
    expect(big.length).toBeGreaterThan(small.length);
    for (const d of small) {
      expect(Number.isInteger(d.dx)).toBe(true);
      expect(Math.abs(Math.hypot(d.dx, d.dy) - 70)).toBeLessThanOrEqual(1);
    }
    expect(dottedRing(0)).toEqual([]);
  });
});

describe('payload and armour key', () => {
  it('drops the internal expected count from the event', () => {
    expect(
      petChangedPayload('bee', {
        phase: 'egg',
        xp: 3,
        xpToNext: 9,
        powerUps: 0,
        expected: 60,
      } as never),
    ).toEqual({ petId: 'bee', phase: 'egg', xp: 3, xpToNext: 9, powerUps: 0 });
  });

  it('only accepts the armour of this pet', () => {
    expect(petGearKeyFor('bee', 'petgear-bee-hell')).toBe('petgear-bee-hell');
    expect(petGearKeyFor('bee', 'petgear-penguin-hell')).toBeNull();
    expect(petGearKeyFor('bee', null)).toBeNull();
    expect(petGearKeyFor('bee', undefined)).toBeNull();
  });
});

import { describe, expect, it } from 'vitest';
import { PET_RULES, getPet } from '../../src/config/pets';
import { LEVELS } from '../../src/config/levels';
import { openingCount } from '../../src/logic/spawn';
import type { LevelDef } from '../../src/contracts';
import {
  HealTimer,
  addPetXp,
  createPetRound,
  expectedEnemies,
  inAura,
  killWeight,
  nearestTarget,
  petBarFraction,
  petStats,
} from '../../src/logic/pets';

function level(over: Partial<LevelDef>): LevelDef {
  return { ...LEVELS[0], ...over };
}

function killsUntil(levelDef: LevelDef, pred: (s: ReturnType<typeof createPetRound>) => boolean) {
  let s = createPetRound(levelDef);
  let n = 0;
  while (!pred(s) && n < 100000) {
    s = addPetXp(s, 1);
    n++;
  }
  return n;
}

describe('expectedEnemies', () => {
  it('is positive for real levels', () => {
    for (const l of LEVELS) expect(expectedEnemies(l)).toBeGreaterThan(0);
  });
  it('handles zero duration and zero interval', () => {
    expect(expectedEnemies(level({ durationSec: 0 }))).toBe(0);
    expect(expectedEnemies(level({ spawnIntervalMs: 0 }))).toBe(0);
  });
});

describe('pet round', () => {
  it.each([0, 40])(
    'hatches at about 12 percent and reaches stage 3 at about 87 to 90 percent (level %i)',
    (id) => {
      const l = LEVELS[id];
      const exp = expectedEnemies(l);
      const hatch = killsUntil(l, (s) => s.phase === 'hatched');
      expect(hatch / exp).toBeGreaterThan(0.11);
      expect(hatch / exp).toBeLessThan(0.13);
      const three = killsUntil(l, (s) => s.powerUps >= 3);
      expect(three / exp).toBeGreaterThan(0.86);
      expect(three / exp).toBeLessThan(0.91);
    },
  );
  it('ideal hatch time (spawn formula) is 20 to 55 s for all levels', () => {
    for (const l of LEVELS) {
      const n = createPetRound(l).xpToNext - openingCount(l);
      const d = l.durationSec;
      const t = (d / 0.4) * (1 - Math.exp((-0.4 * (l.spawnIntervalMs / 1000) * n) / d));
      expect(t).toBeGreaterThan(20);
      expect(t).toBeLessThan(55);
    }
  });
  it('starts in egg phase with target ceil(expected * hatchFraction)', () => {
    const l = LEVELS[0];
    const s = createPetRound(l);
    expect(s.phase).toBe('egg');
    expect(s.xp).toBe(0);
    expect(s.xpToNext).toBe(Math.ceil(expectedEnemies(l) * PET_RULES.hatchFraction));
  });
  it('very short round: target stays at least 1', () => {
    const s = createPetRound(level({ durationSec: 0 }));
    expect(s.xpToNext).toBe(1);
    expect(addPetXp(s, 1).phase).toBe('hatched');
  });
  it('bar stays full and stops counting after power-up 3', () => {
    let s = createPetRound(LEVELS[0]);
    s = addPetXp(s, 100000);
    expect(s.phase).toBe('hatched');
    expect(s.powerUps).toBe(PET_RULES.maxPowerUps);
    expect(s.xp).toBe(s.xpToNext);
    expect(petBarFraction(s)).toBe(1);
    const again = addPetXp(s, 50);
    expect(again.powerUps).toBe(PET_RULES.maxPowerUps);
    expect(again.xp).toBe(again.xpToNext);
  });
  it('carries overflow into the next bar and does not mutate input', () => {
    const s = createPetRound(LEVELS[0]);
    const before = { ...s };
    const h = addPetXp(s, s.xpToNext + 2);
    expect(s).toEqual(before);
    expect(h.phase).toBe('hatched');
    expect(h.xp).toBe(2);
  });
  it('ignores invalid kills', () => {
    const s = createPetRound(LEVELS[0]);
    expect(addPetXp(s, 0)).toBe(s);
    expect(addPetXp(s, -3)).toBe(s);
    expect(addPetXp(s, NaN)).toBe(s);
  });
  it('boss counts bossWeight', () => {
    expect(killWeight(true)).toBe(PET_RULES.bossWeight);
    expect(killWeight(false)).toBe(1);
  });
});

describe('petStats', () => {
  it('no pet means no effect', () => {
    expect(petStats(null, 3, 10)).toEqual({
      damage: 0,
      speedPxPerSec: 0,
      cooldownMs: 0,
      radius: 0,
      count: 0,
      slow: 0,
      slowMs: 0,
    });
  });
  it('bee: damage fraction, extra bee from level 1', () => {
    const bee = getPet('bee');
    if (bee.role !== 'sting') throw new Error('role');
    const s0 = petStats(bee, 0, 10);
    expect(s0.damage).toBeCloseTo(10 * bee.damageFraction);
    expect(s0.count).toBe(1);
    expect(s0.speedPxPerSec).toBe(bee.speedPxPerSec);
    const s2 = petStats(bee, 2, 10);
    expect(s2.count).toBe(1 + bee.extraBees);
    expect(s2.damage).toBeCloseTo(10 * bee.damageFraction * PET_RULES.powerUpDamageMul ** 2);
    expect(s2.speedPxPerSec).toBeCloseTo(bee.speedPxPerSec);
    expect(s2.cooldownMs).toBeCloseTo(1000 / bee.stingsPerSec);
    expect(PET_RULES.powerUpDamageMul ** PET_RULES.maxPowerUps).toBeCloseTo(2.2, 1);
  });
  it('penguin: slow, radius from level 1, power-ups clamp at max', () => {
    const p = getPet('penguin');
    if (p.role !== 'snowball') throw new Error('role');
    expect(petStats(p, 0, 10).radius).toBe(1);
    expect(petStats(p, 1, 10).radius).toBe(p.radiusMul);
    expect(petStats(p, 0, 10).slow).toBe(0.4);
    expect(petStats(p, 9, 10).damage).toBeCloseTo(petStats(p, 3, 10).damage);
    expect(petStats(p, -2, 10).damage).toBeCloseTo(petStats(p, 0, 10).damage);
  });
  it('capybara: aura radius and dps', () => {
    const c = getPet('capybara');
    if (c.role !== 'aura') throw new Error('role');
    expect(petStats(c, 0, 10).radius).toBe(c.auraRadiusPx);
    expect(petStats(c, 1, 10).radius).toBeCloseTo(c.auraRadiusPx * c.auraRadiusMul);
    expect(petStats(c, 0, 10).damage).toBeCloseTo(10 * c.damageFractionPerSec);
  });
});

describe('targeting', () => {
  const enemies = [
    { x: 100, y: 0 },
    { x: 30, y: 40 },
    { x: -10, y: 0 },
  ];
  it('nearestTarget picks the closest, null when empty', () => {
    expect(nearestTarget({ x: 0, y: 0 }, enemies)).toBe(enemies[2]);
    expect(nearestTarget({ x: 0, y: 0 }, [])).toBeNull();
  });
  it('inAura includes the edge and rejects bad radius', () => {
    expect(inAura({ x: 0, y: 0 }, 50, enemies)).toEqual([enemies[1], enemies[2]]);
    expect(inAura({ x: 0, y: 0 }, 0, enemies)).toEqual([]);
    expect(inAura({ x: 0, y: 0 }, 10, [])).toEqual([]);
  });
});

describe('HealTimer', () => {
  const def = { healHp: 2, healIntervalMs: 10000 };
  it('heals once per interval', () => {
    const t = new HealTimer(def);
    expect(t.tick(9999)).toBe(0);
    expect(t.tick(1)).toBe(2);
    expect(t.tick(10000)).toBe(2);
  });
  it('handles long frames and invalid dt', () => {
    const t = new HealTimer(def);
    expect(t.tick(25000)).toBe(4);
    expect(t.tick(-5)).toBe(0);
    expect(t.tick(NaN)).toBe(0);
    t.reset();
    expect(t.tick(9000)).toBe(0);
  });
});

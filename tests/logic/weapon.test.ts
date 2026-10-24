import { describe, expect, it } from 'vitest';
import { ITEMS, RAPID_FIRE_MAX_PER_SEC, WEAPON_BASE } from '../../src/config';
import { emptyPowers } from '../../src/logic/powers';
import { FireTimer, computeWeaponStats, emptyStacks } from '../../src/logic/weapon';

const per = (effect: string): number => ITEMS.find((i) => i.effect === effect)?.perStack ?? 0;

describe('computeWeaponStats', () => {
  it('returns base with zero stacks', () => {
    expect(computeWeaponStats(WEAPON_BASE, emptyStacks(), ITEMS)).toEqual(WEAPON_BASE);
  });
  it('applies perStack per effect and keeps speed/range', () => {
    const s = computeWeaponStats(WEAPON_BASE, { fireRate: 5, damage: 2, size: 1 }, ITEMS);
    expect(s.fireRatePerSec).toBeCloseTo(WEAPON_BASE.fireRatePerSec * (1 + per('fireRate') * 5));
    expect(s.damage).toBeCloseTo(WEAPON_BASE.damage * (1 + per('damage') * 2));
    expect(s.projectileScale).toBeCloseTo(WEAPON_BASE.projectileScale * (1 + per('size')));
    expect(s.projectileSpeed).toBe(WEAPON_BASE.projectileSpeed);
    expect(s.range).toBe(WEAPON_BASE.range);
  });
  it('ignores effects without a def', () => {
    const s = computeWeaponStats(WEAPON_BASE, { fireRate: 3, damage: 3, size: 3 }, []);
    expect(s).toEqual(WEAPON_BASE);
  });
});

describe('FireTimer', () => {
  const shotsOver = (fps: number, seconds: number, rate: number): number => {
    const t = new FireTimer();
    let n = 0;
    for (let i = 0; i < fps * seconds; i++) n += t.tick(1000 / fps, rate);
    return n;
  };
  it('gives the same shots per second at 30 and 144 fps', () => {
    expect(shotsOver(30, 10, 2)).toBe(20);
    expect(shotsOver(144, 10, 2)).toBe(20);
    expect(shotsOver(30, 10, 2.4)).toBe(24);
    expect(shotsOver(144, 10, 2.4)).toBe(24);
  });
  it('fires several shots in one long step', () => {
    expect(new FireTimer().tick(2000, 2)).toBe(4);
  });
  it('returns 0 for invalid input and reset clears charge', () => {
    const t = new FireTimer();
    expect(t.tick(0, 2)).toBe(0);
    expect(t.tick(100, 0)).toBe(0);
    expect(t.tick(100, 2)).toBe(0);
    t.reset();
    expect(t.tick(300, 2)).toBe(0);
    expect(t.tick(200, 2)).toBe(1);
  });
});

describe('computeWeaponStats (powers)', () => {
  const one = { weaponFireRateMult: 1, weaponDamageMult: 1 };
  const shots = (n: number): number | undefined =>
    computeWeaponStats(WEAPON_BASE, one, { ...emptyPowers(), doubleShotStage: n }).shotCount;
  it('neutral factors, no powers: base values, one shot', () => {
    const s = computeWeaponStats(WEAPON_BASE, one, emptyPowers());
    expect(s.fireRatePerSec).toBe(WEAPON_BASE.fireRatePerSec);
    expect(s.damage).toBe(WEAPON_BASE.damage);
    expect(s.shotCount).toBe(1);
  });
  it('upgrade factors act multiplicatively', () => {
    const f = { weaponFireRateMult: 1.5, weaponDamageMult: 2 };
    const s = computeWeaponStats(WEAPON_BASE, f, emptyPowers());
    expect(s.fireRatePerSec).toBeCloseTo(WEAPON_BASE.fireRatePerSec * 1.5);
    expect(s.damage).toBeCloseTo(WEAPON_BASE.damage * 2);
  });
  it('shotCount follows the stage (1 to 3, clamped)', () => {
    expect([shots(0), shots(1), shots(2), shots(9)]).toEqual([1, 2, 3, 3]);
  });
  it('rapid fire applies the cap on the upgraded rate', () => {
    const f = { weaponFireRateMult: 2, weaponDamageMult: 1 };
    const s = computeWeaponStats(WEAPON_BASE, f, { ...emptyPowers(), rapidFireMsLeft: 10 });
    expect(s.fireRatePerSec).toBe(Math.max(WEAPON_BASE.fireRatePerSec * 2, RAPID_FIRE_MAX_PER_SEC));
  });
  it('rapid fire rate gives equal shots at 30 and 144 fps', () => {
    const run = (fps: number): number => {
      const t = new FireTimer();
      let n = 0;
      for (let i = 0; i < fps * 5; i++) n += t.tick(1000 / fps, RAPID_FIRE_MAX_PER_SEC);
      return n;
    };
    expect(run(30)).toBe(100);
    expect(run(144)).toBe(100);
  });
});

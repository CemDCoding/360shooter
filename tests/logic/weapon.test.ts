import { describe, expect, it } from 'vitest';
import { ITEMS, WEAPON_BASE } from '../../src/config';
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

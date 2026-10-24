import { describe, expect, it } from 'vitest';
import { applyDamage, applyHeal, auraDamage, isDead } from '../../src/logic/health';

describe('health', () => {
  it('damage clamps at 0 and ignores negatives', () => {
    expect(applyDamage(50, 20)).toBe(30);
    expect(applyDamage(10, 20)).toBe(0);
    expect(applyDamage(10, -5)).toBe(10);
  });
  it('heal clamps at maxHp and ignores negatives', () => {
    expect(applyHeal(50, 25, 100)).toBe(75);
    expect(applyHeal(90, 25, 100)).toBe(100);
    expect(applyHeal(50, -5, 100)).toBe(50);
  });
  it('isDead', () => {
    expect(isDead(0)).toBe(true);
    expect(isDead(-1)).toBe(true);
    expect(isDead(1)).toBe(false);
  });
  it('auraDamage scales with dt', () => {
    expect(auraDamage(10, 500)).toBe(5);
    expect(auraDamage(-10, 500)).toBe(0);
    expect(auraDamage(10, -5)).toBe(0);
  });
});

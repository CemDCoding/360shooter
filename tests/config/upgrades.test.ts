import { describe, expect, it } from 'vitest';
import { COST_BASE, COST_GROWTH, UPGRADES } from '../../src/config';
import { MAX_UPGRADE_LEVEL } from '../../src/contracts';

const price = (k: number): number => Math.round(COST_BASE * COST_GROWTH ** k);
const sumTo = (stage: number): number =>
  Array.from({ length: stage }, (_, k) => price(k)).reduce((a, b) => a + b, 0);

describe('upgrades', () => {
  it('price series up to stage 10 stays (PE-83)', () => {
    expect(price(0)).toBe(10);
    expect(price(9)).toBe(207);
    expect(sumTo(10)).toBe(698);
  });

  it('prices of stage 11 to 15 follow the same formula and keep rising (AP-105, PE-129)', () => {
    expect(MAX_UPGRADE_LEVEL).toBe(15);
    const prices = Array.from({ length: MAX_UPGRADE_LEVEL }, (_, k) => price(k));
    expect(prices.slice(10)).toEqual([289, 405, 567, 794, 1111]);
    for (let k = 1; k < prices.length; k++) expect(prices[k]).toBeGreaterThan(prices[k - 1]);
    expect(sumTo(MAX_UPGRADE_LEVEL)).toBe(3864);
  });

  it('effect values and labels', () => {
    expect(UPGRADES.weaponFireRate).toMatchObject({ mode: 'multiplicative', perLevel: 0.1 });
    expect(UPGRADES.weaponDamage).toMatchObject({ mode: 'multiplicative', perLevel: 0.1 });
    expect(UPGRADES.playerMaxHp).toMatchObject({ mode: 'additive', perLevel: 10 });
    expect(UPGRADES.playerTurnSpeed).toMatchObject({ mode: 'additive', perLevel: 15 });
    for (const u of Object.values(UPGRADES)) expect(u.label.length).toBeGreaterThan(0);
  });

  it('stage 15 gives +150 percent fire rate and damage, +150 hp and +225 deg/s (AP-105)', () => {
    expect(UPGRADES.weaponFireRate.perLevel * MAX_UPGRADE_LEVEL).toBeCloseTo(1.5, 9);
    expect(UPGRADES.weaponDamage.perLevel * MAX_UPGRADE_LEVEL).toBeCloseTo(1.5, 9);
    expect(UPGRADES.playerMaxHp.perLevel * MAX_UPGRADE_LEVEL).toBe(150);
    expect(UPGRADES.playerTurnSpeed.perLevel * MAX_UPGRADE_LEVEL).toBe(225);
  });
});

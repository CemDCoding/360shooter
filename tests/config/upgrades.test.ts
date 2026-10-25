import { describe, expect, it } from 'vitest';
import { COST_BASE, COST_GROWTH, UPGRADES } from '../../src/config';
import { MAX_UPGRADE_LEVEL } from '../../src/contracts';

const price = (k: number): number => Math.round(COST_BASE * COST_GROWTH ** k);

describe('upgrades', () => {
  it('price series', () => {
    expect(MAX_UPGRADE_LEVEL).toBe(10);
    const prices = Array.from({ length: MAX_UPGRADE_LEVEL }, (_, k) => price(k));
    expect(prices[0]).toBe(10);
    expect(prices[9]).toBe(207);
    expect(prices.reduce((a, b) => a + b, 0)).toBe(698);
  });

  it('effect values and labels', () => {
    expect(UPGRADES.weaponFireRate).toMatchObject({ mode: 'multiplicative', perLevel: 0.1 });
    expect(UPGRADES.weaponDamage).toMatchObject({ mode: 'multiplicative', perLevel: 0.1 });
    expect(UPGRADES.playerMaxHp).toMatchObject({ mode: 'additive', perLevel: 10 });
    expect(UPGRADES.playerTurnSpeed).toMatchObject({ mode: 'additive', perLevel: 15 });
    for (const u of Object.values(UPGRADES)) expect(u.label.length).toBeGreaterThan(0);
  });
});

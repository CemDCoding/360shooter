import { describe, expect, it } from 'vitest';
import { PET_IDS, PET_RULES, PETS, eggTextureKey, getPet, petTextureKey } from '../../src/config';

describe('pets config (PE-168, PE-170, PE-179)', () => {
  it('has the three pets with unique ids and labels', () => {
    expect(PETS.map((p) => p.id)).toEqual(['bee', 'penguin', 'capybara']);
    expect(PET_IDS).toEqual(['bee', 'penguin', 'capybara']);
    expect(PETS.map((p) => p.label)).toEqual(['BIENE', 'PINGUIN', 'CAPYBARA']);
  });

  it('rules', () => {
    expect(PET_RULES).toMatchObject({
      hatchFraction: 0.15,
      powerUpFraction: 0.25,
      maxPowerUps: 3,
      bossWeight: 10,
      powerUpDamageMul: 1.3,
      powerUpSpeedMul: 1.3,
    });
  });

  it('bee', () => {
    expect(getPet('bee')).toMatchObject({
      role: 'sting',
      speedPxPerSec: 220,
      damageFraction: 0.4,
      stingsPerSec: 2.5,
      extraBees: 1,
    });
  });

  it('penguin', () => {
    expect(getPet('penguin')).toMatchObject({
      role: 'snowball',
      intervalMs: 900,
      damageFraction: 1.2,
      slow: 0.4,
      slowMs: 1500,
      radiusMul: 1.5,
    });
  });

  it('capybara', () => {
    expect(getPet('capybara')).toMatchObject({
      role: 'aura',
      auraRadiusPx: 70,
      damageFractionPerSec: 0.5,
      slow: 0.3,
      healHp: 2,
      healIntervalMs: 10000,
      auraRadiusMul: 1.3,
    });
  });

  it('texture keys follow the naming rule', () => {
    expect(petTextureKey('bee')).toBe('pet-bee');
    expect(eggTextureKey('capybara')).toBe('egg-capybara');
  });
});

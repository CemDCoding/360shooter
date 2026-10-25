import { describe, expect, it } from 'vitest';
import type { SaveGame, UpgradeLevels } from '../../src/contracts';
import { MAX_UPGRADE_LEVEL } from '../../src/contracts';
import { buyUpgrade, upgradeCost, upgradeFactors } from '../../src/logic/upgrades';

const zero: UpgradeLevels = {
  weaponFireRate: 0,
  weaponDamage: 0,
  playerMaxHp: 0,
  playerTurnSpeed: 0,
};
const save = (gold: number, upgrades: UpgradeLevels = zero): SaveGame => ({
  version: 2,
  playerXp: 0,
  playerLevel: 1,
  highestUnlockedLevel: 0,
  muted: false,
  gold,
  upgrades,
});

describe('upgradeCost', () => {
  it('has fixed values', () => {
    expect(upgradeCost('weaponDamage', 0)).toBe(10);
    expect(upgradeCost('weaponDamage', 1)).toBe(14);
    expect(upgradeCost('weaponDamage', 9)).toBe(207);
  });
  it('is null at max level and for invalid levels', () => {
    expect(upgradeCost('weaponDamage', MAX_UPGRADE_LEVEL)).toBeNull();
    expect(upgradeCost('weaponDamage', -1)).toBeNull();
    expect(upgradeCost('weaponDamage', 1.5)).toBeNull();
  });
  it('sums to 698 per track', () => {
    let sum = 0;
    for (let l = 0; l < MAX_UPGRADE_LEVEL; l++) sum += upgradeCost('playerMaxHp', l) ?? 0;
    expect(sum).toBe(698);
  });
});

describe('buyUpgrade', () => {
  it('deducts exactly the price and raises the level', () => {
    const s = save(25);
    const out = buyUpgrade(s, 'weaponFireRate');
    expect(out?.gold).toBe(15);
    expect(out?.upgrades?.weaponFireRate).toBe(1);
    expect(s.gold).toBe(25);
    expect(s.upgrades?.weaponFireRate).toBe(0);
  });
  it('returns null with too little gold', () => {
    expect(buyUpgrade(save(9), 'weaponFireRate')).toBeNull();
  });
  it('treats missing gold and upgrades as 0', () => {
    const s: SaveGame = { ...save(0), gold: undefined, upgrades: undefined };
    expect(buyUpgrade(s, 'weaponFireRate')).toBeNull();
    const s2: SaveGame = { ...save(0), gold: 10, upgrades: undefined };
    expect(buyUpgrade(s2, 'weaponFireRate')?.upgrades?.weaponFireRate).toBe(1);
  });
  it('full purchase series up to level 10, then not buyable', () => {
    let s: SaveGame = save(698);
    for (let i = 0; i < MAX_UPGRADE_LEVEL; i++) {
      const next = buyUpgrade(s, 'playerTurnSpeed');
      expect(next).not.toBeNull();
      s = next as SaveGame;
    }
    expect(s.gold).toBe(0);
    expect(s.upgrades?.playerTurnSpeed).toBe(MAX_UPGRADE_LEVEL);
    expect(buyUpgrade({ ...s, gold: 100000 }, 'playerTurnSpeed')).toBeNull();
  });
});

describe('upgradeFactors', () => {
  it('is neutral at level 0', () => {
    const f = upgradeFactors(zero);
    expect(f.weaponFireRateMult).toBe(1);
    expect(f.weaponDamageMult).toBe(1);
    expect(f.playerMaxHp).toBe(100);
    expect(f.playerTurnSpeedDegPerSec).toBe(360);
  });
  it('applies +10 percent, +10 hp, +15 deg/s per level', () => {
    const f = upgradeFactors({
      weaponFireRate: 10,
      weaponDamage: 5,
      playerMaxHp: 10,
      playerTurnSpeed: 10,
    });
    expect(f.weaponFireRateMult).toBeCloseTo(2);
    expect(f.weaponDamageMult).toBeCloseTo(1.5);
    expect(f.playerMaxHp).toBe(200);
    expect(f.playerTurnSpeedDegPerSec).toBe(510);
  });
});

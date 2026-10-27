import { describe, expect, it } from 'vitest';
import {
  GameEvents,
  MAX_UPGRADE_LEVEL,
  type ActivePowers,
  type CoinRules,
  type UpgradeLevels,
  type AssetDef,
  type EnemyDef,
  type GameEventPayloads,
  type ItemDef,
  type ItemRules,
  type LevelDef,
  type PlayerDef,
  type PowerStoreState,
  type StorablePowerDef,
  type ProgressionRules,
  type SaveGame,
  type WeaponStats,
} from '../../src/contracts';

describe('contracts', () => {
  it('accepts valid example objects for every contract', () => {
    const enemy: EnemyDef = {
      id: 'forestWitch',
      hp: 10,
      speed: 40,
      contactDamage: 1,
      behavior: 'shooter',
      xp: 5,
      spriteKey: 'witch',
      projectile: { damage: 1, speed: 100, intervalMs: 1500, keepDistance: 120 },
    };
    const aura: EnemyDef = {
      id: 'forestSpirit',
      hp: 5,
      speed: 30,
      contactDamage: 0,
      behavior: 'aura',
      xp: 3,
      spriteKey: 'spirit',
      aura: { radius: 40, dps: 2 },
    };
    const level: LevelDef = {
      id: 1,
      batch: 'forest',
      durationSec: 60,
      enemyPool: [{ enemyId: 'cursedTree', weight: 1 }],
      spawnIntervalMs: 1000,
      maxEnemies: 20,
    };
    const item: ItemDef = {
      id: 'rapid',
      effect: 'rapidFire',
      perStack: 0.1,
      maxStacks: 5,
      dropWeight: 1,
      spriteKey: 'item-rapid',
    };
    const rules: ItemRules = { dropChance: 0.1, lifetimeMs: 8000 };
    const weapon: WeaponStats = {
      fireRatePerSec: 2,
      damage: 1,
      projectileScale: 1,
      projectileSpeed: 300,
      range: 400,
    };
    const player: PlayerDef = { maxHp: 10, turnSpeedDegPerSec: 180 };
    const prog: ProgressionRules = { xpCurveBase: 100, xpCurveExponent: 1.5, lossXpFactor: 0.5 };
    const save: SaveGame = {
      version: 1,
      playerXp: 0,
      playerLevel: 1,
      highestUnlockedLevel: 0,
      muted: false,
    };
    const asset: AssetDef = {
      key: 'player',
      kind: 'spritesheet',
      path: 'assets/player.png',
      frameWidth: 32,
      frameHeight: 32,
      frames: 4,
      description: 'Astronautin, 4 Frames',
    };
    const payload: GameEventPayloads['round-ended'] = { result: 'won', xpGained: 10 };

    expect([enemy, aura, level, item, rules, weapon, player, prog, save, asset]).toHaveLength(10);
    expect(payload.result).toBe('won');
    expect(GameEvents.RoundEnded).toBe('round-ended');
  });

  it('accepts example objects for coin, upgrade and power contracts', () => {
    const coin: CoinRules = {
      dropChance: 0.05,
      magnetRadiusPx: 80,
      collectRadiusPx: 16,
      magnetSpeedPxPerSec: 300,
    };
    const levels: UpgradeLevels = {
      weaponFireRate: 0,
      weaponDamage: 1,
      playerMaxHp: 2,
      playerTurnSpeed: MAX_UPGRADE_LEVEL,
    };
    const powers: ActivePowers = { doubleShotStage: 1, shieldLeft: 2, rapidFireMsLeft: 5000 };
    const item: ItemDef = {
      id: 'rapid',
      effect: 'rapidFire',
      perStack: 1,
      maxStacks: 1,
      dropWeight: 1,
      spriteKey: 'r',
      durationMs: 5000,
    };
    const save: SaveGame = {
      version: 2,
      playerXp: 0,
      playerLevel: 1,
      highestUnlockedLevel: 0,
      muted: false,
      gold: 10,
      upgrades: levels,
    };
    const old: SaveGame = {
      version: 1,
      playerXp: 0,
      playerLevel: 1,
      highestUnlockedLevel: 0,
      muted: false,
    };
    const coins: GameEventPayloads['coins-changed'] = { roundCoins: 3 };
    const p: GameEventPayloads['powers-changed'] = powers;
    expect(GameEvents.CoinsChanged).toBe('coins-changed');
    expect(GameEvents.PowersChanged).toBe('powers-changed');
    expect(MAX_UPGRADE_LEVEL).toBe(10);
    expect([coin, item, save, old, coins, p].length).toBe(6);
  });

  it('accepts power store contract and event', () => {
    const def: StorablePowerDef = { id: 'rapidFire', kind: 'item', label: 'Dauerfeuer' };
    const state: PowerStoreState = { stored: [def.id] };
    const payload: GameEventPayloads['power-store-changed'] = state;
    expect(GameEvents.PowerStoreChanged).toBe('power-store-changed');
    expect(payload.stored).toEqual(['rapidFire']);
  });

  it('boss-hp-changed carries the invulnerable flag (V-12)', () => {
    const hit: GameEventPayloads['boss-hp-changed'] = { hp: 300, maxHp: 600, invulnerable: false };
    const fade: GameEventPayloads['boss-hp-changed'] = { hp: 300, maxHp: 600, invulnerable: true };
    // @ts-expect-error the field is required: every sender sets it
    const missing: GameEventPayloads['boss-hp-changed'] = { hp: 1, maxHp: 2 };
    expect(GameEvents.BossHpChanged).toBe('boss-hp-changed');
    expect(Object.keys(hit).sort()).toEqual(['hp', 'invulnerable', 'maxHp']);
    expect(fade.invulnerable).toBe(true);
    expect(missing.hp).toBe(1);
  });
});

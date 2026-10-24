import { describe, expect, it } from 'vitest';
import {
  GameEvents,
  type AssetDef,
  type EnemyDef,
  type GameEventPayloads,
  type ItemDef,
  type ItemRules,
  type LevelDef,
  type PlayerDef,
  type ProgressionRules,
  type SaveGame,
  type WeaponStacks,
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
      effect: 'fireRate',
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
    const stacks: WeaponStacks = { fireRate: 0, damage: 0, size: 0 };
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

    expect([
      enemy,
      aura,
      level,
      item,
      rules,
      weapon,
      stacks,
      player,
      prog,
      save,
      asset,
    ]).toHaveLength(11);
    expect(payload.result).toBe('won');
    expect(GameEvents.RoundEnded).toBe('round-ended');
  });
});

import { describe, expect, it } from 'vitest';
import {
  FINISHER_SCENE_KEY,
  FINISHER_VARIANT_IDS,
  type FinisherPlan,
  type FinisherStep,
  type FinisherStartData,
  EASY_PARRY_KEY,
  GameEvents,
  MAX_UPGRADE_LEVEL,
  SAFE_INSETS_KEY,
  type SafeInsets,
  type ActivePowers,
  type CoinRules,
  type UpgradeLevels,
  type AssetDef,
  type BatchId,
  type BossId,
  type EnemyDef,
  type EnemyProjectileDef,
  type StatusOnHit,
  type GameEventPayloads,
  type ItemDef,
  type ParryCircle,
  type ParryPatternDef,
  type ItemRules,
  type LevelDef,
  type PlayerDef,
  type PowerStoreState,
  type StorablePowerDef,
  type ProgressionRules,
  type SaveGame,
  type WeaponStats,
  type EliteRules,
  type PacingDef,
  type SpawnEventDef,
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
    const powers: ActivePowers = {
      doubleShotStage: 1,
      shieldLeft: 2,
      rapidFireMsLeft: 5000,
      doubleShotMsLeft: 0,
    };
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
    const v3: SaveGame = {
      version: 3,
      playerXp: 0,
      playerLevel: 1,
      highestUnlockedLevel: 0,
      muted: false,
      diamonds: 4,
      wonLevels: [0, 1],
      owned: ['egg-bee'],
      equippedGear: { head: 'gear-hell-head', body: null, legs: null },
      activePet: 'bee',
      petGear: { bee: 'petgear-bee-hell', penguin: null },
    };
    expect(v3.version).toBe(3);
    const petEvent: GameEventPayloads['pet-changed'] = {
      petId: 'penguin',
      phase: 'egg',
      xp: 0,
      xpToNext: 10,
      powerUps: 0,
    };
    expect(GameEvents.PetChanged).toBe('pet-changed');
    expect(petEvent.petId).toBe('penguin');
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
    expect(MAX_UPGRADE_LEVEL).toBe(15);
    expect([coin, item, save, old, coins, p].length).toBe(6);
  });

  it('accepts power store contract and event', () => {
    const def: StorablePowerDef = { id: 'rapidFire', kind: 'item', label: 'Dauerfeuer' };
    const state: PowerStoreState = { stored: [def.id] };
    const payload: GameEventPayloads['power-store-changed'] = state;
    expect(GameEvents.PowerStoreChanged).toBe('power-store-changed');
    expect(payload.stored).toEqual(['rapidFire']);
  });

  it('accepts SafeInsets with a fixed registry key (AP-117)', () => {
    const insets: SafeInsets = { top: 0, right: 43, bottom: 20, left: 43 };
    expect(SAFE_INSETS_KEY).toBe('safeInsets');
    expect(Object.keys(insets).sort()).toEqual(['bottom', 'left', 'right', 'top']);
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

  it('accepts the M5 contracts: batches, enemies, behaviours, status effects, bosses (AP-97)', () => {
    const batches: BatchId[] = ['desert', 'pyramids', 'oasis'];
    const bosses: BossId[] = ['giantSandWorm', 'guardianDog', 'pharaoh'];
    const poison: StatusOnHit = { poison: { dps: 3, durationMs: 3000 } };
    const slow: StatusOnHit = { slow: { turnFactor: 0.5, durationMs: 2000 } };
    const charge: EnemyDef = {
      id: 'armadillo',
      hp: 90,
      speed: 20,
      contactDamage: 10,
      behavior: 'charge',
      xp: 8,
      spriteKey: 'enemy-armadillo',
      charge: {
        telegraphMs: 900,
        dashSpeed: 140,
        dashMs: 1200,
        cooldownMs: 3500,
        dashDamageFactor: 0.5,
      },
    };
    const burrow: EnemyDef = {
      id: 'sandWorm',
      hp: 16,
      speed: 70,
      contactDamage: 8,
      behavior: 'burrow',
      xp: 6,
      spriteKey: 'enemy-sand-worm',
      burrow: { underMs: 1800, surfaceMs: 2500, surfaceDistance: 90, telegraphMs: 800 },
    };
    const zigzag: EnemyDef = {
      id: 'fairy',
      hp: 6,
      speed: 75,
      contactDamage: 12,
      behavior: 'chase',
      movement: 'zigzag',
      xp: 4,
      spriteKey: 'enemy-fairy',
      onHit: poison,
    };
    const shot: EnemyProjectileDef = {
      damage: 10,
      speed: 100,
      intervalMs: 2600,
      keepDistance: 150,
      spriteKey: 'witch-bolt',
      onHit: slow,
    };
    const status: GameEventPayloads['player-status'] = {
      effects: [
        { kind: 'poison', remainingMs: 1200 },
        { kind: 'slow', remainingMs: 300 },
      ],
    };
    expect(GameEvents.PlayerStatus).toBe('player-status');
    expect(GameEvents.RoundAbortRequested).toBe('round-abort-requested');
    const abort: GameEventPayloads['round-abort-requested'] = {};
    expect(abort).toEqual({});
    expect(status.effects.map((e) => e.kind)).toEqual(['poison', 'slow']);
    expect([batches, bosses, charge, burrow, zigzag, shot].length).toBe(6);
  });

  it('keeps the old enemy definitions valid without the new optional fields (additive)', () => {
    const old: EnemyDef = {
      id: 'cursedTree',
      hp: 50,
      speed: 30,
      contactDamage: 10,
      behavior: 'chase',
      xp: 5,
      spriteKey: 'enemy-cursed-tree',
    };
    expect(old.movement).toBeUndefined();
    expect(old.onHit).toBeUndefined();
  });
});

describe('M9 contracts (AP-148)', () => {
  it('keeps old circles valid (kind missing = tap) and accepts the new fields', () => {
    const old: ParryCircle = { index: 0, angleDeg: 10, hitAtMs: 500 };
    const drag: ParryCircle = {
      index: 1,
      angleDeg: 20,
      hitAtMs: 900,
      kind: 'drag',
      target: { angleDeg: 90, distancePx: 56 },
      symbol: 'rope',
    };
    const pattern: ParryPatternDef = {
      steps: [{ kind: 'tap' }, { kind: 'decoy', symbol: 'mist' }],
    };
    expect(old.kind).toBeUndefined();
    expect(drag.kind).toBe('drag');
    expect(pattern.steps).toHaveLength(2);
  });

  it('has the easyParry registry key and an optional save field', () => {
    expect(EASY_PARRY_KEY).toBe('easyParry');
    const save: Pick<SaveGame, 'easyParry'> = {};
    expect(save.easyParry).toBeUndefined();
    const on: Pick<SaveGame, 'easyParry'> = { easyParry: true };
    expect(on.easyParry).toBe(true);
  });
});

describe('M10 contracts (AP-157)', () => {
  it('has optional finisher save fields so old saves stay valid', () => {
    const old: Pick<SaveGame, 'seenFinishers' | 'reduceEffects'> = {};
    expect(old.seenFinishers).toBeUndefined();
    expect(old.reduceEffects).toBeUndefined();
    const fresh: Pick<SaveGame, 'seenFinishers' | 'reduceEffects'> = {
      seenFinishers: ['stage-1'],
      reduceEffects: true,
    };
    expect(fresh.seenFinishers).toEqual(['stage-1']);
  });

  it('has the scene key and start data without result for the debug start', () => {
    expect(FINISHER_SCENE_KEY).toBe('FinisherScene');
    expect(FINISHER_VARIANT_IDS).toHaveLength(12);
    const plan: FinisherPlan = {
      variantId: 'stage-1',
      stage: 1,
      isFinale: false,
      steps: [{ block: 'hitstop', atMs: 0, durationMs: 100 }],
      totalMs: 2000,
      skippable: false,
      reduced: false,
    };
    const actor = { texture: 't', x: 0, y: 0, scale: 1 };
    const data: FinisherStartData = {
      plan,
      levelId: 0,
      bossId: 'rootMonster',
      boss: actor,
      player: actor,
    };
    expect(data.result).toBeUndefined();
  });

  it('has optional per-frame hold fields (PE-203) so old steps stay valid', () => {
    const old: FinisherStep = { block: 'frames', atMs: 0, durationMs: 100, frameCount: 2, fps: 10 };
    expect(old.holdsMs).toBeUndefined();
    expect(old.reducedHoldsMs).toBeUndefined();
    expect(old.firstFrame).toBeUndefined();
    expect(old.titleKind).toBeUndefined();
    const fresh: FinisherStep = {
      ...old,
      holdsMs: [100, 50],
      reducedHoldsMs: [150, 0],
      firstFrame: 3,
      titleKind: 'name',
    };
    expect(fresh.holdsMs).toEqual([100, 50]);
    expect(fresh.reducedHoldsMs).toEqual([150, 0]);
    expect(fresh.firstFrame).toBe(3);
    expect(fresh.titleKind).toBe('name');
  });

  it('has optional M12 wave fields so old data stay valid (AP-174)', () => {
    const level: LevelDef = {
      id: 0,
      batch: 'forest',
      durationSec: 180,
      enemyPool: [{ enemyId: 'cursedTree', weight: 1 }],
      spawnIntervalMs: 1000,
      maxEnemies: 10,
    };
    expect(level.minAlive).toBeUndefined();
    expect(level.pacing).toBeUndefined();
    expect(level.events).toBeUndefined();
    const pacing: PacingDef = {
      cycleSec: 49,
      peakSec: 6,
      relaxSec: 10,
      relaxRate: 0.25,
      growthPerCycle: 0.1,
    };
    const event: SpawnEventDef = { kind: 'ring', atSec: 50, count: 8, announceMs: 1000 };
    const elite: EliteRules = {
      enabled: false,
      fromLevel: 3,
      hpMul: 3,
      damageMul: 1.5,
      scaleMul: 1.25,
      costMul: 6,
      maxShare: 0.1,
      guaranteedDrop: true,
    };
    const full: LevelDef = { ...level, minAlive: 5, pacing, events: [event] };
    expect(full.events).toHaveLength(1);
    expect(elite.enabled).toBe(false);
    const enemy: EnemyDef = {
      id: 'cursedTree',
      hp: 1,
      speed: 1,
      contactDamage: 1,
      behavior: 'chase',
      xp: 1,
      spriteKey: 's',
    };
    expect(enemy.threatCost).toBeUndefined();
    expect(enemy.role).toBeUndefined();
  });
});

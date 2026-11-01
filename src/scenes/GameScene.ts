import Phaser from 'phaser';
import {
  COIN_RULES,
  getLevel,
  GOLD_KEEP_ON_LOSS,
  GOLD_KEEP_ON_WIN,
  ITEM_RULES,
  ITEMS,
  PROGRESSION,
} from '../config';
import { ARMOUR_RULES, ARMOURS } from '../config/armour';
import { STORABLE_POWERS } from '../config/powerStore';
import {
  GameEvents,
  type EnemyId,
  type EquippedGear,
  type GearModifiers,
  type ItemRules,
  type GameEventName,
  type GameEventPayloads,
  type ItemDef,
  type LevelDef,
  type PetId,
  type PowerStoreState,
  type StatusOnHit,
} from '../contracts';
import { HELL_SET_RING } from '../config/gear';
import type { ActiveArmour, ArmourDef } from '../contracts/armour';
import { spawnRadiusFor } from '../config/arena';
import { BOSS_TUNING } from '../config/bosses';
import { ArmourPickup } from '../entities/ArmourPickup';
import { BossBase } from '../entities/bosses/BossBase';
import { rimRadii } from '../entities/bosses/rim';
import { createBoss } from '../entities/bosses/createBoss';
import { GiantStone } from '../entities/bosses/GiantStone';
import {
  bodyCircle,
  resolveHazardHits,
  type LaserProbe,
  type ParryGroup,
  type ParryOutcome,
} from '../entities/bosses/hazards';
import { ParryOverlay } from '../entities/ParryOverlay';
import { ArmourRing } from '../entities/ArmourRing';
import { CoinPool, withMagnetFactor } from '../entities/CoinPool';
import { ItemPickup, withLifetimeFactor } from '../entities/ItemPickup';
import { MapBackground } from '../entities/MapBackground';
import { Laser } from '../entities/Laser';
import { LaserPool } from '../entities/LaserPool';
import {
  ContactStatus,
  hitPlayer,
  Player,
  playerConfigFor,
  type GearBlock,
  type PlayerConfig,
} from '../entities/Player';
import { GearBlastPool, GearOverlay } from '../entities/GearOverlay';
import { PetCompanion } from '../entities/pets/PetCompanion';
import { petChangedPayload, petGearKeyFor } from '../entities/pets/petLogic';
import type { PetWorld } from '../entities/pets/Pet';
import { EnemyPool } from '../entities/enemies/createEnemy';
import { Enemy, type EnemyHitFlash } from '../entities/enemies/Enemy';
import { WitchBolt } from '../entities/enemies/WitchBolt';
import { WitchBoltPool } from '../entities/enemies/WitchBoltPool';
import {
  activateArmour,
  createArmourState,
  isInRing,
  resetArmour,
  ringDamageFor,
  rollArmourDrop,
  tickArmour,
} from '../logic/armour';
import { clearForBoss, shouldSpawnNormalEnemies } from '../logic/bossClear';
import {
  burnOnHit,
  deathBlastTargets,
  GearSetState,
  gearModifiers,
  gearTextureKeys,
  itemLifetimeFactor,
  knockbackVector,
  magnetFactor,
  pierceCount,
  rollCrit,
  thornsDamage,
} from '../logic/gear';
import { rollCoinDrop } from '../logic/coins';
import { addPetXp, createPetRound, killWeight, petStats, type PetRound } from '../logic/pets';
import { getPet } from '../config/pets';
import {
  DEFAULT_ENEMY_SCALE,
  ScaleRegistry,
  enemyScaleFor,
  scaledDropChance,
  xpBonus,
  type EnemyScale,
} from '../logic/scaling';
import { settleRound } from '../logic/economy';
import { pointOnRing } from '../logic/geometry';
import { canLaserDestroyBolt } from '../logic/projectiles';
import { rollDrop, scaledDropRate } from '../logic/items';
import {
  canActivate,
  createPowerStore,
  isStorable,
  resetPowerStore,
  storePower,
  takePower,
} from '../logic/powerStore';
import type { RoundResult } from '../logic/progression';
import { createRng, type Rng } from '../logic/rng';
import { RoundState } from '../logic/round';
import { SpawnDirector } from '../logic/spawn';
import { getSoundService, PARRY_KEY, type SoundService } from '../platform/audio';
import { AimInput } from '../platform/input';
import { loadSave, writeSave } from '../platform/storage';
import { VirtualStick } from './controls/VirtualStick';
import { parseDebugLevel, resolveLevelId } from './debug';
import { energyRatio, hudSeconds, powerBlock, powersKey } from './hud/hudMath';
import { POWER_SLOT_PRESSED } from './hud/PowerSlots';

/** Upper bound for one frame step, avoids huge jumps after a stall (ms). */
const MAX_FRAME_MS = 100;
/** Contact damage hits every frame: play the hurt sound at most this often (ms). */
const HURT_SOUND_GAP_MS = 250;
const HUD_KEY = 'HudScene';

export interface GameSceneData {
  levelId?: number;
}

/** Initial values for the HUD (sent via scene launch data). */
export interface HudInitData {
  levelId: number;
  hp: number;
  maxHp: number;
  remainingSec: number;
}

export interface ResultSceneData {
  levelId: number;
  result: RoundResult;
  xpGained: number;
  playerLevel: number;
  previousPlayerLevel: number;
  saved: boolean;
  /** Coins collected in the round (before the win/loss share). */
  roundCoins: number;
  /** Share of the coins that is credited (1 = 100 %, 0.5 = 50 %). */
  goldShare: number;
  /** Gold credited from this round (0 in a debug round). */
  goldGained: number;
  /** Gold total after the round (as stored). */
  goldTotal: number;
  /** Diamonds credited from this round (first win of the level, 0 otherwise, AP-137). */
  diamondsGained: number;
  /** Diamonds total after the round (as stored). */
  diamondsTotal: number;
  /** Debug round (`?level=n`): nothing was written to the save game (PE-49). */
  debugRound: boolean;
  /** The round's boss was defeated (result screen shows "Boss besiegt"). */
  bossDefeated?: boolean;
  /** Boss level only: share of the boss HP left at the end of the round (0..1, AP-72). */
  bossHpLeft?: number;
}

/** Typed emit for the events contract (src/contracts/events.ts). */
export function emitGameEvent<K extends GameEventName>(
  emitter: Phaser.Events.EventEmitter,
  name: K,
  payload: GameEventPayloads[K],
): void {
  emitter.emit(name, payload);
}

function pick<T>(a: unknown, b: unknown, ctor: abstract new (...args: never[]) => T): T | null {
  if (a instanceof ctor) return a;
  if (b instanceof ctor) return b;
  return null;
}

function armourKey(a: ActiveArmour): string {
  return `${a.id ?? ''}|${hudSeconds(a.activeMsLeft)}|${hudSeconds(a.cooldownMsLeft)}`;
}

const NO_GEAR: EquippedGear = { head: null, body: null, legs: null };
/** Status sink for a contact hit the gear blocked: the collected effects are dropped. */
const NO_STATUS_TARGET = { applyStatus: (): void => undefined };

interface PendingDrop {
  x: number;
  y: number;
  coinValue: number;
  coinChance: number;
}

/** Where a defeated enemy explodes (lava boots, AP-143); handled in the next update. */
interface PendingBlast {
  x: number;
  y: number;
}

/** One round: player in the center, enemies from the ring, timer, items, coins, armour. */
export class GameScene extends Phaser.Scene {
  private level!: LevelDef;
  private rng!: Rng;
  private background?: MapBackground;
  private lasers!: LaserPool;
  private boltPool!: WitchBoltPool;
  private enemyPool!: EnemyPool;
  private coinPool?: CoinPool;
  private armourRing?: ArmourRing;
  private player!: Player;
  private playerConfig!: PlayerConfig;
  private aim!: AimInput;
  private stick?: VirtualStick;
  private round!: RoundState;
  private spawner!: SpawnDirector;
  private items: ItemPickup[] = [];
  private armourPickups: ArmourPickup[] = [];
  private pendingDrops: PendingDrop[] = [];
  private killXp = 0;
  /** Scale of each normally spawned enemy (AP-90). Summons and boss spawns are not in here: default. */
  private enemyScales = new ScaleRegistry<Enemy>();
  private levelScale: EnemyScale = DEFAULT_ENEMY_SCALE;
  private roundCoins = 0;
  private armour: ActiveArmour = createArmourState();
  /** Definition of the active (or cooling down) armour; needed by tickArmour. */
  private armourDef: ArmourDef | null = null;
  /** Stored timed powers (round only, never saved, PE-70). */
  private powerStore: PowerStoreState = createPowerStore();
  private lastPowersKey = '';
  private lastArmourKey = '';
  private lastShieldLeft = 0;
  /** Debug round via `?level=n`: the save game is never written (PE-49). */
  private debugRound = false;
  private readonly contactStatus = new ContactStatus();
  /** Play clock (ms): sum of running frame times, stands still while paused (PE-29). */
  private playTimeMs = 0;
  private lastTimerSec = -1;
  private ended = false;
  private sfx!: SoundService;
  private lastHurtSoundMs = Number.NEGATIVE_INFINITY;
  private center = { x: 0, y: 0 };
  /** Boss of the level: created when it appears, removed at the end of the round. */
  private boss?: BossBase;
  private bossWarned = false;
  private bossSpawned = false;
  private bossDefeatedFlag = false;
  /** Last `invulnerable` sent with boss-hp-changed (reset in spawnBoss). */
  private bossInvulnerable = false;
  /** Quicktime circles of the boss attacks (AP-133); destroyed in cleanup. */
  private parryOverlay?: ParryOverlay;
  /** Bought gear of this round (AP-143), read once at round start; neutral without gear. */
  private gear: GearModifiers = gearModifiers(NO_GEAR);
  /** Set effects (diamond block, hell ring, heaven regen) on pausable play time. */
  private gearSets = new GearSetState([]);
  private gearOverlay?: GearOverlay;
  private blasts?: GearBlastPool;
  private pendingBlasts: PendingBlast[] = [];
  /** Burn of the hell body piece, null without it (then no burn loop runs). */
  private burn: { durationMs: number; dps: number } | null = null;
  /** Hell set fire ring, separate from the fire-ring item: its cooldown is never touched (PE-169). */
  private setRingMsLeft = 0;
  /** Item ring or set ring is shown (one ring picture for both). */
  private ringShown = false;
  /** Item rules with the lifetime of the heaven legs (AP-143). */
  private itemRules: ItemRules = ITEM_RULES;
  /** Pet bar of the active pet (AP-144); null without a pet (then nothing pet-related runs). */
  private petRound: PetRound | null = null;
  /** Egg or hatched pet beside the astronaut; destroyed in cleanup. */
  private pet?: PetCompanion<Enemy>;
  /** Living enemies handed to the pet each frame (one reused array, no garbage per frame). */
  private petTargets: Enemy[] = [];

  constructor() {
    super('GameScene');
  }

  init(data?: GameSceneData): void {
    const levelId = resolveLevelId(data?.levelId, window.location.search);
    this.level = getLevel(levelId) ?? (getLevel(0) as LevelDef);
    this.debugRound = parseDebugLevel(window.location.search) !== null;
    this.items = [];
    this.armourPickups = [];
    this.pendingDrops = [];
    this.killXp = 0;
    this.levelScale = enemyScaleFor(this.level.id);
    this.enemyScales = new ScaleRegistry<Enemy>();
    this.roundCoins = 0;
    this.armour = resetArmour();
    this.armourDef = null;
    this.powerStore = resetPowerStore();
    this.lastPowersKey = '';
    this.lastArmourKey = '';
    this.lastShieldLeft = 0;
    this.playTimeMs = 0;
    this.lastTimerSec = -1;
    this.ended = false;
    this.lastHurtSoundMs = Number.NEGATIVE_INFINITY;
    this.boss = undefined;
    this.bossWarned = false;
    this.bossSpawned = false;
    this.bossDefeatedFlag = false;
    this.parryOverlay = undefined;
    this.gear = gearModifiers(NO_GEAR);
    this.gearSets = new GearSetState([]);
    this.gearOverlay = undefined;
    this.blasts = undefined;
    this.pendingBlasts = [];
    this.burn = null;
    this.setRingMsLeft = 0;
    this.ringShown = false;
    this.itemRules = ITEM_RULES;
    this.petRound = null;
    this.pet = undefined;
    this.petTargets = [];
  }

  create(): void {
    const { width, height } = this.scale;
    this.center = { x: width / 2, y: height / 2 };
    this.sfx = getSoundService(this.game);
    this.rng = createRng(Date.now() >>> 0);
    // endRound() pauses the world; make sure a restarted round ("Nochmal") runs again.
    this.physics.resume();

    // Upgrades bought in the menu apply to this round (PE-41), the equipped gear on top (AP-143).
    const save = loadSave();
    const equipped = save.equippedGear ?? NO_GEAR;
    this.gear = gearModifiers(equipped);
    this.gearSets = new GearSetState(this.gear.setBonuses);
    this.burn = burnOnHit(this.gear);
    this.itemRules = withLifetimeFactor(ITEM_RULES, itemLifetimeFactor(this.gear));
    this.playerConfig = playerConfigFor(save.upgrades, this.gear);

    // Fixed seed per level: same floor layout every round.
    this.background = new MapBackground(this, this.level.batch, this.level.id * 7919 + 1);

    this.lasers = new LaserPool(this);
    this.lasers.pierce = pierceCount(this.gear);
    this.boltPool = new WitchBoltPool(this);
    this.enemyPool = new EnemyPool(this, {
      boltPool: this.boltPool,
      center: this.center,
      onDeath: (_x, _y, xp) => {
        this.sfx.play('sfx-enemy-death');
        this.killXp += xp;
      },
    });
    this.player = new Player(this, this.center.x, this.center.y, this.lasers, this.playerConfig);
    this.player.setDepth(10);
    this.player.setGear({ modifiers: this.gear, sets: this.gearSets, rng: this.rng });
    this.createGearVisuals(equipped);
    const activePet = save.activePet ?? null;
    this.createPet(activePet, activePet ? (save.petGear?.[activePet] ?? null) : null);
    this.stick = new VirtualStick(this);
    // A press on a quicktime circle is checked first and used up; it does not aim (AP-133).
    this.aim = new AimInput(this, this.center.x, this.center.y, this.stick, (x, y) =>
      this.tryParryTap(x, y),
    );
    this.parryOverlay = new ParryOverlay(this);

    this.coinPool = new CoinPool(this, withMagnetFactor(COIN_RULES, magnetFactor(this.gear)));
    this.coinPool.onCollected = (value) => {
      if (this.ended) return;
      this.roundCoins += value;
      this.sfx.play('sfx-coin');
      emitGameEvent(this.events, GameEvents.CoinsChanged, { roundCoins: this.roundCoins });
    };
    this.armourRing = new ArmourRing(this);

    this.round = new RoundState(this.level);
    const spawnRadius = spawnRadiusFor(this.scale);
    this.spawner = new SpawnDirector(this.level, this.rng, spawnRadius);

    this.bindPlayerCallbacks();
    this.addColliders();

    document.addEventListener('visibilitychange', this.onVisibilityChange);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, this.cleanup, this);

    const hudData: HudInitData = {
      levelId: this.level.id,
      hp: this.player.hp,
      maxHp: this.playerConfig.maxHp,
      remainingSec: Math.ceil(this.round.remainingMs / 1000),
    };
    // The HUD starts with zeros and reads no state: send start values once it exists (AP-34).
    const hud = this.scene.get(HUD_KEY);
    hud.events.once(Phaser.Scenes.Events.CREATE, this.sendHudStartState, this);
    // Taps on a power slot come from the HUD as a scene event (AP-66); removed in cleanup.
    hud.events.off(POWER_SLOT_PRESSED, this.onPowerSlotPressed, this);
    hud.events.on(POWER_SLOT_PRESSED, this.onPowerSlotPressed, this);
    // "RUNDE BEENDEN" in the pause menu (PE-159); removed in cleanup, so repeated aborts never stack.
    hud.events.off(GameEvents.RoundAbortRequested, this.onAbortRequested, this);
    hud.events.on(GameEvents.RoundAbortRequested, this.onAbortRequested, this);
    this.scene.launch(HUD_KEY, hudData);
    this.scene.bringToTop(HUD_KEY);
  }

  private readonly sendHudStartState = (): void => {
    if (this.ended) return;
    emitGameEvent(this.events, GameEvents.CoinsChanged, { roundCoins: this.roundCoins });
    this.emitPowers(true);
    this.emitArmour(true);
    this.emitPowerStore();
    this.emitPet();
  };

  /**
   * Active pet of the save (AP-144): starts every round as an egg beside the astronaut, its bar is the round
   * state from logic/pets. Without an active pet nothing is created and the round is unchanged.
   */
  private createPet(petId: PetId | null, petGearId: string | null): void {
    if (!petId) return;
    this.petRound = createPetRound(this.level);
    this.pet = new PetCompanion<Enemy>(
      this,
      getPet(petId),
      petGearKeyFor(petId, petGearId),
      this.player,
    );
    this.pet.setRound(this.petRound);
  }

  /** Weighted kills fill the pet bar (a boss counts PET_RULES.bossWeight); pet-changed on every change. */
  private addPetKills(isBoss: boolean): void {
    const round = this.petRound;
    if (!round || this.ended) return;
    const next = addPetXp(round, killWeight(isBoss));
    if (next === round) return;
    this.petRound = next;
    this.pet?.setRound(next);
    this.emitPet();
  }

  private emitPet(): void {
    if (!this.petRound || !this.pet) return;
    emitGameEvent(
      this.events,
      GameEvents.PetChanged,
      petChangedPayload(this.pet.def.id, this.petRound),
    );
  }

  /**
   * Egg, hatch and fight on play time. Pet damage goes through damageEnemy (rewards, bar), healing through
   * Player.heal. Only pool enemies are targets: bosses are not in the pool (like the fire ring, Q-23).
   */
  private updatePet(dt: number): void {
    const pet = this.pet;
    const round = this.petRound;
    if (!pet || !round || this.player.isDead) return;
    const targets = this.petTargets;
    targets.length = 0;
    for (const e of this.enemyPool.enemies) if (e.active) targets.push(e);
    const world: PetWorld<Enemy> = {
      player: this.player,
      enemies: targets,
      stats: petStats(pet.def, round.powerUps, this.player.stats.damage),
      radiusOf: (e) => (e.body as Phaser.Physics.Arcade.Body | null)?.halfWidth ?? 0,
      damage: (e, amount, flash) => {
        if (e.active && !this.ended && amount > 0) this.damageEnemy(e, amount, flash);
      },
      slow: (e, effect) => e.applySlow(effect),
      heal: (hp) => this.player.heal(hp),
    };
    pet.update(dt, world);
  }

  private bindPlayerCallbacks(): void {
    this.player.callbacks.onHpChange = (hp, maxHp) =>
      emitGameEvent(this.events, GameEvents.HpChanged, { hp, maxHp });
    this.player.callbacks.onShoot = () => this.sfx.play('sfx-laser');
    this.player.callbacks.onHurt = () => {
      if (this.playTimeMs - this.lastHurtSoundMs < HURT_SOUND_GAP_MS) return;
      this.lastHurtSoundMs = this.playTimeMs;
      this.sfx.play('sfx-player-hurt');
    };
    this.player.callbacks.onShieldChange = (shieldLeft) => {
      if (this.lastShieldLeft > 0 && shieldLeft <= 0) this.sfx.play('sfx-shield-break');
      this.lastShieldLeft = shieldLeft;
      this.emitPowers();
    };
    this.player.callbacks.onStatsChange = () => this.emitPowers();
    this.player.callbacks.onStatusChange = (effects) =>
      emitGameEvent(this.events, GameEvents.PlayerStatus, { effects });
    this.player.callbacks.onGearBlock = (by: GearBlock) => {
      // Only the diamond set block shows its ring; the block chance of the head has no picture (brief H-35).
      if (by === 'setBlock') this.gearOverlay?.playBlock();
    };
  }

  /**
   * Gear overlays on the astronaut (legs, body, head) and the diamond glint; the explosion pool only with the
   * lava boots. Nothing is created without gear.
   */
  private createGearVisuals(equipped: EquippedGear): void {
    const keys = gearTextureKeys(equipped);
    const diamondSet = this.gear.setBonuses.some((b) => b.kind === 'timedBlock');
    if (keys.length > 0 || diamondSet) {
      this.gearOverlay = new GearOverlay(this, keys, diamondSet);
      this.syncGearOverlay(0);
    }
    if (this.gear.effects.some((e) => e.kind === 'deathBlast'))
      this.blasts = new GearBlastPool(this);
  }

  private syncGearOverlay(dt: number): void {
    this.gearOverlay?.sync(this.player, dt, this.gearSets.blockReady());
  }

  private addColliders(): void {
    // Laser vs enemy: one laser hits one enemy (the heaven body piece lets it pass through more, AP-143).
    this.physics.add.overlap(this.enemyPool.enemies, this.lasers.group, (a, b) => {
      const enemy = pick(a, b, Enemy);
      const laser = pick(a, b, Laser);
      if (!enemy || !laser || !enemy.active || !laser.active || this.ended) return;
      if (laser.hasHit(enemy)) return;
      if (!laser.registerHit(enemy)) this.lasers.release(laser);
      if (!this.laserHitsEnemy(enemy, laser.damage)) this.sfx.play('sfx-hit');
    });
    // Laser vs item: shooting an item collects it (PE-16).
    this.physics.add.overlap(this.items, this.lasers.group, (a, b) => {
      const item = pick(a, b, ItemPickup);
      const laser = pick(a, b, Laser);
      if (!item || !laser || !item.active || !laser.active || this.ended) return;
      this.lasers.release(laser);
      item.collect();
    });
    // Laser vs armour pickup: collected like an item (PE-57).
    this.physics.add.overlap(this.armourPickups, this.lasers.group, (a, b) => {
      const pickup = pick(a, b, ArmourPickup);
      const laser = pick(a, b, Laser);
      if (!pickup || !laser || !pickup.active || !laser.active || this.ended) return;
      this.lasers.release(laser);
      pickup.collect();
    });
    // Coins are not connected to lasers: lasers pass through (PE-39).
    // Laser vs enemy projectile: both are removed, one laser hits one target (PE-37).
    this.physics.add.overlap(this.boltPool.bolts, this.lasers.group, (a, b) => {
      const bolt = pick(a, b, WitchBolt);
      const laser = pick(a, b, Laser);
      if (!bolt || !laser || !bolt.active || !laser.active || this.ended) return;
      const lb = laser.body as Phaser.Physics.Arcade.Body;
      const bb = bolt.body as Phaser.Physics.Arcade.Body;
      const hit = canLaserDestroyBolt(
        { active: laser.active, x: lb.center.x, y: lb.center.y, radius: lb.halfWidth },
        { active: bolt.active, x: bb.center.x, y: bb.center.y, radius: bb.halfWidth },
      );
      if (!hit) return;
      this.lasers.release(laser);
      bolt.despawn();
      this.sfx.play('sfx-hit');
    });
    // Witch bolt vs player (damage goes through Player.takeDamage, shield first).
    this.physics.add.overlap(this.player, this.boltPool.bolts, (a, b) => {
      const bolt = pick(a, b, WitchBolt);
      if (!bolt || !bolt.active || this.ended) return;
      bolt.despawn();
      hitPlayer(this.player, bolt.damage, bolt.onHit);
    });
  }

  /**
   * Single damage path for enemies (laser and fire ring). On a kill the drop rolls are
   * queued with the enemy's coin value; XP and sound run via the pool's onDeath.
   */
  private damageEnemy(enemy: Enemy, amount: number, flash: EnemyHitFlash = 'hit'): boolean {
    const { x, y } = enemy;
    const killed = enemy.takeDamage(amount, flash);
    if (killed) this.onEnemyKilled(enemy, x, y);
    return killed;
  }

  /**
   * One laser hit on an enemy (AP-143): critical hit of the hell head (golden flash, damage times the crit
   * factor), then the burn of the hell body piece on a survivor. Without gear exactly damageEnemy(laser damage).
   */
  private laserHitsEnemy(enemy: Enemy, damage: number): boolean {
    const crit = rollCrit(this.gear, this.rng);
    const killed = this.damageEnemy(enemy, damage * crit, crit > 1 ? 'crit' : 'hit');
    if (!killed && this.burn) enemy.applyBurn(this.burn);
    return killed;
  }

  /** Rewards of a kill (drops, scaled xp) and the explosion of the lava boots. */
  private onEnemyKilled(enemy: Enemy, x: number, y: number): void {
    const scale = this.enemyScales.get(enemy);
    // onDeath already added def.xp: add the difference to the scaled value.
    this.killXp += xpBonus(enemy.def.xp, scale);
    this.pendingDrops.push({
      x,
      y,
      coinValue: enemy.def.coinValue ?? 0,
      coinChance: scaledDropChance(COIN_RULES.dropChance, scale),
    });
    if (this.blasts) this.pendingBlasts.push({ x, y });
    this.addPetKills(false);
  }

  /**
   * Explosions of the lava boots (AP-143), one frame after the kill: damage over the same enemy damage path as
   * a laser hit (rewards, further explosions next frame). Bosses are not in the enemy pool, so the blast never
   * hurts them (like the fire ring, Q-23).
   */
  private updateBlasts(): void {
    if (this.pendingBlasts.length === 0) return;
    const blasts = this.pendingBlasts;
    this.pendingBlasts = [];
    const targets: { x: number; y: number; radius: number; enemy: Enemy }[] = [];
    for (const e of this.enemyPool.enemies) {
      if (!e.active) continue;
      const r = (e.body as Phaser.Physics.Arcade.Body | null)?.halfWidth ?? 0;
      targets.push({ x: e.x, y: e.y, radius: r, enemy: e });
    }
    for (const { x, y } of blasts) {
      // Above enemies and items, below the astronaut and her weapon (depth - 1).
      this.blasts?.play(x, y, this.player.depth - 2);
      const hit = deathBlastTargets(this.gear, x, y, targets);
      for (const t of hit.targets) {
        if (t.enemy.active) this.damageEnemy(t.enemy, hit.damage);
      }
    }
  }

  /** Burn ticks of the hell body piece through the enemy damage path (rewards); no flash per tick. */
  private applyBurnDamage(): void {
    if (!this.burn) return;
    for (const e of this.enemyPool.enemies) {
      if (!e.active) continue;
      const d = e.takeBurnDamage();
      if (d > 0) this.damageEnemy(e, d, 'none');
    }
  }

  update(time: number, delta: number): void {
    if (this.ended) return;
    const dt = Math.min(MAX_FRAME_MS, Math.max(0, delta));
    this.playTimeMs += dt;

    this.player.update(dt, this.aim.targetAngle);
    this.lasers.update();
    this.boltPool.update();
    this.enemyPool.update(time, dt);
    this.applyBurnDamage();
    this.updateBlasts();
    this.spawnEnemies(dt);
    this.applyAreaDamage(dt);
    this.updateGearSets(dt);
    this.updateArmour(dt);
    this.syncGearOverlay(dt);
    this.updatePet(dt);
    this.updateBoss(time, dt);
    this.updateParry(dt);
    this.spawnDrops();
    this.updateItems(this.playTimeMs);
    this.coinPool?.update(dt, this.player);
    this.emitPowers();

    // Order matters (AP-06): death before the timer, so a loss wins over a simultaneous timeout.
    if (this.player.isDead) this.round.playerDied();
    this.round.tick(dt);
    this.updateBossTimeline();
    this.emitTimer();

    if (this.round.status !== 'running') this.endRound(this.round.status);
  }

  /** Single spawn path: always records the scale (default for summons), pooled enemies never keep an old one. */
  private spawnScaled(id: EnemyId, x: number, y: number, scale?: EnemyScale): Enemy {
    const e = this.enemyPool.spawn(id, x, y, scale);
    this.enemyScales.assign(e, scale);
    return e;
  }

  private spawnEnemies(dt: number): void {
    const bossAlive = this.boss !== undefined && !this.bossDefeatedFlag;
    // Q-58: no normal spawns while the boss lives.
    if (!shouldSpawnNormalEnemies(bossAlive)) return;
    let alive = 0;
    for (const e of this.enemyPool.enemies) if (e.active) alive += 1;
    for (const req of this.spawner.tick(dt, alive, bossAlive)) {
      const p = pointOnRing(req.angle, req.radius, this.center.x, this.center.y);
      this.spawnScaled(req.enemyId, p.x, p.y, this.levelScale);
    }
  }

  /** Contact damage and spirit aura, both scaled by frame time (values per second in config). */
  private applyAreaDamage(dt: number): void {
    if (this.player.isDead) return;
    let damage = 0;
    this.physics.overlap(this.player, this.enemyPool.enemies, (a, b) => {
      const enemy = pick(a, b, Enemy);
      if (!enemy?.active) return;
      const dealt = enemy.contactDamageFor(dt) * this.enemyScales.get(enemy).contact;
      damage += dealt;
      // One hit per hitting enemy (AP-112); status (snake poison) comes with the hit.
      if (dealt > 0) {
        this.contactStatus.add(enemy.onHit);
        this.contactRecoil(enemy);
      }
    });
    for (const e of this.enemyPool.enemies) {
      if (e.active) damage += e.auraDamageAt(this.player.x, this.player.y, dt);
    }
    // A hit the gear stopped completely brings no status effect either (AP-143).
    const landed = damage > 0 ? this.player.takeDamage(damage) : true;
    this.contactStatus.flush(landed ? this.player : NO_STATUS_TARGET);
  }

  /**
   * Thorns and knockback of the diamond body and legs (AP-143) on an enemy that dealt contact damage: pushed
   * away from the player and damaged over the enemy damage path (rewards). No-op without the pieces.
   */
  private contactRecoil(enemy: Enemy): void {
    const thorns = thornsDamage(this.gear);
    const push = knockbackVector(this.gear, this.player.x, this.player.y, enemy.x, enemy.y);
    if (thorns <= 0 && push.x === 0 && push.y === 0) return;
    const { x, y } = enemy;
    if (enemy.recoil(thorns, push.x, push.y)) this.onEnemyKilled(enemy, x, y);
  }

  /**
   * Armour timing on pausable play time, ring follows the player and damages enemies in the
   * radius (PE-52, PE-57). Bosses are not in the enemy pool, so the ring never hurts them (Q-23).
   */
  private updateArmour(dt: number): void {
    const def = this.armourDef;
    const itemActive = def !== null && this.armour.id !== null;
    const setActive = this.setRingMsLeft > 0;
    // One ring burns at a time: the item ring (if active) or the hell set ring, never twice per frame.
    const ringDef = itemActive ? def : setActive ? HELL_SET_RING : null;
    if (ringDef && !this.player.isDead) {
      const dmg = ringDamageFor(ringDef, dt);
      const { x: cx, y: cy } = this.player;
      for (const e of this.enemyPool.enemies) {
        if (!e.active) continue;
        const r = (e.body as Phaser.Physics.Arcade.Body | null)?.halfWidth ?? 0;
        if (isInRing(ringDef, cx, cy, e.x, e.y, r)) this.damageEnemy(e, dmg);
      }
    }
    if (def) this.armour = tickArmour(this.armour, dt, def);
    this.setRingMsLeft = Math.max(0, this.setRingMsLeft - dt);
    this.updateRingVisual();
    if (def) this.emitArmour();
  }

  /** Ring picture follows the player while the item ring or the hell set ring burns. */
  private updateRingVisual(): void {
    const on = this.armour.id !== null || this.setRingMsLeft > 0;
    if (on) {
      if (!this.ringShown) this.armourRing?.show(this.armourDef ?? HELL_SET_RING);
      this.ringShown = true;
      this.armourRing?.setCenter(this.player.x, this.player.y);
    } else if (this.ringShown) {
      this.ringShown = false;
      this.armourRing?.hide();
    }
  }

  /**
   * Set effects on pausable play time (AP-143): the hell set lights the fire ring for 3 s (own timer, the
   * cooldown of the fire-ring item stays untouched), the heaven set heals. The diamond block is used up in
   * the player's damage path.
   */
  private updateGearSets(dt: number): void {
    if (this.player.isDead) return;
    const tick = this.gearSets.tick(dt);
    if (tick.ringTriggers > 0) {
      this.setRingMsLeft = Math.max(this.setRingMsLeft, HELL_SET_RING.durationMs);
    }
    if (tick.regenHp > 0) this.player.heal(tick.regenHp);
  }

  /** Boss warning (33 s left) and appearance (30 s left), driven by the round state (PE-18). */
  private updateBossTimeline(): void {
    if (this.ended || this.round.status !== 'running') return;
    const phase = this.round.bossPhase;
    if (phase === 'none') return;
    const bossId = this.level.bossId;
    if (!bossId) return;
    if (!this.bossWarned) {
      this.bossWarned = true;
      if (phase === 'warning') {
        this.sfx.play('sfx-boss-warning');
        emitGameEvent(this.events, GameEvents.BossWarning, { bossId });
      }
    }
    if (phase === 'active' && !this.bossSpawned) this.spawnBoss(bossId);
  }

  /** PE-137: boss appearance despawns all normal enemies and their bolts, no kill and no reward. */
  private clearNormalEnemiesForBoss(): void {
    clearForBoss(this.enemyPool.enemies, this.boltPool.bolts);
  }

  private spawnBoss(bossId: NonNullable<LevelDef['bossId']>): void {
    this.clearNormalEnemiesForBoss();
    this.bossSpawned = true;
    this.bossInvulnerable = false;
    const boss = createBoss(this, bossId, this.level.id, {
      arena: {
        width: this.scale.width,
        height: this.scale.height,
        margin: BOSS_TUNING.arena.margin,
      },
      center: this.center,
      rng: this.rng,
      onHpChanged: (hp, maxHp) => this.emitBossHp(hp, maxHp),
      onDefeated: () => this.onBossDefeated(bossId),
      onSummonTrees: (positions) => {
        if (this.ended) return;
        for (const p of positions) this.spawnScaled('cursedTree', p.x, p.y);
      },
      // Generic summon (AP-97): any enemy id over the same spawn path as the tree call.
      onSummon: (enemyId, positions) => {
        if (this.ended) return;
        for (const p of positions) this.spawnScaled(enemyId, p.x, p.y);
      },
      getPlayerPos: () => ({ x: this.player.x, y: this.player.y }),
      onPlayerHit: (damage) => {
        // A fully parried roll arrives with 0: no hit, no hurt sound (AP-133).
        if (damage > 0 && !this.ended && !this.player.isDead) this.player.takeDamage(damage);
      },
      onParryResolved: (outcome) => this.onParryResolved(outcome),
    });
    this.boss = boss;
    emitGameEvent(this.events, GameEvents.BossSpawned, {
      bossId,
      hp: boss.maxHp,
      maxHp: boss.maxHp,
    });
    // Appears from a random direction on the rim around the player.
    const rim = rimRadii(BOSS_TUNING.giantStone.rim, {
      width: this.scale.width,
      height: this.scale.height,
      margin: BOSS_TUNING.arena.margin,
    });
    const angle = this.rng.next() * Math.PI * 2;
    boss.spawn(this.center.x + Math.cos(angle) * rim.rx, this.center.y + Math.sin(angle) * rim.ry);
  }

  /** boss-hp-changed with the invulnerable flag from boss.isInvulnerable (V-12, PE-87). */
  private emitBossHp(hp: number, maxHp: number): void {
    if (this.ended) return;
    this.bossInvulnerable = this.boss?.isInvulnerable === true;
    emitGameEvent(this.events, GameEvents.BossHpChanged, {
      hp,
      maxHp,
      invulnerable: this.bossInvulnerable,
    });
  }

  private onBossDefeated(bossId: NonNullable<LevelDef['bossId']>): void {
    if (this.bossDefeatedFlag || this.ended) return;
    this.bossDefeatedFlag = true;
    // Boss death clears all quicktime circles at once (the tracker went with despawn()).
    this.parryOverlay?.clear();
    this.sfx.play('sfx-boss-defeated');
    emitGameEvent(this.events, GameEvents.BossDefeated, { bossId });
    this.addPetKills(true);
    this.round.bossDefeated();
  }

  /** Boss update, hits and damage. Runs once per frame (boss.update exactly once, AP-67 contract). */
  private updateBoss(time: number, dt: number): void {
    const boss = this.boss;
    if (!boss || this.bossDefeatedFlag) return;
    boss.update(time, dt);
    if (this.bossDefeatedFlag || this.player.isDead) return;
    // The ghost phase changes invulnerability without an HP change: tell the HUD (boss bar "IMMUN").
    if (boss.isInvulnerable !== this.bossInvulnerable) this.emitBossHp(boss.hp, boss.maxHp);

    const parts = this.bossParts();

    // Laser vs boss body (the stone: its parts). Invulnerable (ghost fade): lasers pass through.
    if (parts.length > 0) {
      this.physics.overlap(this.lasers.group, parts, (a, b) => {
        const laser = pick(a, b, Laser);
        const part = pick(a, b, BossBase);
        if (!laser || !part || !laser.active || !part.active || this.ended) return;
        if (part.isInvulnerable) return;
        this.lasers.release(laser);
        if (!part.takeDamage(laser.damage * rollCrit(this.gear, this.rng)))
          this.sfx.play('sfx-hit');
      });
    }
    if (this.bossDefeatedFlag) return;

    // Contact damage of the boss body, scaled by frame time.
    let damage = 0;
    if (parts.length > 0) {
      this.physics.overlap(this.player, parts, (a, b) => {
        const part = pick(a, b, BossBase);
        if (part?.active) damage += part.contactDamageFor(dt);
      });
    }
    if (damage > 0) this.player.takeDamage(damage);

    this.updateBossHazards(boss);
  }

  /** Living boss bodies: the boss itself, or the stone fragments after the split. */
  private bossParts(): BossBase[] {
    const boss = this.boss;
    if (!boss) return [];
    return boss instanceof GiantStone ? boss.parts : boss.active ? [boss] : [];
  }

  /** Open quicktime groups of all living boss parts (empty without a boss or after its death). */
  private parryGroups(): ParryGroup[] {
    if (this.bossDefeatedFlag) return [];
    return this.bossParts().flatMap((p) => [...p.parryGroups]);
  }

  /** Quicktime display on play time (stands still while paused, AP-133). */
  private updateParry(dt: number): void {
    if (this.ended) return;
    this.parryOverlay?.update(dt, this.parryGroups(), { x: this.player.x, y: this.player.y });
  }

  /**
   * A press at the world point (x, y) (AimInput, before aiming): true if it hit an open quicktime circle. The
   * press is then used up and the aim of the astronaut stays as it was.
   */
  private tryParryTap(x: number, y: number): boolean {
    if (this.ended || this.player.isDead || this.bossDefeatedFlag) return false;
    const player = { x: this.player.x, y: this.player.y };
    for (const part of this.bossParts()) {
      if (part.tapParry({ x, y }, player)) return true;
    }
    return false;
  }

  /** An attack with circles hits now (from BossBase, right before its damage): grades and "PARRY!". */
  private onParryResolved(outcome: ParryOutcome): void {
    if (this.ended) return;
    this.parryOverlay?.finish(outcome);
    if (outcome.blocked) this.sfx.play(PARRY_KEY);
  }

  /**
   * Treffer von Boss-Geschossen (PE-134): one generic path for every boss, no `instanceof`. The boss reports
   * its projectiles and danger zones via getHazards(); lasers first (one laser hits one hazard), then the
   * player (damage through Player.takeDamage, shield first, onHit passed on).
   */
  private updateBossHazards(boss: BossBase): void {
    if (this.ended) return;
    const hazards = boss.getHazards();
    if (hazards.length === 0) return;
    const lasers: {
      readonly active: boolean;
      readonly probe: LaserProbe;
      readonly laser: Laser;
    }[] = [];
    for (const child of this.lasers.group.getChildren()) {
      const laser = child as Laser;
      const body = laser.body as Phaser.Physics.Arcade.Body | null;
      if (!laser.active || !body) continue;
      lasers.push({
        get active() {
          return laser.active;
        },
        probe: {
          rect: { left: body.left, top: body.top, right: body.right, bottom: body.bottom },
          circle: bodyCircle(body),
        },
        laser,
      });
    }
    const pb = this.player.body as Phaser.Physics.Arcade.Body;
    resolveHazardHits(hazards, lasers, bodyCircle(pb), {
      releaseLaser: (l) => this.lasers.release(l.laser),
      onLaserUsed: () => this.sfx.play('sfx-hit'),
      hitPlayer: (damage, onHit) => this.hitPlayerByBoss(damage, onHit),
    });
  }

  /** A boss hazard hit the player: damage first (shield first), then the status effect (poison, slow). */
  private hitPlayerByBoss(damage: number, onHit: StatusOnHit | undefined): void {
    hitPlayer(this.player, damage, onHit);
  }

  private despawnBoss(): void {
    this.boss?.despawn();
    this.boss = undefined;
  }

  private spawnDrops(): void {
    // AP-146: item and armour drops are rolled per enemy, so divide by the enemy count factor (like coins).
    const itemRules = {
      ...ITEM_RULES,
      dropChance: scaledDropRate(ITEM_RULES.dropChance, this.level.id),
    };
    const armourRules = {
      ...ARMOUR_RULES,
      dropChance: scaledDropRate(ARMOUR_RULES.dropChance, this.level.id),
    };
    for (const { x, y, coinValue, coinChance } of this.pendingDrops) {
      const def = rollDrop(this.rng, itemRules, ITEMS);
      if (def) this.spawnItem(x, y, def);
      if (coinValue > 0 && rollCoinDrop(this.rng, { ...COIN_RULES, dropChance: coinChance }))
        this.coinPool?.spawn(x, y, coinValue);
      if (ARMOURS.length > 0 && rollArmourDrop(this.rng, armourRules)) {
        const armourDef = ARMOURS[Math.floor(this.rng.next() * ARMOURS.length)] ?? ARMOURS[0];
        this.spawnArmourPickup(x, y, armourDef);
      }
    }
    this.pendingDrops.length = 0;
  }

  private spawnItem(x: number, y: number, def: ItemDef): void {
    const item = new ItemPickup(this, x, y, def, this.itemRules, this.playTimeMs);
    item.setDepth(5);
    item.onCollected = (collected) => {
      // Timed powers go into the storage slot instead of starting (PE-70).
      if (isStorable(collected.id)) {
        this.storeCollected(collected.id);
        return;
      }
      this.sfx.play('sfx-item-pickup');
      this.player.applyItem(collected);
    };
    this.items.push(item);
  }

  private spawnArmourPickup(x: number, y: number, def: ArmourDef): void {
    const pickup = new ArmourPickup(this, x, y, def, this.itemRules, this.playTimeMs);
    pickup.setDepth(5);
    pickup.onCollected = (collected) => this.onArmourCollected(collected);
    this.armourPickups.push(pickup);
  }

  /** Storable armour goes into the slot; other armour activates directly (PE-57, PE-70). */
  private onArmourCollected(def: ArmourDef): void {
    if (this.ended || this.player.isDead) return;
    if (isStorable(def.id)) {
      this.storeCollected(def.id);
      return;
    }
    if (this.startArmour(def)) this.sfx.play('sfx-item-pickup');
  }

  /** Activates only without active armour and outside the cooldown (PE-57). */
  private startArmour(def: ArmourDef): boolean {
    const next = activateArmour(this.armour, def);
    if (next === this.armour) return false;
    this.armour = next;
    this.armourDef = def;
    this.armourRing?.show(def);
    this.armourRing?.setCenter(this.player.x, this.player.y);
    this.ringShown = true;
    this.emitArmour(true);
    return true;
  }

  /** Stores a picked-up timed power; a full slot makes the pickup do nothing (PE-70). */
  private storeCollected(id: string): void {
    if (this.ended || this.player.isDead) return;
    const r = storePower(this.powerStore, id);
    if (!r.accepted) return;
    this.powerStore = r.state;
    this.sfx.play('sfx-item-pickup');
    this.emitPowerStore();
  }

  /** Tap on a ready slot (HUD scene event): start the stored power via the usual path. */
  private onPowerSlotPressed(id: unknown): void {
    if (typeof id !== 'string' || this.ended || this.player.isDead || !this.scene.isActive())
      return;
    const def = STORABLE_POWERS.find((p) => p.id === id);
    if (!def) return;
    const { blocked } = powerBlock(def, this.player.powers, this.armour);
    if (!canActivate(this.powerStore, id, blocked)) return;
    if (def.kind === 'item') {
      const item = ITEMS.find((i) => i.id === id);
      if (!item) return;
      this.powerStore = takePower(this.powerStore, id).state;
      this.player.applyItem(item);
      this.emitPowers(true);
    } else {
      const armour = ARMOURS.find((a) => a.id === id);
      if (!armour || !this.startArmour(armour)) return;
      this.powerStore = takePower(this.powerStore, id).state;
    }
    this.emitPowerStore();
  }

  private emitPowerStore(): void {
    emitGameEvent(this.events, GameEvents.PowerStoreChanged, {
      stored: [...this.powerStore.stored],
    });
  }

  /** Updates pickups and removes expired/collected ones in place (the collider keeps the array). */
  private updateItems(now: number): void {
    let w = 0;
    for (const item of this.items) {
      if (item.update(now)) this.items[w++] = item;
    }
    this.items.length = w;
    w = 0;
    for (const pickup of this.armourPickups) {
      if (pickup.update(now)) this.armourPickups[w++] = pickup;
    }
    this.armourPickups.length = w;
  }

  /** powers-changed when shield, double shot or the shown rapid-fire seconds change. */
  private emitPowers(force = false): void {
    const powers = this.player.powers;
    const key = powersKey(powers);
    if (!force && key === this.lastPowersKey) return;
    this.lastPowersKey = key;
    emitGameEvent(this.events, GameEvents.PowersChanged, { ...powers });
  }

  /** armour-changed when the state or the shown seconds change. */
  private emitArmour(force = false): void {
    const key = armourKey(this.armour);
    if (!force && key === this.lastArmourKey) return;
    this.lastArmourKey = key;
    emitGameEvent(this.events, GameEvents.ArmourChanged, { ...this.armour });
  }

  private emitTimer(): void {
    const sec = Math.ceil(this.round.remainingMs / 1000);
    if (sec === this.lastTimerSec) return;
    this.lastTimerSec = sec;
    emitGameEvent(this.events, GameEvents.TimerTick, { remainingSec: sec });
  }

  private endRound(result: RoundResult): void {
    if (this.ended) return;
    this.ended = true;
    this.physics.pause();
    // Status effects end with the round (win, timeout or death); the HUD is told before it stops.
    this.player.clearStatus();
    this.armour = resetArmour();
    this.armourDef = null;
    this.setRingMsLeft = 0;
    this.ringShown = false;
    this.pendingBlasts = [];
    this.armourRing?.hide();
    // Round over (win, timeout or death): the storage is emptied, nothing is saved (PE-70).
    // The HUD hears about it, so it no longer shows a stale "ready" slot (V-14 a).
    this.powerStore = resetPowerStore();
    this.emitPowerStore();
    // Boss HP share left for the result screen (boss level only; not yet appeared = full).
    const boss = this.boss;
    const bossParts = this.bossParts();
    const bossHpLeft = !this.level.bossId
      ? undefined
      : boss
        ? energyRatio(
            bossParts.reduce((s, p) => s + Math.max(0, p.hp), 0),
            boss.maxHp,
          )
        : 1;
    this.despawnBoss();
    this.parryOverlay?.clear();

    const before = loadSave();
    const settled = settleRound(
      before,
      this.level.id,
      result,
      this.killXp,
      this.roundCoins,
      this.debugRound,
      PROGRESSION,
    );
    const xpGained = settled.xpGained;
    // Exactly one write per round; a debug round writes nothing (PE-40, PE-49).
    const saved = settled.shouldWrite ? writeSave(settled.next) : false;
    const stored = settled.shown;

    emitGameEvent(this.events, GameEvents.RoundEnded, { result, xpGained });
    const data: ResultSceneData = {
      levelId: this.level.id,
      result,
      xpGained,
      playerLevel: stored.playerLevel,
      previousPlayerLevel: before.playerLevel,
      saved,
      roundCoins: this.roundCoins,
      goldShare: result === 'won' ? GOLD_KEEP_ON_WIN : GOLD_KEEP_ON_LOSS,
      goldGained: settled.goldGained,
      goldTotal: stored.gold ?? 0,
      diamondsGained: settled.diamondsGained,
      diamondsTotal: stored.diamonds ?? 0,
      debugRound: this.debugRound,
      bossDefeated: this.bossDefeatedFlag,
      bossHpLeft: this.bossDefeatedFlag ? 0 : bossHpLeft,
    };
    this.scene.stop(HUD_KEY);
    this.scene.start('ResultScene', data);
  }

  private readonly onAbortRequested = (): void => {
    this.abortRound();
  };

  /**
   * The player left the round from the pause menu (PE-159): no settleRound, no save access, no result
   * screen, no end sound. The scene is cleaned up by its SHUTDOWN handler (cleanup) and the menu starts.
   */
  private abortRound(): void {
    if (this.ended) return;
    this.ended = true;
    this.physics.pause();
    this.scene.stop(HUD_KEY);
    this.scene.start('MenuScene');
  }

  /** Auto pause when the page goes to the background (PE-29). */
  private readonly onVisibilityChange = (): void => {
    if (document.hidden && !this.ended && this.scene.isActive()) this.scene.pause();
  };

  private cleanup(): void {
    document.removeEventListener('visibilitychange', this.onVisibilityChange);
    const hud = this.scene.get(HUD_KEY);
    hud?.events.off(Phaser.Scenes.Events.CREATE, this.sendHudStartState, this);
    hud?.events.off(POWER_SLOT_PRESSED, this.onPowerSlotPressed, this);
    hud?.events.off(GameEvents.RoundAbortRequested, this.onAbortRequested, this);
    this.powerStore = resetPowerStore();
    // Also after abortRound (PE-159): open circles, rings and words go away without damage or sound.
    this.despawnBoss();
    this.parryOverlay?.destroy();
    this.parryOverlay = undefined;
    this.player.callbacks.onHpChange = undefined;
    this.player.callbacks.onStatsChange = undefined;
    this.player.callbacks.onShieldChange = undefined;
    this.player.callbacks.onShoot = undefined;
    this.player.callbacks.onHurt = undefined;
    this.player.callbacks.onStatusChange = undefined;
    this.player.callbacks.onGearBlock = undefined;
    this.player.setGear(null);
    for (const item of this.items) item.onCollected = undefined;
    for (const pickup of this.armourPickups) pickup.onCollected = undefined;
    this.items = [];
    this.armourPickups = [];
    this.pendingDrops = [];
    this.armour = resetArmour();
    this.armourDef = null;
    this.coinPool?.destroy();
    this.coinPool = undefined;
    this.armourRing?.destroy();
    this.armourRing = undefined;
    this.setRingMsLeft = 0;
    this.ringShown = false;
    this.pendingBlasts = [];
    this.gearOverlay?.destroy();
    this.gearOverlay = undefined;
    this.blasts?.destroy();
    this.blasts = undefined;
    // Also after abortRound and "Nochmal": egg, pet, snowball pool, aura and hearts go with the round.
    this.pet?.destroy();
    this.pet = undefined;
    this.petRound = null;
    this.petTargets = [];
    this.background?.destroy();
    this.background = undefined;
    this.stick?.destroy();
    this.stick = undefined;
    // AimInput removes its own listeners on SHUTDOWN; game objects, colliders and timers
    // are destroyed by Phaser's scene shutdown.
    if (this.scene.isActive(HUD_KEY) || this.scene.isPaused(HUD_KEY)) {
      this.scene.stop(HUD_KEY);
    }
  }
}

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
  type ActivePowers,
  type GameEventName,
  type GameEventPayloads,
  type ItemDef,
  type LevelDef,
  type PowerStoreState,
  type UpgradeLevels,
} from '../contracts';
import type { ActiveArmour, ArmourDef } from '../contracts/armour';
import { BOSS_TUNING } from '../config/bosses';
import { ArmourPickup } from '../entities/ArmourPickup';
import { BossBase } from '../entities/bosses/BossBase';
import { createBoss } from '../entities/bosses/createBoss';
import { ForestGhost } from '../entities/bosses/ForestGhost';
import { GhostOrb } from '../entities/bosses/GhostOrb';
import { GiantStone } from '../entities/bosses/GiantStone';
import { RootMonster } from '../entities/bosses/RootMonster';
import { RootSpike } from '../entities/bosses/RootSpike';
import { ArmourRing } from '../entities/ArmourRing';
import { CoinPool } from '../entities/CoinPool';
import { ItemPickup } from '../entities/ItemPickup';
import { MapBackground } from '../entities/MapBackground';
import { Laser } from '../entities/Laser';
import { LaserPool } from '../entities/LaserPool';
import { Player, type PlayerConfig } from '../entities/Player';
import { EnemyPool } from '../entities/enemies/createEnemy';
import { Enemy } from '../entities/enemies/Enemy';
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
import { rollCoinDrop } from '../logic/coins';
import { applyRoundGold, goldPayout } from '../logic/economy';
import { pointOnRing } from '../logic/geometry';
import { canLaserDestroyBolt } from '../logic/projectiles';
import { rollDrop } from '../logic/items';
import {
  canActivate,
  createPowerStore,
  isStorable,
  resetPowerStore,
  storePower,
  takePower,
} from '../logic/powerStore';
import { applyRoundResult, roundXp, type RoundResult } from '../logic/progression';
import { createRng, type Rng } from '../logic/rng';
import { RoundState } from '../logic/round';
import { SpawnDirector } from '../logic/spawn';
import { upgradeFactors } from '../logic/upgrades';
import { weaponStageForUpgrades } from '../logic/weaponMount';
import { getSoundService, type SoundService } from '../platform/audio';
import { AimInput } from '../platform/input';
import { loadSave, writeSave } from '../platform/storage';
import { VirtualStick } from './controls/VirtualStick';
import { parseDebugLevel, resolveLevelId } from './debug';
import { energyRatio, powerBlock } from './hud/hudMath';
import { POWER_SLOT_PRESSED } from './hud/PowerSlots';

/** Layout only: distance of the spawn ring beyond the visible corners (pixels). */
const SPAWN_MARGIN_PX = 24;
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

/** Whole seconds as the HUD shows them (changes at most once per second). */
function hudSeconds(ms: number): number {
  return ms > 0 ? Math.ceil(ms / 1000) : 0;
}

function powersKey(p: ActivePowers): string {
  return `${p.doubleShotStage}|${Math.ceil(p.shieldLeft)}|${hudSeconds(p.rapidFireMsLeft)}`;
}

function armourKey(a: ActiveArmour): string {
  return `${a.id ?? ''}|${hudSeconds(a.activeMsLeft)}|${hudSeconds(a.cooldownMsLeft)}`;
}

function playerConfigFrom(levels: UpgradeLevels | undefined): PlayerConfig {
  const f = upgradeFactors(
    levels ?? { weaponFireRate: 0, weaponDamage: 0, playerMaxHp: 0, playerTurnSpeed: 0 },
  );
  return {
    maxHp: f.playerMaxHp,
    turnSpeedDegPerSec: f.playerTurnSpeedDegPerSec,
    weaponFireRateMult: f.weaponFireRateMult,
    weaponDamageMult: f.weaponDamageMult,
    weaponStage: weaponStageForUpgrades(levels ?? { weaponFireRate: 0, weaponDamage: 0 }),
  };
}

interface PendingDrop {
  x: number;
  y: number;
  coinValue: number;
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
  }

  create(): void {
    const { width, height } = this.scale;
    this.center = { x: width / 2, y: height / 2 };
    this.sfx = getSoundService(this.game);
    this.rng = createRng(Date.now() >>> 0);
    // endRound() pauses the world; make sure a restarted round ("Nochmal") runs again.
    this.physics.resume();

    // Upgrades bought in the menu apply to this round (PE-41).
    this.playerConfig = playerConfigFrom(loadSave().upgrades);

    // Fixed seed per level: same floor layout every round.
    this.background = new MapBackground(this, this.level.batch, this.level.id * 7919 + 1);

    this.lasers = new LaserPool(this);
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
    this.stick = new VirtualStick(this);
    this.aim = new AimInput(this, this.center.x, this.center.y, this.stick);

    this.coinPool = new CoinPool(this, COIN_RULES);
    this.coinPool.onCollected = (value) => {
      if (this.ended) return;
      this.roundCoins += value;
      this.sfx.play('sfx-coin');
      emitGameEvent(this.events, GameEvents.CoinsChanged, { roundCoins: this.roundCoins });
    };
    this.armourRing = new ArmourRing(this);

    this.round = new RoundState(this.level);
    const spawnRadius = Math.hypot(width, height) / 2 + SPAWN_MARGIN_PX;
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
    this.scene.launch(HUD_KEY, hudData);
    this.scene.bringToTop(HUD_KEY);
  }

  private readonly sendHudStartState = (): void => {
    if (this.ended) return;
    emitGameEvent(this.events, GameEvents.CoinsChanged, { roundCoins: this.roundCoins });
    this.emitPowers(true);
    this.emitArmour(true);
    this.emitPowerStore();
  };

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
  }

  private addColliders(): void {
    // Laser vs enemy: one laser hits one enemy.
    this.physics.add.overlap(this.enemyPool.enemies, this.lasers.group, (a, b) => {
      const enemy = pick(a, b, Enemy);
      const laser = pick(a, b, Laser);
      if (!enemy || !laser || !enemy.active || !laser.active || this.ended) return;
      this.lasers.release(laser);
      if (!this.damageEnemy(enemy, laser.damage)) this.sfx.play('sfx-hit');
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
      this.player.takeDamage(bolt.damage);
    });
  }

  /**
   * Single damage path for enemies (laser and fire ring). On a kill the drop rolls are
   * queued with the enemy's coin value; XP and sound run via the pool's onDeath.
   */
  private damageEnemy(enemy: Enemy, amount: number): boolean {
    const { x, y } = enemy;
    const killed = enemy.takeDamage(amount);
    if (killed) this.pendingDrops.push({ x, y, coinValue: enemy.def.coinValue ?? 0 });
    return killed;
  }

  update(time: number, delta: number): void {
    if (this.ended) return;
    const dt = Math.min(MAX_FRAME_MS, Math.max(0, delta));
    this.playTimeMs += dt;

    this.player.update(dt, this.aim.targetAngle);
    this.lasers.update();
    this.boltPool.update();
    this.enemyPool.update(time, dt);
    this.spawnEnemies(dt);
    this.applyAreaDamage(dt);
    this.updateArmour(dt);
    this.updateBoss(time, dt);
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

  private spawnEnemies(dt: number): void {
    let alive = 0;
    for (const e of this.enemyPool.enemies) if (e.active) alive += 1;
    const bossAlive = this.boss !== undefined && !this.bossDefeatedFlag;
    for (const req of this.spawner.tick(dt, alive, bossAlive)) {
      const p = pointOnRing(req.angle, req.radius, this.center.x, this.center.y);
      this.enemyPool.spawn(req.enemyId, p.x, p.y);
    }
  }

  /** Contact damage and spirit aura, both scaled by frame time (values per second in config). */
  private applyAreaDamage(dt: number): void {
    if (this.player.isDead) return;
    let damage = 0;
    this.physics.overlap(this.player, this.enemyPool.enemies, (a, b) => {
      const enemy = pick(a, b, Enemy);
      if (enemy?.active) damage += enemy.contactDamageFor(dt);
    });
    for (const e of this.enemyPool.enemies) {
      if (e.active) damage += e.auraDamageAt(this.player.x, this.player.y, dt);
    }
    if (damage > 0) this.player.takeDamage(damage);
  }

  /**
   * Armour timing on pausable play time, ring follows the player and damages enemies in the
   * radius (PE-52, PE-57). Bosses are not in the enemy pool, so the ring never hurts them (Q-23).
   */
  private updateArmour(dt: number): void {
    const def = this.armourDef;
    if (!def) return;
    const wasActive = this.armour.id !== null;
    if (wasActive && !this.player.isDead) {
      const dmg = ringDamageFor(def, dt);
      const { x: cx, y: cy } = this.player;
      for (const e of this.enemyPool.enemies) {
        if (!e.active) continue;
        const r = (e.body as Phaser.Physics.Arcade.Body | null)?.halfWidth ?? 0;
        if (isInRing(def, cx, cy, e.x, e.y, r)) this.damageEnemy(e, dmg);
      }
    }
    this.armour = tickArmour(this.armour, dt, def);
    if (this.armour.id !== null) this.armourRing?.setCenter(this.player.x, this.player.y);
    else if (wasActive) this.armourRing?.hide();
    this.emitArmour();
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

  private spawnBoss(bossId: NonNullable<LevelDef['bossId']>): void {
    this.bossSpawned = true;
    this.bossInvulnerable = false;
    const boss = createBoss(this, bossId, this.level.id, {
      center: this.center,
      rng: this.rng,
      onHpChanged: (hp, maxHp) => this.emitBossHp(hp, maxHp),
      onDefeated: () => this.onBossDefeated(bossId),
      onSummonTrees: (positions) => {
        if (this.ended) return;
        for (const p of positions) this.enemyPool.spawn('cursedTree', p.x, p.y);
      },
      getPlayerPos: () => ({ x: this.player.x, y: this.player.y }),
      onPlayerHit: (damage) => {
        if (!this.ended && !this.player.isDead) this.player.takeDamage(damage);
      },
    });
    this.boss = boss;
    emitGameEvent(this.events, GameEvents.BossSpawned, { bossId, hp: boss.maxHp, maxHp: boss.maxHp });
    // Appears from a random direction on the rim around the player.
    const rim = BOSS_TUNING.giantStone.rim;
    const angle = this.rng.next() * Math.PI * 2;
    boss.spawn(this.center.x + Math.cos(angle) * rim.rx, this.center.y + Math.sin(angle) * rim.ry);
  }

  /** boss-hp-changed with the invulnerable flag from boss.isInvulnerable (V-12, PE-87). */
  private emitBossHp(hp: number, maxHp: number): void {
    if (this.ended) return;
    this.bossInvulnerable = this.boss?.isInvulnerable === true;
    emitGameEvent(this.events, GameEvents.BossHpChanged, { hp, maxHp, invulnerable: this.bossInvulnerable });
  }

  private onBossDefeated(bossId: NonNullable<LevelDef['bossId']>): void {
    if (this.bossDefeatedFlag || this.ended) return;
    this.bossDefeatedFlag = true;
    this.sfx.play('sfx-boss-defeated');
    emitGameEvent(this.events, GameEvents.BossDefeated, { bossId });
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

    const parts: BossBase[] = boss instanceof GiantStone ? boss.parts : boss.active ? [boss] : [];

    // Laser vs boss body (the stone: its parts). Invulnerable (ghost fade): lasers pass through.
    if (parts.length > 0) {
      this.physics.overlap(this.lasers.group, parts, (a, b) => {
        const laser = pick(a, b, Laser);
        const part = pick(a, b, BossBase);
        if (!laser || !part || !laser.active || !part.active || this.ended) return;
        if (part.isInvulnerable) return;
        this.lasers.release(laser);
        if (!part.takeDamage(laser.damage)) this.sfx.play('sfx-hit');
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

    if (boss instanceof RootMonster) this.updateRootSpikes(boss);
    else if (boss instanceof ForestGhost) this.updateGhostOrbs(boss);
  }

  private updateRootSpikes(boss: RootMonster): void {
    const spikes = [...boss.activeSpikes];
    if (spikes.length === 0) return;
    this.physics.overlap(this.lasers.group, spikes, (a, b) => {
      const laser = pick(a, b, Laser);
      const spike = pick(a, b, RootSpike);
      if (!laser || !spike || !laser.active || !spike.active || this.ended) return;
      if (spike.laserHit()) {
        this.lasers.release(laser);
        this.sfx.play('sfx-hit');
      }
    });
    this.physics.overlap(this.player, spikes, (a, b) => {
      const spike = pick(a, b, RootSpike);
      if (!spike || !spike.active || this.ended) return;
      const dmg = spike.tryHit();
      if (dmg > 0) this.player.takeDamage(dmg);
    });
  }

  private updateGhostOrbs(boss: ForestGhost): void {
    const orbs = boss.orbs.filter((o) => o.active);
    if (orbs.length === 0) return;
    // Laser vs orb: same circle rule as the witch bolt, one laser destroys one orb (PE-37).
    this.physics.overlap(this.lasers.group, orbs, (a, b) => {
      const laser = pick(a, b, Laser);
      const orb = pick(a, b, GhostOrb);
      if (!laser || !orb || !laser.active || !orb.active || this.ended) return;
      const lb = laser.body as Phaser.Physics.Arcade.Body;
      const ob = orb.body as Phaser.Physics.Arcade.Body;
      const hit = canLaserDestroyBolt(
        { active: laser.active, x: lb.center.x, y: lb.center.y, radius: lb.halfWidth },
        { active: orb.active, x: ob.center.x, y: ob.center.y, radius: ob.halfWidth },
      );
      if (!hit) return;
      this.lasers.release(laser);
      orb.kill();
      this.sfx.play('sfx-hit');
    });
    this.physics.overlap(this.player, orbs, (a, b) => {
      const orb = pick(a, b, GhostOrb);
      if (!orb || !orb.active || this.ended) return;
      const dmg = orb.damage;
      orb.kill();
      this.player.takeDamage(dmg);
    });
  }

  private despawnBoss(): void {
    this.boss?.despawn();
    this.boss = undefined;
  }

  private spawnDrops(): void {
    for (const { x, y, coinValue } of this.pendingDrops) {
      const def = rollDrop(this.rng, ITEM_RULES, ITEMS);
      if (def) this.spawnItem(x, y, def);
      if (coinValue > 0 && rollCoinDrop(this.rng, COIN_RULES))
        this.coinPool?.spawn(x, y, coinValue);
      if (ARMOURS.length > 0 && rollArmourDrop(this.rng, ARMOUR_RULES)) {
        const armourDef = ARMOURS[Math.floor(this.rng.next() * ARMOURS.length)] ?? ARMOURS[0];
        this.spawnArmourPickup(x, y, armourDef);
      }
    }
    this.pendingDrops.length = 0;
  }

  private spawnItem(x: number, y: number, def: ItemDef): void {
    const item = new ItemPickup(this, x, y, def, ITEM_RULES, this.playTimeMs);
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
    const pickup = new ArmourPickup(this, x, y, def, ITEM_RULES, this.playTimeMs);
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
    if (typeof id !== 'string' || this.ended || this.player.isDead || !this.scene.isActive()) return;
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
    emitGameEvent(this.events, GameEvents.PowerStoreChanged, { stored: [...this.powerStore.stored] });
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
    this.armour = resetArmour();
    this.armourDef = null;
    this.armourRing?.hide();
    // Round over (win, timeout or death): the storage is emptied, nothing is saved (PE-70).
    // The HUD hears about it, so it no longer shows a stale "ready" slot (V-14 a).
    this.powerStore = resetPowerStore();
    this.emitPowerStore();
    // Boss HP share left for the result screen (boss level only; not yet appeared = full).
    const boss = this.boss;
    const bossParts: BossBase[] = boss instanceof GiantStone ? boss.parts : boss?.active ? [boss] : [];
    const bossHpLeft = !this.level.bossId
      ? undefined
      : boss
        ? energyRatio(bossParts.reduce((s, p) => s + Math.max(0, p.hp), 0), boss.maxHp)
        : 1;
    this.despawnBoss();

    const xpGained = roundXp(this.killXp, result, PROGRESSION);
    const before = loadSave();
    const withResult = applyRoundResult(before, this.level.id, result, xpGained, PROGRESSION);
    const after = applyRoundGold(withResult, this.roundCoins, result);
    // Exactly one write per round; a debug round writes nothing (PE-40, PE-49).
    const saved = this.debugRound ? false : writeSave(after);
    const stored = this.debugRound ? before : after;

    emitGameEvent(this.events, GameEvents.RoundEnded, { result, xpGained });
    const data: ResultSceneData = {
      levelId: this.level.id,
      result,
      xpGained: this.debugRound ? 0 : xpGained,
      playerLevel: stored.playerLevel,
      previousPlayerLevel: before.playerLevel,
      saved,
      roundCoins: this.roundCoins,
      goldShare: result === 'won' ? GOLD_KEEP_ON_WIN : GOLD_KEEP_ON_LOSS,
      goldGained: this.debugRound ? 0 : goldPayout(this.roundCoins, result),
      goldTotal: stored.gold ?? 0,
      debugRound: this.debugRound,
      bossDefeated: this.bossDefeatedFlag,
      bossHpLeft: this.bossDefeatedFlag ? 0 : bossHpLeft,
    };
    this.scene.stop(HUD_KEY);
    this.scene.start('ResultScene', data);
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
    this.powerStore = resetPowerStore();
    this.despawnBoss();
    this.player.callbacks.onHpChange = undefined;
    this.player.callbacks.onStatsChange = undefined;
    this.player.callbacks.onShieldChange = undefined;
    this.player.callbacks.onShoot = undefined;
    this.player.callbacks.onHurt = undefined;
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

import Phaser from 'phaser';
import { getLevel, ITEM_RULES, ITEMS, PLAYER, PROGRESSION } from '../config';
import {
  GameEvents,
  type GameEventName,
  type GameEventPayloads,
  type ItemDef,
  type LevelDef,
  type WeaponStacks,
} from '../contracts';
import { ItemPickup } from '../entities/ItemPickup';
import { MapBackground } from '../entities/MapBackground';
import { Laser } from '../entities/Laser';
import { LaserPool } from '../entities/LaserPool';
import { Player } from '../entities/Player';
import { EnemyPool } from '../entities/enemies/createEnemy';
import { Enemy } from '../entities/enemies/Enemy';
import { WitchBolt } from '../entities/enemies/WitchBolt';
import { WitchBoltPool } from '../entities/enemies/WitchBoltPool';
import { pointOnRing } from '../logic/geometry';
import { rollDrop } from '../logic/items';
import { applyRoundResult, roundXp, type RoundResult } from '../logic/progression';
import { createRng, type Rng } from '../logic/rng';
import { RoundState } from '../logic/round';
import { SpawnDirector } from '../logic/spawn';
import { getSoundService, type SoundService } from '../platform/audio';
import { AimInput } from '../platform/input';
import { loadSave, writeSave } from '../platform/storage';
import { resolveLevelId } from './debug';

/** Layout only: distance of the spawn ring beyond the visible corners (pixels). */
const SPAWN_MARGIN_PX = 24;
/** Upper bound for one frame step, avoids huge jumps after a stall (ms). */
const MAX_FRAME_MS = 100;
/** Contact damage hits every frame: play the hurt sound at most this often (ms). */
const HURT_SOUND_GAP_MS = 250;

export interface GameSceneData {
  levelId?: number;
}

/** Initial values for the HUD (sent via scene launch data). */
export interface HudInitData {
  levelId: number;
  hp: number;
  maxHp: number;
  remainingSec: number;
  stacks: WeaponStacks;
}

export interface ResultSceneData {
  levelId: number;
  result: RoundResult;
  xpGained: number;
  playerLevel: number;
  previousPlayerLevel: number;
  saved: boolean;
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

/** One round: player in the center, enemies from the ring, timer, items (F-01..F-11). */
export class GameScene extends Phaser.Scene {
  private level!: LevelDef;
  private rng!: Rng;
  private background?: MapBackground;
  private lasers!: LaserPool;
  private boltPool!: WitchBoltPool;
  private enemyPool!: EnemyPool;
  private player!: Player;
  private aim!: AimInput;
  private round!: RoundState;
  private spawner!: SpawnDirector;
  private items: ItemPickup[] = [];
  private pendingDrops: { x: number; y: number }[] = [];
  private killXp = 0;
  /** Play clock (ms): sum of running frame times, stands still while paused (PE-29). */
  private playTimeMs = 0;
  private lastTimerSec = -1;
  private ended = false;
  private sfx!: SoundService;
  private lastHurtSoundMs = Number.NEGATIVE_INFINITY;
  private center = { x: 0, y: 0 };

  constructor() {
    super('GameScene');
  }

  init(data?: GameSceneData): void {
    const levelId = resolveLevelId(data?.levelId, window.location.search);
    this.level = getLevel(levelId) ?? (getLevel(0) as LevelDef);
    this.items = [];
    this.pendingDrops = [];
    this.killXp = 0;
    this.playTimeMs = 0;
    this.lastTimerSec = -1;
    this.ended = false;
    this.lastHurtSoundMs = Number.NEGATIVE_INFINITY;
  }

  create(): void {
    const { width, height } = this.scale;
    this.center = { x: width / 2, y: height / 2 };
    this.sfx = getSoundService(this.game);
    this.rng = createRng(Date.now() >>> 0);
    // endRound() pauses the world; make sure a restarted round ("Nochmal") runs again.
    this.physics.resume();

    // Fixed seed per level: same floor layout every round.
    this.background = new MapBackground(this, this.level.batch, this.level.id * 7919 + 1);

    this.lasers = new LaserPool(this);
    this.boltPool = new WitchBoltPool(this);
    this.enemyPool = new EnemyPool(this, {
      boltPool: this.boltPool,
      center: this.center,
      onDeath: (x, y, xp) => {
        this.sfx.play('sfx-enemy-death');
        this.killXp += xp;
        this.pendingDrops.push({ x, y });
      },
    });
    this.player = new Player(this, this.center.x, this.center.y, this.lasers);
    this.player.setDepth(10);
    this.aim = new AimInput(this, this.center.x, this.center.y);

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
      maxHp: PLAYER.maxHp,
      remainingSec: Math.ceil(this.round.remainingMs / 1000),
      stacks: { ...this.player.stacks },
    };
    this.scene.launch('HudScene', hudData);
    this.scene.bringToTop('HudScene');
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
    this.player.callbacks.onStatsChange = (_stats, stacks) =>
      emitGameEvent(this.events, GameEvents.WeaponChanged, { stacks: { ...stacks } });
  }

  private addColliders(): void {
    // Laser vs enemy: one laser hits one enemy.
    this.physics.add.overlap(this.enemyPool.enemies, this.lasers.group, (a, b) => {
      const enemy = pick(a, b, Enemy);
      const laser = pick(a, b, Laser);
      if (!enemy || !laser || !enemy.active || !laser.active || this.ended) return;
      this.lasers.release(laser);
      if (!enemy.takeDamage(laser.damage)) this.sfx.play('sfx-hit');
    });
    // Laser vs item: shooting an item collects it (PE-16).
    this.physics.add.overlap(this.items, this.lasers.group, (a, b) => {
      const item = pick(a, b, ItemPickup);
      const laser = pick(a, b, Laser);
      if (!item || !laser || !item.active || !laser.active || this.ended) return;
      this.lasers.release(laser);
      item.collect();
    });
    // Witch bolt vs player.
    this.physics.add.overlap(this.player, this.boltPool.bolts, (a, b) => {
      const bolt = pick(a, b, WitchBolt);
      if (!bolt || !bolt.active || this.ended) return;
      bolt.despawn();
      this.player.takeDamage(bolt.damage);
    });
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
    this.spawnDrops();
    this.updateItems(this.playTimeMs);

    // Order matters (AP-06): death before the timer, so a loss wins over a simultaneous timeout.
    if (this.player.isDead) this.round.playerDied();
    this.round.tick(dt);
    this.emitTimer();

    if (this.round.status !== 'running') this.endRound(this.round.status);
  }

  private spawnEnemies(dt: number): void {
    let alive = 0;
    for (const e of this.enemyPool.enemies) if (e.active) alive += 1;
    for (const req of this.spawner.tick(dt, alive)) {
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

  private spawnDrops(): void {
    for (const { x, y } of this.pendingDrops) {
      const def = rollDrop(this.rng, ITEM_RULES, ITEMS);
      if (def) this.spawnItem(x, y, def);
    }
    this.pendingDrops.length = 0;
  }

  private spawnItem(x: number, y: number, def: ItemDef): void {
    const item = new ItemPickup(this, x, y, def, ITEM_RULES, this.playTimeMs);
    item.setDepth(5);
    item.onCollected = (collected) => {
      this.sfx.play('sfx-item-pickup');
      this.player.applyItem(collected);
    };
    this.items.push(item);
  }

  /** Updates items and removes expired/collected ones in place (the collider keeps the array). */
  private updateItems(now: number): void {
    let w = 0;
    for (const item of this.items) {
      if (item.update(now)) this.items[w++] = item;
    }
    this.items.length = w;
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

    const xpGained = roundXp(this.killXp, result, PROGRESSION);
    const before = loadSave();
    const after = applyRoundResult(before, this.level.id, result, xpGained, PROGRESSION);
    const saved = writeSave(after);

    emitGameEvent(this.events, GameEvents.RoundEnded, { result, xpGained });
    const data: ResultSceneData = {
      levelId: this.level.id,
      result,
      xpGained,
      playerLevel: after.playerLevel,
      previousPlayerLevel: before.playerLevel,
      saved,
    };
    this.scene.stop('HudScene');
    this.scene.start('ResultScene', data);
  }

  /** Auto pause when the page goes to the background (PE-29). */
  private readonly onVisibilityChange = (): void => {
    if (document.hidden && !this.ended && this.scene.isActive()) this.scene.pause();
  };

  private cleanup(): void {
    document.removeEventListener('visibilitychange', this.onVisibilityChange);
    this.player.callbacks.onHpChange = undefined;
    this.player.callbacks.onStatsChange = undefined;
    this.player.callbacks.onShoot = undefined;
    this.player.callbacks.onHurt = undefined;
    for (const item of this.items) item.onCollected = undefined;
    this.items = [];
    this.pendingDrops = [];
    this.background?.destroy();
    this.background = undefined;
    // AimInput removes its own listeners on SHUTDOWN; game objects, colliders and timers
    // are destroyed by Phaser's scene shutdown.
    if (this.scene.isActive('HudScene') || this.scene.isPaused('HudScene')) {
      this.scene.stop('HudScene');
    }
  }
}

import Phaser from 'phaser';
import { animKey } from '../../config/assets';
import { BOSS_TUNING } from '../../config/bosses';
import { THEME } from '../../config/theme';
import { prefersReducedMotion } from '../../platform/motion';
import { sproutDamage, sproutHitsLeft, stepToward } from './bossGeometry';

export const ROOT_SPIKE_TEXTURE = 'boss-root-spike';
const SPIKE_DEPTH = 2;
const FLASH_MS = 120;
const FLASH_TINT = THEME.colors['game.hit-flash'].num;
const SPROUT_START_SCALE = 0.4;
const SPROUT_START_ALPHA = 0.5;

/** sprout: harmless bud (rootThrust announcement), up: the root hurts once, creep: ring root moving in. */
export type RootSpikePhase = 'sprout' | 'up' | 'creep';

export interface RootSpikeOptions {
  /** Start phase, default 'up' (the old behaviour). */
  mode?: RootSpikePhase;
  /** sprout: time until the bud turns into a root (ms). */
  sproutMs?: number;
  /** creep: point the root moves to and speed in px/s. */
  target?: { x: number; y: number };
  speedPxPerSec?: number;
}

/**
 * Root of the root monster (AP-17, AP-67). The boss owns it and removes it (tick() / destroy()).
 * Scene contract (AP-20):
 * - Overlap with the player: tryHit() returns the damage once, otherwise 0 (0 in the sprout phase).
 * - Overlap with a laser: laserHit() returns true if the laser was used up (bud or ring root), false if it passes
 *   (root in phase "up"). One laser hits exactly one target.
 */
export class RootSpike extends Phaser.Physics.Arcade.Sprite {
  private phase: RootSpikePhase;
  private lifeLeftMs = BOSS_TUNING.rootMonster.spikeLifetimeMs;
  private sproutLeftMs: number;
  private readonly sproutTotalMs: number;
  private hitsLeft: number = BOSS_TUNING.rootMonster.sprout.hits;
  private consumed = false;
  private destroyed = false;
  private flashLeftMs = 0;
  private readonly speed: number;
  private readonly goal: { x: number; y: number } | undefined;
  private readonly reduced: boolean;

  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    private readonly damage: number,
    opts: RootSpikeOptions = {},
  ) {
    super(scene, x, y, ROOT_SPIKE_TEXTURE);
    this.phase = opts.mode ?? 'up';
    this.sproutTotalMs = Math.max(1, opts.sproutMs ?? 0);
    this.sproutLeftMs = this.sproutTotalMs;
    this.goal = opts.target;
    this.speed = opts.speedPxPerSec ?? 0;
    this.reduced = prefersReducedMotion();
    scene.add.existing(this);
    scene.physics.add.existing(this);
    this.setDepth(SPIKE_DEPTH);
    const anim = animKey(ROOT_SPIKE_TEXTURE);
    if (scene.anims.exists(anim)) this.play(anim, true);
    this.applyBody();
    if (this.phase === 'sprout' && !this.reduced) {
      this.setScale(SPROUT_START_SCALE).setAlpha(SPROUT_START_ALPHA);
    }
  }

  get currentPhase(): RootSpikePhase {
    return this.phase;
  }

  /** Remaining laser hits of the bud. */
  get budHitsLeft(): number {
    return this.hitsLeft;
  }

  /** Circle body: bud with the sprout hit radius, otherwise a small circle (ring root or root). */
  private applyBody(): void {
    const body = this.body as Phaser.Physics.Arcade.Body | null;
    if (!body) return;
    const r =
      this.phase === 'sprout'
        ? BOSS_TUNING.rootMonster.sprout.hitRadius
        : this.phase === 'creep'
          ? BOSS_TUNING.rootMonster.ring.spikeRadius
          : Math.min(this.width, this.height) / 2;
    this.setCircle(r, this.width / 2 - r, this.height / 2 - r);
  }

  /**
   * A laser hit. Returns true if the laser was used up. The bud loses one hit (flash, no shake, PE-31),
   * a ring root is removed. The root in phase "up" lets lasers pass.
   */
  laserHit(): boolean {
    if (!this.active || this.destroyed || this.consumed) return false;
    if (this.phase === 'sprout') {
      if (this.hitsLeft <= 0) return false;
      this.hitsLeft = sproutHitsLeft(this.hitsLeft, 1);
      this.flash();
      if (this.hitsLeft <= 0) this.destroyed = true;
      return true;
    }
    if (this.phase === 'creep') {
      this.destroyed = true;
      return true;
    }
    return false;
  }

  /** Returns the damage the first time the root hits, afterwards 0. 0 in the bud phase and when destroyed. */
  tryHit(): number {
    if (this.consumed || this.destroyed || !this.active || this.phase === 'sprout') return 0;
    this.consumed = true;
    if (this.phase === 'creep') return this.damage;
    return sproutDamage(this.damage, BOSS_TUNING.rootMonster.sprout.hits, this.hitsLeft);
  }

  /** Advances the phases. Returns true when the root is gone and should be removed. */
  tick(deltaMs: number): boolean {
    if (this.destroyed || !this.scene) return true;
    if (this.flashLeftMs > 0) {
      this.flashLeftMs -= deltaMs;
      if (this.flashLeftMs <= 0) this.clearTint();
    }
    if (this.phase === 'sprout') {
      this.sproutLeftMs -= deltaMs;
      if (this.sproutLeftMs <= 0) {
        // The bud turns into a root; its damage was fixed by the laser hits.
        this.phase = 'up';
        this.setScale(1).setAlpha(1);
        this.applyBody();
        return this.hitsLeft <= 0;
      }
      if (!this.reduced) {
        const p = 1 - this.sproutLeftMs / this.sproutTotalMs;
        this.setScale(SPROUT_START_SCALE + (1 - SPROUT_START_SCALE) * p);
        this.setAlpha(SPROUT_START_ALPHA + (1 - SPROUT_START_ALPHA) * p);
      }
      return false;
    }
    if (this.phase === 'creep') {
      if (this.consumed) return true;
      const goal = this.goal;
      if (!goal) return true;
      const next = stepToward({ x: this.x, y: this.y }, goal, this.speed, deltaMs);
      this.setPosition(next.x, next.y);
      this.body?.updateFromGameObject();
      return next.arrived;
    }
    this.lifeLeftMs -= deltaMs;
    return this.lifeLeftMs <= 0;
  }

  private flash(): void {
    this.flashLeftMs = FLASH_MS;
    this.setTintFill(FLASH_TINT);
  }
}

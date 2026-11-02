import type Phaser from 'phaser';
import { petTextureKey } from '../../config/pets';
import type { PetDef, PetId } from '../../contracts';
import type { Located, PetStats } from '../../logic/pets';
import { prefersReducedMotion } from '../../platform/motion';
import { ATTACK_FRAME_MS, PET_DEPTH_BELOW_PLAYER, PET_GEAR_DEPTH_STEP } from './petLogic';

// Pet base (AP-144, brief H-35): display and behaviour of a hatched pet. Pets are invulnerable and have no
// physics body, so they never block shots and never take input (no aiming, no quicktime).

/** Idle and walk frames 0-3 at 4 fps (sheet pet-<id>, 16x16 x 6; 4-5 are the attack frames). */
const IDLE_FPS = 4;
const IDLE_FRAMES = 4;

export function petIdleAnim(id: PetId): string {
  return `pet-${id}-idle`;
}

/** What the pet follows: the astronaut. */
export interface PetPlayer extends Located {
  readonly flipX: boolean;
  readonly depth: number;
}

/** The round as the pet sees it; damage and healing go through the scene's paths. */
export interface PetWorld<E extends Located> {
  readonly player: PetPlayer;
  /** Living targets: active pool enemies plus living, vulnerable boss parts (AP-164, PE-205). */
  readonly enemies: readonly E[];
  readonly stats: PetStats;
  radiusOf(enemy: E): number;
  damage(enemy: E, amount: number, flash: 'hit' | 'none'): void;
  slow(enemy: E, effect: { slow: number; durationMs: number }): void;
  heal(hp: number): void;
}

/** Depth of a pet: below the astronaut and her weapon behind, above enemies and items. */
export function petDepth(playerDepth: number): number {
  return playerDepth - PET_DEPTH_BELOW_PLAYER;
}

/** Creates the idle animation of a pet once per game (4 fps, loop). */
export function ensurePetAnims(scene: Phaser.Scene, id: PetId): void {
  const key = petTextureKey(id);
  const anim = petIdleAnim(id);
  if (scene.anims.exists(anim) || !scene.textures.exists(key)) return;
  scene.anims.create({
    key: anim,
    frames: scene.anims.generateFrameNumbers(key, { start: 0, end: IDLE_FRAMES - 1 }),
    frameRate: IDLE_FPS,
    repeat: -1,
  });
}

/**
 * One pet figure: the pet sprite and its armour overlay (petgear-<pet>-<set>, same frame and flipX). Plays the
 * idle loop; an attack frame (4 or 5) replaces it for ATTACK_FRAME_MS.
 */
export class PetSprite {
  readonly sprite: Phaser.GameObjects.Sprite;
  private gear: Phaser.GameObjects.Sprite | null = null;
  private attackFrame: number | null = null;
  private attackMs = 0;
  private readonly idleAnim: string;

  constructor(scene: Phaser.Scene, id: PetId, gearKey: string | null, x: number, y: number) {
    ensurePetAnims(scene, id);
    this.idleAnim = petIdleAnim(id);
    this.sprite = scene.add.sprite(x, y, petTextureKey(id), 0);
    if (scene.anims.exists(this.idleAnim)) this.sprite.play(this.idleAnim);
    if (gearKey && scene.textures.exists(gearKey)) this.gear = scene.add.sprite(x, y, gearKey, 0);
  }

  get x(): number {
    return this.sprite.x;
  }

  get y(): number {
    return this.sprite.y;
  }

  /** Shows an attack frame (4 wind-up, 5 strike) for a moment. */
  showAttack(frame: number): void {
    if (this.attackFrame === null) this.sprite.stop();
    this.attackFrame = frame;
    this.attackMs = ATTACK_FRAME_MS;
    this.sprite.setFrame(frame);
  }

  /** Holds the wind-up frame while it is set (bee close to its target); no effect during a strike. */
  holdWindup(on: boolean, frame: number): void {
    if (on && this.attackFrame === null) this.showAttack(frame);
    else if (on && this.attackFrame === frame) this.attackMs = ATTACK_FRAME_MS;
  }

  place(x: number, y: number, flipX: boolean, depth: number, dtMs: number): void {
    if (this.attackFrame !== null) {
      this.attackMs -= Math.max(0, dtMs);
      if (this.attackMs <= 0) {
        this.attackFrame = null;
        if (this.sprite.scene?.anims.exists(this.idleAnim)) this.sprite.play(this.idleAnim);
        else this.sprite.setFrame(0);
      }
    }
    this.sprite.setPosition(Math.round(x), Math.round(y)).setFlipX(flipX).setDepth(depth);
    this.gear
      ?.setPosition(this.sprite.x, this.sprite.y)
      .setFrame(this.sprite.frame.name)
      .setFlipX(flipX)
      .setDepth(depth + PET_GEAR_DEPTH_STEP);
  }

  setVisible(on: boolean): void {
    this.sprite.setVisible(on);
    this.gear?.setVisible(on);
  }

  destroy(): void {
    this.sprite.destroy();
    this.gear?.destroy();
    this.gear = null;
  }
}

/** A hatched pet in the round. Subclasses: Bee, Penguin, Capybara. */
export abstract class Pet<E extends Located = Located> {
  protected readonly reducedMotion = prefersReducedMotion();

  constructor(
    protected readonly scene: Phaser.Scene,
    readonly def: PetDef,
    protected readonly gearKey: string | null,
  ) {}

  /** One step on pausable play time (the scene does not call it while paused or after the end). */
  abstract update(dtMs: number, world: PetWorld<E>): void;

  abstract destroy(): void;
}

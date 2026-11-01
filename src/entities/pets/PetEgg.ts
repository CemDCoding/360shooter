import type Phaser from 'phaser';
import { eggTextureKey } from '../../config/pets';
import type { PetId } from '../../contracts';
import type { Located } from '../../logic/pets';
import { prefersReducedMotion } from '../../platform/motion';
import { petDepth, type PetPlayer } from './Pet';
import {
  eggFrame,
  FOLLOW_SPEED,
  HATCH_MS,
  HatchSequence,
  petAnchor,
  stepTowards,
  type HatchStage,
} from './petLogic';

const HATCH_KEY = 'pet-hatch';
const HATCH_FRAMES = 3;

/**
 * The pet's egg beside the astronaut (egg-<pet> 16x16 x 4): rest, wobble from 80 % of the bar, cracks at
 * 100 %, then the shell bursts (pet-hatch 24x24 x 3, once in motion.hatch) and the pet appears.
 */
export class PetEgg {
  private egg: Phaser.GameObjects.Sprite | null;
  private burst: Phaser.GameObjects.Sprite | null = null;
  private readonly hatch = new HatchSequence();
  private readonly reducedMotion = prefersReducedMotion();
  private elapsedMs = 0;
  private burstMs = 0;
  private pos: Located;

  constructor(
    private readonly scene: Phaser.Scene,
    petId: PetId,
    start: Located,
  ) {
    this.pos = { ...start };
    const key = eggTextureKey(petId);
    this.egg = scene.textures.exists(key) ? scene.add.sprite(start.x, start.y, key, 0) : null;
  }

  get stage(): HatchStage {
    return this.hatch.stage;
  }

  /** Where the egg sits now (the pet appears there). */
  get position(): Located {
    return { ...this.pos };
  }

  /** The bar was full the first time: cracks, then the shell bursts. */
  startHatch(): void {
    this.hatch.start(this.reducedMotion);
  }

  /** One step; `fraction` is the bar share (0..1). Returns the stage after the step. */
  update(dtMs: number, player: PetPlayer, fraction: number): HatchStage {
    const dt = Math.max(0, dtMs);
    this.elapsedMs += dt;
    // The egg lies on the ground on the far side of the aim (offset like penguin and capybara).
    this.pos = stepTowards(this.pos, petAnchor(player, player.flipX, 'penguin'), FOLLOW_SPEED, dt);
    const stage = this.hatch.tick(dt);
    const depth = petDepth(player.depth);
    const x = Math.round(this.pos.x);
    const y = Math.round(this.pos.y);
    if (stage === 'egg' || stage === 'crack') {
      const frame =
        stage === 'crack'
          ? eggFrame(1, 0, true)
          : eggFrame(fraction, this.elapsedMs, this.reducedMotion);
      this.egg?.setPosition(x, y).setFrame(frame).setFlipX(player.flipX).setDepth(depth);
      return stage;
    }
    this.egg?.destroy();
    this.egg = null;
    if (stage === 'burst') this.showBurst(x, y, depth, dt);
    else this.hideBurst();
    return stage;
  }

  private showBurst(x: number, y: number, depth: number, dt: number): void {
    if (!this.scene.textures.exists(HATCH_KEY)) return;
    this.burst ??= this.scene.add.sprite(x, y, HATCH_KEY, 0);
    const frame = Math.min(HATCH_FRAMES - 1, Math.floor((this.burstMs / HATCH_MS) * HATCH_FRAMES));
    this.burst
      .setPosition(x, y)
      .setFrame(frame)
      .setDepth(depth + 0.2)
      .setVisible(true);
    this.burstMs += dt;
  }

  private hideBurst(): void {
    this.burst?.destroy();
    this.burst = null;
  }

  destroy(): void {
    this.egg?.destroy();
    this.egg = null;
    this.hideBurst();
  }
}

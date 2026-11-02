import Phaser from 'phaser';
import type { EquippedGear, PetId } from '../../contracts';
import { prefersReducedMotion } from '../../platform/motion';
import { previewLayers, previewPetPlacement, type PreviewFit } from './gearPanelLogic';

const IDLE_MS = 450;

export interface GearPreviewOptions {
  /** Whole-number scale: window 4, player card 2, result screen 3. */
  scale: number;
  equipped?: EquippedGear;
  pet?: PetId | null;
  petGear?: string | null;
  flipX?: boolean;
  /** Optional frame (px, centred on the astronaut): the pet is placed fully inside it. */
  fit?: PreviewFit;
}

/**
 * Astronaut with armour layers (legs, body, head), optional pet with its armour in front.
 * Origin is the centre of the astronaut. Idle frames 0-1 unless reduced motion is on.
 */
export class GearPreview extends Phaser.GameObjects.Container {
  private readonly opts: Required<Omit<GearPreviewOptions, 'fit'>> & { fit?: PreviewFit };
  private readonly baseSprites: Phaser.GameObjects.Sprite[] = [];
  private idleFrame = 0;
  private idleTimer: Phaser.Time.TimerEvent | null = null;

  constructor(scene: Phaser.Scene, x: number, y: number, options: GearPreviewOptions) {
    super(scene, x, y);
    this.opts = {
      scale: Math.max(1, Math.round(options.scale)),
      equipped: options.equipped ?? { head: null, body: null, legs: null },
      pet: options.pet ?? null,
      petGear: options.petGear ?? null,
      flipX: options.flipX ?? false,
      fit: options.fit,
    };
    this.build();
    if (!prefersReducedMotion() && this.baseSprites.length > 0) {
      this.idleTimer = scene.time.addEvent({
        delay: IDLE_MS,
        loop: true,
        callback: () => {
          this.idleFrame = this.idleFrame === 0 ? 1 : 0;
          for (const s of this.baseSprites) s.setFrame(this.idleFrame);
        },
      });
    }
    scene.add.existing(this);
  }

  private layer(key: string, x: number, y: number): Phaser.GameObjects.Sprite | null {
    if (!this.scene.textures.exists(key)) return null;
    const s = this.scene.add.sprite(x, y, key, 0).setScale(this.opts.scale);
    s.setFlipX(this.opts.flipX);
    this.add(s);
    return s;
  }

  private build(): void {
    const layers = previewLayers(this.opts.equipped, this.opts.pet, this.opts.petGear);
    // Astronaut first, armour above in the order legs, body, head; pet last (in front).
    for (const key of ['astronaut', ...layers.gear]) {
      const s = this.layer(key, 0, 0);
      if (s) this.baseSprites.push(s);
    }
    if (layers.pet) {
      const { x: dx, y: dy } = previewPetPlacement(this.opts.scale, this.opts.flipX, this.opts.fit);
      this.layer(layers.pet, dx, dy);
      if (layers.petGear) this.layer(layers.petGear, dx, dy);
    }
  }

  /** Size of the astronaut layer in px. */
  get bodySize(): number {
    return 32 * this.opts.scale;
  }

  override destroy(fromScene?: boolean): void {
    this.idleTimer?.remove(false);
    this.idleTimer = null;
    super.destroy(fromScene);
  }
}

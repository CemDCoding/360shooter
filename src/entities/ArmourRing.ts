import Phaser from 'phaser';
import type { ArmourDef } from '../contracts/armour';

const RING_ALPHA = 0.5;
const RING_DEPTH = 50;
const RING_COLOR = 0xff7a1a;

/** Visual ring around the player. Display only; damage and timing live in the armour logic. */
export class ArmourRing {
  private circle: Phaser.GameObjects.Arc | null;

  constructor(scene: Phaser.Scene) {
    this.circle = scene.add
      .circle(0, 0, 1, RING_COLOR, RING_ALPHA)
      .setDepth(RING_DEPTH)
      .setVisible(false);
  }

  /** Shows the ring with the radius of the given armour. */
  show(def: ArmourDef): void {
    this.circle?.setRadius(def.radiusPx).setVisible(true);
  }

  hide(): void {
    this.circle?.setVisible(false);
  }

  /** Call every frame with the player position. */
  setCenter(x: number, y: number): void {
    this.circle?.setPosition(x, y);
  }

  destroy(): void {
    this.circle?.destroy();
    this.circle = null;
  }
}

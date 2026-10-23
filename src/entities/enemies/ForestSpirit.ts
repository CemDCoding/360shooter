import type Phaser from 'phaser';
import { Enemy, type EnemyContext } from './Enemy';

/** Aura behavior: walks to the center; the aura (see auraDamageAt) hurts nearby targets. */
export class ForestSpirit extends Enemy {
  constructor(scene: Phaser.Scene, ctx?: EnemyContext) {
    super(scene, 'forestSpirit', ctx);
  }

  protected behave(): void {
    this.moveToCenter();
  }
}

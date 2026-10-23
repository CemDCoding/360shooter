import type Phaser from 'phaser';
import { Enemy, type EnemyContext } from './Enemy';

/** Chase behavior: walks straight to the center. */
export class CursedTree extends Enemy {
  constructor(scene: Phaser.Scene, ctx?: EnemyContext) {
    super(scene, 'cursedTree', ctx);
  }

  protected behave(): void {
    this.moveToCenter();
  }
}

import type Phaser from 'phaser';
import { Enemy, type EnemyContext } from './Enemy';

/** Chase behavior: fast, walks straight to the center. */
export class ZombieSquirrel extends Enemy {
  constructor(scene: Phaser.Scene, ctx?: EnemyContext) {
    super(scene, 'zombieSquirrel', ctx);
  }

  protected behave(): void {
    this.moveToCenter();
  }
}

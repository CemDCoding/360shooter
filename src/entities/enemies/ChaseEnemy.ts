import { Enemy } from './Enemy';

/** Behavior 'chase': walks straight to the center. Used by tree, squirrel, and future chasers. */
export class ChaseEnemy extends Enemy {
  protected behave(): void {
    this.moveToCenter();
  }
}

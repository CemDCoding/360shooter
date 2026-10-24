import { Enemy } from './Enemy';

/** Behavior 'aura': walks to the center; the aura (see auraDamageAt) hurts nearby targets. */
export class AuraEnemy extends Enemy {
  protected behave(): void {
    this.moveToCenter();
  }
}

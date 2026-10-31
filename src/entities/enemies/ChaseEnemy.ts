import { ZIGZAG } from '../../config/enemies';
import { distance } from '../../logic/geometry';
import { zigzagVelocity } from '../../logic/zigzag';
import { Enemy } from './Enemy';

/**
 * Behavior 'chase': walks to the center. Used by tree, squirrel, bear, sphinx, snake and the fairy.
 * With `movement: 'zigzag'` (fairy, PE-127) the path swings sideways; the forward speed stays the plain
 * speed, so the time to contact equals a straight runner (AP-83). Base of the charge and burrow enemies.
 */
export class ChaseEnemy extends Enemy {
  private zigzagMs = 0;

  protected onSpawn(): void {
    this.zigzagMs = 0;
  }

  protected behave(delta: number): void {
    if (this.def.movement === 'zigzag') this.moveZigzag(delta);
    else this.moveToCenter();
  }

  private moveZigzag(delta: number): void {
    this.zigzagMs += Math.max(0, delta);
    const dist = distance(this.x, this.y, this.center.x, this.center.y);
    if (dist < 1) {
      this.halt();
    } else {
      const v = zigzagVelocity(
        { x: this.x, y: this.y },
        this.center,
        this.approachSpeed(dist),
        this.zigzagMs,
        ZIGZAG.amplitude,
        ZIGZAG.periodMs,
      );
      this.setVelocity(v.x, v.y);
    }
    this.faceCenter();
  }
}

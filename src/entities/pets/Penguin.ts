import type Phaser from 'phaser';
import type { PenguinDef } from '../../contracts';
import { nearestTarget, type Located } from '../../logic/pets';
import { Pet, PetSprite, petDepth, type PetWorld } from './Pet';
import { ActionTimer, ATTACK_FRAME_MS, FOLLOW_SPEED, petAnchor, stepTowards } from './petLogic';
import { SnowballPool } from './Snowball';

const FRAME_THROW = 5;
const FRAME_WINDUP = 4;
/** The ball leaves at the penguin's raised flipper, a little above its centre (px). */
const THROW_HEIGHT = 4;

/** Whole sprite scale of the snowball: the bigger ball (power-up) is shown at 2x (pixel grid). */
export function snowballSpriteScale(radiusFactor: number): number {
  return Math.max(1, Math.round(Number.isFinite(radiusFactor) ? radiusFactor : 1));
}

/** Penguin (PE-170): stands beside the astronaut and throws slowing snowballs at the nearest enemy. */
export class Penguin<E extends Located> extends Pet<E> {
  private readonly body: PetSprite;
  private readonly balls: SnowballPool<E>;
  private readonly timer = new ActionTimer();
  private pos: Located;
  /** Time left of the wind-up before the ball leaves; negative: no throw pending. */
  private windupMs = -1;

  constructor(scene: Phaser.Scene, def: PenguinDef, gearKey: string | null, start: Located) {
    super(scene, def, gearKey);
    this.pos = { ...start };
    this.body = new PetSprite(scene, 'penguin', gearKey, start.x, start.y);
    this.balls = new SnowballPool<E>(scene, this.reducedMotion);
  }

  update(dtMs: number, world: PetWorld<E>): void {
    const { player, stats, enemies } = world;
    this.pos = stepTowards(
      this.pos,
      petAnchor(player, player.flipX, 'penguin'),
      FOLLOW_SPEED,
      dtMs,
    );
    const depth = petDepth(player.depth);
    const target = nearestTarget(this.pos, enemies);
    // Wind-up (frame 4) first, the ball leaves with the throw frame (5) one attack frame later.
    if (this.windupMs >= 0) {
      this.windupMs -= Math.max(0, dtMs);
      if (this.windupMs < 0 && target) {
        const thrown = this.balls.throw(
          this.pos.x,
          this.pos.y - THROW_HEIGHT,
          target,
          snowballSpriteScale(stats.radius),
          depth + 0.1,
        );
        if (thrown) this.body.showAttack(FRAME_THROW);
      }
    } else if (this.timer.tick(dtMs, stats.cooldownMs, target !== null)) {
      this.windupMs = ATTACK_FRAME_MS;
      this.body.showAttack(FRAME_WINDUP);
    }
    this.body.place(this.pos.x, this.pos.y, player.flipX, depth, dtMs);
    this.balls.update(
      dtMs,
      enemies,
      stats.radius || 1,
      (e) => world.radiusOf(e),
      (enemy) => {
        world.damage(enemy, stats.damage, 'hit');
        // Slowed enemies get no own picture (brief H-35); Enemy.applySlow keeps the stronger effect.
        world.slow(enemy, { slow: stats.slow, durationMs: stats.slowMs });
      },
    );
  }

  destroy(): void {
    this.body.destroy();
    this.balls.destroy();
  }
}

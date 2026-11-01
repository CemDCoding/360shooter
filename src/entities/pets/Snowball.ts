import type Phaser from 'phaser';
import type { Located } from '../../logic/pets';
import { SNOWBALL_RADIUS, stepSnowball, type SnowballState } from './petLogic';

// Snowballs of the penguin (AP-144, brief H-35): pet-snowball 8x8 x 2, a small pool of sprites. No physics
// body: the hit test is a plain distance check against living enemies.

const SNOWBALL_KEY = 'pet-snowball';
const SPIN_FRAME_MS = 120;
/** Upper bound of balls in flight (one every 0.9 s or faster, each lives at most 2 s). */
export const SNOWBALL_POOL_MAX = 6;

interface Ball<E> extends SnowballState {
  sprite: Phaser.GameObjects.Sprite;
  target: E | null;
  live: boolean;
}

export class SnowballPool<E extends Located> {
  private readonly balls: Ball<E>[] = [];

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly reducedMotion: boolean,
  ) {}

  /** Balls in flight (for tests and the pool bound). */
  get liveCount(): number {
    return this.balls.filter((b) => b.live).length;
  }

  /** Throws a ball from (x, y) at the target; false if the pool is full or the texture is missing. */
  throw(x: number, y: number, target: E, scale: number, depth: number): boolean {
    if (!this.scene.textures.exists(SNOWBALL_KEY)) return false;
    let ball = this.balls.find((b) => !b.live);
    if (!ball) {
      if (this.balls.length >= SNOWBALL_POOL_MAX) return false;
      ball = {
        sprite: this.scene.add.sprite(x, y, SNOWBALL_KEY, 0),
        target: null,
        live: false,
        x,
        y,
        tx: x,
        ty: y,
        ageMs: 0,
      };
      this.balls.push(ball);
    }
    Object.assign(ball, { x, y, tx: target.x, ty: target.y, ageMs: 0, target, live: true });
    ball.sprite
      .setPosition(Math.round(x), Math.round(y))
      .setScale(scale)
      .setDepth(depth)
      .setFrame(0)
      .setVisible(true);
    return true;
  }

  /**
   * Moves all balls; `onHit` gets the enemy a ball reached. A ball whose target died flies on to the last
   * point and may hit another enemy on the way.
   */
  update(
    dtMs: number,
    enemies: readonly E[],
    hitScale: number,
    radiusOf: (e: E) => number,
    onHit: (enemy: E) => void,
  ): void {
    for (const b of this.balls) {
      if (!b.live) continue;
      if (b.target && !enemies.includes(b.target)) b.target = null;
      const res = stepSnowball(b, b.target, enemies, dtMs, SNOWBALL_RADIUS * hitScale, radiusOf);
      if (res !== null) {
        this.release(b);
        if (res !== 'gone') onHit(res);
        continue;
      }
      b.sprite.setPosition(Math.round(b.x), Math.round(b.y));
      if (!this.reducedMotion) b.sprite.setFrame(Math.floor(b.ageMs / SPIN_FRAME_MS) % 2);
    }
  }

  private release(b: Ball<E>): void {
    b.live = false;
    b.target = null;
    b.sprite.setVisible(false);
  }

  destroy(): void {
    for (const b of this.balls) b.sprite.destroy();
    this.balls.length = 0;
  }
}

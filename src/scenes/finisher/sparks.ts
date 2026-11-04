// Particles of the choreography player (M13, AP-182, PE-246, PE-248): pre-coloured images (atlas frames
// such as `rig-fx-root-6`, or a loaded texture), no tint, so they look the same under Canvas. One pool of
// `CHOREO_RULES.maxParticles` images, made at the start and reused; nothing is created in the update.
import type Phaser from 'phaser';
import { CHOREO_RULES } from '../../config/finishers';
import { CHOREO_DEPTH, type ChoreoContext } from './context';
import { seededRandom } from './layout';

/** Speed range (px/s) of a spark, how fast it halves (ms) and its default life (ms). */
const SPEED_MIN = 40;
const SPEED_MAX = 200;
const DRAG_HALF_MS = 300;
export const SPARK_LIFE_MS = 600;

interface Spark {
  x: number;
  y: number;
  vx: number;
  vy: number;
  age: number;
  life: number;
  img: Phaser.GameObjects.Image;
}

/** Texture and frame of a particle image; null when neither the atlas frame nor the texture is loaded. */
export function sparkTexture(
  textures: Pick<Phaser.Textures.TextureManager, 'exists' | 'get'>,
  atlas: string,
  texture: string,
): { key: string; frame: string | undefined } | null {
  if (textures.exists(atlas) && textures.get(atlas).has(texture))
    return { key: atlas, frame: texture };
  if (textures.exists(texture)) return { key: texture, frame: undefined };
  return null;
}

export class SparkPool {
  private readonly free: Spark[] = [];
  private readonly live: Spark[] = [];
  private readonly sparks: Spark[] = [];
  private readonly rnd: () => number;

  constructor(ctx: ChoreoContext, size: number = CHOREO_RULES.maxParticles) {
    this.rnd = seededRandom(ctx.data.levelId * 97 + 13);
    for (let i = 0; i < size; i++) {
      const img = ctx.scene.add
        .image(0, 0, '__DEFAULT')
        .setDepth(CHOREO_DEPTH.particles)
        .setVisible(false);
      ctx.addWorld(img);
      const s: Spark = { x: 0, y: 0, vx: 0, vy: 0, age: 0, life: 0, img };
      this.sparks.push(s);
      this.free.push(s);
    }
  }

  get alive(): number {
    return this.live.length;
  }

  get capacity(): number {
    return this.sparks.length;
  }

  /** Spawns up to `n` sparks at (x, y); never more than the pool holds. */
  spawn(
    n: number,
    x: number,
    y: number,
    key: string,
    frame: string | undefined,
    lifeMs: number,
  ): void {
    for (let i = 0; i < n; i++) {
      const s = this.free.pop();
      if (!s) return;
      const img = s.img;
      const a = this.rnd() * Math.PI * 2;
      const v = SPEED_MIN + this.rnd() * (SPEED_MAX - SPEED_MIN);
      s.x = x;
      s.y = y;
      s.vx = Math.cos(a) * v;
      s.vy = Math.sin(a) * v;
      s.age = 0;
      s.life = lifeMs * (0.7 + this.rnd() * 0.3);
      img.setTexture(key, frame).setPosition(Math.round(x), Math.round(y)).setVisible(true);
      this.live.push(s);
    }
  }

  /** Moves every spark by `dtMs` (real time, slower in slow motion). */
  update(dtMs: number): void {
    const drag = 0.5 ** (dtMs / DRAG_HALF_MS);
    for (let i = this.live.length - 1; i >= 0; i--) {
      const s = this.live[i];
      s.age += dtMs;
      if (s.age >= s.life) {
        s.img.setVisible(false);
        this.free.push(s);
        this.live[i] = this.live[this.live.length - 1];
        this.live.pop();
        continue;
      }
      s.x += (s.vx * dtMs) / 1000;
      s.y += (s.vy * dtMs) / 1000;
      s.vx *= drag;
      s.vy *= drag;
      s.img.setPosition(Math.round(s.x), Math.round(s.y));
    }
  }

  destroy(): void {
    for (const s of this.sparks) s.img.destroy();
    this.sparks.length = 0;
    this.live.length = 0;
    this.free.length = 0;
  }
}

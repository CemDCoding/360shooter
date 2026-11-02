// particles and shatter of the finisher (AP-160, brief H-39 decision 7a): shards `finisher-shards`
// (boss x 3 + 0..2) fly out from the hit point, turn into coral embers and vanish. At most
// FINISHER_RULES.maxParticles live at once. Own simple particles: tint and emitters are not needed,
// so they also work with the Canvas renderer.
import type Phaser from 'phaser';
import type { FinisherStep } from '../../contracts';
import { FINISHER_RULES } from '../../config/finishers';
import { THEME, themeColor } from '../../config/theme';
import type { BlockEffect, FinisherContext } from './context';
import { seededRandom } from './layout';

const SHARD_KEY = 'finisher-shards';
const SHARDS_PER_BOSS = 3;
const EMBER = THEME.sizePx['size.finisher-shard'];
/** Shards of one shatter at strength 1 (mockup: 70 in stage 6, about 40 in stage 5). */
export const SHATTER_MAX = 70;
/** Embers of one particles block at strength 1 (mockup: 24). */
export const SPARKS_MAX = 30;
/** Speed range (px/s) and how fast it halves (ms). */
const SPEED_MIN = 60;
const SPEED_MAX = 260;
const DRAG_HALF_MS = 400;
/** Share of the life a shard flies as a shard before it glows as an ember. */
const SHARD_SHARE = 0.55;

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  age: number;
  life: number;
  emberAt: number;
  color: number;
  img: Phaser.GameObjects.Image | null;
}

/** Number of particles a block spawns (strength 0..1 of the step). */
export function particleCount(max: number, strength: number | undefined): number {
  const s = Number.isFinite(strength) ? Math.min(1, Math.max(0, strength as number)) : 1;
  return Math.round(max * s);
}

export class ParticleSystem {
  private readonly list: Particle[] = [];
  private readonly pool: Phaser.GameObjects.Image[] = [];
  private readonly embers: Phaser.GameObjects.Graphics;
  private readonly rnd: () => number;
  private readonly colors = [themeColor('finisher.beam-rim').num, themeColor('finisher.name').num];
  private readonly hasShards: boolean;

  constructor(private readonly ctx: FinisherContext) {
    this.embers = ctx.scene.add.graphics();
    ctx.world.add(this.embers);
    this.rnd = seededRandom(ctx.data.levelId * 131 + 7);
    this.hasShards = ctx.scene.textures.exists(SHARD_KEY);
  }

  get alive(): number {
    return this.list.length;
  }

  /** Spawns up to `n` particles (never more than maxParticles alive). */
  spawn(n: number, lifeMs: number, withShards: boolean): void {
    const room = Math.max(0, FINISHER_RULES.maxParticles - this.list.length);
    const count = Math.min(room, Math.max(0, Math.floor(n)));
    const { x, y } = this.ctx.hit;
    for (let i = 0; i < count; i++) {
      const a = this.rnd() * Math.PI * 2;
      const v = SPEED_MIN + this.rnd() * (SPEED_MAX - SPEED_MIN);
      const life = lifeMs * (0.7 + this.rnd() * 0.3);
      let img: Phaser.GameObjects.Image | null = null;
      if (withShards && this.hasShards) {
        const frame = this.ctx.bossIndex * SHARDS_PER_BOSS + (i % SHARDS_PER_BOSS);
        img = this.pool.pop() ?? this.ctx.scene.add.image(0, 0, SHARD_KEY, frame);
        if (!img.parentContainer) this.ctx.world.add(img);
        img
          .setFrame(frame)
          .setScale(i % 3 === 0 ? 3 : 2)
          .setVisible(true);
      }
      this.list.push({
        x,
        y,
        vx: Math.cos(a) * v,
        vy: Math.sin(a) * v * 0.8,
        age: 0,
        life,
        emberAt: img ? life * SHARD_SHARE : 0,
        color: this.colors[i % 2],
        img,
      });
    }
  }

  /** Moves everything by `dtMs` of effect time (0 in a hitstop, slower in slow motion). */
  update(dtMs: number): void {
    this.embers.clear();
    const drag = 0.5 ** (dtMs / DRAG_HALF_MS);
    for (let i = this.list.length - 1; i >= 0; i--) {
      const p = this.list[i];
      p.age += dtMs;
      p.x += (p.vx * dtMs) / 1000;
      p.y += (p.vy * dtMs) / 1000;
      p.vx *= drag;
      p.vy *= drag;
      if (p.age >= p.life) {
        this.release(p);
        this.list.splice(i, 1);
        continue;
      }
      if (p.img && p.age < p.emberAt) {
        p.img.setPosition(Math.round(p.x), Math.round(p.y));
        continue;
      }
      if (p.img) {
        this.release(p);
        p.img = null;
      }
      this.embers
        .fillStyle(p.color, 1)
        .fillRect(Math.round(p.x) - EMBER / 2, Math.round(p.y) - EMBER / 2, EMBER, EMBER);
    }
  }

  private release(p: Particle): void {
    if (!p.img) return;
    p.img.setVisible(false);
    this.pool.push(p.img);
  }

  destroy(): void {
    for (const p of this.list) p.img?.destroy();
    for (const img of this.pool) img.destroy();
    this.list.length = 0;
    this.pool.length = 0;
    this.embers.destroy();
  }
}

/** shatter: the boss copy breaks into shards at once (life = step duration). */
export function shatter(
  ctx: FinisherContext,
  step: FinisherStep,
  system: ParticleSystem,
): BlockEffect {
  ctx.actors.setBossMode('hidden');
  system.spawn(particleCount(SHATTER_MAX, step.strength), step.durationMs, true);
  return { update() {}, destroy() {} };
}

/** particles: embers keep coming from the hit point during the step. */
export function particles(
  ctx: FinisherContext,
  step: FinisherStep,
  system: ParticleSystem,
): BlockEffect {
  const total = particleCount(SPARKS_MAX, step.strength);
  const life = Math.max(1, step.durationMs / 2);
  let spawned = 0;
  return {
    update(seqMs) {
      const due = Math.min(
        total,
        Math.floor((total * Math.max(0, seqMs)) / Math.max(1, step.durationMs - life)),
      );
      if (due > spawned) {
        system.spawn(due - spawned, life, false);
        spawned = due;
      }
    },
    destroy() {},
  };
}

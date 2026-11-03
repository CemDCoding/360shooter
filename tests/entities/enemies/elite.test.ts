import { describe, expect, it, vi } from 'vitest';
import { THEME } from '../../../src/config/theme';
import { ENEMIES } from '../../../src/config/enemies';
import { ELITE_RULES } from '../../../src/config/waves';
import { ChaseEnemy } from '../../../src/entities/enemies/ChaseEnemy';
import { EnemyPool } from '../../../src/entities/enemies/createEnemy';
import { eliteScale } from '../../../src/entities/enemies/Enemy';
import { enemyScaleFor } from '../../../src/logic/scaling';
import { CENTER, sceneOf, simulate } from './helpers';
import { makeScene, type StubScene } from './phaserStub';

vi.mock('phaser', () => import('./phaserStub'));

/** Image stand-in: records what the elite marking sets. */
class StubImage {
  visible = true;
  tint: number | undefined;
  tintMode: string | undefined;
  flipX = false;
  scaleX = 1;
  scaleY = 1;
  alpha = 1;
  depth = 0;
  height = 7;
  destroyed = false;
  constructor(
    public x: number,
    public y: number,
    public key: string,
  ) {}
  setTintFill(t: number): this {
    this.tint = t;
    this.tintMode = 'fill';
    return this;
  }
  setTexture(key: string): this {
    this.key = key;
    return this;
  }
  setPosition(x: number, y: number): this {
    this.x = x;
    this.y = y;
    return this;
  }
  setFlipX(v: boolean): this {
    this.flipX = v;
    return this;
  }
  setScale(x: number, y: number): this {
    this.scaleX = x;
    this.scaleY = y;
    return this;
  }
  setAlpha(a: number): this {
    this.alpha = a;
    return this;
  }
  setDepth(d: number): this {
    this.depth = d;
    return this;
  }
  setVisible(v: boolean): this {
    this.visible = v;
    return this;
  }
  destroy(): void {
    this.destroyed = true;
  }
}

function setup() {
  const scene = makeScene({ 'elite-crown': [9, 7] }) as StubScene & { images: StubImage[] };
  scene.images = [];
  (scene.add as unknown as Record<string, unknown>).image = (x: number, y: number, k: string) => {
    const i = new StubImage(x, y, k);
    scene.images.push(i);
    return i;
  };
  const enemy = new ChaseEnemy(sceneOf(scene), 'cursedTree', { center: CENTER });
  return { scene, enemy };
}

const EDGE = THEME.colors['game.elite-edge'].num;
const visibleImages = (s: { images: StubImage[] }) => s.images.filter((i) => i.visible);

describe('elite values (AP-178)', () => {
  it('multiplies hp by 3 and damage by 1.5 and leaves the rest of the scale alone', () => {
    const base = enemyScaleFor(12);
    const e = eliteScale(base, ELITE_RULES);
    expect(e.hp).toBeCloseTo(base.hp * 3);
    expect(e.contact).toBeCloseTo(base.contact * 1.5);
    expect(e.shot).toBeCloseTo(base.shot * 1.5);
    expect(e.xp).toBe(base.xp);
    expect(e.coin).toBe(base.coin);
    expect(e.size).toBe(base.size);
  });

  it('is on from the rules with the plan values', () => {
    expect(ELITE_RULES).toMatchObject({ enabled: true, hpMul: 3, damageMul: 1.5, scaleMul: 1.25 });
  });

  it('pool spawn gives hp x3 and the same speed as a regular enemy', () => {
    const { scene } = setup();
    const pool = new EnemyPool(sceneOf(scene), { center: CENTER } as never);
    const base = enemyScaleFor(12);
    const reg = pool.spawn('cursedTree', 0, 0, base);
    const regHp = reg.hp;
    const regSpeed = reg.def.speed;
    reg.despawn();
    const el = pool.spawn('cursedTree', 0, 0, eliteScale(base, ELITE_RULES));
    expect(el.hp).toBe(Math.round(ENEMIES.cursedTree.hp * base.hp * 3));
    expect(el.hp / regHp).toBeCloseTo(3, 1);
    expect(el.def.speed).toBe(regSpeed);
  });
});

describe('elite marking (AP-178, brief H-43)', () => {
  it('scales the size by scaleMul on top of the tier size', () => {
    const { enemy } = setup();
    enemy.spawn(100, 100, 1.2);
    enemy.markElite(ELITE_RULES.scaleMul);
    expect(enemy.scaleX).toBeCloseTo(1.2 * 1.25);
    expect(enemy.isElite).toBe(true);
  });

  it('draws 4 ice-white silhouette copies behind the body, 1 px away, and an unscaled untinted crown', () => {
    const { scene, enemy } = setup();
    enemy.spawn(100, 100, 1, 2);
    enemy.markElite(1.25);
    const edges = scene.images.filter((i) => i.tintMode === 'fill');
    expect(edges).toHaveLength(4);
    for (const i of edges) {
      expect(i.tint).toBe(EDGE);
      expect(Math.abs(i.x - 100)).toBe(1);
      expect(Math.abs(i.y - 100)).toBe(1);
      expect(i.depth).toBeLessThan(enemy.depth);
    }
    // The warm tier tint stays on the body.
    expect((enemy as unknown as { tint?: number }).tint).toBe(THEME.colors['game.tier-2'].num);
    const crown = scene.images.find((i) => i.key === 'elite-crown')!;
    expect(crown.tintMode).toBeUndefined();
    expect(crown.scaleX).toBe(1);
    const top = enemy.y - (enemy.height * enemy.scaleY) / 2;
    expect(crown.y + crown.height / 2).toBeCloseTo(top - THEME.sizePx['size.elite-crown-gap']);
  });

  it('follows the body while it moves', () => {
    const { scene, enemy } = setup();
    enemy.spawn(40, 60);
    enemy.markElite(1.25);
    simulate(enemy, 400);
    const edge = scene.images.find((i) => i.tintMode === 'fill')!;
    expect(Math.abs(edge.x - enemy.x)).toBeLessThan(3);
    expect(Math.abs(edge.y - enemy.y)).toBeLessThan(3);
  });

  it('resets everything on despawn and on a regular respawn (pool reuse)', () => {
    const { scene, enemy } = setup();
    enemy.spawn(100, 100);
    enemy.markElite(1.25);
    expect(visibleImages(scene)).toHaveLength(5);
    enemy.despawn();
    expect(visibleImages(scene)).toHaveLength(0);
    // The flag survives the death, so the kill rewards can read it.
    expect(enemy.isElite).toBe(true);
    enemy.spawn(100, 100);
    expect(enemy.isElite).toBe(false);
    expect(enemy.scaleX).toBe(1);
    expect(visibleImages(scene)).toHaveLength(0);
    simulate(enemy, 100);
    expect(visibleImages(scene)).toHaveLength(0);
  });

  it('creates the copies once and reuses them for the next elite', () => {
    const { scene, enemy } = setup();
    enemy.spawn(100, 100);
    enemy.markElite(1.25);
    enemy.despawn();
    enemy.spawn(10, 10);
    enemy.markElite(1.25);
    expect(scene.images).toHaveLength(5);
    expect(visibleImages(scene)).toHaveLength(5);
  });

  it('removes the copies with the enemy', () => {
    const { scene, enemy } = setup();
    enemy.spawn(100, 100);
    enemy.markElite(1.25);
    enemy.destroy();
    expect(scene.images.every((i) => i.destroyed)).toBe(true);
  });
});

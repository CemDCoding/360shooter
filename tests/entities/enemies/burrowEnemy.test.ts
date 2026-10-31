import { describe, expect, it, vi } from 'vitest';
import { MIN_TELEGRAPH_MS } from '../../../src/config/bosses';
import { ENEMIES } from '../../../src/config/enemies';
import { OPACITY } from '../../../src/config/theme';
import { BurrowEnemy, emergeFillAlpha } from '../../../src/entities/enemies/BurrowEnemy';
import { CENTER, bodyOf, runUntil, sceneOf, simulate } from './helpers';
import { makeScene } from './phaserStub';

vi.mock('phaser', () => import('./phaserStub'));

const DEF = ENEMIES.sandWorm.burrow!;

function spawn(dx = 300) {
  const scene = makeScene();
  const e = new BurrowEnemy(sceneOf(scene), 'sandWorm', { center: CENTER });
  e.spawn(CENTER.x + dx, CENTER.y);
  return { scene, e };
}

const distToCenter = (e: { x: number; y: number }) => Math.hypot(e.x - CENTER.x, e.y - CENTER.y);

describe('BurrowEnemy (PE-127)', () => {
  it('chases above the sand first and can be hit there', () => {
    const { e } = spawn();
    simulate(e, 500);
    expect(e.phase).toBe('surface');
    expect(e.isInvulnerable).toBe(false);
    expect(bodyOf(e).enable).toBe(true);
    expect(distToCenter(e)).toBeLessThan(300);
    const hp = e.hp;
    e.takeDamage(5);
    expect(e.hp).toBe(hp - 5);
  });

  it('under the sand: invulnerable, no body for lasers or contact, dimmed with a sand hill', () => {
    const { e, scene } = spawn();
    runUntil(e, () => e.phase === 'under');
    simulate(e, 16);
    expect(e.isInvulnerable).toBe(true);
    expect(bodyOf(e).enable).toBe(false);
    expect(e.active).toBe(true);
    expect(e.visible).toBe(true);
    expect(e.alpha).toBe(OPACITY.dim);
    expect(scene.graphics[0]?.drawn).toContain('strokeEllipse');
    const hp = e.hp;
    expect(e.takeDamage(1000)).toBe(false);
    expect(e.hp).toBe(hp);
  });

  it('the hill walks toward the player but stops at the surfacing distance', () => {
    const { e } = spawn(400);
    runUntil(e, () => e.phase === 'under');
    const start = distToCenter(e);
    simulate(e, 300);
    expect(distToCenter(e)).toBeLessThan(start);
    runUntil(e, () => e.phase !== 'under');
    expect(distToCenter(e)).toBeGreaterThanOrEqual(DEF.surfaceDistance - 1e-6);
  });

  it('announces surfacing for at least 700 ms with a filling warning circle', () => {
    const { e, scene } = spawn(150);
    runUntil(e, () => e.phase === 'emerge');
    const total = Math.max(MIN_TELEGRAPH_MS, DEF.telegraphMs);
    expect(e.isInvulnerable).toBe(true);
    let emergeMs = 0;
    const fills: number[] = [];
    while (e.phase === 'emerge') {
      simulate(e, 16);
      if (e.phase !== 'emerge') break;
      emergeMs += 16;
      const g = scene.graphics[0]!;
      expect(g.drawn).toContain('strokeCircle');
      const fill = g.calls.find((c) => c[0] === 'fillStyle');
      fills.push(Number(fill?.[2]));
    }
    expect(emergeMs + 32).toBeGreaterThanOrEqual(total);
    expect(fills[fills.length - 1]).toBeGreaterThan(fills[0]!);
  });

  it('surfaces at least surfaceDistance from the player, hittable and opaque again', () => {
    const { e, scene } = spawn(150);
    runUntil(e, () => e.phase === 'emerge');
    runUntil(e, () => e.phase === 'surface');
    expect(distToCenter(e)).toBeGreaterThanOrEqual(DEF.surfaceDistance - 1e-6);
    expect(bodyOf(e).enable).toBe(true);
    expect(e.alpha).toBe(1);
    expect(scene.graphics[0]?.visible).toBe(false);
    expect(e.isInvulnerable).toBe(false);
  });

  it('comes back from the pool above the sand (no burrowed state left)', () => {
    const { e, scene } = spawn();
    runUntil(e, () => e.phase === 'under');
    e.despawn();
    expect(scene.graphics[0]?.visible).toBe(false);
    e.spawn(CENTER.x + 300, CENTER.y);
    expect(e.phase).toBe('surface');
    expect(e.isInvulnerable).toBe(false);
    expect(bodyOf(e).enable).toBe(true);
    expect(e.alpha).toBe(1);
  });

  it('emergeFillAlpha grows from 0 to OPACITY.dim', () => {
    expect(emergeFillAlpha(800, 800)).toBe(0);
    expect(emergeFillAlpha(400, 800)).toBeCloseTo(OPACITY.dim / 2);
    expect(emergeFillAlpha(0, 800)).toBeCloseTo(OPACITY.dim);
    expect(emergeFillAlpha(0, 0)).toBe(OPACITY.dim);
  });
});

import { afterEach, describe, expect, it, vi } from 'vitest';
import { MIN_TELEGRAPH_MS } from '../../../src/config/bosses';
import { CHARGE_TRIGGER_DISTANCE, ENEMIES } from '../../../src/config/enemies';
import { OPACITY } from '../../../src/config/theme';
import type { EnemyId } from '../../../src/contracts';
import { ChargeEnemy, telegraphAlpha } from '../../../src/entities/enemies/ChargeEnemy';
import { CENTER, bodyOf, runUntil, sceneOf, simulate } from './helpers';
import { makeScene } from './phaserStub';

vi.mock('phaser', () => import('./phaserStub'));

const CHARGERS: EnemyId[] = ['boar', 'armadillo'];

function spawn(id: EnemyId, dx = 200) {
  const scene = makeScene();
  const e = new ChargeEnemy(sceneOf(scene), id, { center: CENTER });
  e.spawn(CENTER.x + dx, CENTER.y);
  return { scene, e };
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('ChargeEnemy (PE-127)', () => {
  it.each(CHARGERS)('%s gives at least 1000 ms reaction time from the announcement', (id) => {
    const c = ENEMIES[id].charge!;
    const reaction = c.telegraphMs + (CHARGE_TRIGGER_DISTANCE / c.dashSpeed) * 1000;
    expect(c.telegraphMs).toBeGreaterThanOrEqual(MIN_TELEGRAPH_MS);
    expect(reaction).toBeGreaterThanOrEqual(1000);
  });

  it.each(CHARGERS)(
    '%s walks slowly, announces at least 700 ms standing still, then dashes',
    (id) => {
      const { e, scene } = spawn(id);
      const c = ENEMIES[id].charge!;
      runUntil(e, () => e.phase === 'telegraph');
      expect(Math.hypot(e.x - CENTER.x, e.y - CENTER.y)).toBeCloseTo(CHARGE_TRIGGER_DISTANCE, 0);
      const total = Math.max(MIN_TELEGRAPH_MS, c.telegraphMs);
      // The announcement may start inside the last walking step: at most one step is already gone.
      const startLeft = e.telegraphLeftMs;
      expect(startLeft).toBeGreaterThanOrEqual(total - 16);

      let telegraphMs = 0;
      let movedDuringTelegraph = false;
      let ringShown = false;
      while (e.phase === 'telegraph') {
        simulate(e, 16);
        if (e.phase !== 'telegraph') break;
        telegraphMs += 16;
        const v = bodyOf(e).velocity;
        if (v.x !== 0 || v.y !== 0) movedDuringTelegraph = true;
        if (scene.graphics[0]?.drawn.includes('strokeCircle')) ringShown = true;
      }
      expect(telegraphMs + 16).toBeGreaterThanOrEqual(startLeft);
      expect(movedDuringTelegraph).toBe(false);
      expect(ringShown).toBe(true);
      expect(e.phase).toBe('dash');
      // The first dash step may still contain the end of the announcement: check a full step.
      simulate(e, 16);
      expect(e.phase).toBe('dash');
      expect(Math.hypot(bodyOf(e).velocity.x, bodyOf(e).velocity.y)).toBeCloseTo(c.dashSpeed, 0);
      // The announcement is gone as soon as the dash runs.
      expect(scene.graphics[0]?.visible).toBe(false);
      expect(e.alpha).toBe(1);
      runUntil(e, () => e.phase === 'recover');
      simulate(e, 16);
      expect(e.phase).toBe('recover');
      expect(bodyOf(e).velocity).toEqual({ x: 0, y: 0 });
    },
  );

  it('dashes along the line to the point fixed when the announcement started', () => {
    const { e, scene } = spawn('boar');
    runUntil(e, () => e.phase === 'telegraph');
    simulate(e, 16);
    const line = scene.graphics[0]!.calls.find((c) => c[0] === 'lineBetween')!;
    expect(line.slice(3, 5)).toEqual([CENTER.x, CENTER.y]);
    runUntil(e, () => e.phase === 'dash');
    simulate(e, 16);
    expect(bodyOf(e).velocity.x).toBeLessThan(0);
    expect(bodyOf(e).velocity.y).toBeCloseTo(0);
  });

  it('blinks during the announcement, with reduced motion only the outline ring', () => {
    const { e } = spawn('boar');
    runUntil(e, () => e.phase === 'telegraph');
    const alphas = new Set<number>();
    while (e.phase === 'telegraph') {
      simulate(e, 16);
      if (e.phase === 'telegraph') alphas.add(e.alpha);
    }
    expect(alphas).toEqual(new Set([1, OPACITY.blink]));

    vi.stubGlobal('matchMedia', () => ({ matches: true }));
    const reduced = spawn('boar');
    runUntil(reduced.e, () => reduced.e.phase === 'telegraph');
    simulate(reduced.e, 16);
    expect(reduced.e.alpha).toBe(1);
    expect(reduced.scene.graphics[0]?.drawn).toContain('strokeCircle');
  });

  it('telegraphAlpha alternates slowly and never blinks with reduced motion', () => {
    expect(telegraphAlpha(0, false)).toBe(1);
    expect(telegraphAlpha(350, false)).toBe(OPACITY.blink);
    expect(telegraphAlpha(650, false)).toBe(1);
    for (const t of [0, 350, 650, 1000]) expect(telegraphAlpha(t, true)).toBe(1);
  });

  it('armadillo takes half damage while rolling, full damage otherwise; the boar always full', () => {
    const { e } = spawn('armadillo');
    const hp = e.hp;
    e.takeDamage(10);
    expect(e.hp).toBe(hp - 10);
    runUntil(e, () => e.phase === 'dash');
    e.takeDamage(10);
    expect(e.hp).toBe(hp - 15);
    runUntil(e, () => e.phase === 'recover');
    e.takeDamage(10);
    expect(e.hp).toBe(hp - 25);

    const boar = spawn('boar').e;
    runUntil(boar, () => boar.phase === 'dash');
    boar.takeDamage(10);
    expect(boar.hp).toBe(ENEMIES.boar.hp - 10);
  });

  it('starts fresh after the pool revives it (no phase, alpha or ring left)', () => {
    const { e, scene } = spawn('boar');
    runUntil(e, () => e.phase === 'telegraph');
    simulate(e, 400);
    e.despawn();
    expect(scene.graphics[0]?.visible).toBe(false);
    e.spawn(CENTER.x + 300, CENTER.y);
    expect(e.phase).toBe('approach');
    expect(e.telegraphLeftMs).toBe(0);
    expect(e.alpha).toBe(1);
  });
});

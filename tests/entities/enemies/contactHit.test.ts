import { describe, expect, it, vi } from 'vitest';
import { CONTACT_HIT_SECONDS, ENEMIES } from '../../../src/config/enemies';
import type { EnemyId } from '../../../src/contracts';
import { EnemyPool } from '../../../src/entities/enemies/createEnemy';
import { WitchBoltPool } from '../../../src/entities/enemies/WitchBoltPool';
import { dealsContactHit } from '../../../src/logic/contactHit';
import { CENTER, bodyOf, runUntil, sceneOf, simulate } from './helpers';
import { makeScene } from './phaserStub';

vi.mock('phaser', () => import('./phaserStub'));

function setup() {
  const scene = makeScene({ 'witch-bolt': [8, 8] });
  const boltPool = new WitchBoltPool(sceneOf(scene));
  const onDeath = vi.fn();
  const pool = new EnemyPool(sceneOf(scene), { center: CENTER, boltPool, onDeath });
  return { pool, onDeath };
}

const phaseOf = (e: object) => (e as unknown as { phase: string }).phase;
const HIT_IDS = Object.values(ENEMIES)
  .filter((d) => dealsContactHit(d.behavior, d.contactDamage))
  .map((d) => [d.id]);

describe('contact hit (AP-112)', () => {
  it.each(HIT_IDS)('%s hits once and vanishes without onDeath', (id) => {
    const { pool, onDeath } = setup();
    const e = pool.spawn(id as EnemyId, CENTER.x + 20, CENTER.y);
    const def = ENEMIES[id as EnemyId];
    expect(e.contactDamageFor(16)).toBeCloseTo(def.contactDamage * CONTACT_HIT_SECONDS);
    expect(e.contactDamageFor(16)).toBe(0);
    expect(bodyOf(e).enable).toBe(false);
    expect(bodyOf(e).velocity).toEqual({ x: 0, y: 0 });
    expect(e.active).toBe(true);
    simulate(e, 300);
    expect(e.active).toBe(false);
    expect(onDeath).not.toHaveBeenCalled();
  });

  it('takeDamage after the hit does not kill (no coin, no xp)', () => {
    const { pool, onDeath } = setup();
    const e = pool.spawn('cursedTree', CENTER.x + 20, CENTER.y);
    e.contactDamageFor(16);
    expect(e.takeDamage(9999)).toBe(false);
    expect(onDeath).not.toHaveBeenCalled();
    expect(e.active).toBe(true);
  });

  it('pool reuse resets the hit and hits exactly once again', () => {
    const { pool } = setup();
    const e = pool.spawn('cursedTree', CENTER.x + 20, CENTER.y);
    e.contactDamageFor(16);
    simulate(e, 300);
    const again = pool.spawn('cursedTree', CENTER.x + 20, CENTER.y);
    expect(again).toBe(e);
    expect(bodyOf(again).enable).toBe(true);
    expect((again as unknown as { tint?: number }).tint).toBeUndefined();
    expect(again.contactDamageFor(16)).toBeGreaterThan(0);
    expect(again.contactDamageFor(16)).toBe(0);
  });

  it('charging boar hits once during the dash and stops', () => {
    const { pool } = setup();
    const boar = pool.spawn('boar', CENTER.x + 300, CENTER.y);
    runUntil(boar, () => phaseOf(boar) === 'dash');
    expect(boar.contactDamageFor(16)).toBeCloseTo(ENEMIES.boar.contactDamage * CONTACT_HIT_SECONDS);
    simulate(boar, 16);
    expect(bodyOf(boar).velocity).toEqual({ x: 0, y: 0 });
    expect(boar.contactDamageFor(16)).toBe(0);
  });

  it('burrowed sand worm cannot hit, a surfaced one hits once', () => {
    const { pool } = setup();
    const w = pool.spawn('sandWorm', CENTER.x + 300, CENTER.y);
    runUntil(w, () => phaseOf(w) === 'under');
    simulate(w, 16);
    expect(w.contactDamageFor(16)).toBe(0);
    runUntil(w, () => phaseOf(w) === 'surface');
    expect(w.contactDamageFor(16)).toBeGreaterThan(0);
    expect(w.contactDamageFor(16)).toBe(0);
  });

  it('a worm that hit never switches its body on again', () => {
    const { pool } = setup();
    const w = pool.spawn('sandWorm', CENTER.x + 300, CENTER.y);
    w.contactDamageFor(16);
    simulate(w, 100);
    expect(bodyOf(w).enable).toBe(false);
  });

  it('aura enemy keeps its damage per second and never despawns by contact', () => {
    const { pool } = setup();
    const s = pool.spawn('forestSpirit', CENTER.x + 20, CENTER.y);
    const a = s.contactDamageFor(1000);
    expect(a).toBeCloseTo(ENEMIES.forestSpirit.contactDamage);
    expect(s.contactDamageFor(1000)).toBeCloseTo(a);
    simulate(s, 500);
    expect(s.active).toBe(true);
    expect(bodyOf(s).enable).toBe(true);
  });

  it('shooters keep the damage per second', () => {
    const { pool } = setup();
    const w = pool.spawn('forestWitch', CENTER.x + 20, CENTER.y);
    expect(w.contactDamageFor(1000)).toBeCloseTo(ENEMIES.forestWitch.contactDamage);
    expect(w.contactDamageFor(1000)).toBeCloseTo(ENEMIES.forestWitch.contactDamage);
    expect(w.active).toBe(true);
  });
});

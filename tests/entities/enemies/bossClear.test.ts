import { describe, expect, it, vi } from 'vitest';
import { ENEMIES } from '../../../src/config/enemies';
import type { EnemyId } from '../../../src/contracts';
import { EnemyPool } from '../../../src/entities/enemies/createEnemy';
import { WitchBoltPool } from '../../../src/entities/enemies/WitchBoltPool';
import { clearForBoss } from '../../../src/logic/bossClear';
import { CENTER, bodyOf, runUntil, sceneOf, simulate } from './helpers';
import { makeScene } from './phaserStub';

vi.mock('phaser', () => import('./phaserStub'));

function setup() {
  const scene = makeScene({ 'witch-bolt': [8, 8] });
  const boltPool = new WitchBoltPool(sceneOf(scene));
  const onDeath = vi.fn();
  const pool = new EnemyPool(sceneOf(scene), { center: CENTER, boltPool, onDeath });
  return { pool, boltPool, onDeath };
}

const phaseOf = (e: object) => (e as unknown as { phase: string }).phase;
const ALL_IDS = Object.keys(ENEMIES) as EnemyId[];

describe('boss clear on real entities (AP-114)', () => {
  it('clears every enemy type without onDeath and the pool reuses them fresh', () => {
    const { pool, boltPool, onDeath } = setup();
    const list = ALL_IDS.map((id) => pool.spawn(id, CENTER.x + 150, CENTER.y));
    const r = clearForBoss(pool.enemies, boltPool.bolts);
    expect(r.enemies).toBe(list.length);
    for (const e of list) expect(e.active).toBe(false);
    expect(onDeath).not.toHaveBeenCalled();
    expect(clearForBoss(pool.enemies, boltPool.bolts).enemies).toBe(0);
    const again = pool.spawn(ALL_IDS[0]!, CENTER.x + 150, CENTER.y);
    expect(again.active).toBe(true);
    expect(bodyOf(again).enable).toBe(true);
  });

  it('clears a burrowed (invulnerable) sand worm', () => {
    const { pool, boltPool } = setup();
    const w = pool.spawn('sandWorm', CENTER.x + 200, CENTER.y);
    runUntil(w, () => bodyOf(w).enable === false, 20_000);
    clearForBoss(pool.enemies, boltPool.bolts);
    expect(w.active).toBe(false);
  });

  it('clears a boar during the dash without damage', () => {
    const { pool, boltPool, onDeath } = setup();
    const boar = pool.spawn('boar', CENTER.x + 300, CENTER.y);
    runUntil(boar, () => phaseOf(boar) === 'dash');
    clearForBoss(pool.enemies, boltPool.bolts);
    expect(boar.active).toBe(false);
    expect(boar.contactDamageFor(16)).toBe(0);
    expect(onDeath).not.toHaveBeenCalled();
  });

  it('clears a contact-spent enemy and gives no second damage', () => {
    const { pool, boltPool } = setup();
    const e = pool.spawn('cursedTree', CENTER.x + 20, CENTER.y);
    e.contactDamageFor(16);
    clearForBoss(pool.enemies, boltPool.bolts);
    expect(e.active).toBe(false);
    expect(e.contactDamageFor(16)).toBe(0);
  });

  it('forest spirit deals no aura damage after the clear', () => {
    const { pool, boltPool } = setup();
    const s = pool.spawn('forestSpirit', CENTER.x, CENTER.y);
    simulate(s, 16);
    clearForBoss(pool.enemies, boltPool.bolts);
    expect(s.auraDamageAt(CENTER.x, CENTER.y, 1000)).toBe(0);
  });

  it('clears active bolts of shooters', () => {
    const { pool, boltPool } = setup();
    boltPool.fire(CENTER.x, CENTER.y, CENTER.x + 100, CENTER.y, 5, 100);
    expect(boltPool.bolts.some((b) => b.active)).toBe(true);
    clearForBoss(pool.enemies, boltPool.bolts);
    expect(boltPool.bolts.every((b) => !b.active)).toBe(true);
  });
});

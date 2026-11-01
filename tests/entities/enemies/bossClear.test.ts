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
  // Stand-ins for the scene's reward paths: they must never be touched by the clear.
  const rewards = { kills: 0, killXp: 0, pendingDrops: [] as unknown[] };
  const onDeath = vi.fn(() => {
    rewards.kills += 1;
    rewards.killXp += 1;
    rewards.pendingDrops.push({});
  });
  const pool = new EnemyPool(sceneOf(scene), { center: CENTER, boltPool, onDeath });
  const clear = () => clearForBoss(pool.enemies, boltPool.bolts);
  return { scene, pool, boltPool, onDeath, rewards, clear };
}

const phaseOf = (e: object) => (e as unknown as { phase: string }).phase;
const ALL_IDS = Object.keys(ENEMIES) as EnemyId[];

describe('boss clear on real entities (AP-114)', () => {
  it('(a) a cleared enemy restarts fresh from the pool', () => {
    const { pool, clear, scene } = setup();
    const e = pool.spawn('boar', CENTER.x + 300, CENTER.y);
    runUntil(e, () => phaseOf(e) === 'telegraph');
    e.alpha = 0.3;
    e.hp = 1;
    clear();
    expect(e.active).toBe(false);
    const again = pool.spawn('boar', CENTER.x + 300, CENTER.y);
    expect(again).toBe(e);
    expect(again.active).toBe(true);
    expect(again.hp).toBe(ENEMIES.boar.hp);
    expect(phaseOf(again)).toBe('approach');
    expect(again.alpha).toBe(1);
    expect(bodyOf(again).enable).toBe(true);
    expect(scene.graphics[0]?.visible).toBe(false);
  });

  it('(a) a cleared bolt carries only the values of the next shot', () => {
    const { boltPool, clear } = setup();
    boltPool.fire(CENTER.x, CENTER.y, CENTER.x + 100, CENTER.y, 5, 100);
    const old = boltPool.bolts[0]!;
    expect(old.active).toBe(true);
    clear();
    expect(old.active).toBe(false);
    boltPool.fire(CENTER.x, CENTER.y, CENTER.x, CENTER.y + 100, 9, 50);
    expect(boltPool.bolts[0]).toBe(old);
    expect(old.active).toBe(true);
    expect(bodyOf(old).velocity.x).toBeCloseTo(0, 5);
    expect(bodyOf(old).velocity.y).toBeCloseTo(50, 5);
  });

  it('(b) a burrowed sand worm is cleared and its hill is gone', () => {
    const { pool, clear, scene, onDeath } = setup();
    const w = pool.spawn('sandWorm', CENTER.x + 200, CENTER.y);
    runUntil(w, () => phaseOf(w) === 'under');
    simulate(w, 16);
    expect(bodyOf(w).enable).toBe(false);
    expect(scene.graphics[0]?.visible).toBe(true);
    clear();
    expect(w.active).toBe(false);
    expect(scene.graphics[0]?.visible).toBe(false);
    expect(scene.graphics[0]?.drawn).toEqual([]);
    expect(onDeath).not.toHaveBeenCalled();
  });

  it('(c) a boar in the dash is gone and deals no damage', () => {
    const { pool, clear, onDeath } = setup();
    const boar = pool.spawn('boar', CENTER.x + 300, CENTER.y);
    runUntil(boar, () => phaseOf(boar) === 'dash');
    clear();
    expect(boar.active).toBe(false);
    expect(boar.contactDamageFor(16)).toBe(0);
    expect(onDeath).not.toHaveBeenCalled();
  });

  it('(d) charge announcement ring and line disappear', () => {
    const { pool, clear, scene } = setup();
    const boar = pool.spawn('boar', CENTER.x + 300, CENTER.y);
    runUntil(boar, () => phaseOf(boar) === 'telegraph');
    simulate(boar, 32);
    expect(scene.graphics[0]?.visible).toBe(true);
    expect(scene.graphics[0]?.drawn).toContain('strokeCircle');
    expect(scene.graphics[0]?.drawn).toContain('lineBetween');
    clear();
    expect(boar.active).toBe(false);
    expect(scene.graphics[0]?.visible).toBe(false);
    expect(scene.graphics[0]?.drawn).toEqual([]);
  });

  it('(d) sand worm eruption warning circle disappears', () => {
    const { pool, clear, scene } = setup();
    const w = pool.spawn('sandWorm', CENTER.x + 200, CENTER.y);
    runUntil(w, () => scene.graphics[0]?.drawn.includes('fillCircle') === true, 120_000);
    expect(scene.graphics[0]?.drawn).toContain('fillCircle');
    clear();
    expect(w.active).toBe(false);
    expect(scene.graphics[0]?.visible).toBe(false);
    expect(scene.graphics[0]?.drawn).toEqual([]);
  });

  it('(e) no kill, xp or drop is produced, for every enemy type', () => {
    const { pool, clear, onDeath, rewards } = setup();
    for (const id of ALL_IDS) pool.spawn(id, CENTER.x + 150, CENTER.y);
    const r = clear();
    expect(r.enemies).toBe(ALL_IDS.length);
    expect(pool.enemies.every((e) => !e.active)).toBe(true);
    expect(onDeath).not.toHaveBeenCalled();
    expect(rewards).toEqual({ kills: 0, killXp: 0, pendingDrops: [] });
  });

  it('(f) a second clear despawns nothing', () => {
    const { pool, clear } = setup();
    pool.spawn('cursedTree', CENTER.x + 150, CENTER.y);
    expect(clear().enemies).toBe(1);
    expect(clear()).toEqual({ enemies: 0, bolts: 0 });
  });

  it('(h) forest spirit: aura circle hidden, no aura damage', () => {
    const { pool, clear } = setup();
    const s = pool.spawn('forestSpirit', CENTER.x, CENTER.y);
    expect(s.auraDamageAt(CENTER.x, CENTER.y, 1000)).toBeGreaterThan(0);
    clear();
    expect(s.active).toBe(false);
    expect(s.auraDamageAt(CENTER.x, CENTER.y, 1000)).toBe(0);
  });

  it('(i) shooters and their bolts in flight are gone', () => {
    const { pool, boltPool, clear } = setup();
    const shooters = (['forestWitch', 'mummy', 'camel', 'archaeologist'] as const).filter(
      (id) => id in ENEMIES,
    );
    const list = shooters.map((id) => pool.spawn(id as EnemyId, CENTER.x + 100, CENTER.y));
    boltPool.fire(CENTER.x, CENTER.y, CENTER.x + 100, CENTER.y, 5, 100);
    boltPool.fire(CENTER.x, CENTER.y, CENTER.x, CENTER.y + 100, 5, 100);
    const r = clear();
    expect(r.bolts).toBe(2);
    expect(list.every((e) => !e.active)).toBe(true);
    expect(boltPool.bolts.every((b) => !b.active)).toBe(true);
  });

  it('(j) a contact-spent enemy is cleared without a second hit or reward', () => {
    const { pool, clear, onDeath } = setup();
    const e = pool.spawn('cursedTree', CENTER.x + 20, CENTER.y);
    expect(e.contactDamageFor(16)).toBeGreaterThan(0);
    clear();
    expect(e.active).toBe(false);
    expect(e.contactDamageFor(16)).toBe(0);
    expect(onDeath).not.toHaveBeenCalled();
  });
});

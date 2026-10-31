import { describe, expect, it, vi } from 'vitest';
import { ENEMIES, ENEMY_BODY_SIZE, ZIGZAG } from '../../../src/config/enemies';
import type { EnemyId } from '../../../src/contracts';
import { AuraEnemy } from '../../../src/entities/enemies/AuraEnemy';
import { BurrowEnemy } from '../../../src/entities/enemies/BurrowEnemy';
import { ChargeEnemy } from '../../../src/entities/enemies/ChargeEnemy';
import { ChaseEnemy } from '../../../src/entities/enemies/ChaseEnemy';
import { EnemyPool, createEnemy } from '../../../src/entities/enemies/createEnemy';
import { ForestWitch } from '../../../src/entities/enemies/ForestWitch';
import { WitchBoltPool } from '../../../src/entities/enemies/WitchBoltPool';
import { CENTER, bodyOf, sceneOf } from './helpers';
import { makeScene } from './phaserStub';

vi.mock('phaser', () => import('./phaserStub'));

const CLASS_OF = {
  chase: ChaseEnemy,
  aura: AuraEnemy,
  shooter: ForestWitch,
  charge: ChargeEnemy,
  burrow: BurrowEnemy,
} as const;

function setup() {
  const scene = makeScene({ 'witch-bolt': [8, 8] });
  const boltPool = new WitchBoltPool(sceneOf(scene));
  return { scene, boltPool };
}

describe('createEnemy without the AP-97 fallbacks (AP-101)', () => {
  it.each(Object.keys(ENEMIES) as EnemyId[])('creates %s with the class of its behaviour', (id) => {
    const { scene, boltPool } = setup();
    const e = createEnemy(sceneOf(scene), id, { boltPool, center: CENTER });
    expect(e).toBeInstanceOf(CLASS_OF[ENEMIES[id].behavior]);
    expect(e.def.id).toBe(id);
  });

  it('runs charge and burrow in their own classes, not as plain chasers', () => {
    const { scene } = setup();
    expect(createEnemy(sceneOf(scene), 'boar')).toBeInstanceOf(ChargeEnemy);
    expect(createEnemy(sceneOf(scene), 'armadillo')).toBeInstanceOf(ChargeEnemy);
    expect(createEnemy(sceneOf(scene), 'sandWorm')).toBeInstanceOf(BurrowEnemy);
  });

  it('still needs a bolt pool for shooters', () => {
    const { scene } = setup();
    expect(() => createEnemy(sceneOf(scene), 'camel')).toThrow(/boltPool/);
    expect(() => createEnemy(sceneOf(scene), 'mummy')).toThrow(/boltPool/);
  });

  it('sets the hit box of the M5 enemies from the config, not from the placeholder PNG', () => {
    const { scene, boltPool } = setup();
    for (const [id, size] of Object.entries(ENEMY_BODY_SIZE) as [EnemyId, number][]) {
      const e = createEnemy(sceneOf(scene), id, { boltPool });
      expect(bodyOf(e).width, id).toBe(size);
      expect(bodyOf(e).height, id).toBe(size);
    }
    expect(ENEMY_BODY_SIZE.sphinx).toBe(48);
    expect(ENEMY_BODY_SIZE.cursedTree).toBeUndefined();
  });

  it('reuses pooled enemies of the same id', () => {
    const { scene, boltPool } = setup();
    const pool = new EnemyPool(sceneOf(scene), { boltPool, center: CENTER });
    const a = pool.spawn('boar', 0, 0);
    a.despawn();
    expect(pool.spawn('boar', 10, 10)).toBe(a);
    expect(pool.enemies).toHaveLength(1);
  });
});

describe('ChaseEnemy movement', () => {
  function velocityAt(id: EnemyId, x: number, y: number, ms: number) {
    const { scene } = setup();
    const e = createEnemy(sceneOf(scene), id, { center: CENTER });
    e.spawn(x, y);
    e.update(0, ms);
    return bodyOf(e).velocity;
  }

  it('keeps the old enemies on a straight line at their speed', () => {
    const v = velocityAt('cursedTree', CENTER.x + 100, CENTER.y, 16);
    expect(v.x).toBeCloseTo(-ENEMIES.cursedTree.speed);
    expect(v.y).toBeCloseTo(0);
  });

  it('zigzags the fairy sideways while the forward speed stays its speed (AP-83)', () => {
    let maxLateral = 0;
    for (const ms of [0, ZIGZAG.periodMs / 4, ZIGZAG.periodMs / 2]) {
      // From the right: forward is -x, lateral is y.
      const v = velocityAt('fairy', CENTER.x + 100, CENTER.y, ms + 1);
      expect(v.x).toBeCloseTo(-ENEMIES.fairy.speed);
      maxLateral = Math.max(maxLateral, Math.abs(v.y));
    }
    expect(maxLateral).toBeGreaterThan(0);
  });

  it('restarts the zigzag phase on every spawn (pool reuse)', () => {
    const { scene } = setup();
    const e = createEnemy(sceneOf(scene), 'fairy', { center: CENTER });
    e.spawn(CENTER.x + 100, CENTER.y);
    e.update(0, 1);
    const first = { ...bodyOf(e).velocity };
    e.update(0, 300);
    e.despawn();
    e.spawn(CENTER.x + 100, CENTER.y);
    e.update(0, 1);
    expect(bodyOf(e).velocity.y).toBeCloseTo(first.y);
  });

  it('stops the fairy on the center', () => {
    const v = velocityAt('fairy', CENTER.x, CENTER.y, 100);
    expect(v).toEqual({ x: 0, y: 0 });
  });
});

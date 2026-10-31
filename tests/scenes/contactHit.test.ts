import { describe, expect, it, vi } from 'vitest';
import { CONTACT_HIT_SECONDS, ENEMIES } from '../../src/config/enemies';
import { EnemyPool } from '../../src/entities/enemies/createEnemy';
import { WitchBoltPool } from '../../src/entities/enemies/WitchBoltPool';
import { ContactStatus } from '../../src/entities/Player';
import { CENTER, sceneOf } from '../entities/enemies/helpers';
import { makeScene } from '../entities/enemies/phaserStub';

vi.mock('phaser', () => import('../entities/enemies/phaserStub'));

interface FakePlayer {
  takeDamage: (d: number) => void;
  applyStatus: (s: unknown) => void;
}

/** Mirrors the contact part of GameScene.applyAreaDamage: one overlap per active enemy. */
function frame(
  pool: EnemyPool,
  scales: Map<object, number>,
  player: FakePlayer,
  status: ContactStatus,
  dt: number,
) {
  let damage = 0;
  for (const e of pool.enemies) {
    if (!e.active) continue;
    const dealt = e.contactDamageFor(dt) * (scales.get(e) ?? 1);
    damage += dealt;
    if (dealt > 0) status.add(e.onHit);
  }
  if (damage > 0) player.takeDamage(damage);
  status.flush(player as never);
}

function setup() {
  const scene = makeScene({ 'witch-bolt': [8, 8] });
  const boltPool = new WitchBoltPool(sceneOf(scene));
  const pool = new EnemyPool(sceneOf(scene), { center: CENTER, boltPool });
  const player = { takeDamage: vi.fn(), applyStatus: vi.fn() };
  return { pool, player, status: new ContactStatus() };
}

describe('contact hit in the scene frame (AP-112)', () => {
  it('scales the single hit with contact and deals it once', () => {
    const { pool, player, status } = setup();
    const e = pool.spawn('zombieSquirrel', CENTER.x, CENTER.y);
    const scales = new Map<object, number>([[e, 2]]);
    frame(pool, scales, player, status, 16);
    frame(pool, scales, player, status, 16);
    expect(player.takeDamage).toHaveBeenCalledTimes(1);
    expect(player.takeDamage).toHaveBeenCalledWith(
      ENEMIES.zombieSquirrel.contactDamage * CONTACT_HIT_SECONDS * 2,
    );
  });

  it('applies the snake poison once, with the hit', () => {
    const { pool, player, status } = setup();
    pool.spawn('snake', CENTER.x, CENTER.y);
    frame(pool, new Map(), player, status, 16);
    frame(pool, new Map(), player, status, 16);
    expect(player.applyStatus).toHaveBeenCalledTimes(1);
  });

  it('two enemies in the same frame go into one takeDamage call', () => {
    const { pool, player, status } = setup();
    pool.spawn('cursedTree', CENTER.x, CENTER.y);
    pool.spawn('zombieSquirrel', CENTER.x, CENTER.y);
    frame(pool, new Map(), player, status, 16);
    expect(player.takeDamage).toHaveBeenCalledTimes(1);
    const sum =
      (ENEMIES.cursedTree.contactDamage + ENEMIES.zombieSquirrel.contactDamage) *
      CONTACT_HIT_SECONDS;
    expect(player.takeDamage).toHaveBeenCalledWith(sum);
  });
});

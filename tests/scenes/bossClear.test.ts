import { describe, expect, it } from 'vitest';
import { shouldClearForBoss } from '../../src/logic/bossClear';
import src from '../../src/scenes/GameScene.ts?raw';

// GameScene cannot be imported in vitest, so the wiring is checked on the source text.

function body(name: string): string {
  const start = src.indexOf(`private ${name}(`);
  expect(start).toBeGreaterThan(-1);
  const next = src.indexOf('\n  private ', start + 1);
  return src.slice(start, next === -1 ? undefined : next);
}

describe('boss clear wiring in GameScene (AP-114)', () => {
  it('spawnBoss clears before the boss is created', () => {
    const b = body('spawnBoss');
    const clear = b.indexOf('this.clearNormalEnemiesForBoss()');
    expect(clear).toBeGreaterThan(-1);
    expect(clear).toBeLessThan(b.indexOf('createBoss('));
    expect(clear).toBeLessThan(b.indexOf('this.bossSpawned = true'));
  });

  it('the clear goes over despawn only, never over damage or death', () => {
    const b = body('clearNormalEnemiesForBoss');
    expect(b).toContain('clearForBoss(this.enemyPool.enemies, this.boltPool.bolts)');
    expect(b).not.toMatch(/damageEnemy|takeDamage|onDeath|pendingDrops/);
  });

  it('spawnEnemies returns before the spawner ticks while the boss lives', () => {
    const b = body('spawnEnemies');
    const gate = b.indexOf('shouldSpawnNormalEnemies(bossAlive)');
    expect(gate).toBeGreaterThan(-1);
    expect(gate).toBeLessThan(b.indexOf('this.spawner.tick('));
  });

  it('the boss appears once per round and only with a boss id (g, l)', () => {
    const b = body('updateBossTimeline');
    expect(b).toMatch(/if \(!bossId\) return/);
    expect(b).toContain('!this.bossSpawned');
    // Same condition as a pure function (not used by the scene, which checks it inline).
    expect(shouldClearForBoss(undefined, false)).toBe(false);
    expect(shouldClearForBoss('sandWorm', true)).toBe(false);
  });
});

import { describe, expect, it, vi } from 'vitest';
import { getLevel } from '../../src/config';
import { SpawnDirector } from '../../src/logic/spawn';
import {
  clearForBoss,
  despawnAllActive,
  shouldClearForBoss,
  shouldSpawnNormalEnemies,
} from '../../src/logic/bossClear';

const item = (active: boolean) => ({ active, despawn: vi.fn() });

describe('bossClear (AP-114)', () => {
  it('despawns active items once and skips inactive ones', () => {
    const a = item(true);
    const b = item(false);
    expect(despawnAllActive([a, b])).toBe(1);
    expect(a.despawn).toHaveBeenCalledTimes(1);
    expect(b.despawn).not.toHaveBeenCalled();
  });

  it('second call after despawn does nothing', () => {
    const a = {
      active: true,
      despawn: vi.fn(() => {
        a.active = false;
      }),
    };
    expect(despawnAllActive([a])).toBe(1);
    expect(despawnAllActive([a])).toBe(0);
    expect(a.despawn).toHaveBeenCalledTimes(1);
  });

  it('clearForBoss clears enemies and bolts only', () => {
    const boss = item(true);
    const r = clearForBoss([item(true), item(true)], [item(true)]);
    expect(r).toEqual({ enemies: 2, bolts: 1 });
    expect(boss.despawn).not.toHaveBeenCalled();
  });

  it('no spawn while the boss lives (Q-58)', () => {
    expect(shouldSpawnNormalEnemies(true)).toBe(false);
    expect(shouldSpawnNormalEnemies(false)).toBe(true);
  });

  it('clear condition needs a boss id and runs once', () => {
    expect(shouldClearForBoss(undefined, false)).toBe(false);
    expect(shouldClearForBoss('treant', false)).toBe(true);
    expect(shouldClearForBoss('treant', true)).toBe(false);
  });
});

describe('no respawn burst after the boss dies (k)', () => {
  const rng = () => {
    let a = 7;
    return {
      next() {
        a = (a * 1103515245 + 12345) % 2147483648;
        return a / 2147483648;
      },
    };
  };

  it('the spawn timer does not run in the boss fight and no burst follows', () => {
    const level = getLevel(5)!;
    const d = new SpawnDirector(level, rng(), 600);
    d.tick(16, 0); // opening wave
    let bossAlive = true;
    let requested = 0;
    // Boss fight: the scene never ticks the director.
    for (let t = 0; t < 120_000; t += 100) {
      if (shouldSpawnNormalEnemies(bossAlive)) requested += d.tick(100, 0, bossAlive).length;
    }
    expect(requested).toBe(0);
    bossAlive = false;
    let after = 0;
    for (let t = 0; t < level.spawnIntervalMs * 10; t += 16) {
      const n = shouldSpawnNormalEnemies(bossAlive) ? d.tick(16, 0, bossAlive).length : 0;
      expect(n).toBeLessThanOrEqual(1);
      after += n;
    }
    expect(after).toBeLessThanOrEqual(11);
    expect(after).toBeGreaterThanOrEqual(8);
  });
});

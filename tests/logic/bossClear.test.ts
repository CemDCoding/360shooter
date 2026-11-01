import { describe, expect, it, vi } from 'vitest';
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

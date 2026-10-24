import { describe, expect, it } from 'vitest';
import { ENEMIES } from '../../src/config';

describe('enemies', () => {
  it.each(Object.values(ENEMIES))('$id has positive values', (e) => {
    expect(e.hp).toBeGreaterThan(0);
    expect(e.speed).toBeGreaterThan(0);
    expect(e.xp).toBeGreaterThan(0);
    expect(e.contactDamage).toBeGreaterThanOrEqual(0);
  });

  it('zombie squirrel is slowed down (AP-23)', () => {
    expect(ENEMIES.zombieSquirrel.speed).toBeLessThanOrEqual(80);
  });

  it('behaviors carry their definitions', () => {
    expect(ENEMIES.forestWitch.projectile).toEqual({
      damage: 8,
      speed: 120,
      intervalMs: 2000,
      keepDistance: 140,
    });
    expect(ENEMIES.forestSpirit.aura).toEqual({ radius: 48, dps: 12 });
    expect(ENEMIES.cursedTree.behavior).toBe('chase');
    expect(ENEMIES.zombieSquirrel.behavior).toBe('chase');
  });
});

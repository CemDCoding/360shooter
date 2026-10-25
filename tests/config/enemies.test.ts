import { describe, expect, it } from 'vitest';
import { CONTACT_DESPAWN_DAMAGE, ENEMIES, PLAYER, WEAPON_BASE } from '../../src/config';

describe('enemies', () => {
  it.each(Object.values(ENEMIES))('$id has positive values', (e) => {
    expect(e.hp).toBeGreaterThan(0);
    expect(e.speed).toBeGreaterThan(0);
    expect(e.xp).toBeGreaterThan(0);
    expect(e.contactDamage).toBeGreaterThanOrEqual(0);
  });

  it('coin values match PE-39..43 for all four enemies', () => {
    expect(ENEMIES.cursedTree.coinValue).toBe(2);
    expect(ENEMIES.zombieSquirrel.coinValue).toBe(2);
    expect(ENEMIES.forestWitch.coinValue).toBe(5);
    expect(ENEMIES.forestSpirit.coinValue).toBe(8);
  });

  it('cursed tree survives one laser and a double-shot salvo with damage upgrade 5 (AP-56)', () => {
    const hp = ENEMIES.cursedTree.hp;
    expect(hp).toBeGreaterThanOrEqual(5 * WEAPON_BASE.damage);
    const salvo = 3 * (WEAPON_BASE.damage * 1.5); // Doppelschuss Stufe 2, Schaden-Upgrade Stufe 5
    expect(salvo).toBeLessThan(hp);
    expect(Math.ceil(hp / WEAPON_BASE.damage)).toBe(5);
  });

  it('only the cursed tree despawns after contact damage (AP-60)', () => {
    const limit = CONTACT_DESPAWN_DAMAGE.cursedTree;
    expect(Number.isFinite(limit)).toBe(true);
    expect(limit).toBeGreaterThan(0);
    expect(limit).toBeLessThanOrEqual(PLAYER.maxHp / 2);
    expect(CONTACT_DESPAWN_DAMAGE.forestWitch).toBeUndefined();
    expect(CONTACT_DESPAWN_DAMAGE.zombieSquirrel).toBeUndefined();
    expect(CONTACT_DESPAWN_DAMAGE.forestSpirit).toBeUndefined();
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

import { describe, expect, it } from 'vitest';
import {
  CHARGE_TRIGGER_DISTANCE,
  CONTACT_DESPAWN_DAMAGE,
  ENEMIES,
  PLAYER,
  WEAPON_BASE,
} from '../../src/config';
import { ASSETS } from '../../src/config/assets';
import { BOSS_TUNING, MIN_TELEGRAPH_MS } from '../../src/config/bosses';
import type { EnemyId } from '../../src/contracts';

describe('enemies', () => {
  it.each(Object.values(ENEMIES))('$id has positive values', (e) => {
    expect(e.hp).toBeGreaterThan(0);
    expect(e.speed).toBeGreaterThan(0);
    expect(e.xp).toBeGreaterThan(0);
    expect(e.contactDamage).toBeGreaterThanOrEqual(0);
  });

  it('coin values match PE-39..43 for all four enemies', () => {
    expect(ENEMIES.cursedTree.coinValue).toBe(1);
    expect(ENEMIES.zombieSquirrel.coinValue).toBe(1);
    expect(ENEMIES.forestWitch.coinValue).toBe(4);
    expect(ENEMIES.forestSpirit.coinValue).toBe(4);
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

describe('enemies M5 (AP-97, PE-127)', () => {
  const NEW_IDS: EnemyId[] = [
    'mummy',
    'sandWorm',
    'armadillo',
    'camel',
    'snake',
    'archaeologist',
    'sphinx',
    'boar',
    'bear',
    'fairy',
  ];

  it('has all fourteen enemies with matching id and kebab sprite key', () => {
    expect(Object.keys(ENEMIES)).toHaveLength(14);
    for (const id of NEW_IDS) {
      const e = ENEMIES[id];
      expect(e?.id, id).toBe(id);
      const kebab = id.replace(/[A-Z]/g, (c) => `-${c.toLowerCase()}`);
      expect(e.spriteKey, id).toBe(`enemy-${kebab}`);
      expect(e.coinValue ?? 0, id).toBeGreaterThan(0);
    }
  });

  it('gives every enemy a sprite key that exists in the asset manifest', () => {
    for (const e of Object.values(ENEMIES)) {
      expect(ASSETS.find((a) => a.key === e.spriteKey)?.kind, e.id).toBe('spritesheet');
    }
  });

  it('uses the building blocks of PE-127', () => {
    expect(ENEMIES.boar.behavior).toBe('charge');
    expect(ENEMIES.armadillo.behavior).toBe('charge');
    expect(ENEMIES.sandWorm.behavior).toBe('burrow');
    expect(ENEMIES.camel.behavior).toBe('shooter');
    expect(ENEMIES.mummy.behavior).toBe('shooter');
    expect(ENEMIES.archaeologist.behavior).toBe('shooter');
    expect(ENEMIES.sphinx.behavior).toBe('chase');
    expect(ENEMIES.bear.behavior).toBe('chase');
    expect(ENEMIES.snake.behavior).toBe('chase');
    expect(ENEMIES.fairy.behavior).toBe('chase');
    expect(ENEMIES.fairy.movement).toBe('zigzag');
  });

  it('carries the definition every behaviour needs', () => {
    for (const e of Object.values(ENEMIES)) {
      if (e.behavior === 'shooter') expect(e.projectile, e.id).toBeDefined();
      if (e.behavior === 'aura') expect(e.aura, e.id).toBeDefined();
      if (e.behavior === 'charge') expect(e.charge, e.id).toBeDefined();
      if (e.behavior === 'burrow') expect(e.burrow, e.id).toBeDefined();
    }
  });

  it('announces charge and surfacing at least MIN_TELEGRAPH_MS (fairness)', () => {
    for (const e of Object.values(ENEMIES)) {
      if (e.charge) {
        expect(e.charge.telegraphMs, e.id).toBeGreaterThanOrEqual(MIN_TELEGRAPH_MS);
        expect(e.charge.dashDamageFactor, e.id).toBeGreaterThan(0);
        expect(e.charge.dashDamageFactor, e.id).toBeLessThanOrEqual(1);
      }
      if (e.burrow) {
        expect(e.burrow.telegraphMs, e.id).toBeGreaterThanOrEqual(MIN_TELEGRAPH_MS);
        expect(e.burrow.surfaceDistance, e.id).toBeGreaterThan(BOSS_TUNING.playerHitRadius);
      }
    }
    expect(ENEMIES.armadillo.charge?.dashDamageFactor).toBe(0.5);
    expect(ENEMIES.boar.charge?.dashDamageFactor).toBe(1);
  });

  it('poisons with the snake (3 s) and slows with the mummy wrap (2 s)', () => {
    expect(ENEMIES.snake.onHit?.poison?.durationMs).toBe(3000);
    expect(ENEMIES.snake.onHit?.poison?.dps).toBeGreaterThan(0);
    const slow = ENEMIES.mummy.projectile?.onHit?.slow;
    expect(slow?.durationMs).toBe(2000);
    expect(slow?.turnFactor).toBeGreaterThan(0);
    expect(slow?.turnFactor).toBeLessThan(1);
  });

  it('follows the keywords of F-19 (AP-105)', () => {
    const e = ENEMIES;
    // Fee: sehr wenig HP, viel Schaden.
    expect(e.fairy.hp).toBeLessThan(e.zombieSquirrel.hp);
    expect(e.fairy.contactDamage).toBeGreaterThan(e.cursedTree.contactDamage);
    // Wildschwein und Baer: viel HP, mehr als der Baum.
    expect(e.boar.hp).toBeGreaterThan(e.cursedTree.hp);
    expect(e.bear.hp).toBeGreaterThan(e.cursedTree.hp);
    // Sphinx: Tank, die meisten HP aller normalen Gegner, langsam.
    for (const other of Object.values(e)) {
      if (other.id !== 'sphinx') expect(e.sphinx.hp, other.id).toBeGreaterThan(other.hp);
    }
    expect(e.sphinx.speed).toBeLessThan(e.cursedTree.speed);
    // Armadillo: viel HP, langsam.
    expect(e.armadillo.hp).toBeGreaterThan(e.cursedTree.hp);
    expect(e.armadillo.speed).toBeLessThan(e.cursedTree.speed);
    // Schlange: schnell, wenig HP.
    expect(e.snake.speed).toBeGreaterThan(e.zombieSquirrel.speed);
    expect(e.snake.hp).toBeLessThan(e.cursedTree.hp / 2);
    // Mumie: langsam, viel Schaden (staerkstes Geschoss der Schuetzen).
    expect(e.mummy.speed).toBeLessThan(e.cursedTree.speed);
    for (const id of ['forestWitch', 'camel', 'archaeologist'] as const) {
      expect(e.mummy.projectile!.damage, id).toBeGreaterThan(e[id].projectile!.damage);
    }
  });

  it('gives chargers a reaction time of at least 1000 ms (PE-75, AP-101)', () => {
    for (const e of Object.values(ENEMIES)) {
      if (e.charge) {
        const reactionMs =
          e.charge.telegraphMs + (CHARGE_TRIGGER_DISTANCE / e.charge.dashSpeed) * 1000;
        expect(reactionMs, e.id).toBeGreaterThanOrEqual(1000);
      }
    }
  });

  it('gives the archaeologist the standard shooter values of the witch', () => {
    const pick = (id: EnemyId) => {
      const e = ENEMIES[id];
      return [e.hp, e.speed, e.contactDamage, e.behavior, e.xp, e.coinValue, e.projectile];
    };
    expect(pick('archaeologist')).toEqual(pick('forestWitch'));
  });
});

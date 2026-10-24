// Balancing (AP-15), Erklaerung in docs/balancing.md.
import type { EnemyDef, EnemyId } from '../contracts';

export const ENEMIES: Readonly<Record<EnemyId, EnemyDef>> = {
  cursedTree: {
    id: 'cursedTree',
    hp: 30,
    speed: 30,
    contactDamage: 10,
    behavior: 'chase',
    xp: 5,
    spriteKey: 'enemy-cursed-tree',
  },
  forestWitch: {
    id: 'forestWitch',
    hp: 20,
    speed: 40,
    contactDamage: 5,
    behavior: 'shooter',
    xp: 10,
    spriteKey: 'enemy-forest-witch',
    projectile: { damage: 8, speed: 120, intervalMs: 2000, keepDistance: 140 },
  },
  zombieSquirrel: {
    id: 'zombieSquirrel',
    hp: 8,
    speed: 80,
    contactDamage: 5,
    behavior: 'chase',
    xp: 4,
    spriteKey: 'enemy-zombie-squirrel',
  },
  forestSpirit: {
    id: 'forestSpirit',
    hp: 10,
    speed: 60,
    contactDamage: 0,
    behavior: 'aura',
    xp: 8,
    spriteKey: 'enemy-forest-spirit',
    aura: { radius: 48, dps: 12 },
  },
};

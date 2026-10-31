import { describe, expect, it, vi } from 'vitest';
import { ENEMIES } from '../../src/config/enemies';
import type { EnemyId } from '../../src/contracts';
import { createEnemy } from '../../src/entities/enemies/createEnemy';

// Stand-ins for the Phaser classes: they only record which class the factory picked.
const { make } = vi.hoisted(() => {
  const make = (kind: string) =>
    class {
      readonly kind = kind;
      readonly id: string;
      constructor(_scene: unknown, id: string) {
        this.id = id;
      }
    };
  return { make };
});
vi.mock('../../src/entities/enemies/ChaseEnemy', () => ({ ChaseEnemy: make('chase') }));
vi.mock('../../src/entities/enemies/AuraEnemy', () => ({ AuraEnemy: make('aura') }));
vi.mock('../../src/entities/enemies/ForestWitch', () => ({ ForestWitch: make('shooter') }));

const scene = {} as never;
const boltPool = {} as never;

/** Class per behaviour, with the AP-97 fallbacks: charge and burrow run as chase. */
const EXPECTED: Record<string, string> = {
  chase: 'chase',
  aura: 'aura',
  shooter: 'shooter',
  charge: 'chase',
  burrow: 'chase',
};

describe('createEnemy (AP-97)', () => {
  it.each(Object.keys(ENEMIES) as EnemyId[])('creates %s with a class for its behaviour', (id) => {
    const e = createEnemy(scene, id, { boltPool }) as unknown as { kind: string; id: string };
    expect(e.kind).toBe(EXPECTED[ENEMIES[id].behavior]);
    expect(e.id).toBe(id);
  });

  it('still needs a bolt pool for shooters', () => {
    expect(() => createEnemy(scene, 'camel')).toThrow(/boltPool/);
    expect(() => createEnemy(scene, 'mummy')).toThrow(/boltPool/);
  });
});

import { describe, expect, it, vi } from 'vitest';
import { BOSSES } from '../../src/config/bosses';
import type { BossId } from '../../src/contracts';
import { createBoss } from '../../src/entities/bosses/createBoss';
import { GiantSandWorm } from '../../src/entities/bosses/GiantSandWorm';
import { GuardianDog } from '../../src/entities/bosses/GuardianDog';
import { Pharaoh } from '../../src/entities/bosses/Pharaoh';

// Stand-in for BossBase (Phaser): records what the boss classes hand to the base constructor.
const { FakeBase, make } = vi.hoisted(() => {
  class FakeBase {
    readonly bossId: string;
    readonly levelId: number;
    readonly ctx: unknown;
    constructor(_scene: unknown, bossId: string, levelId: number, ctx: unknown = {}) {
      this.bossId = bossId;
      this.levelId = levelId;
      this.ctx = ctx;
    }
  }
  const make = (bossId: string) =>
    class extends FakeBase {
      constructor(scene: unknown, levelId: number, ctx: unknown) {
        super(scene, bossId, levelId, ctx);
      }
    };
  return { FakeBase, make };
});
vi.mock('../../src/entities/bosses/BossBase', () => ({ BossBase: FakeBase }));
vi.mock('../../src/entities/bosses/RootMonster', () => ({ RootMonster: make('rootMonster') }));
vi.mock('../../src/entities/bosses/ForestGhost', () => ({ ForestGhost: make('forestGhost') }));
vi.mock('../../src/entities/bosses/GiantStone', () => ({ GiantStone: make('giantStone') }));

const scene = {} as never;
const LEVEL_OF: Record<BossId, number> = {
  rootMonster: 0,
  forestGhost: 5,
  giantStone: 10,
  giantSandWorm: 21,
  guardianDog: 26,
  pharaoh: 40,
};

describe('createBoss (AP-97)', () => {
  it.each(Object.keys(BOSSES) as BossId[])('creates %s', (id) => {
    const b = createBoss(scene, id, LEVEL_OF[id]) as unknown as InstanceType<typeof FakeBase>;
    expect(b.bossId).toBe(id);
    expect(b.levelId).toBe(LEVEL_OF[id]);
  });

  it('uses the stub classes for the M5 bosses', () => {
    expect(createBoss(scene, 'giantSandWorm', 21)).toBeInstanceOf(GiantSandWorm);
    expect(createBoss(scene, 'guardianDog', 26)).toBeInstanceOf(GuardianDog);
    expect(createBoss(scene, 'pharaoh', 31)).toBeInstanceOf(Pharaoh);
  });

  it('hands the whole context (generic summon included) to the M5 bosses', () => {
    const onSummon = vi.fn();
    const getPlayerPos = () => ({ x: 1, y: 2 });
    const ctx = { onSummon, getPlayerPos };
    for (const id of ['giantSandWorm', 'guardianDog', 'pharaoh'] as const) {
      const b = createBoss(scene, id, LEVEL_OF[id], ctx) as unknown as InstanceType<
        typeof FakeBase
      >;
      expect(b.ctx).toBe(ctx);
    }
  });
});

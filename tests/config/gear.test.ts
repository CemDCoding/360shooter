import { describe, expect, it } from 'vitest';
import { ARMOURS } from '../../src/config/armour';
import {
  GEAR_PIECES,
  GEAR_SET_BONUSES,
  GEAR_SET_LABELS,
  GEAR_SETS,
  GEAR_SLOTS,
  HELL_SET_RING,
  PET_GEAR_SET_LABELS,
  getGearPiece,
} from '../../src/config';

const byId = (id: string) => {
  const p = getGearPiece(id);
  if (!p) throw new Error(`missing ${id}`);
  return p;
};

describe('gear config (PE-169)', () => {
  it('has 9 pieces, unique ids, every set and slot once', () => {
    expect(GEAR_PIECES).toHaveLength(9);
    expect(new Set(GEAR_PIECES.map((p) => p.id)).size).toBe(9);
    for (const set of GEAR_SETS)
      for (const slot of GEAR_SLOTS)
        expect(GEAR_PIECES.filter((p) => p.set === set && p.slot === slot)).toHaveLength(1);
  });

  it('uses the names from brief H-35 as labels', () => {
    expect(GEAR_PIECES.map((p) => p.label)).toEqual([
      'KRISTALLHELM',
      'KRISTALLPANZER',
      'KRISTALLSTIEFEL',
      'TEUFELSHÖRNER',
      'GLUTPANZER',
      'LAVASTIEFEL',
      'HEILIGENSCHEIN',
      'ENGELSWESTE',
      'WOLKENSTIEFEL',
    ]);
    expect(GEAR_SET_LABELS).toEqual({ diamond: 'DIAMANT', hell: 'HÖLLE', heaven: 'HIMMEL' });
    expect(PET_GEAR_SET_LABELS).toEqual({ diamond: 'KRISTALL', hell: 'GLUT', heaven: 'HIMMEL' });
  });

  it('diamond set values', () => {
    expect(byId('gear-diamond-head')).toMatchObject({
      stats: { maxHpAdd: 10 },
      effect: { kind: 'blockChance', chance: 0.1 },
    });
    expect(byId('gear-diamond-body')).toMatchObject({
      stats: { damageTakenMul: 0.9 },
      effect: { kind: 'thorns', damageFactor: 1 },
    });
    expect(byId('gear-diamond-legs')).toMatchObject({
      stats: { maxHpAdd: 10 },
      effect: { kind: 'knockback', px: 24 },
    });
  });

  it('hell set values', () => {
    expect(byId('gear-hell-head')).toMatchObject({
      stats: { damageMul: 1.1 },
      effect: { kind: 'crit', chance: 0.1, mul: 2 },
    });
    expect(byId('gear-hell-body')).toMatchObject({
      stats: { damageMul: 1.1 },
      effect: { kind: 'burn', durationMs: 3000, dpsFactor: 0.5 },
    });
    expect(byId('gear-hell-legs')).toMatchObject({
      stats: { damageMul: 1.05 },
      effect: { kind: 'deathBlast', radiusPx: 40, damageFactor: 1.5 },
    });
  });

  it('heaven set values', () => {
    expect(byId('gear-heaven-head')).toMatchObject({
      stats: { turnSpeedMul: 1.1 },
      effect: { kind: 'healBoost', mul: 2 },
    });
    expect(byId('gear-heaven-body')).toMatchObject({
      stats: { fireRateMul: 1.1 },
      effect: { kind: 'pierce', extraTargets: 1 },
    });
    expect(byId('gear-heaven-legs')).toMatchObject({
      stats: { turnSpeedMul: 1.1 },
      effect: { kind: 'magnet', magnetMul: 1.5, itemLifetimeMul: 1.5 },
    });
  });

  it('set bonuses: block 30 s, ring every 20 s for 3 s, 1 HP per 2 s', () => {
    expect(GEAR_SET_BONUSES).toHaveLength(3);
    expect(GEAR_SET_BONUSES.find((b) => b.set === 'diamond')).toMatchObject({
      kind: 'timedBlock',
      intervalMs: 30000,
    });
    expect(GEAR_SET_BONUSES.find((b) => b.set === 'hell')).toMatchObject({
      kind: 'autoRing',
      intervalMs: 20000,
      durationMs: 3000,
    });
    expect(GEAR_SET_BONUSES.find((b) => b.set === 'heaven')).toMatchObject({
      kind: 'regen',
      intervalMs: 2000,
      hpPerTick: 1,
    });
  });

  it('hell ring is the fire ring with 3 s and leaves the original untouched', () => {
    const base = ARMOURS.find((a) => a.id === 'fire-ring');
    expect(HELL_SET_RING).toEqual({ ...base, durationMs: 3000 });
    expect(base?.durationMs).toBe(5000);
  });
});

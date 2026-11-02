import { describe, expect, it } from 'vitest';
import type { EquippedGear, GearModifiers } from '../../src/contracts';
import { HELL_SET_RING } from '../../src/config/gear';
import {
  GearSetState,
  applyGearToStats,
  burnOnHit,
  deathBlastTargets,
  gearModifiers,
  gearTextureKeys,
  healAmount,
  itemLifetimeFactor,
  knockbackVector,
  magnetFactor,
  pierceCount,
  resolveIncomingDamage,
  rollBlock,
  rollCrit,
  setProgress,
  thornsDamage,
} from '../../src/logic/gear';
import { emptyPowers } from '../../src/logic/powers';
import { createRng, type Rng } from '../../src/logic/rng';
import { upgradeFactors } from '../../src/logic/upgrades';

const EMPTY: EquippedGear = { head: null, body: null, legs: null };

function gear(head: string | null, body: string | null, legs: string | null): EquippedGear {
  return { head, body, legs };
}
const one = (slot: keyof EquippedGear, id: string): GearModifiers =>
  gearModifiers({ ...EMPTY, [slot]: id });

/** Rng that returns fixed values and counts its draws. */
function fixedRng(...values: number[]): Rng & { draws: number } {
  let i = 0;
  return {
    draws: 0,
    next() {
      this.draws += 1;
      return values[i++ % values.length] ?? 0;
    },
  };
}

const DIAMOND = gear('gear-diamond-head', 'gear-diamond-body', 'gear-diamond-legs');
const HELL = gear('gear-hell-head', 'gear-hell-body', 'gear-hell-legs');
const HEAVEN = gear('gear-heaven-head', 'gear-heaven-body', 'gear-heaven-legs');

describe('gearModifiers', () => {
  it('empty gear gives neutral values', () => {
    expect(gearModifiers(EMPTY)).toEqual({
      maxHpAdd: 0,
      damageMul: 1,
      fireRateMul: 1,
      turnSpeedMul: 1,
      damageTakenMul: 1,
      effects: [],
      setBonuses: [],
    });
  });
  it('ignores unknown ids and pieces in the wrong slot', () => {
    expect(gearModifiers(gear('nope', 'gear-hell-head', 'gear-diamond-body'))).toEqual(
      gearModifiers(EMPTY),
    );
  });
  it('multiplies multipliers and adds max HP', () => {
    const m = gearModifiers(HEAVEN);
    expect(m.turnSpeedMul).toBeCloseTo(1.21);
    expect(m.fireRateMul).toBeCloseTo(1.1);
    const h = gearModifiers(HELL);
    expect(h.damageMul).toBeCloseTo(1.1 * 1.1 * 1.05);
    expect(gearModifiers(DIAMOND).maxHpAdd).toBe(20);
  });
  it('set bonus only with all three pieces of one set', () => {
    expect(gearModifiers(gear('gear-hell-head', 'gear-hell-body', null)).setBonuses).toEqual([]);
    expect(
      gearModifiers(gear('gear-hell-head', 'gear-hell-body', 'gear-diamond-legs')).setBonuses,
    ).toEqual([]);
    expect(gearModifiers(DIAMOND).setBonuses.map((b) => b.kind)).toEqual(['timedBlock']);
    expect(gearModifiers(HELL).setBonuses.map((b) => b.kind)).toEqual(['autoRing']);
    expect(gearModifiers(HEAVEN).setBonuses.map((b) => b.kind)).toEqual(['regen']);
  });
  it('mixed gear collects every effect', () => {
    const m = gearModifiers(gear('gear-diamond-head', 'gear-hell-body', 'gear-heaven-legs'));
    expect(m.effects.map((e) => e.kind)).toEqual(['blockChance', 'burn', 'magnet']);
    expect(m.maxHpAdd).toBe(10);
    expect(m.damageMul).toBeCloseTo(1.1);
    expect(m.turnSpeedMul).toBeCloseTo(1.1);
  });
});

describe('setProgress and gearTextureKeys', () => {
  it('shows "SET HÖLLE 2/3"', () => {
    const p = setProgress(gear('gear-hell-head', 'gear-hell-body', 'gear-heaven-legs'));
    expect(p[0]).toEqual({
      set: 'hell',
      count: 2,
      total: 3,
      complete: false,
      text: 'SET HÖLLE 2/3',
    });
    expect(p[1]?.text).toBe('SET HIMMEL 1/3');
  });
  it('full set is complete, empty gear has no hint', () => {
    expect(setProgress(DIAMOND)).toEqual([
      { set: 'diamond', count: 3, total: 3, complete: true, text: 'SET DIAMANT 3/3' },
    ]);
    expect(setProgress(EMPTY)).toEqual([]);
  });
  it('texture layers in order legs, body, head', () => {
    expect(gearTextureKeys(HELL)).toEqual(['gear-hell-legs', 'gear-hell-body', 'gear-hell-head']);
    expect(gearTextureKeys(gear('gear-heaven-head', null, 'gear-diamond-legs'))).toEqual([
      'gear-diamond-legs',
      'gear-heaven-head',
    ]);
    expect(gearTextureKeys(EMPTY)).toEqual([]);
  });
});

describe('applyGearToStats', () => {
  const base = upgradeFactors({
    weaponFireRate: 2,
    weaponDamage: 3,
    playerMaxHp: 1,
    playerTurnSpeed: 0,
  });
  it('empty gear keeps the upgrade values exactly', () => {
    expect(applyGearToStats(base, gearModifiers(EMPTY))).toEqual(base);
  });
  it('works on top of the gold upgrades', () => {
    const s = applyGearToStats(
      base,
      gearModifiers(gear('gear-hell-head', 'gear-heaven-body', 'gear-diamond-legs')),
    );
    expect(s.weaponDamageMult).toBeCloseTo(base.weaponDamageMult * 1.1);
    expect(s.weaponFireRateMult).toBeCloseTo(base.weaponFireRateMult * 1.1);
    expect(s.playerMaxHp).toBe(base.playerMaxHp + 10);
    expect(s.playerTurnSpeedDegPerSec).toBe(base.playerTurnSpeedDegPerSec);
    const t = applyGearToStats(base, gearModifiers(HEAVEN));
    expect(t.playerTurnSpeedDegPerSec).toBeCloseTo(base.playerTurnSpeedDegPerSec * 1.21);
  });
});

describe('PE-169 diamond pieces', () => {
  it('head: +10 max HP and 10 % block chance', () => {
    const m = one('head', 'gear-diamond-head');
    expect(m.maxHpAdd).toBe(10);
    expect(rollBlock(m, fixedRng(0.099))).toBe(true);
    expect(rollBlock(m, fixedRng(0.1))).toBe(false);
  });
  it('body: -10 % damage taken and thorns 10', () => {
    const m = one('body', 'gear-diamond-body');
    expect(m.damageTakenMul).toBeCloseTo(0.9);
    expect(thornsDamage(m, 10)).toBe(10);
    expect(thornsDamage(m, 40)).toBe(40);
  });
  it('legs: +10 max HP and knockback away from the player', () => {
    const m = one('legs', 'gear-diamond-legs');
    expect(m.maxHpAdd).toBe(10);
    const v = knockbackVector(m, 100, 100, 130, 140);
    expect(v.x).toBeCloseTo(24 * 0.6);
    expect(v.y).toBeCloseTo(24 * 0.8);
    expect(knockbackVector(m, 5, 5, 5, 5)).toEqual({ x: 0, y: 0 });
  });
  it('set: one block ready at start, next one 30 s after use', () => {
    const s = new GearSetState(gearModifiers(DIAMOND).setBonuses);
    expect(s.blockReady()).toBe(true);
    expect(s.consumeBlock()).toBe(true);
    expect(s.consumeBlock()).toBe(false);
    s.tick(29999);
    expect(s.blockReady()).toBe(false);
    s.tick(1);
    expect(s.blockReady()).toBe(true);
    s.tick(60000);
    expect(s.consumeBlock()).toBe(true);
    expect(s.blockReady()).toBe(false);
  });
});

describe('PE-169 hell pieces', () => {
  it('head: +10 % damage and 10 % crit x2', () => {
    const m = one('head', 'gear-hell-head');
    expect(m.damageMul).toBeCloseTo(1.1);
    expect(rollCrit(m, fixedRng(0.05))).toBe(2);
    expect(rollCrit(m, fixedRng(0.5))).toBe(1);
  });
  it('body: +10 % damage and burn 3 s at 5/s', () => {
    const m = one('body', 'gear-hell-body');
    expect(m.damageMul).toBeCloseTo(1.1);
    expect(burnOnHit(m, 10)).toEqual({ durationMs: 3000, dps: 5 });
    expect(burnOnHit(m, 40)).toEqual({ durationMs: 3000, dps: 20 });
  });
  it('legs: +5 % damage and death blast (circle test)', () => {
    const m = one('legs', 'gear-hell-legs');
    expect(m.damageMul).toBeCloseTo(1.05);
    const targets = [
      { id: 'in', x: 30, y: 0, radius: 5 },
      { id: 'edge', x: 50, y: 0, radius: 10 },
      { id: 'out', x: 0, y: 60, radius: 10 },
    ];
    const r = deathBlastTargets(m, 0, 0, targets, 10);
    expect(r.damage).toBe(15);
    expect(deathBlastTargets(m, 0, 0, targets, 40).damage).toBe(60);
    expect(r.targets.map((t) => t.id)).toEqual(['in', 'edge']);
  });
  it('set: fire ring every 20 s for 3 s', () => {
    expect(HELL_SET_RING.id).toBe('fire-ring');
    expect(HELL_SET_RING.durationMs).toBe(3000);
    const s = new GearSetState(gearModifiers(HELL).setBonuses);
    expect(s.tick(19999).ringTriggers).toBe(0);
    expect(s.tick(1).ringTriggers).toBe(1);
    expect(s.tick(20000).ringTriggers).toBe(1);
    expect(s.tick(40000).ringTriggers).toBe(2);
    expect(s.blockReady()).toBe(false);
  });
});

describe('PE-169 heaven pieces', () => {
  it('head: +10 % turn speed and double heal', () => {
    const m = one('head', 'gear-heaven-head');
    expect(m.turnSpeedMul).toBeCloseTo(1.1);
    expect(healAmount(m, 15)).toBe(30);
    expect(healAmount(gearModifiers(EMPTY), 15)).toBe(15);
  });
  it('body: +10 % fire rate and laser pierces 1 enemy', () => {
    const m = one('body', 'gear-heaven-body');
    expect(m.fireRateMul).toBeCloseTo(1.1);
    expect(pierceCount(m)).toBe(1);
  });
  it('legs: +10 % turn speed, magnet and item lifetime +50 %', () => {
    const m = one('legs', 'gear-heaven-legs');
    expect(m.turnSpeedMul).toBeCloseTo(1.1);
    expect(magnetFactor(m)).toBe(1.5);
    expect(itemLifetimeFactor(m)).toBe(1.5);
  });
  it('set: 1 whole HP every 2 s', () => {
    const s = new GearSetState(gearModifiers(HEAVEN).setBonuses);
    expect(s.tick(1999).regenHp).toBe(0);
    expect(s.tick(1).regenHp).toBe(1);
    expect(s.tick(1000).regenHp).toBe(0);
    expect(s.tick(5000).regenHp).toBe(3);
    expect(s.tick(0).regenHp).toBe(0);
  });
});

describe('neutral effects without gear', () => {
  const m = gearModifiers(EMPTY);
  it('returns neutral values and draws no random number', () => {
    const rng = fixedRng(0);
    expect(rollBlock(m, rng)).toBe(false);
    expect(rollCrit(m, rng)).toBe(1);
    expect(rng.draws).toBe(0);
    expect(thornsDamage(m, 10)).toBe(0);
    expect(knockbackVector(m, 0, 0, 10, 0)).toEqual({ x: 0, y: 0 });
    expect(burnOnHit(m, 10)).toBeNull();
    expect(deathBlastTargets(m, 0, 0, [{ x: 0, y: 0, radius: 5 }], 10)).toEqual({
      damage: 0,
      targets: [],
    });
    expect(pierceCount(m)).toBe(0);
    expect(magnetFactor(m)).toBe(1);
    expect(itemLifetimeFactor(m)).toBe(1);
  });
  it('set state without set bonus does nothing', () => {
    const s = new GearSetState(m.setBonuses);
    expect(s.blockReady()).toBe(false);
    expect(s.consumeBlock()).toBe(false);
    expect(s.tick(100000)).toEqual({ ringTriggers: 0, regenHp: 0 });
  });
  it('set state ignores invalid dt', () => {
    const s = new GearSetState(gearModifiers(HEAVEN).setBonuses);
    expect(s.tick(Number.NaN).regenHp).toBe(0);
    expect(s.tick(-5000).regenHp).toBe(0);
    expect(s.tick(2000).regenHp).toBe(1);
  });
});

describe('resolveIncomingDamage (order: set block, block chance, reduction, shield)', () => {
  it('without gear the damage goes straight to the shield and HP, no draw', () => {
    const rng = fixedRng(0);
    const r = resolveIncomingDamage(
      10,
      gearModifiers(EMPTY),
      false,
      { ...emptyPowers(), shieldLeft: 4 },
      rng,
    );
    expect(r).toEqual({
      damage: 6,
      powers: { ...emptyPowers(), shieldLeft: 0 },
      blockedBy: null,
      setBlockUsed: false,
    });
    expect(rng.draws).toBe(0);
  });
  it('set block comes first and draws nothing', () => {
    const rng = fixedRng(0);
    const r = resolveIncomingDamage(10, gearModifiers(DIAMOND), true, emptyPowers(), rng);
    expect(r.blockedBy).toBe('setBlock');
    expect(r.setBlockUsed).toBe(true);
    expect(r.damage).toBe(0);
    expect(rng.draws).toBe(0);
  });
  it('block chance comes before the reduction and keeps the shield', () => {
    const powers = { ...emptyPowers(), shieldLeft: 5 };
    const r = resolveIncomingDamage(10, gearModifiers(DIAMOND), false, powers, fixedRng(0.01));
    expect(r.blockedBy).toBe('blockChance');
    expect(r.damage).toBe(0);
    expect(r.powers.shieldLeft).toBe(5);
  });
  it('reduction applies before the shield', () => {
    const powers = { ...emptyPowers(), shieldLeft: 4 };
    const r = resolveIncomingDamage(10, gearModifiers(DIAMOND), false, powers, fixedRng(0.9));
    expect(r.damage).toBeCloseTo(5);
    expect(r.powers.shieldLeft).toBe(0);
    expect(r.blockedBy).toBeNull();
  });
  it('zero or invalid damage does nothing', () => {
    const rng = fixedRng(0);
    const r = resolveIncomingDamage(Number.NaN, gearModifiers(DIAMOND), true, emptyPowers(), rng);
    expect(r).toEqual({ damage: 0, powers: emptyPowers(), blockedBy: null, setBlockUsed: false });
    expect(rng.draws).toBe(0);
  });
  it('is deterministic with a seeded Rng', () => {
    const run = (): number[] => {
      const rng = createRng(42);
      const m = gearModifiers(gear('gear-diamond-head', 'gear-hell-body', null));
      return Array.from(
        { length: 50 },
        () => resolveIncomingDamage(10, m, false, emptyPowers(), rng).damage,
      );
    };
    expect(run()).toEqual(run());
  });
});

import { describe, expect, it } from 'vitest';
import type { SaveGame } from '../../src/contracts';
import { buy, canBuy, equipGear, equipPetGear, setActivePet } from '../../src/logic/shop';
import { defaultSave } from '../../src/platform/storage';

const rich = (extra: Partial<SaveGame> = {}): SaveGame => ({
  ...defaultSave(),
  diamonds: 20,
  ...extra,
});

describe('buy', () => {
  it('buys with enough diamonds and pays the price', () => {
    const r = buy(rich(), 'egg-bee');
    expect(r.ok).toBe(true);
    expect(r.save.diamonds).toBe(15);
    expect(r.save.owned).toEqual(['egg-bee']);
  });
  it('too few diamonds changes nothing', () => {
    const s = rich({ diamonds: 4 });
    const r = buy(s, 'egg-bee');
    expect(r).toEqual({ ok: false, reason: 'not-enough-diamonds', save: s });
    expect(r.save).toBe(s);
    expect(canBuy(s, 'egg-bee')).toBe(false);
  });
  it('double purchase changes nothing', () => {
    const once = buy(rich(), 'gear-diamond-head').save;
    const twice = buy(once, 'gear-diamond-head');
    expect(twice.ok).toBe(false);
    if (!twice.ok) expect(twice.reason).toBe('already-owned');
    expect(twice.save).toBe(once);
  });
  it('unknown ids are refused', () => {
    const r = buy(rich(), 'nope');
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toBe('unknown-item');
  });
  it('exact price works down to 0', () => {
    expect(buy(rich({ diamonds: 3 }), 'gear-hell-body').save.diamonds).toBe(0);
  });
});

describe('equipGear', () => {
  const own = rich({ owned: ['gear-diamond-head'] });
  it('equips an owned piece and unequips with null', () => {
    const r = equipGear(own, 'head', 'gear-diamond-head');
    expect(r.ok && r.save.equippedGear?.head).toBe('gear-diamond-head');
    const u = equipGear(r.save, 'head', null);
    expect(u.ok && u.save.equippedGear?.head).toBeNull();
  });
  it('refuses unowned pieces, wrong slots and unknown ids', () => {
    expect(equipGear(own, 'head', 'gear-hell-head')).toMatchObject({
      ok: false,
      reason: 'not-owned',
    });
    expect(equipGear(own, 'body', 'gear-diamond-head')).toMatchObject({
      ok: false,
      reason: 'wrong-slot',
    });
    expect(equipGear(own, 'head', 'x')).toMatchObject({ ok: false, reason: 'unknown-item' });
    expect(equipGear(own, 'hand' as never, null)).toMatchObject({ ok: false });
  });
});

describe('setActivePet / equipPetGear', () => {
  const own = rich({ owned: ['egg-bee', 'petgear-bee-hell'] });
  it('activates only owned eggs', () => {
    expect(setActivePet(own, 'bee')).toMatchObject({ ok: true });
    expect(setActivePet(own, 'penguin')).toMatchObject({ ok: false, reason: 'not-owned' });
    const r = setActivePet(setActivePet(own, 'bee').save, null);
    expect(r.ok && r.save.activePet).toBeNull();
  });
  it('equips pet gear only if owned and for that pet', () => {
    const ok = equipPetGear(own, 'bee', 'petgear-bee-hell');
    expect(ok.ok && ok.save.petGear).toEqual({ bee: 'petgear-bee-hell' });
    expect(equipPetGear(own, 'penguin', 'petgear-bee-hell')).toMatchObject({
      reason: 'wrong-pet',
    });
    expect(equipPetGear(own, 'bee', 'petgear-bee-heaven')).toMatchObject({ reason: 'not-owned' });
    expect(equipPetGear(own, 'bee', 'gear-diamond-head')).toMatchObject({
      reason: 'unknown-item',
    });
    const off = equipPetGear(ok.save, 'bee', null);
    expect(off.ok && off.save.petGear?.bee).toBeNull();
  });
});

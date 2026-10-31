import { describe, expect, it } from 'vitest';
import { CONTACT_HIT_SECONDS, ENEMIES } from '../../src/config/enemies';
import { contactHitDamage, dealsContactHit } from '../../src/logic/contactHit';

describe('contactHit (AP-112)', () => {
  it('hit window is half a second', () => {
    expect(CONTACT_HIT_SECONDS).toBe(0.5);
  });

  it('chase, charge and burrow hit once, aura and shooter do not', () => {
    expect(dealsContactHit('chase', 10)).toBe(true);
    expect(dealsContactHit('charge', 10)).toBe(true);
    expect(dealsContactHit('burrow', 10)).toBe(true);
    expect(dealsContactHit('aura', 10)).toBe(false);
    expect(dealsContactHit('shooter', 10)).toBe(false);
  });

  it('needs a positive finite contact damage', () => {
    for (const bad of [0, -1, Number.NaN, Infinity]) {
      expect(dealsContactHit('chase', bad)).toBe(false);
    }
  });

  it('damage is contactDamage times the window', () => {
    expect(contactHitDamage(10)).toBe(5);
    expect(contactHitDamage(10, 2)).toBe(20);
  });

  it('invalid input gives 0', () => {
    for (const bad of [0, -3, Number.NaN, Infinity]) expect(contactHitDamage(bad)).toBe(0);
    expect(contactHitDamage(10, -1)).toBe(0);
    expect(contactHitDamage(10, Number.NaN)).toBe(0);
  });

  it('rule over every enemy by behavior, not by name', () => {
    for (const def of Object.values(ENEMIES)) {
      const hits = dealsContactHit(def.behavior, def.contactDamage);
      const expected =
        ['chase', 'charge', 'burrow'].includes(def.behavior) && def.contactDamage > 0;
      expect(hits, def.id).toBe(expected);
    }
  });
});

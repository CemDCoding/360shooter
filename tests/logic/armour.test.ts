import { describe, expect, it } from 'vitest';
import { ARMOUR_RULES, ARMOURS } from '../../src/config/armour';
import {
  activateArmour,
  createArmourState,
  isInRing,
  resetArmour,
  ringDamageFor,
  rollArmourDrop,
  tickArmour,
} from '../../src/logic/armour';
import { createRng } from '../../src/logic/rng';

const ring = ARMOURS[0];

describe('armour logic', () => {
  it('activates from a fresh state', () => {
    const s = activateArmour(createArmourState(), ring);
    expect(s).toEqual({ id: ring.id, activeMsLeft: 5000, cooldownMsLeft: 0 });
  });

  it('blocks activation while active', () => {
    const active = activateArmour(createArmourState(), ring);
    const ticked = tickArmour(active, 1000, ring);
    expect(activateArmour(ticked, ring)).toBe(ticked);
  });

  it('ends after 5 s and starts the 20 s cooldown', () => {
    let s = activateArmour(createArmourState(), ring);
    s = tickArmour(s, 4999, ring);
    expect(s.id).toBe(ring.id);
    s = tickArmour(s, 1, ring);
    expect(s).toEqual({ id: null, activeMsLeft: 0, cooldownMsLeft: 20000 });
  });

  it('blocks activation during cooldown and allows it afterwards', () => {
    let s = tickArmour(activateArmour(createArmourState(), ring), 5000, ring);
    expect(activateArmour(s, ring)).toBe(s);
    s = tickArmour(s, 19999, ring);
    expect(activateArmour(s, ring)).toBe(s);
    s = tickArmour(s, 1, ring);
    expect(s.cooldownMsLeft).toBe(0);
    expect(activateArmour(s, ring).id).toBe(ring.id);
  });

  it('ring damage scales with dt', () => {
    expect(ringDamageFor(ring, 1000)).toBe(20);
    expect(ringDamageFor(ring, 500)).toBe(10);
    expect(ringDamageFor(ring, 16)).toBeCloseTo(0.32);
  });

  it('checks the ring radius boundary', () => {
    expect(isInRing(ring, 0, 0, 72, 0, 0)).toBe(true);
    expect(isInRing(ring, 0, 0, 72.5, 0, 0)).toBe(false);
    expect(isInRing(ring, 0, 0, 80, 0, 10)).toBe(true);
    expect(isInRing(ring, 0, 0, 100, 0, 10)).toBe(false);
  });

  it('drops at about 2 percent with a fixed seed', () => {
    const rng = createRng(1234);
    let drops = 0;
    const n = 20000;
    for (let i = 0; i < n; i++) if (rollArmourDrop(rng, ARMOUR_RULES)) drops++;
    expect(drops / n).toBeGreaterThan(0.015);
    expect(drops / n).toBeLessThan(0.025);
  });

  it('resets to the empty state', () => {
    expect(resetArmour()).toEqual(createArmourState());
  });
});

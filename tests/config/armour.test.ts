import { describe, expect, it } from 'vitest';
import { ARMOUR_RULES, ARMOURS } from '../../src/config/armour';

describe('armour config', () => {
  it('contains the fire ring with PE-52 values', () => {
    const ring = ARMOURS.find((a) => a.id === 'fire-ring');
    expect(ring).toBeDefined();
    expect(ring?.label).toBe('Feuerring');
    expect(ring?.durationMs).toBe(5000);
    expect(ring?.cooldownMs).toBe(20000);
    expect(ring?.radiusPx).toBe(72);
    expect(ring?.damagePerSec).toBe(20);
  });

  it('has unique ids', () => {
    const ids = ARMOURS.map((a) => a.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('has a drop chance between 0 and 1', () => {
    expect(ARMOUR_RULES.dropChance).toBeGreaterThan(0);
    expect(ARMOUR_RULES.dropChance).toBeLessThan(1);
  });
});

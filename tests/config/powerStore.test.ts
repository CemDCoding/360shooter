import { describe, expect, it } from 'vitest';
import { ARMOURS } from '../../src/config/armour';
import { ITEMS } from '../../src/config/items';
import { STORABLE_POWERS } from '../../src/config/powerStore';

describe('STORABLE_POWERS', () => {
  it('has no duplicate ids and non-empty labels', () => {
    const ids = STORABLE_POWERS.map((p) => p.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const p of STORABLE_POWERS) expect(p.label.length).toBeGreaterThan(0);
  });

  it('every id is a timed item or an armour', () => {
    for (const p of STORABLE_POWERS) {
      if (p.kind === 'item') {
        const item = ITEMS.find((i) => i.id === p.id);
        expect(item, p.id).toBeDefined();
        expect(item?.effect).toBe('rapidFire');
        expect(item?.durationMs ?? 0).toBeGreaterThan(0);
      } else {
        expect(
          ARMOURS.some((a) => a.id === p.id),
          p.id,
        ).toBe(true);
      }
    }
  });
});

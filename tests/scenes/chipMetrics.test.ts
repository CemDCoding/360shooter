import { describe, expect, it } from 'vitest';
import {
  CHIP_SHRINK,
  chipMetrics,
  chipShrink,
  SHRUNK_CHIPS,
  type ChipId,
} from '../../src/scenes/hud/hudMath';
import { funkScale } from '../../src/scenes/hud/FunkPanel';

const KS = [1, 1.36, 1.4];

describe('chipMetrics (B3, PE-119)', () => {
  it.each(KS)('shrink 1 gives the old measures at k = %s', (k) => {
    const m = chipMetrics(k, 1);
    expect(m.height).toBe(Math.round(24 * k));
    expect(m.padX).toBe(Math.round(6 * k));
    expect(m.gap).toBe(Math.round(4 * k));
    expect(m.iconW).toBe(Math.round(16 * k));
    expect(m.textScale).toBe(funkScale(2, k));
  });

  it.each(KS)('shrunk chip is at least 10 percent lower with a whole text step at k = %s', (k) => {
    const a = chipMetrics(k, 1);
    const b = chipMetrics(k, CHIP_SHRINK);
    expect(b.height).toBeLessThanOrEqual(a.height * 0.9);
    expect(Number.isInteger(b.textScale)).toBe(true);
    expect(b.textScale).toBeGreaterThanOrEqual(2);
    expect(b.height).toBeGreaterThan(8 * b.textScale);
    expect(b.padX).toBeLessThanOrEqual(a.padX);
    expect(b.iconW).toBeLessThan(a.iconW);
  });

  it('gives 20 px at k = 1 and 28 px at k = 1.36', () => {
    expect(chipMetrics(1, CHIP_SHRINK).height).toBe(20);
    expect(chipMetrics(1.36, CHIP_SHRINK).height).toBe(28);
  });

  it('is monotonic in k', () => {
    let prev = 0;
    for (const k of [1, 1.1, 1.2, 1.3, 1.36, 1.4]) {
      const h = chipMetrics(k, CHIP_SHRINK).height;
      expect(h).toBeGreaterThanOrEqual(prev);
      prev = h;
    }
  });

  it('shrinks exactly the coin counter, double shot chip and shield chip', () => {
    expect([...SHRUNK_CHIPS].sort()).toEqual(['coin', 'doubleShot', 'shield']);
    const all: ChipId[] = ['coin', 'doubleShot', 'shield', 'rapidFire', 'armour'];
    for (const id of all) {
      const small = (SHRUNK_CHIPS as readonly string[]).includes(id);
      expect(chipShrink(id)).toBe(small ? CHIP_SHRINK : 1);
    }
    expect(chipShrink('rapidFire')).toBe(1);
    expect(chipShrink('armour')).toBe(1);
  });
});

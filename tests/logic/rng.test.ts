import { describe, expect, it } from 'vitest';
import { createRng } from '../../src/logic/rng';

describe('rng', () => {
  it('is deterministic per seed', () => {
    const a = createRng(42);
    const b = createRng(42);
    for (let i = 0; i < 20; i++) expect(a.next()).toBe(b.next());
  });
  it('differs between seeds and stays in [0,1)', () => {
    expect(createRng(1).next()).not.toBe(createRng(2).next());
    const c = createRng(7);
    for (let i = 0; i < 1000; i++) {
      const v = c.next();
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
    }
  });
});

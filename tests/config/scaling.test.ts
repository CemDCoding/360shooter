import { describe, expect, it } from 'vitest';
import { LEVEL_COUNT, LEVEL_SCALING } from '../../src/config';

describe('LEVEL_SCALING', () => {
  it('has one entry per level', () => {
    expect(LEVEL_SCALING).toHaveLength(21);
    expect(LEVEL_SCALING).toHaveLength(LEVEL_COUNT);
  });

  it('has finite positive factors, all 1.0 in AP-90', () => {
    for (const s of LEVEL_SCALING) {
      expect(s).toEqual({ hp: 1, xp: 1, coin: 1, contact: 1 });
    }
  });
});

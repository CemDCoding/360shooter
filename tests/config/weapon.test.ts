import { describe, expect, it } from 'vitest';
import { WEAPON_BASE } from '../../src/config';

describe('weapon', () => {
  it('start weapon fires at least 4 shots per second (AP-23)', () => {
    expect(WEAPON_BASE.fireRatePerSec).toBeGreaterThanOrEqual(4);
  });
});

import { describe, expect, it } from 'vitest';
import { COIN_VISUAL } from '../../src/config/coins';
import { RING_DEPTH } from '../../src/entities/ArmourRing';
import { PARRY_DEPTH } from '../../src/entities/ParryOverlay';
import { PET_DEPTH_BELOW_PLAYER } from '../../src/entities/pets/petLogic';

// Known fixed depths that are not exported as constants (see AP-165 diagnosis).
const PLAYER_DEPTH = 10;
const PICKUP_DEPTH = 5;
const BOSS_HAZARD_MAX_DEPTH = 3;

describe('depth order (AP-165)', () => {
  it('quicktime circles lie above every exported game depth', () => {
    for (const d of [RING_DEPTH, COIN_VISUAL.depth, PLAYER_DEPTH, PICKUP_DEPTH, BOSS_HAZARD_MAX_DEPTH]) {
      expect(PARRY_DEPTH).toBeGreaterThan(d);
    }
    expect(PARRY_DEPTH).toBeGreaterThan(PLAYER_DEPTH + 1 + PET_DEPTH_BELOW_PLAYER);
  });
  it('fire ring stays above the player', () => {
    expect(RING_DEPTH).toBeGreaterThan(PLAYER_DEPTH);
  });
});

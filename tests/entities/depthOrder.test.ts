import { describe, expect, it } from 'vitest';
import { COIN_VISUAL } from '../../src/config/coins';
import { RING_DEPTH } from '../../src/entities/ArmourRing';
import { PARRY_DEPTH } from '../../src/entities/ParryOverlay';
import { petDepth } from '../../src/entities/pets/Pet';
import { FOCUS_DIM_DEPTH } from '../../src/logic/effectRank';

// Not exported, copied from the source (AP-165 diagnosis):
const PLAYER_DEPTH = 10; // GameScene.ts: this.player.setDepth(10)
const PICKUP_DEPTH = 5; // GameScene.ts: item.setDepth(5) / pickup.setDepth(5)
const BOSS_HAZARD_MAX_DEPTH = 3; // bosses/*: SPARK_DEPTH = 3 (spikes and orbs 2)

describe('depth order (AP-165)', () => {
  it('quicktime circles lie above every game depth', () => {
    const depths = [
      RING_DEPTH,
      COIN_VISUAL.depth,
      petDepth(PLAYER_DEPTH),
      PLAYER_DEPTH,
      PICKUP_DEPTH,
      BOSS_HAZARD_MAX_DEPTH,
    ];
    for (const d of depths) expect(PARRY_DEPTH).toBeGreaterThan(d);
    expect(PARRY_DEPTH).toBeGreaterThan(PLAYER_DEPTH + 1);
  });
  it('AP-173: the focus ink layer lies above the floor and below every game depth', () => {
    const MAP_FLOOR_DEPTH = -100; // MapBackground.ts: DEPTH (tiles, decoration, motes, vignette)
    const PHARAOH_STORM_DEPTH = -50; // Pharaoh.ts: STORM_DEPTH, the lowest boss attack
    const CAPYBARA_AURA_DEPTH = -1; // Capybara.ts: AURA_DEPTH, the lowest pet effect
    const TELEGRAPH_DEPTH = 1; // bosses/Telegraph.ts
    expect(FOCUS_DIM_DEPTH).toBeGreaterThan(MAP_FLOOR_DEPTH);
    const above = [
      PHARAOH_STORM_DEPTH,
      CAPYBARA_AURA_DEPTH,
      TELEGRAPH_DEPTH,
      BOSS_HAZARD_MAX_DEPTH,
      PICKUP_DEPTH,
      COIN_VISUAL.depth,
      petDepth(PLAYER_DEPTH),
      PLAYER_DEPTH,
      RING_DEPTH,
      PARRY_DEPTH,
    ];
    for (const d of above) expect(FOCUS_DIM_DEPTH).toBeLessThan(d);
  });
  it('fire ring lies above the pet and the player', () => {
    expect(RING_DEPTH).toBeGreaterThan(petDepth(PLAYER_DEPTH));
    expect(RING_DEPTH).toBeGreaterThan(PLAYER_DEPTH);
  });
});

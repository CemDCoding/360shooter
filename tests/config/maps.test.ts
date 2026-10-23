import { describe, expect, it } from 'vitest';
import { ASSETS } from '../../src/config/assets';
import { LEVELS } from '../../src/config/levels';
import { MAPS, MAX_MAP_PARTICLES } from '../../src/config/maps';
import type { BatchId } from '../../src/contracts';

const BATCHES: BatchId[] = ['forest', 'forestNight', 'elfForest'];

describe('maps', () => {
  it('has an entry with a valid spritesheet key for every batch used by levels', () => {
    const used = new Set(LEVELS.map((l) => l.batch));
    for (const b of [...BATCHES, ...used]) {
      const map = MAPS[b];
      expect(map).toBeDefined();
      const asset = ASSETS.find((a) => a.key === map.tilesetKey);
      expect(asset?.kind).toBe('spritesheet');
    }
  });

  it('keeps values in range and particles light', () => {
    for (const b of BATCHES) {
      const m = MAPS[b];
      expect(m.decoDensity).toBeGreaterThanOrEqual(0);
      expect(m.decoDensity).toBeLessThanOrEqual(1);
      expect(m.vignette).toBeGreaterThanOrEqual(0);
      expect(m.vignette).toBeLessThanOrEqual(1);
      expect(m.effectCount).toBeLessThanOrEqual(MAX_MAP_PARTICLES);
      if (m.effect === 'none') expect(m.effectCount).toBe(0);
    }
  });

  it('makes the three batches distinguishable', () => {
    const colors = new Set(BATCHES.map((b) => MAPS[b].baseColor));
    expect(colors.size).toBe(3);
    expect(MAPS.forest.effect).toBe('none');
    expect(MAPS.forestNight.effect).toBe('fireflies');
    expect(MAPS.elfForest.effect).toBe('spores');
  });
});

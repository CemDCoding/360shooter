import { describe, expect, it } from 'vitest';
import { ASSETS } from '../../src/config/assets';
import { LEVELS } from '../../src/config/levels';
import { MAPS, MAX_MAP_PARTICLES } from '../../src/config/maps';
import { themeColor } from '../../src/config/theme';
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

  it('has no tint on any map (the tiles bring their own colors)', () => {
    for (const b of BATCHES) expect(MAPS[b].tint).toBeUndefined();
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

  it('has complete desert, pyramid and oasis maps with design tokens (AP-111)', () => {
    const EXPECTED = {
      desert: ['biome.desert-ground', 0.14, 0.4, 'sand', 'game.sand'],
      pyramids: ['biome.pyramid-ground', 0.18, 0.55, 'embers', 'game.ember'],
      oasis: ['biome.oasis-ground', 0.2, 0.45, 'motes', 'game.oasis-mote'],
    } as const;
    expect(Object.keys(MAPS).sort()).toEqual([...BATCHES, ...Object.keys(EXPECTED)].sort());
    for (const [b, [ground, density, vignette, effect, color]] of Object.entries(EXPECTED)) {
      const m = MAPS[b as BatchId];
      expect(m.tilesetKey).toBe('tiles-' + b);
      expect(ASSETS.find((a) => a.key === m.tilesetKey)?.kind).toBe('spritesheet');
      expect(m.tint).toBeUndefined();
      expect(m.baseColor).toBe(themeColor(ground).num);
      expect(m.decoDensity).toBe(density);
      expect(m.vignette).toBe(vignette);
      expect(m.effect).toBe(effect);
      expect(m.effectColor).toBe(themeColor(color).num);
      expect(m.effectCount).toBeGreaterThan(0);
      expect(m.effectCount).toBeLessThanOrEqual(MAX_MAP_PARTICLES);
    }
    expect(new Set(Object.values(MAPS).map((m) => m.baseColor)).size).toBe(6);
  });

  it('takes ground and particle colours from the design tokens', () => {
    expect(MAPS.forest.baseColor).toBe(themeColor('biome.forest-ground').num);
    expect(MAPS.forestNight.baseColor).toBe(themeColor('biome.night-ground').num);
    expect(MAPS.elfForest.baseColor).toBe(themeColor('biome.elf-ground').num);
    expect(MAPS.forestNight.effectColor).toBe(themeColor('game.firefly').num);
    expect(MAPS.elfForest.effectColor).toBe(themeColor('game.spore').num);
  });
});

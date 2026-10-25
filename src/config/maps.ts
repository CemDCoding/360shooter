import type { BatchId } from '../contracts';
import { themeColor } from './theme';

export type MapEffect = 'none' | 'fireflies' | 'spores';

export interface MapDef {
  /** Asset key of the tileset spritesheet (see ASSETS). Frame 0 = ground, further frames = decoration. */
  tilesetKey: string;
  /** Background color behind the tiles (0xRRGGBB). */
  baseColor: number;
  /** Tint applied to all tiles (undefined = none). */
  tint?: number;
  /** Share of cells that get a decoration tile (0..1). */
  decoDensity: number;
  effect: MapEffect;
  /** Particle color of the effect (0xRRGGBB). */
  effectColor: number;
  /** Number of particles, at most MAX_MAP_PARTICLES. */
  effectCount: number;
  /** Edge darkening strength (0..1). */
  vignette: number;
}

export const MAX_MAP_PARTICLES = 40;

export const MAPS: Readonly<Record<BatchId, MapDef>> = {
  forest: {
    tilesetKey: 'tiles-forest',
    baseColor: themeColor('biome.forest-ground').num,
    decoDensity: 0.12,
    effect: 'none',
    effectColor: themeColor('game.hit-flash').num,
    effectCount: 0,
    vignette: 0.35,
  },
  forestNight: {
    tilesetKey: 'tiles-forest-night',
    baseColor: themeColor('biome.night-ground').num,
    tint: themeColor('biome.night').num,
    decoDensity: 0.14,
    effect: 'fireflies',
    effectColor: themeColor('game.firefly').num,
    effectCount: 24,
    vignette: 0.6,
  },
  elfForest: {
    tilesetKey: 'tiles-elf-forest',
    baseColor: themeColor('biome.elf-ground').num,
    tint: themeColor('biome.elf').num,
    decoDensity: 0.18,
    effect: 'spores',
    effectColor: themeColor('game.spore').num,
    effectCount: 30,
    vignette: 0.45,
  },
};

export function getMap(batch: BatchId): MapDef {
  return MAPS[batch];
}

import type { BatchId } from '../contracts';

export type MapEffect = 'none' | 'fireflies' | 'spores';

export interface MapDef {
  /** Asset key of the tileset spritesheet (see ASSETS). Frame 0 = ground, further frames = decoration. */
  tilesetKey: string;
  /** Background color behind the tiles (0xRRGGBB). */
  baseColor: number;
  /** Tint applied to all tiles (0xFFFFFF = none). */
  tint: number;
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
    baseColor: 0x2f5d34,
    tint: 0xffffff,
    decoDensity: 0.12,
    effect: 'none',
    effectColor: 0xffffff,
    effectCount: 0,
    vignette: 0.35,
  },
  forestNight: {
    tilesetKey: 'tiles-forest-night',
    baseColor: 0x0f1c3a,
    tint: 0x7f8fd0,
    decoDensity: 0.14,
    effect: 'fireflies',
    effectColor: 0xf3f07a,
    effectCount: 24,
    vignette: 0.6,
  },
  elfForest: {
    tilesetKey: 'tiles-elf-forest',
    baseColor: 0x3b2a6b,
    tint: 0xd9b8ff,
    decoDensity: 0.18,
    effect: 'spores',
    effectColor: 0x9ff5ec,
    effectCount: 30,
    vignette: 0.45,
  },
};

export function getMap(batch: BatchId): MapDef {
  return MAPS[batch];
}

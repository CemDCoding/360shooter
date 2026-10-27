// Pure helper of the giant stone rim (AP-84, PE-101). No Phaser import, testable.
import { ARENA } from '../../config/arena';
import type { ArenaRect } from '../../contracts';

/**
 * Rim radii of the stone start and bounce positions. The tuned rim (rx, ry) is the distance for the base
 * arena; on a wider arena the rim grows by the extra half width, so the stone sits as far from the edge as before.
 */
export function rimRadii(rim: { rx: number; ry: number }, arena: ArenaRect): { rx: number; ry: number } {
  return {
    rx: rim.rx + (arena.width - ARENA.baseWidth) / 2,
    ry: rim.ry + (arena.height - ARENA.height) / 2,
  };
}

// Speedline drawing of the finisher (AP-160, brief H-39), used by the Wurzelbrecher ring effect.
// Graphics only, so it works without WebGL. The M10 screen blocks were removed in AP-191.
import type Phaser from 'phaser';
import { THEME } from '../../config/theme';
import { speedlineWedges, type Point } from './layout';

const SPEEDLINES = THEME.sizeCount['size.finisher-speedlines'];

/** Draws radial speedlines into `g` (filled quads, no gradient). */
export function drawSpeedlines(
  g: Phaser.GameObjects.Graphics,
  center: Point,
  width: number,
  height: number,
  colorNum: number,
  seed: number,
  count = SPEEDLINES,
): void {
  g.fillStyle(colorNum, 1);
  for (const quad of speedlineWedges(center.x, center.y, width, height, count, seed)) {
    g.fillPoints(quad, true);
  }
}

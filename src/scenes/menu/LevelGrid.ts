import Phaser from 'phaser';
import { LEVELS } from '../../config';
import type { BatchId } from '../../contracts';
import { THEME, type ColorName } from '../../config/theme';
import { drawBevel, drawLock, drawRing, drawStar, kText, textWidth } from './kassette';
import { groupLevels } from './levelGroups';
import { groupRange, tileState, type TileState } from './menuLogic';

export const GRID_WIDTH = 408;
export const GRID_HEIGHT = 252;

const TILE = THEME.sizePx['size.tile'];
const TILE_GAP = 4;
const HEAD_H = 14;
const HEAD_GAP = 13;
const GROUP_GAP = 10;
const PAD_X = 8;
const PAD_Y = 10;

const BIOME_COLOR: Record<BatchId, ColorName> = {
  forest: 'biome.forest',
  forestNight: 'biome.night',
  elfForest: 'biome.elf',
};

interface TileStyle {
  fill: ColorName;
  hi: ColorName;
  lo: ColorName;
  fg: ColorName;
}

const TILE_STYLE: Record<TileState, TileStyle> = {
  done: { fill: 'menu.done-bg', hi: 'menu.done-hi', lo: 'menu.done-lo', fg: 'menu.done-fg' },
  current: {
    fill: 'menu.action-bg',
    hi: 'menu.action-hi',
    lo: 'menu.action-lo',
    fg: 'menu.action-fg',
  },
  locked: {
    fill: 'menu.locked-bg',
    hi: 'menu.locked-bg',
    lo: 'menu.locked-bg',
    fg: 'menu.locked-fg',
  },
};

/**
 * Level-Raster im Kassetten-Panel: nach Biom gruppiert mit Aufkleber und Bereich.
 * Zustände: geschafft (Minze und Stern), aktuell (Koralle, Ring, Pfeil), gesperrt (Schloss).
 * x, y ist die linke obere Ecke des Panels.
 */
export class LevelGrid extends Phaser.GameObjects.Container {
  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    highestUnlockedLevel: number,
    onSelect: (levelId: number) => void,
  ) {
    super(scene, x, y);
    const g = scene.add.graphics();
    this.add(g);
    drawBevel(g, 0, 0, GRID_WIDTH, GRID_HEIGHT, {
      fill: 'menu.surface',
      hi: 'menu.surface-hi',
      lo: 'menu.surface-lo',
    });

    let top = PAD_Y;
    for (const group of groupLevels(LEVELS, highestUnlockedLevel)) {
      this.addGroupHead(
        scene,
        g,
        PAD_X,
        top,
        group.batch,
        group.label.toUpperCase(),
        groupRange(group),
      );
      const rowY = top + HEAD_H + HEAD_GAP;
      group.cells.forEach((cell, i) => {
        const state = tileState(cell.id, highestUnlockedLevel);
        const cx = PAD_X + i * (TILE + TILE_GAP);
        this.add(this.makeTile(scene, cx, rowY, cell.id, state, () => onSelect(cell.id)));
      });
      top = rowY + TILE + GROUP_GAP;
    }
    this.addLegend(scene, g);
    scene.add.existing(this);
  }

  private addGroupHead(
    scene: Phaser.Scene,
    g: Phaser.GameObjects.Graphics,
    x: number,
    y: number,
    batch: BatchId,
    name: string,
    range: string,
  ): void {
    const text = kText(scene, x + 5 + 8 + 5, y + 4, name, 1, 'menu.sticker-fg');
    const textW = textWidth(text);
    const w = 5 + 8 + 5 + textW + 5;
    // Aufkleber: Umriss mit 2 px Schatten, Biomfarbe als Muster-Feld
    g.fillStyle(THEME.colors['menu.outline'].num).fillRect(x, y, w + 4, HEAD_H + 4);
    g.fillStyle(THEME.colors['menu.outline'].num).fillRect(x + 2, y + 2, w + 4, HEAD_H + 4);
    g.fillStyle(THEME.colors['menu.sticker-bg'].num).fillRect(x, y, w, HEAD_H);
    g.fillStyle(THEME.colors['menu.outline'].num).fillRect(x + 5 - 1, y + 3 - 1, 10, 10);
    g.fillStyle(THEME.colors[BIOME_COLOR[batch]].num).fillRect(x + 5, y + 3, 8, 8);
    this.add(text);
    this.add(kText(scene, x + w + 10, y + 4, range, 1, 'menu.text-muted'));
  }

  private makeTile(
    scene: Phaser.Scene,
    x: number,
    y: number,
    id: number,
    state: TileState,
    onPick: () => void,
  ): Phaser.GameObjects.Container {
    const s = TILE_STYLE[state];
    const tile = scene.add.container(x + TILE / 2, y + TILE / 2);
    const g = scene.add.graphics();
    tile.add(g);
    drawBevel(g, -TILE / 2, -TILE / 2, TILE, TILE, s, false);
    if (state === 'current') {
      drawRing(g, -TILE / 2, -TILE / 2, TILE, TILE, 0, 'menu.focus');
      // Pfeil über der Kachel zeigt auf sie (zweites Merkmal neben der Farbe)
      for (let row = 0; row < 6; row++) {
        const half = 5 - row;
        g.fillStyle(THEME.colors['menu.focus'].num).fillRect(
          -half,
          -TILE / 2 - 13 + row,
          half * 2,
          1,
        );
      }
    }
    if (state === 'locked') {
      if (scene.textures.exists('ui-icons')) {
        tile.add(scene.add.image(0, 0, 'ui-icons', 3).setTint(THEME.colors['menu.locked-fg'].num));
      }
    } else {
      tile.add(kText(scene, 0, 0, String(id), 2, s.fg, 0.5, 0.5));
    }
    if (state === 'done') {
      drawStar(g, TILE / 2 - 9, TILE / 2 - 9, 'menu.outline', 'menu.gold');
    }
    if (state !== 'locked') {
      tile.setSize(TILE, TILE);
      tile.setInteractive({ useHandCursor: true });
      tile.on('pointerup', onPick);
    }
    return tile;
  }

  private addLegend(scene: Phaser.Scene, g: Phaser.GameObjects.Graphics): void {
    const y = GRID_HEIGHT - PAD_Y - 8;
    let x = PAD_X;
    const entry = (caption: string, icon: (ix: number) => void): void => {
      icon(x);
      const t = kText(scene, x + 12, y + 1, caption, 1, 'menu.text-muted');
      this.add(t);
      x += 12 + textWidth(t) + 14;
    };
    entry('GESCHAFFT', (ix) => drawStar(g, ix, y, 'menu.outline', 'menu.gold'));
    entry('AKTUELL', (ix) => {
      g.fillStyle(THEME.colors['menu.focus'].num).fillRect(ix - 2, y - 2, 12, 12);
      g.fillStyle(THEME.colors['menu.outline'].num).fillRect(ix - 1, y - 1, 10, 10);
      g.fillStyle(THEME.colors['menu.action-bg'].num).fillRect(ix, y, 8, 8);
    });
    entry('GESPERRT', (ix) => drawLock(g, ix, y, 'menu.text-muted', 'menu.locked-bg'));
  }
}

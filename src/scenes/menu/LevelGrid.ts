import Phaser from 'phaser';
import { LEVELS } from '../../config';
import { Button } from './Button';
import { formatDuration, groupLevels } from './levelGroups';

const CELL = 40;
const GAP = 6;
const GROUP_HEIGHT = 62;

/** Level 0-20 in three batch groups; locked levels are grey with a lock, free ones are tappable. */
export class LevelGrid extends Phaser.GameObjects.Container {
  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    highestUnlockedLevel: number,
    onSelect: (levelId: number) => void,
  ) {
    super(scene, x, y);
    groupLevels(LEVELS, highestUnlockedLevel).forEach((group, row) => {
      const top = row * GROUP_HEIGHT;
      const rowWidth = group.cells.length * (CELL + GAP) - GAP;
      this.add(
        scene.add
          .text(0, top, group.label, { color: '#ffd966', fontSize: '12px' })
          .setOrigin(0.5, 0),
      );
      group.cells.forEach((cell, i) => {
        const cx = -rowWidth / 2 + CELL / 2 + i * (CELL + GAP);
        const cy = top + 16 + CELL / 2;
        const btn = new Button(
          scene,
          cx,
          cy,
          String(cell.id),
          () => onSelect(cell.id),
          { width: CELL, height: CELL, fontSize: 14, subLabel: formatDuration(cell.durationSec) },
        );
        if (!cell.unlocked) {
          btn.setEnabled(false);
          btn.label.setVisible(false);
          // lock drawn as body + shackle, no asset needed
          const g = scene.add.graphics();
          g.fillStyle(0xcccccc, 1).fillRect(-5, -5, 10, 8);
          g.lineStyle(2, 0xcccccc, 1).strokeCircle(0, -7, 3);
          g.fillStyle(0x333333, 1).fillRect(-1, -2, 2, 3);
          btn.add(g);
        }
        this.add(btn);
      });
    });
    scene.add.existing(this);
  }
}

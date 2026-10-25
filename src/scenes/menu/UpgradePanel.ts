import Phaser from 'phaser';
import { MAX_UPGRADE_LEVEL } from '../../contracts';
import type { UpgradeTrack } from '../../contracts';
import { UPGRADES } from '../../config/upgrades';
import { buyUpgrade, upgradeCost } from '../../logic/upgrades';
import { loadSave, writeSave } from '../../platform/storage';
import { Button } from './Button';

const TRACKS: readonly UpgradeTrack[] = [
  'weaponFireRate',
  'weaponDamage',
  'playerMaxHp',
  'playerTurnSpeed',
];

/** Modal upgrade shop; buys via buyUpgrade + writeSave and redraws itself. */
export class UpgradePanel extends Phaser.GameObjects.Container {
  private readonly content: Phaser.GameObjects.Container;
  private readonly onChange: () => void;
  private readonly onClose: () => void;
  private readonly escKey: Phaser.Input.Keyboard.Key | null;
  private readonly onEsc = (): void => this.onClose();

  constructor(scene: Phaser.Scene, onChange: () => void, onClose: () => void) {
    super(scene, 0, 0);
    this.onChange = onChange;
    this.onClose = onClose;
    this.setDepth(1000);
    const { width, height } = scene.scale;
    const backdrop = scene.add
      .rectangle(0, 0, width, height, 0x000000, 0.75)
      .setOrigin(0)
      .setInteractive();
    const panel = scene.add
      .rectangle(width / 2, height / 2, 520, 270, 0x1b2430)
      .setStrokeStyle(2, 0xffffff, 0.8);
    this.content = scene.add.container(0, 0);
    this.add([backdrop, panel, this.content]);
    this.escKey = scene.input.keyboard?.addKey(Phaser.Input.Keyboard.KeyCodes.ESC) ?? null;
    this.escKey?.on('down', this.onEsc);
    this.redraw();
    scene.add.existing(this);
  }

  private redraw(): void {
    const scene = this.scene;
    const { width, height } = scene.scale;
    const save = loadSave();
    const levels = save.upgrades;
    const gold = save.gold ?? 0;
    this.content.removeAll(true);
    const top = height / 2 - 135;
    const x0 = width / 2 - 240;
    const items: Phaser.GameObjects.GameObject[] = [
      scene.add
        .text(x0, top + 16, 'Upgrades', { color: '#ffffff', fontSize: '20px' })
        .setOrigin(0, 0.5),
      scene.add
        .text(width / 2 + 240, top + 16, `Gold: ${gold}`, { color: '#ffd24a', fontSize: '16px' })
        .setOrigin(1, 0.5),
    ];
    TRACKS.forEach((track, i) => {
      const y = top + 62 + i * 42;
      const level = levels?.[track] ?? 0;
      const cost = upgradeCost(track, level);
      items.push(
        scene.add
          .text(x0, y, UPGRADES[track].label, { color: '#ffffff', fontSize: '14px' })
          .setOrigin(0, 0.5),
        scene.add
          .text(x0 + 170, y, `Stufe ${level}/${MAX_UPGRADE_LEVEL}`, {
            color: '#cfd8e3',
            fontSize: '14px',
          })
          .setOrigin(0, 0.5),
        scene.add
          .text(x0 + 290, y, cost === null ? 'max' : `${cost} Gold`, {
            color: cost === null ? '#5ad17a' : '#ffd24a',
            fontSize: '14px',
          })
          .setOrigin(0, 0.5),
      );
      const btn = new Button(scene, x0 + 445, y, 'Kaufen', () => this.buy(track), {
        width: 80,
        height: 34,
        fontSize: 12,
      });
      btn.setEnabled(cost !== null && gold >= cost);
      items.push(btn);
    });
    items.push(
      new Button(scene, width / 2, top + 250, 'Schließen', () => this.onClose(), {
        width: 120,
        height: 36,
        fontSize: 13,
      }),
    );
    this.content.add(items);
  }

  private buy(track: UpgradeTrack): void {
    const next = buyUpgrade(loadSave(), track);
    if (!next) return;
    writeSave(next);
    this.redraw();
    this.onChange();
  }

  override destroy(fromScene?: boolean): void {
    this.escKey?.off('down', this.onEsc);
    super.destroy(fromScene);
  }
}

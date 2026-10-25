import Phaser from 'phaser';
import { Button } from './Button';

/** Modal yes/no dialog; the full-screen backdrop swallows input for everything below. */
export class ConfirmDialog extends Phaser.GameObjects.Container {
  constructor(scene: Phaser.Scene, message: string, onConfirm: () => void, onCancel: () => void) {
    const { width, height } = scene.scale;
    super(scene, 0, 0);
    this.setDepth(1000);
    const backdrop = scene.add
      .rectangle(0, 0, width, height, 0x000000, 0.7)
      .setOrigin(0)
      .setInteractive();
    const panel = scene.add
      .rectangle(width / 2, height / 2, 280, 120, 0x1b2430)
      .setStrokeStyle(2, 0xffffff, 0.8);
    const text = scene.add
      .text(width / 2, height / 2 - 28, message, {
        color: '#ffffff',
        fontSize: '14px',
        align: 'center',
        wordWrap: { width: 260 },
      })
      .setOrigin(0.5);
    const yes = new Button(scene, width / 2 - 60, height / 2 + 28, 'Ja, löschen', onConfirm, {
      width: 100,
      height: 36,
      fill: 0x8a2d2d,
      hoverFill: 0xb23a3a,
      fontSize: 12,
    });
    const no = new Button(scene, width / 2 + 60, height / 2 + 28, 'Abbrechen', onCancel, {
      width: 100,
      height: 36,
      fontSize: 12,
    });
    this.add([backdrop, panel, text, yes, no]);
    scene.add.existing(this);
  }
}

import Phaser from 'phaser';
import type { ActiveArmour } from '../../contracts';
import { armourDisplay } from './hudMath';

/** Circle with remaining active time, then cooldown time; invisible without armour. */
export class ArmourIndicator {
  private readonly circle: Phaser.GameObjects.Arc;
  private readonly text: Phaser.GameObjects.Text;

  constructor(scene: Phaser.Scene, x: number, y: number, k: number, fontPx: number) {
    this.circle = scene.add.circle(x, y, 6 * k, 0xff7a1a).setStrokeStyle(1, 0xffffff, 0.8);
    this.text = scene.add
      .text(x + 10 * k, y, '', { fontFamily: 'monospace', fontSize: `${fontPx}px`, color: '#ffffff' })
      .setOrigin(0, 0.5)
      .setStroke('#000000', 2);
    this.set({ id: null, activeMsLeft: 0, cooldownMsLeft: 0 });
  }

  set(a: ActiveArmour): void {
    const d = armourDisplay(a);
    const visible = d.phase !== 'hidden';
    this.circle.setVisible(visible);
    this.text.setVisible(visible);
    if (!visible) return;
    const active = d.phase === 'active';
    this.circle.setFillStyle(active ? 0xff7a1a : 0x666666, active ? 1 : 0.7);
    this.text.setText(`${d.sec}s`);
    this.text.setColor(active ? '#ffffff' : '#aaaaaa');
  }
}

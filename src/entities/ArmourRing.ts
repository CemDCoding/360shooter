import Phaser from 'phaser';
import { THEME } from '../config/theme';
import type { ArmourDef } from '../contracts/armour';

const RING_DEPTH = 50;
const RING_COLOR = THEME.colors['game.fire-ring'].num;
const RING_STROKE_PX = 2;
const DASH_PX = 6;

/** Visual dashed ring around the player. Display only; damage and timing live in the armour logic. */
export class ArmourRing {
  private gfx: Phaser.GameObjects.Graphics | null;

  constructor(scene: Phaser.Scene) {
    this.gfx = scene.add.graphics().setDepth(RING_DEPTH).setVisible(false);
  }

  /** Shows the dashed ring with the radius of the given armour. */
  show(def: ArmourDef): void {
    const gfx = this.gfx;
    if (!gfx) return;
    const r = def.radiusPx;
    const dashes = Math.max(8, Math.round((Math.PI * 2 * r) / DASH_PX / 2) * 2);
    const step = (Math.PI * 2) / dashes;
    gfx.clear().lineStyle(RING_STROKE_PX, RING_COLOR, 1);
    for (let i = 0; i < dashes; i += 2) {
      gfx.beginPath();
      gfx.arc(0, 0, r, i * step, (i + 1) * step);
      gfx.strokePath();
    }
    gfx.setVisible(true);
  }

  hide(): void {
    this.gfx?.setVisible(false);
  }

  /** Call every frame with the player position. */
  setCenter(x: number, y: number): void {
    this.gfx?.setPosition(x, y);
  }

  destroy(): void {
    this.gfx?.destroy();
    this.gfx = null;
  }
}

import Phaser from 'phaser';
import { angleFromCenter } from './angle';

/**
 * Unified aim input. Mouse: target follows the pointer (no click needed).
 * Touch: target is the last touch point and persists after release.
 */
export class AimInput {
  targetAngle = 0;
  private readonly scene: Phaser.Scene;
  private readonly cx: number;
  private readonly cy: number;
  private readonly onContextMenu = (e: Event) => e.preventDefault();

  constructor(scene: Phaser.Scene, cx: number, cy: number) {
    this.scene = scene;
    this.cx = cx;
    this.cy = cy;
    scene.input.on('pointermove', this.update, this);
    scene.input.on('pointerdown', this.update, this);
    scene.input.mouse?.disableContextMenu();
    const canvas = scene.game.canvas;
    canvas.addEventListener('contextmenu', this.onContextMenu);
    canvas.style.touchAction = 'none';
    scene.events.once(Phaser.Scenes.Events.SHUTDOWN, this.destroy, this);
  }

  private update(pointer: Phaser.Input.Pointer): void {
    this.targetAngle = angleFromCenter(pointer.x, pointer.y, this.cx, this.cy);
  }

  destroy(): void {
    this.scene.input.off('pointermove', this.update, this);
    this.scene.input.off('pointerdown', this.update, this);
    this.scene.game.canvas.removeEventListener('contextmenu', this.onContextMenu);
  }
}

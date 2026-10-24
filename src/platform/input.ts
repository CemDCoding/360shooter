import Phaser from 'phaser';
import { pointerAngleWhileStick, resolveAim } from '../logic/aimSource';
import { angleFromCenter } from './angle';

/** What AimInput needs from the virtual stick. */
export interface StickSource {
  readonly held: boolean;
  readonly angleRad: number | null;
  readonly pointerId: number | null;
  contains(x: number, y: number): boolean;
}

/**
 * Unified aim input. Mouse: target follows the pointer (no click needed).
 * Touch: target is the last touch point and persists after release.
 */
export class AimInput {
  private lastAngle = 0;
  private pointerAngle: number | null = null;
  private readonly stick?: StickSource;
  private readonly scene: Phaser.Scene;
  private readonly cx: number;
  private readonly cy: number;
  private readonly onContextMenu = (e: Event) => e.preventDefault();

  constructor(scene: Phaser.Scene, cx: number, cy: number, stick?: StickSource) {
    this.stick = stick;
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

  /** Aim angle in radians; the priority rule lives in resolveAim (stick beats tap and mouse). */
  get targetAngle(): number {
    this.pointerAngle = pointerAngleWhileStick(this.stick?.held ?? false, this.pointerAngle);
    const r = resolveAim({
      stickHeld: this.stick?.held ?? false,
      stickAngleRad: this.stick?.angleRad ?? null,
      pointerAngleRad: this.pointerAngle,
      lastAngleRad: this.lastAngle,
    });
    this.lastAngle = r.angleRad;
    return r.angleRad;
  }

  private update(pointer: Phaser.Input.Pointer): void {
    const stick = this.stick;
    if (stick) {
      // The stick's own finger and taps on the stick never aim; other fingers are ignored while held.
      if (pointer.id === stick.pointerId || stick.held || stick.contains(pointer.x, pointer.y))
        return;
    }
    this.pointerAngle = angleFromCenter(pointer.x, pointer.y, this.cx, this.cy);
  }

  destroy(): void {
    this.scene.input.off('pointermove', this.update, this);
    this.scene.input.off('pointerdown', this.update, this);
    this.scene.game.canvas.removeEventListener('contextmenu', this.onContextMenu);
  }
}

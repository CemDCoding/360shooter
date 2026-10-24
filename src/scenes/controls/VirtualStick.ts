import Phaser from 'phaser';
import { stickAngleRad, stickVector } from '../../platform/stick';

/** Layout/feel constants of the stick (arena units). */
const BASE_DIAMETER = 140;
const KNOB_DIAMETER = 56;
const EDGE_MARGIN = 24;
const DEAD_ZONE_RATIO = 0.15;
const ALPHA = 0.5;
const DEPTH = 50;

/**
 * Virtual stick, bottom right, touch devices only. Owns one pointer (by id).
 * The canvas already lies inside the safe area (layoutArena), so the margin is relative to it.
 */
export class VirtualStick {
  private readonly scene: Phaser.Scene;
  private readonly base: Phaser.GameObjects.Arc;
  private readonly knob: Phaser.GameObjects.Arc;
  private readonly cx: number;
  private readonly cy: number;
  private readonly radius = BASE_DIAMETER / 2;
  private ownerId: number | null = null;
  private angle: number | null = null;
  private destroyed = false;

  /** True if the stick is shown (touch device). */
  readonly enabled: boolean;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    this.enabled = !!scene.sys.game.device.input.touch;
    const { width, height } = scene.scale;
    this.cx = width - EDGE_MARGIN - this.radius;
    this.cy = height - EDGE_MARGIN - this.radius;
    this.base = scene.add
      .circle(this.cx, this.cy, this.radius, 0xffffff, 0.25)
      .setStrokeStyle(2, 0xffffff, 0.8)
      .setScrollFactor(0)
      .setAlpha(ALPHA)
      .setDepth(DEPTH)
      .setVisible(this.enabled);
    this.knob = scene.add
      .circle(this.cx, this.cy, KNOB_DIAMETER / 2, 0xffffff, 0.8)
      .setScrollFactor(0)
      .setAlpha(ALPHA)
      .setDepth(DEPTH + 1)
      .setVisible(this.enabled);
    if (!this.enabled) return;
    scene.input.addPointer(2);
    scene.input.on('pointerdown', this.onDown, this);
    scene.input.on('pointermove', this.onMove, this);
    scene.input.on('pointerup', this.onUp, this);
    scene.input.on('pointerupoutside', this.onUp, this);
    // A paused scene gets no pointerup: release the stick on pause and resume.
    scene.events.on(Phaser.Scenes.Events.PAUSE, this.reset, this);
    scene.events.on(Phaser.Scenes.Events.RESUME, this.reset, this);
    scene.events.once(Phaser.Scenes.Events.SHUTDOWN, this.destroy, this);
  }

  get held(): boolean {
    return this.ownerId !== null;
  }

  /** Stick angle in radians, null while not held or inside the dead zone. */
  get angleRad(): number | null {
    return this.ownerId === null ? null : this.angle;
  }

  /** Id of the owning pointer, null if not held. */
  get pointerId(): number | null {
    return this.ownerId;
  }

  /** True if the point lies on the stick base (taps there never aim). */
  contains(x: number, y: number): boolean {
    return this.enabled && Math.hypot(x - this.cx, y - this.cy) <= this.radius;
  }

  private onDown(pointer: Phaser.Input.Pointer): void {
    if (this.ownerId !== null || !this.contains(pointer.x, pointer.y)) return;
    this.ownerId = pointer.id;
    this.track(pointer);
  }

  private onMove(pointer: Phaser.Input.Pointer): void {
    if (pointer.id === this.ownerId) this.track(pointer);
  }

  private onUp(pointer: Phaser.Input.Pointer): void {
    if (pointer.id === this.ownerId) this.reset();
  }

  private reset(): void {
    this.ownerId = null;
    this.angle = null;
    this.knob.setPosition(this.cx, this.cy);
  }

  private track(pointer: Phaser.Input.Pointer): void {
    const v = stickVector(pointer.x - this.cx, pointer.y - this.cy, this.radius, DEAD_ZONE_RATIO);
    this.angle = v.active ? stickAngleRad(v) : null;
    this.knob.setPosition(this.cx + v.x * this.radius, this.cy + v.y * this.radius);
  }

  destroy(): void {
    if (this.destroyed) return;
    this.destroyed = true;
    if (this.enabled) {
      this.scene.input.off('pointerdown', this.onDown, this);
      this.scene.input.off('pointermove', this.onMove, this);
      this.scene.input.off('pointerup', this.onUp, this);
      this.scene.input.off('pointerupoutside', this.onUp, this);
      this.scene.events.off(Phaser.Scenes.Events.PAUSE, this.reset, this);
      this.scene.events.off(Phaser.Scenes.Events.RESUME, this.reset, this);
    }
    this.ownerId = null;
    this.angle = null;
    this.base.destroy();
    this.knob.destroy();
  }
}

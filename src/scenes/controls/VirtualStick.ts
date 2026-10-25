import Phaser from 'phaser';
import { THEME, themeColor } from '../../config/theme';
import { STICK_CATCH_DIAMETER } from '../hud/hudMath';
import { stickAngleRad, stickVector } from '../../platform/stick';

/** Layout/feel constants of the stick (arena units). Drawn size comes from the design tokens. */
const BASE_DIAMETER = THEME.sizePx['size.stick'];
const KNOB_DIAMETER = THEME.sizePx['size.stick-knob'];
/** Catch area where a finger starts the stick: independent of the drawn size, at least 126 px. */
export const CATCH_DIAMETER = STICK_CATCH_DIAMETER;
const EDGE_MARGIN = 24;
const DEAD_ZONE_RATIO = 0.15;
const DEPTH = 50;

/**
 * Virtual stick, bottom right, touch devices only. Owns one pointer (by id).
 * The canvas already lies inside the safe area (layoutArena), so the margin is relative to it.
 */
export class VirtualStick {
  private readonly scene: Phaser.Scene;
  private readonly base: Phaser.GameObjects.Arc;
  private readonly knob: Phaser.GameObjects.Arc;
  private readonly ring: Phaser.GameObjects.Graphics;
  private readonly cx: number;
  private readonly cy: number;
  private readonly radius = BASE_DIAMETER / 2;
  private readonly catchRadius = Math.max(CATCH_DIAMETER, BASE_DIAMETER) / 2;
  private ownerId: number | null = null;
  private angle: number | null = null;
  private destroyed = false;

  /** True if the stick is shown (touch device). */
  readonly enabled: boolean;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    this.enabled = !!scene.sys.game.device.input.touch;
    const { width, height } = scene.scale;
    this.cx = width - EDGE_MARGIN - this.catchRadius;
    this.cy = height - EDGE_MARGIN - this.catchRadius;
    const accent = themeColor('hud.accent').num;
    // Dotted phosphor ring: drawn as dots on a graphics object, with a faint glass fill.
    const glass = themeColor('hud.glass');
    this.base = scene.add
      .circle(this.cx, this.cy, this.radius, glass.num, 0.35)
      .setScrollFactor(0)
      .setDepth(DEPTH)
      .setVisible(this.enabled);
    this.ring = scene.add
      .graphics({ x: this.cx, y: this.cy })
      .setScrollFactor(0)
      .setDepth(DEPTH)
      .setVisible(this.enabled);
    this.ring.fillStyle(accent, 1);
    const dots = Math.round(Math.PI * BASE_DIAMETER / 3);
    for (let i = 0; i < dots; i++) {
      const a = (i / dots) * Math.PI * 2;
      this.ring.fillRect(Math.round(Math.cos(a) * (this.radius - 0.5)), Math.round(Math.sin(a) * (this.radius - 0.5)), 1, 1);
    }
    this.knob = scene.add
      .circle(this.cx, this.cy, KNOB_DIAMETER / 2, accent, 0.2)
      .setStrokeStyle(2, accent, 1)
      .setScrollFactor(0)
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
    return this.enabled && Math.hypot(x - this.cx, y - this.cy) <= this.catchRadius;
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
    this.knob.setFillStyle(themeColor('hud.accent').num, 0.2);
  }

  private track(pointer: Phaser.Input.Pointer): void {
    const v = stickVector(pointer.x - this.cx, pointer.y - this.cy, this.radius, DEAD_ZONE_RATIO);
    this.angle = v.active ? stickAngleRad(v) : null;
    this.knob.setPosition(this.cx + v.x * this.radius, this.cy + v.y * this.radius);
    this.knob.setFillStyle(themeColor('hud.accent').num, 0.5);
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
    this.ring.destroy();
    this.knob.destroy();
  }
}

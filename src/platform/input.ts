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
 * Takes a tap before it aims (AP-133): returns true if the tap at the world point (x, y) hit a quicktime
 * circle. Only called for a press (pointerdown), never for a mouse move.
 */
export type TapClaim = (x: number, y: number) => boolean;

/** Where a pointer event goes. */
export type PointerRoute = 'stick' | 'parry' | 'held' | 'ignore' | 'aim';

export interface PointerRouteInput {
  /** pointerdown (true) or pointermove (false). */
  down: boolean;
  /** The event belongs to the stick: its own finger or a press on the stick. */
  onStick: boolean;
  /** The stick is held by another finger. */
  stickHeld: boolean;
  /** This pointer pressed a quicktime circle and is still down. */
  heldOnCircle: boolean;
}

/**
 * Priority of one pointer event (AP-133): the stick first (it never aims by tap and never presses a circle),
 * then a press on an open quicktime circle (used up, the aim stays), then the rest of a press that hit a
 * circle (no aiming until release), then the old rule (other fingers do not aim while the stick is held).
 * `claim` is only asked for a press and only after the stick check.
 */
export function routePointer(input: PointerRouteInput, claim: () => boolean): PointerRoute {
  if (input.onStick) return 'stick';
  if (input.heldOnCircle) return 'held';
  if (input.down && claim()) return 'parry';
  if (input.stickHeld) return 'ignore';
  return 'aim';
}

/**
 * Unified aim input. Mouse: target follows the pointer (no click needed).
 * Touch: target is the last touch point and persists after release.
 * A press on a quicktime circle (claimTap) is used up and does not aim.
 */
export class AimInput {
  private lastAngle = 0;
  private pointerAngle: number | null = null;
  private readonly stick?: StickSource;
  private readonly scene: Phaser.Scene;
  private readonly cx: number;
  private readonly cy: number;
  /** Pointer that pressed a circle; its moves do not aim until it is released. */
  private circlePointerId: number | null = null;
  private readonly onContextMenu = (e: Event) => e.preventDefault();

  constructor(
    scene: Phaser.Scene,
    cx: number,
    cy: number,
    stick?: StickSource,
    private readonly claimTap?: TapClaim,
  ) {
    this.stick = stick;
    this.scene = scene;
    this.cx = cx;
    this.cy = cy;
    scene.input.on('pointermove', this.onMove, this);
    scene.input.on('pointerdown', this.onDown, this);
    scene.input.on('pointerup', this.onUp, this);
    scene.input.on('pointerupoutside', this.onUp, this);
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

  private onDown(pointer: Phaser.Input.Pointer): void {
    this.route(pointer, true);
  }

  private onMove(pointer: Phaser.Input.Pointer): void {
    this.route(pointer, false);
  }

  private onUp(pointer: Phaser.Input.Pointer): void {
    if (pointer.id === this.circlePointerId) this.circlePointerId = null;
  }

  private route(pointer: Phaser.Input.Pointer, down: boolean): void {
    const stick = this.stick;
    const route = routePointer(
      {
        down,
        // The stick's own finger and taps on the stick never aim and never press a circle.
        onStick:
          !!stick && (pointer.id === stick.pointerId || stick.contains(pointer.x, pointer.y)),
        stickHeld: stick?.held ?? false,
        heldOnCircle: !down && pointer.id === this.circlePointerId && pointer.isDown,
      },
      () => this.claimTap?.(pointer.worldX, pointer.worldY) ?? false,
    );
    if (route === 'parry') this.circlePointerId = pointer.id;
    if (route !== 'aim') return;
    this.pointerAngle = angleFromCenter(pointer.x, pointer.y, this.cx, this.cy);
  }

  destroy(): void {
    this.scene.input.off('pointermove', this.onMove, this);
    this.scene.input.off('pointerdown', this.onDown, this);
    this.scene.input.off('pointerup', this.onUp, this);
    this.scene.input.off('pointerupoutside', this.onUp, this);
    this.scene.game.canvas.removeEventListener('contextmenu', this.onContextMenu);
  }
}

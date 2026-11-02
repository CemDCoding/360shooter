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

/**
 * Pointer hand-off to the quicktime circles (M9, AP-151). Every pointer is identified by its pointerId, so a
 * second finger can hold or drag a circle while the first one keeps the stick.
 */
export interface ParryPointerHandler {
  /** Press at the world point: true if it hit a circle or a drag target (the press is used up). */
  press(pointerId: number, x: number, y: number): boolean;
  /** Move of a pointer that pressed a circle (drag). */
  move(pointerId: number, x: number, y: number): void;
  /** Up of a pointer that pressed a circle (end of a hold, drop of a drag). */
  release(pointerId: number, x: number, y: number): void;
  /** The pointer went up while the scene was paused: that release does not count. */
  cancel(pointerId: number): void;
}

/**
 * Which pointers pressed a quicktime circle and are still down (pure, testable). The stick pointer is never in
 * here: routePointer sends it to the stick before a circle is asked.
 */
export class CirclePointers {
  private readonly ids = new Set<number>();

  claim(pointerId: number): void {
    this.ids.add(pointerId);
  }

  has(pointerId: number): boolean {
    return this.ids.has(pointerId);
  }

  /** Pointer up: true if it had pressed a circle (then the circle gets the release). */
  free(pointerId: number): boolean {
    return this.ids.delete(pointerId);
  }

  /** Pointers that are no longer down (after a pause): removed and returned for cancel. */
  dropReleased(isDown: (pointerId: number) => boolean): number[] {
    const gone = [...this.ids].filter((id) => !isDown(id));
    for (const id of gone) this.ids.delete(id);
    return gone;
  }

  clear(): void {
    this.ids.clear();
  }

  get size(): number {
    return this.ids.size;
  }
}

/** What happens on pointer up: a circle pointer releases its circle, anything else does nothing. */
export function routePointerUp(pointerId: number, circles: CirclePointers): 'release' | 'none' {
  return circles.free(pointerId) ? 'release' : 'none';
}

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
 * Priority of one pointer event (AP-133, M9): the moves of a pointer that pressed a circle stay with that
 * circle (hold, drag; no aiming until release), then the stick (it never aims by tap and never presses a
 * circle), then a press on an open quicktime circle (used up, the aim stays), then the old rule (other fingers
 * do not aim while the stick is held).
 * `claim` is only asked for a press and only after the stick check.
 */
export function routePointer(input: PointerRouteInput, claim: () => boolean): PointerRoute {
  // A pointer that holds or drags a circle keeps it, even when it passes over the stick area (M9). The stick's
  // own pointer can never hold a circle: its press went to the stick.
  if (input.heldOnCircle && !input.down) return 'held';
  if (input.onStick) return 'stick';
  if (input.down && claim()) return 'parry';
  if (input.stickHeld) return 'ignore';
  return 'aim';
}

/**
 * Unified aim input. Mouse: target follows the pointer (no click needed).
 * Touch: target is the last touch point and persists after release.
 * A press on a quicktime circle is used up and does not aim; that pointer then holds or drags the circle until
 * it goes up (M9). The handler is either the M7 TapClaim or a ParryPointerHandler.
 */
export class AimInput {
  private lastAngle = 0;
  private pointerAngle: number | null = null;
  private readonly stick?: StickSource;
  private readonly scene: Phaser.Scene;
  private readonly cx: number;
  private readonly cy: number;
  /** Pointers that pressed a circle; their moves do not aim until they are released. */
  private readonly circles = new CirclePointers();
  private readonly parry?: ParryPointerHandler;
  private readonly onContextMenu = (e: Event) => e.preventDefault();

  constructor(
    scene: Phaser.Scene,
    cx: number,
    cy: number,
    stick?: StickSource,
    parry?: TapClaim | ParryPointerHandler,
  ) {
    this.parry =
      typeof parry === 'function'
        ? { press: (_id, x, y) => parry(x, y), move: () => {}, release: () => {}, cancel: () => {} }
        : parry;
    this.stick = stick;
    this.scene = scene;
    this.cx = cx;
    this.cy = cy;
    scene.input.on('pointermove', this.onMove, this);
    scene.input.on('pointerdown', this.onDown, this);
    scene.input.on('pointerup', this.onUp, this);
    scene.input.on('pointerupoutside', this.onUp, this);
    scene.events.on(Phaser.Scenes.Events.RESUME, this.onResume, this);
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
    if (routePointerUp(pointer.id, this.circles) === 'release')
      this.parry?.release(pointer.id, pointer.worldX, pointer.worldY);
  }

  /** After a pause: pointers that went up meanwhile let go of their circles without a grade. */
  private onResume(): void {
    const pointers = this.scene.input.manager?.pointers ?? [];
    const down = (id: number) => pointers.some((p) => p.id === id && p.isDown);
    for (const id of this.circles.dropReleased(down)) this.parry?.cancel(id);
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
        heldOnCircle: !down && this.circles.has(pointer.id) && pointer.isDown,
      },
      () => this.parry?.press(pointer.id, pointer.worldX, pointer.worldY) ?? false,
    );
    if (route === 'parry') this.circles.claim(pointer.id);
    if (route === 'held') this.parry?.move(pointer.id, pointer.worldX, pointer.worldY);
    if (route !== 'aim') return;
    this.pointerAngle = angleFromCenter(pointer.x, pointer.y, this.cx, this.cy);
  }

  destroy(): void {
    this.scene.input.off('pointermove', this.onMove, this);
    this.scene.input.off('pointerdown', this.onDown, this);
    this.scene.input.off('pointerup', this.onUp, this);
    this.scene.input.off('pointerupoutside', this.onUp, this);
    this.scene.events.off(Phaser.Scenes.Events.RESUME, this.onResume, this);
    this.circles.clear();
    this.scene.game.canvas.removeEventListener('contextmenu', this.onContextMenu);
  }
}

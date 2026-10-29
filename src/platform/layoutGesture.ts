/**
 * Pure logic of the gesture that toggles the layout overlay (no DOM): a fixed number of fingers
 * put down together and held still for a while. Only outside a round (menu, result); the caller
 * passes `blocked = true` while a round exists, so joystick and buttons are never affected.
 */

export interface HoldGestureConfig {
  /** Exact number of fingers that must touch the screen. */
  fingers: number;
  /** How long all fingers must stay down (ms). */
  holdMs: number;
  /** All fingers must arrive within this time after the first one (ms). */
  windowMs: number;
}

/** Three fingers together, held for two seconds. */
export const LAYOUT_GESTURE: HoldGestureConfig = { fingers: 3, holdMs: 2000, windowMs: 600 };

export class HoldGesture {
  private firstAt: number | null = null;
  private holdFrom: number | null = null;
  private fired = false;

  constructor(private readonly cfg: HoldGestureConfig = LAYOUT_GESTURE) {}

  /**
   * The number of touching fingers changed. Returns the time (same clock as `now`) at which
   * `check` should be called because a hold has started, else null.
   */
  touches(count: number, now: number, blocked: boolean): number | null {
    if (!Number.isFinite(count) || count <= 0) {
      this.firstAt = null;
      this.holdFrom = null;
      this.fired = false;
      return null;
    }
    if (this.firstAt === null) this.firstAt = now;
    if (blocked || this.fired || count !== this.cfg.fingers) {
      this.holdFrom = null;
      return null;
    }
    if (this.holdFrom !== null) return null;
    if (now - this.firstAt > this.cfg.windowMs) return null;
    this.holdFrom = now;
    return now + this.cfg.holdMs;
  }

  /** True exactly once when the hold is complete; again only after all fingers were lifted. */
  check(now: number, blocked: boolean): boolean {
    if (this.holdFrom === null || this.fired) return false;
    if (blocked) {
      this.holdFrom = null;
      return false;
    }
    if (now - this.holdFrom < this.cfg.holdMs) return false;
    this.fired = true;
    this.holdFrom = null;
    return true;
  }
}

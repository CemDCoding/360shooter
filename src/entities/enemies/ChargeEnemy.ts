import type Phaser from 'phaser';
import { CHARGE_TRIGGER_DISTANCE } from '../../config/enemies';
import { OPACITY, THEME } from '../../config/theme';
import { ChargeState, type ChargePhase } from '../../logic/charge';
import { distance } from '../../logic/geometry';
import { prefersReducedMotion } from '../../platform/motion';
import { ChaseEnemy } from './ChaseEnemy';

/** Warning colour of announcements, the same token as the boss telegraph. */
const WARN_COLOR = THEME.colors['red.300'].num;
/** Blink step of the announcement: slow enough to stay below three flashes per second. */
const BLINK_STEP_MS = THEME.motionMs['motion.slow'];
const RING_PADDING = 4;
const RING_WIDTH = 2;
const LINE_WIDTH = 1;
const FALLBACK_RADIUS = 12;

/**
 * Alpha of a charger during its announcement: blinks between 1 and OPACITY.blink, with reduced motion
 * always 1 (the outline ring carries the state alone). Pure, for tests.
 */
export function telegraphAlpha(elapsedMs: number, reducedMotion: boolean): number {
  if (reducedMotion) return 1;
  return Math.floor(Math.max(0, elapsedMs) / BLINK_STEP_MS) % 2 === 0 ? 1 : OPACITY.blink;
}

/**
 * Behavior 'charge' (boar, armadillo, PE-127): walks slowly to CHARGE_TRIGGER_DISTANCE, announces the dash
 * for at least MIN_TELEGRAPH_MS (outline ring plus a line to the dash target, blinking unless reduced
 * motion), dashes in a straight line to the point fixed at the start of the announcement, then recovers.
 * While dashing incoming damage is multiplied by charge.dashDamageFactor (armadillo rolls: half damage).
 * The logic is the pure ChargeState (AP-98).
 */
export class ChargeEnemy extends ChaseEnemy {
  private logic?: ChargeState;
  private gfx?: Phaser.GameObjects.Graphics;
  private telegraphElapsedMs = 0;
  private readonly reducedMotion = prefersReducedMotion();

  /** Current phase, 'approach' before the first spawn. */
  get phase(): ChargePhase {
    return this.logic?.phase ?? 'approach';
  }

  /** Remaining announcement time in ms (0 outside of the announcement). */
  get telegraphLeftMs(): number {
    return this.logic?.telegraphLeftMs ?? 0;
  }

  protected onSpawn(): void {
    super.onSpawn();
    const def = this.def.charge;
    if (!def) throw new Error(`${this.def.id} has behavior charge but no charge definition`);
    // A fresh state per spawn: a pooled charger never keeps an old phase.
    this.logic = new ChargeState(def, CHARGE_TRIGGER_DISTANCE);
    this.telegraphElapsedMs = 0;
    this.setAlpha(1);
  }

  protected onDespawn(): void {
    this.gfx?.clear().setVisible(false);
    this.setAlpha(1);
  }

  protected damageFactor(): number {
    return this.logic?.damageFactor() ?? 1;
  }

  protected behave(delta: number): void {
    const state = this.logic;
    if (!state || !(delta > 0)) {
      this.halt();
      return;
    }
    const dist = distance(this.x, this.y, this.center.x, this.center.y);
    const step = state.update(
      delta,
      { x: this.x, y: this.y },
      this.center,
      this.approachSpeed(dist),
    );
    this.setVelocity((step.dx * 1000) / delta, (step.dy * 1000) / delta);
    if (state.phase === 'dash' && step.dx !== 0) this.setFlipX(step.dx < 0);
    else if (state.phase !== 'dash') this.faceCenter();
    this.showTelegraph(state, delta);
  }

  private showTelegraph(state: ChargeState, delta: number): void {
    if (state.phase !== 'telegraph') {
      if (this.telegraphElapsedMs > 0) {
        this.telegraphElapsedMs = 0;
        this.gfx?.clear().setVisible(false);
        this.setAlpha(1);
      }
      return;
    }
    this.telegraphElapsedMs += delta;
    this.setAlpha(telegraphAlpha(this.telegraphElapsedMs, this.reducedMotion));
    const gfx = (this.gfx ??= this.scene.add.graphics().setDepth(this.depth + 1));
    const body = this.body as Phaser.Physics.Arcade.Body | null;
    const radius =
      (body ? Math.max(body.halfWidth, body.halfHeight) : FALLBACK_RADIUS) + RING_PADDING;
    const target = state.dashTarget;
    gfx.clear().setVisible(true);
    gfx.lineStyle(LINE_WIDTH, WARN_COLOR, OPACITY.ghost);
    gfx.lineBetween(this.x, this.y, target.x, target.y);
    gfx.lineStyle(RING_WIDTH, WARN_COLOR, 1);
    gfx.strokeCircle(this.x, this.y, radius);
  }

  destroy(fromScene?: boolean): void {
    this.gfx?.destroy();
    super.destroy(fromScene);
  }
}

import type Phaser from 'phaser';
import { OPACITY, THEME } from '../../config/theme';
import { BurrowState, effectiveEmergeMs, type BurrowPhase } from '../../logic/burrow';
import { distance } from '../../logic/geometry';
import { ChaseEnemy } from './ChaseEnemy';

const SAND_COLOR = THEME.colors['game.sand'].num;
/** Warning colour of announcements, the same token as the boss telegraph. */
const WARN_COLOR = THEME.colors['red.300'].num;
const HILL_WIDTH = 22;
const HILL_HEIGHT = 10;
const HILL_LINE = 2;
const WARN_RADIUS = 16;
const WARN_LINE = 2;

/**
 * Fill alpha of the surfacing warning: grows from 0 to OPACITY.dim over the announcement. Pure, for tests.
 * It fills steadily (no blinking), so it also suits reduced motion.
 */
export function emergeFillAlpha(leftMs: number, totalMs: number): number {
  if (!(totalMs > 0)) return OPACITY.dim;
  const done = 1 - Math.min(1, Math.max(0, leftMs) / totalMs);
  return OPACITY.dim * done;
}

/**
 * Behavior 'burrow' (sand worm, PE-127): chases above the sand, then dives. Under the sand it is
 * invulnerable and has no physics body (lasers pass, no contact damage); it shows as a dimmed sprite
 * plus a drawn sand hill ring (brief gap, transition PE-133: alpha OPACITY.dim and a ring in game.sand),
 * so the state is readable by shape, not only by colour. Before surfacing a warning circle fills for at
 * least MIN_TELEGRAPH_MS at the surfacing point, which keeps the configured distance to the player.
 * The logic is the pure BurrowState (AP-98).
 */
export class BurrowEnemy extends ChaseEnemy {
  private logic?: BurrowState;
  private gfx?: Phaser.GameObjects.Graphics;

  /** Current phase, 'surface' before the first spawn. */
  get phase(): BurrowPhase {
    return this.logic?.phase ?? 'surface';
  }

  get isInvulnerable(): boolean {
    return this.logic?.invulnerable ?? false;
  }

  protected onSpawn(): void {
    super.onSpawn();
    const def = this.def.burrow;
    if (!def) throw new Error(`${this.def.id} has behavior burrow but no burrow definition`);
    // A fresh state per spawn: a pooled worm never comes back burrowed.
    this.logic = new BurrowState(def, { x: this.x, y: this.y });
    this.setAlpha(1);
  }

  protected onDespawn(): void {
    this.gfx?.clear().setVisible(false);
    this.setAlpha(1);
  }

  protected behave(delta: number): void {
    const state = this.logic;
    if (!state) return;
    const before = state.phase;
    if (before === 'surface') {
      super.behave(delta);
      state.sync({ x: this.x, y: this.y });
    }
    const hill = state.position;
    const dist = distance(hill.x, hill.y, this.center.x, this.center.y);
    state.update(delta, this.center, this.approachSpeed(dist));

    if (state.phase === 'surface') {
      if (before !== 'surface') this.surface(state);
      return;
    }
    if (before === 'surface') this.dive();
    this.setPosition(state.position.x, state.position.y);
    this.faceCenter();
    this.drawHill(state);
  }

  private dive(): void {
    this.halt();
    this.setHittable(false);
    this.setAlpha(OPACITY.dim);
  }

  private surface(state: BurrowState): void {
    this.setPosition(state.position.x, state.position.y);
    this.setHittable(true);
    this.halt();
    this.setAlpha(1);
    this.gfx?.clear().setVisible(false);
  }

  private drawHill(state: BurrowState): void {
    const gfx = (this.gfx ??= this.scene.add.graphics().setDepth(this.depth + 1));
    const { x, y } = state.position;
    gfx.clear().setVisible(true);
    gfx.lineStyle(HILL_LINE, SAND_COLOR, 1);
    gfx.strokeEllipse(x, y + HILL_HEIGHT / 2, HILL_WIDTH, HILL_HEIGHT);
    if (state.phase === 'emerge' && this.def.burrow) {
      const total = effectiveEmergeMs(this.def.burrow);
      gfx.fillStyle(WARN_COLOR, emergeFillAlpha(state.emergeLeftMs, total));
      gfx.fillCircle(x, y, WARN_RADIUS);
      gfx.lineStyle(WARN_LINE, WARN_COLOR, 1);
      gfx.strokeCircle(x, y, WARN_RADIUS);
    }
  }

  destroy(fromScene?: boolean): void {
    this.gfx?.destroy();
    super.destroy(fromScene);
  }
}

import Phaser from 'phaser';
import { THEME } from '../../config/theme';

const WARN_COLOR = THEME.colors['red.300'].num;
const OUTLINE_ALPHA = 0.9;
const FILL_ALPHA_START = 0.12;
const FILL_ALPHA_END = 0.5;
const OUTLINE_WIDTH = 2;

export type TelegraphShape =
  | { kind: 'circle'; x: number; y: number; radius: number }
  | { kind: 'line'; x1: number; y1: number; x2: number; y2: number; width: number }
  | {
      kind: 'ring';
      x: number;
      y: number;
      /** Middle radius of the ring. */
      radius: number;
      thickness: number;
      /** Optional gap (radians): the ring is open from gapStart over gapSize. */
      gapStart?: number;
      gapSize?: number;
    };

/**
 * Warning display of a boss attack (circle, line or ring). It fills during durationMs, then calls
 * onDone and removes itself. It runs on the scene update, so it stops with the pause.
 * Every boss attack shows one before it hits (fairness). Colour: red.300 from the theme.
 */
export class Telegraph extends Phaser.GameObjects.Graphics {
  private elapsedMs = 0;
  private done = false;

  constructor(
    scene: Phaser.Scene,
    private readonly shape: TelegraphShape,
    private readonly durationMs: number,
    private readonly onDone?: () => void,
  ) {
    super(scene);
    scene.add.existing(this);
    this.setDepth(1);
    scene.events.on(Phaser.Scenes.Events.UPDATE, this.step, this);
    this.once(Phaser.GameObjects.Events.DESTROY, () => {
      scene.events.off(Phaser.Scenes.Events.UPDATE, this.step, this);
    });
    this.redraw();
  }

  static circle(
    scene: Phaser.Scene,
    x: number,
    y: number,
    radius: number,
    durationMs: number,
    onDone?: () => void,
  ): Telegraph {
    return new Telegraph(scene, { kind: 'circle', x, y, radius }, durationMs, onDone);
  }

  static line(
    scene: Phaser.Scene,
    x1: number,
    y1: number,
    x2: number,
    y2: number,
    width: number,
    durationMs: number,
    onDone?: () => void,
  ): Telegraph {
    return new Telegraph(scene, { kind: 'line', x1, y1, x2, y2, width }, durationMs, onDone);
  }

  static ring(
    scene: Phaser.Scene,
    x: number,
    y: number,
    radius: number,
    thickness: number,
    durationMs: number,
    onDone?: () => void,
    gap?: { start: number; size: number },
  ): Telegraph {
    return new Telegraph(
      scene,
      { kind: 'ring', x, y, radius, thickness, gapStart: gap?.start, gapSize: gap?.size },
      durationMs,
      onDone,
    );
  }

  /** Progress 0..1. */
  get progress(): number {
    return this.durationMs > 0 ? Math.min(1, this.elapsedMs / this.durationMs) : 1;
  }

  /** Removes the warning without calling onDone (e.g. the boss died). */
  cancel(): void {
    this.done = true;
    this.destroy();
  }

  private step(_time: number, delta: number): void {
    if (this.done) return;
    this.elapsedMs += delta;
    this.redraw();
    if (this.elapsedMs >= this.durationMs) {
      this.done = true;
      const cb = this.onDone;
      this.destroy();
      cb?.();
    }
  }

  private redraw(): void {
    const p = this.progress;
    const s = this.shape;
    this.clear();
    this.lineStyle(OUTLINE_WIDTH, WARN_COLOR, OUTLINE_ALPHA);
    this.fillStyle(WARN_COLOR, FILL_ALPHA_START + (FILL_ALPHA_END - FILL_ALPHA_START) * p);
    if (s.kind === 'circle') {
      this.strokeCircle(s.x, s.y, s.radius);
      this.fillCircle(s.x, s.y, s.radius * p);
    } else if (s.kind === 'line') {
      const dx = s.x2 - s.x1;
      const dy = s.y2 - s.y1;
      const len = Math.hypot(dx, dy);
      if (len < 1) return;
      const nx = (-dy / len) * (s.width / 2);
      const ny = (dx / len) * (s.width / 2);
      this.strokePoints(
        [
          new Phaser.Math.Vector2(s.x1 + nx, s.y1 + ny),
          new Phaser.Math.Vector2(s.x2 + nx, s.y2 + ny),
          new Phaser.Math.Vector2(s.x2 - nx, s.y2 - ny),
          new Phaser.Math.Vector2(s.x1 - nx, s.y1 - ny),
        ],
        true,
      );
      // The fill grows from the start of the line to its end.
      const ex = s.x1 + dx * p;
      const ey = s.y1 + dy * p;
      this.fillPoints(
        [
          new Phaser.Math.Vector2(s.x1 + nx, s.y1 + ny),
          new Phaser.Math.Vector2(ex + nx, ey + ny),
          new Phaser.Math.Vector2(ex - nx, ey - ny),
          new Phaser.Math.Vector2(s.x1 - nx, s.y1 - ny),
        ],
        true,
      );
    } else {
      const gapSize = s.gapSize ?? 0;
      const start = (s.gapStart ?? 0) + gapSize;
      const sweep = Math.PI * 2 - gapSize;
      const inner = Math.max(0, s.radius - s.thickness / 2);
      const outer = s.radius + s.thickness / 2;
      // Outline: outer and inner arc of the open ring. The fill grows from inner to outer.
      this.beginPath();
      this.arc(s.x, s.y, outer, start, start + sweep, false);
      this.strokePath();
      this.beginPath();
      this.arc(s.x, s.y, inner, start, start + sweep, false);
      this.strokePath();
      const fillOuter = inner + (outer - inner) * p;
      this.beginPath();
      this.arc(s.x, s.y, fillOuter, start, start + sweep, false);
      this.arc(s.x, s.y, inner, start + sweep, start, true);
      this.closePath();
      this.fillPath();
    }
  }
}

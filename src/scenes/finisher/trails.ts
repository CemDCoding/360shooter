// Motion trails of the choreography player (M13, AP-182, PE-246, brief H-46): afterimages from a pool and
// the cut line as a Graphics band. Canvas-safe: copies of the part images with falling alpha, plain filled
// rectangles; no Rope, no tint, no FX. Every object is created at the start, never in the update.
import type Phaser from 'phaser';
import { CHOREO_RULES } from '../../config/finishers';
import { OPACITY, THEME } from '../../config/theme';
import { applyEase } from '../../logic/choreo';
import { CHOREO_DEPTH, type ChoreoContext } from './context';
import type { FxApi, FxEvent, FxInstance } from './fx';
import type { PartWorld, RigFigure } from './rig';

/** Copies per moving part (`size.rig-afterimages`, budget `maxAfterimagesPerPart`). */
export const AFTERIMAGE_COPIES = Math.min(
  THEME.sizeCount['size.rig-afterimages'],
  CHOREO_RULES.maxAfterimagesPerPart,
);
/** Alpha of copy 1 (newest) to 3 (oldest). */
export const AFTERIMAGE_ALPHA: readonly number[] = [
  OPACITY['rig-afterimage-1'],
  OPACITY['rig-afterimage-2'],
  OPACITY['rig-afterimage-3'],
];
export const AFTERIMAGE_GAP_MS = THEME.motionMs['motion.rig-afterimage-gap'];
export const AFTERIMAGE_FADE_MS = THEME.motionMs['motion.rig-afterimage-fade'];
/** Fade-out in `Stepped(3)` (H-46). */
export const AFTERIMAGE_FADE_STEPS = 3;

/** Samples kept per part: covers the oldest copy (99 ms) even at 240 fps. */
const HISTORY = 64;

/** Alpha of copy `k` (0 = newest) `sinceFadeMs` after its trail stopped; 0 when gone. */
export function afterimageAlpha(k: number, sinceFadeMs: number, fadeMs: number): number {
  const base = AFTERIMAGE_ALPHA[Math.min(k, AFTERIMAGE_ALPHA.length - 1)];
  if (sinceFadeMs <= 0) return base;
  if (sinceFadeMs >= fadeMs) return 0;
  return base * (1 - applyEase('stepped', sinceFadeMs / fadeMs, AFTERIMAGE_FADE_STEPS));
}

/** Ring buffer of the world transform and frame of one part over the last frames (real time). */
export class PartHistory {
  private readonly t = new Float64Array(HISTORY).fill(-Infinity);
  private readonly x = new Float64Array(HISTORY);
  private readonly y = new Float64Array(HISTORY);
  private readonly angle = new Float64Array(HISTORY);
  private readonly sx = new Float64Array(HISTORY);
  private readonly sy = new Float64Array(HISTORY);
  private readonly frame: string[] = new Array<string>(HISTORY).fill('');
  private head = -1;
  private readonly w: PartWorld = { x: 0, y: 0, angle: 0, scaleX: 1, scaleY: 1 };

  constructor(
    readonly figure: RigFigure,
    readonly part: number,
  ) {}

  record(nowMs: number): void {
    const w = this.figure.worldOf(this.part, this.w);
    this.head = (this.head + 1) % HISTORY;
    const h = this.head;
    this.t[h] = nowMs;
    this.x[h] = w.x;
    this.y[h] = w.y;
    this.angle[h] = w.angle;
    this.sx[h] = w.scaleX;
    this.sy[h] = w.scaleY;
    this.frame[h] = this.figure.frameOf(this.part);
  }

  /** Index of the newest sample at or before `tMs` (the oldest one if all are newer), -1 when empty. */
  indexAt(tMs: number): number {
    if (this.head < 0) return -1;
    let best = this.head;
    for (let n = 0; n < HISTORY; n++) {
      const i = (this.head - n + HISTORY) % HISTORY;
      if (this.t[i] === -Infinity) break;
      best = i;
      if (this.t[i] <= tMs) return i;
    }
    return best;
  }

  /** Puts `img` where the part was at sample `i`. */
  place(img: Phaser.GameObjects.Image, i: number): void {
    img.setPosition(this.x[i], this.y[i]).setAngle(this.angle[i]).setScale(this.sx[i], this.sy[i]);
  }

  frameAt(i: number): string {
    return this.frame[i];
  }

  timeAt(i: number): number {
    return this.t[i];
  }
}

/**
 * The afterimage copies of one part: `AFTERIMAGE_COPIES` images made once, reused by every afterimage
 * event of this part. Copy k shows the part where it was (k + 1) * gap ms ago.
 */
export class AfterimagePool {
  readonly images: Phaser.GameObjects.Image[] = [];
  private readonly shown: string[] = [];

  constructor(
    ctx: ChoreoContext,
    readonly history: PartHistory,
  ) {
    const fig = history.figure;
    const part = fig.parts[history.part];
    for (let k = 0; k < AFTERIMAGE_COPIES; k++) {
      const img = ctx.scene.add.image(0, 0, '__DEFAULT');
      fig.showOn(img, part.frame);
      img.setOrigin(part.originX, part.originY).setDepth(CHOREO_DEPTH.afterimage).setVisible(false);
      ctx.addWorld(img);
      this.images.push(img);
      this.shown.push(part.frame);
    }
  }

  /** Trail running: copy k follows the history `(k + 1) * gapMs` behind `nowMs`. */
  follow(nowMs: number, copies: number, gapMs: number): void {
    for (let k = 0; k < this.images.length; k++) {
      const img = this.images[k];
      if (k >= copies) {
        img.setVisible(false);
        continue;
      }
      const i = this.history.indexAt(nowMs - (k + 1) * gapMs);
      if (i < 0) continue;
      this.history.place(img, i);
      const frame = this.history.frameAt(i);
      if (frame !== this.shown[k]) {
        this.shown[k] = frame;
        this.history.figure.showOn(img, frame);
      }
      img.setAlpha(afterimageAlpha(k, 0, 1)).setVisible(true);
    }
  }

  /** Trail stopped: the copies stay in place and fade out in steps. */
  fade(sinceFadeMs: number, fadeMs: number): void {
    for (let k = 0; k < this.images.length; k++) {
      const a = afterimageAlpha(k, sinceFadeMs, fadeMs);
      this.images[k].setAlpha(a);
      if (a <= 0) this.images[k].setVisible(false);
    }
  }

  hide(): void {
    for (const img of this.images) img.setVisible(false);
  }

  destroy(): void {
    for (const img of this.images) img.destroy();
    this.images.length = 0;
  }
}

/** Name of the built-in `fx` effect of every boss: the cut line of the laser blade (H-46). */
export const SLASH_FX = 'slash';

/**
 * Cut line (H-46): a vertical white band (`finisher.slash`, `size.rig-slash`) with a coral rim
 * (`finisher.slash-rim`, `size.rig-slash-rim` on each side), both times the boss scale, through the boss
 * root from the top of the boss down to the ground line `size.rig-ground`. Stays with "reduce effects".
 */
export function slashFx(api: FxApi, event: FxEvent): FxInstance {
  const scene = api.ctx.scene;
  const g = scene.add.graphics().setDepth(CHOREO_DEPTH.slash).setVisible(false);
  api.ctx.addWorld(g);
  const core = THEME.sizePx['size.rig-slash'] * api.bossScale;
  const rim = THEME.sizePx['size.rig-slash-rim'] * api.bossScale;
  const ground = THEME.sizePx['size.rig-ground'];
  return {
    start() {
      const boss = api.boss();
      if (!boss) return;
      const x = boss.container.x;
      const top = Math.round(boss.top());
      const h = Math.max(0, ground - top);
      g.clear();
      g.fillStyle(THEME.colors['finisher.slash-rim'].num, event.strength ?? 1);
      g.fillRect(Math.round(x - core / 2 - rim), top, core + 2 * rim, h);
      g.fillStyle(THEME.colors['finisher.slash'].num, event.strength ?? 1);
      g.fillRect(Math.round(x - core / 2), top, core, h);
      g.setVisible(true);
    },
    update() {},
    stop() {
      g.setVisible(false);
    },
    destroy() {
      g.destroy();
    },
  };
}

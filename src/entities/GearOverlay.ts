import Phaser from 'phaser';
import { animKey } from '../config/assets';
import { THEME } from '../config/theme';
import { prefersReducedMotion } from '../platform/motion';

// Bought gear in the round (AP-143, brief H-35): overlays on the astronaut, diamond glint and block ring,
// and the small explosion of the lava boots. Display only; the effects live in logic/gear.

const HIT_TINT = THEME.colors['game.hit-flash'].num;
const GLINT_KEY = 'gear-diamond-glint';
const BLAST_KEY = 'gear-blast';
const BLAST_ANIM = 'gear-blast-12fps';
const BLAST_FPS = 12;
const BLAST_FRAMES = 4;
const BLOCK_RING_COLOR = THEME.colors['game.gear-block'].num;
const BLOCK_RING_STROKE_PX = 2;
const BLOCK_RING_FROM_PX = 16;
const BLOCK_RING_TO_PX = 28;
const BLOCK_RING_MS = THEME.motionMs['motion.gear-block'];
/** Without motion the ring stands at its end size for this long (brief H-35). */
export const BLOCK_RING_STATIC_MS = 120;

/** Depth step between the layers above the astronaut (weapon: player depth +-1, so all stay in between). */
const LAYER_STEP = 0.1;

/**
 * Depth of overlay layer `index` (0 = legs, then body, head; see gearTextureKeys): directly above the
 * astronaut and below a weapon in front (player depth + 1), above a weapon behind (player depth - 1).
 */
export function overlayDepth(playerDepth: number, index: number): number {
  return playerDepth + LAYER_STEP * (index + 1);
}

/** Depth of the diamond glint: above all three layers, still below a weapon in front. */
export function glintDepth(playerDepth: number): number {
  return overlayDepth(playerDepth, 3);
}

/**
 * Radius of the diamond block ring `elapsedMs` after the block, or null once it is over. It grows from 16 to
 * 28 px in motion.gear-block (300 ms); with reduced motion it stands at 28 px for 120 ms.
 */
export function blockRingRadius(elapsedMs: number, reducedMotion: boolean): number | null {
  if (!Number.isFinite(elapsedMs) || elapsedMs < 0) return null;
  if (reducedMotion) return elapsedMs < BLOCK_RING_STATIC_MS ? BLOCK_RING_TO_PX : null;
  if (elapsedMs >= BLOCK_RING_MS) return null;
  const t = elapsedMs / BLOCK_RING_MS;
  return Math.round(BLOCK_RING_FROM_PX + (BLOCK_RING_TO_PX - BLOCK_RING_FROM_PX) * t);
}

/** What the overlay follows: the astronaut sprite. */
export interface OverlayTarget {
  readonly x: number;
  readonly y: number;
  readonly depth: number;
  readonly flipX: boolean;
  readonly visible: boolean;
  readonly frame: { readonly name: string | number };
  readonly isHitFlashing: boolean;
}

/**
 * Gear pieces as sprites on the astronaut: same position, frame (0-3) and flipX every frame, order legs, body,
 * head from bottom to top, all between the astronaut and a weapon in front. Plus the diamond set glint (only
 * while the block is ready) and the block ring.
 */
export class GearOverlay {
  private layers: Phaser.GameObjects.Sprite[];
  private glint: Phaser.GameObjects.Sprite | null = null;
  private ring: Phaser.GameObjects.Graphics | null = null;
  /** Time since the last set block in ms; negative: no ring. */
  private ringMs = -1;
  private flashing = false;
  private readonly reducedMotion: boolean;

  /**
   * @param keys texture keys from bottom to top (`gearTextureKeys`)
   * @param withGlint the diamond set is worn (glint and block ring)
   */
  constructor(
    private readonly scene: Phaser.Scene,
    keys: readonly string[],
    withGlint: boolean,
  ) {
    this.reducedMotion = prefersReducedMotion();
    this.layers = keys
      .filter((k) => scene.textures.exists(k))
      .map((k) => scene.add.sprite(0, 0, k, 0));
    if (withGlint && scene.textures.exists(GLINT_KEY)) {
      const glint = scene.add.sprite(0, 0, GLINT_KEY, 0).setVisible(false);
      // Sparkle at 4 fps (preload animation); with reduced motion a still frame (the hint stays visible).
      if (!this.reducedMotion && scene.anims.exists(animKey(GLINT_KEY)))
        glint.play(animKey(GLINT_KEY));
      this.glint = glint;
    }
    if (withGlint) this.ring = scene.add.graphics().setVisible(false);
  }

  /** Number of piece layers (for tests and the empty check). */
  get layerCount(): number {
    return this.layers.length;
  }

  /** Call every frame after the player update; `dtMs` is pausable game time. */
  sync(target: OverlayTarget, dtMs: number, blockReady: boolean): void {
    const flash = target.isHitFlashing;
    this.layers.forEach((layer, i) => {
      layer
        .setPosition(target.x, target.y)
        .setFrame(target.frame.name)
        .setFlipX(target.flipX)
        .setVisible(target.visible)
        .setDepth(overlayDepth(target.depth, i));
      if (flash !== this.flashing) {
        if (flash) layer.setTintFill(HIT_TINT);
        else layer.clearTint();
      }
    });
    this.flashing = flash;
    if (this.glint) {
      this.glint
        .setPosition(target.x, target.y)
        .setFlipX(target.flipX)
        .setDepth(glintDepth(target.depth))
        .setVisible(blockReady && target.visible);
    }
    this.updateRing(target, dtMs);
  }

  /** The diamond set block stopped a hit: ring from 16 to 28 px. */
  playBlock(): void {
    if (this.ring) this.ringMs = 0;
  }

  private updateRing(target: OverlayTarget, dtMs: number): void {
    const ring = this.ring;
    if (!ring || this.ringMs < 0) return;
    const r = blockRingRadius(this.ringMs, this.reducedMotion);
    this.ringMs += Math.max(0, dtMs);
    if (r === null) {
      this.ringMs = -1;
      ring.setVisible(false);
      return;
    }
    ring
      .clear()
      .lineStyle(BLOCK_RING_STROKE_PX, BLOCK_RING_COLOR, 1)
      .strokeCircle(0, 0, r)
      .setPosition(target.x, target.y)
      .setDepth(target.depth + 2)
      .setVisible(true);
  }

  destroy(): void {
    for (const layer of this.layers) layer.destroy();
    this.layers = [];
    this.glint?.destroy();
    this.glint = null;
    this.ring?.destroy();
    this.ring = null;
  }
}

/** Small explosions of the lava boots (gear-blast 24x24 x 4, once, 12 fps). Pooled sprites. */
export class GearBlastPool {
  private readonly sprites: Phaser.GameObjects.Sprite[] = [];

  constructor(private readonly scene: Phaser.Scene) {
    const anims = scene.anims;
    if (!anims.exists(BLAST_ANIM) && scene.textures.exists(BLAST_KEY)) {
      anims.create({
        key: BLAST_ANIM,
        frames: anims.generateFrameNumbers(BLAST_KEY, { start: 0, end: BLAST_FRAMES - 1 }),
        frameRate: BLAST_FPS,
        repeat: 0,
      });
    }
  }

  /** Plays one explosion at (x, y); does nothing without the texture. */
  play(x: number, y: number, depth: number): void {
    if (!this.scene.textures.exists(BLAST_KEY)) return;
    let sprite = this.sprites.find((s) => !s.visible);
    if (!sprite) {
      const created = this.scene.add.sprite(x, y, BLAST_KEY, 0);
      // One listener per pooled sprite, registered once: hide when the animation ends.
      created.on(Phaser.Animations.Events.ANIMATION_COMPLETE, () => created.setVisible(false));
      this.sprites.push(created);
      sprite = created;
    }
    sprite.setPosition(x, y).setDepth(depth).setVisible(true);
    if (this.scene.anims.exists(BLAST_ANIM)) sprite.play(BLAST_ANIM);
    else sprite.setVisible(false);
  }

  destroy(): void {
    for (const s of this.sprites) s.destroy();
    this.sprites.length = 0;
  }
}

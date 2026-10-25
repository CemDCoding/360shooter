import Phaser from 'phaser';
import type { ItemDef, ItemRules } from '../contracts';
import { THEME } from '../config/theme';
import { isExpired } from '../logic/items';
import { prefersReducedMotion } from '../platform/motion';

/** Last part of the lifetime in which the item blinks. */
const BLINK_WINDOW_MS = 3000;
const BLINK_PERIOD_MS = 250;
const OUTLINE_COLOR = THEME.colors['game.hit-flash'].num;
const OUTLINE_OFFSETS: ReadonlyArray<readonly [number, number]> = [
  [-1, 0],
  [1, 0],
  [0, -1],
  [0, 1],
];

/** Item that appears where an enemy died; shoot it to collect it. */
export class ItemPickup extends Phaser.Physics.Arcade.Sprite {
  readonly def: ItemDef;
  private readonly spawnedAt: number;
  private readonly lifetimeMs: number;
  private collected = false;
  private outline: Phaser.GameObjects.Sprite[] = [];
  /** Called once when collected by a laser. */
  onCollected?: (def: ItemDef) => void;

  /**
   * @param spawnedAtMs Spawn time on the clock later passed to update(). Pass a clock that
   *   stops while the game is paused (e.g. accumulated round time) so the lifetime does not
   *   run out during a pause. Defaults to scene.time.now.
   */
  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    def: ItemDef,
    rules: ItemRules,
    spawnedAtMs: number = scene.time.now,
  ) {
    super(scene, x, y, def.spriteKey);
    this.def = def;
    this.lifetimeMs = rules.lifetimeMs;
    this.spawnedAt = spawnedAtMs;
    scene.add.existing(this);
    scene.physics.add.existing(this);
    (this.body as Phaser.Physics.Arcade.Body).setCircle(8);
    const key = `${def.spriteKey}-anim`;
    if (scene.anims.exists(key)) this.play(key);
  }

  /** Call every frame with the same clock as spawnedAtMs (ms). Returns false once expired/destroyed. */
  update(nowMs: number): boolean {
    if (this.collected || !this.active) return false;
    if (isExpired(this.spawnedAt, nowMs, this.lifetimeMs)) {
      this.destroy();
      return false;
    }
    const remaining = this.lifetimeMs - (nowMs - this.spawnedAt);
    if (remaining <= BLINK_WINDOW_MS) {
      if (prefersReducedMotion()) {
        // No blinking: the remaining time stays visible through a static outline.
        this.updateOutline();
      } else {
        this.setAlpha(Math.floor(remaining / BLINK_PERIOD_MS) % 2 === 0 ? 0.35 : 1);
      }
    }
    return true;
  }

  /** Hard 1 px outline from four offset, flat-tinted copies (renderer independent). */
  private updateOutline(): void {
    if (this.outline.length === 0) {
      this.outline = OUTLINE_OFFSETS.map(([dx, dy]) =>
        this.scene.add
          .sprite(this.x + dx, this.y + dy, this.texture.key, this.frame.name)
          .setTintFill(OUTLINE_COLOR)
          .setDepth(this.depth - 1),
      );
    }
    for (const copy of this.outline) copy.setFrame(this.frame.name);
  }

  override destroy(fromScene?: boolean): void {
    for (const copy of this.outline) copy.destroy();
    this.outline = [];
    super.destroy(fromScene);
  }

  /** Called when a laser hits the item. Returns false if already collected. */
  collect(): boolean {
    if (this.collected || !this.active) return false;
    this.collected = true;
    this.onCollected?.(this.def);
    this.destroy();
    return true;
  }
}

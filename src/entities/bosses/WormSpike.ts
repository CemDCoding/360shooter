import Phaser from 'phaser';
import { canLaserDestroyBolt } from '../../logic/projectiles';
import type { BossHazard } from './hazards';
import { OUTLINE_COLOR, SAND_COLOR } from './wormStyle';

const SPIKE_DEPTH = 2;
const TIP = 6;
const BACK = 5;
const HALF = 3;

/**
 * Skin spike of the giant sand worm (spikeVolley, AP-100). No sprite in the brief (gap, PE-133): drawn as a
 * spike, fill `game.sand`, outline `sprite.outline`. Moved by the worm (tick), checked by the scene through
 * the generic hazard path (PE-134): shootable like a ghost orb, hurts the player once.
 */
export class WormSpike extends Phaser.GameObjects.Graphics {
  /** Damage on contact (already scaled by the variant). */
  damage = 0;
  private vx = 0;
  private vy = 0;
  private lifeMs = 0;

  constructor(
    scene: Phaser.Scene,
    private readonly radius: number,
  ) {
    super(scene);
    scene.add.existing(this);
    this.setDepth(SPIKE_DEPTH);
    this.lineStyle(1, OUTLINE_COLOR, 1);
    this.fillStyle(SAND_COLOR, 1);
    const pts = [
      new Phaser.Math.Vector2(TIP, 0),
      new Phaser.Math.Vector2(-BACK, -HALF),
      new Phaser.Math.Vector2(-BACK, HALF),
    ];
    this.fillPoints(pts, true);
    this.strokePoints(pts, true);
    this.kill();
  }

  fire(
    x: number,
    y: number,
    angleRad: number,
    speed: number,
    damage: number,
    lifeMs: number,
  ): void {
    this.setPosition(x, y).setRotation(angleRad).setActive(true).setVisible(true);
    this.vx = Math.cos(angleRad) * speed;
    this.vy = Math.sin(angleRad) * speed;
    this.damage = damage;
    this.lifeMs = lifeMs;
  }

  /** Moves the spike; returns false once it expired. */
  tick(deltaMs: number): boolean {
    if (!this.active) return false;
    this.lifeMs -= deltaMs;
    if (this.lifeMs <= 0) {
      this.kill();
      return false;
    }
    this.setPosition(this.x + (this.vx * deltaMs) / 1000, this.y + (this.vy * deltaMs) / 1000);
    return true;
  }

  kill(): void {
    this.setActive(false).setVisible(false);
  }

  /** The spike as a generic boss hazard (circle). */
  hazard(): BossHazard {
    const circle = { x: this.x, y: this.y, radius: this.radius };
    const isActive = (): boolean => this.active;
    return {
      get active() {
        return isActive();
      },
      shape: { kind: 'circle', ...circle },
      shootable: true,
      laserHit: (laser) => {
        const hit = canLaserDestroyBolt(
          { active: true, ...laser.circle },
          { active: this.active, ...circle },
        );
        if (hit) this.kill();
        return hit;
      },
      playerHit: () => {
        if (!this.active) return 0;
        this.kill();
        return this.damage;
      },
    };
  }
}

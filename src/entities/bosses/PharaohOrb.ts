import type Phaser from 'phaser';
import { animKey } from '../../config/assets';
import { canLaserDestroyBolt } from '../../logic/projectiles';
import type { BossHazard } from './hazards';

/** Sprite of the golden scarab orb (brief PE-133: 8 x 8, 2 frames). */
export const PHARAOH_ORB_KEY = 'boss-pharaoh-orb';
const ORB_DEPTH = 2;
const ORB_SIZE = 8;

/**
 * Golden scarab orb of the pharaoh (goldCurse and sandstorm, AP-104). Moved by the pharaoh (tick), checked
 * by the scene through the generic hazard path (PE-134): shootable, hurts the player once.
 */
export class PharaohOrb {
  damage = 0;
  /** Speed in px/s (fairness tests). */
  speed = 0;
  /** Time since it was fired (ms). */
  ageMs = 0;
  private readonly sprite: Phaser.GameObjects.Sprite;
  private vx = 0;
  private vy = 0;
  private lifeMs = 0;

  constructor(
    scene: Phaser.Scene,
    private readonly radius: number,
    reducedMotion: boolean,
  ) {
    this.sprite = scene.add
      .sprite(-200, -200, PHARAOH_ORB_KEY, 0)
      .setDisplaySize(ORB_SIZE, ORB_SIZE)
      .setDepth(ORB_DEPTH);
    const anim = animKey(PHARAOH_ORB_KEY);
    if (!reducedMotion && scene.anims.exists(anim)) this.sprite.play(anim);
    this.kill();
  }

  get active(): boolean {
    return this.sprite.active;
  }

  get x(): number {
    return this.sprite.x;
  }

  get y(): number {
    return this.sprite.y;
  }

  fire(
    x: number,
    y: number,
    angleRad: number,
    speed: number,
    damage: number,
    lifeMs: number,
  ): void {
    this.sprite.setPosition(x, y).setRotation(angleRad).setActive(true).setVisible(true);
    this.vx = Math.cos(angleRad) * speed;
    this.vy = Math.sin(angleRad) * speed;
    this.speed = speed;
    this.damage = damage;
    this.lifeMs = lifeMs;
    this.ageMs = 0;
  }

  /** Moves the orb; returns false once it expired. */
  tick(deltaMs: number): boolean {
    if (!this.active) return false;
    this.lifeMs -= deltaMs;
    this.ageMs += deltaMs;
    if (this.lifeMs <= 0) {
      this.kill();
      return false;
    }
    this.sprite.setPosition(
      this.x + (this.vx * deltaMs) / 1000,
      this.y + (this.vy * deltaMs) / 1000,
    );
    return true;
  }

  kill(): void {
    this.sprite.setActive(false).setVisible(false);
  }

  /** The orb as a generic boss hazard (circle). */
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

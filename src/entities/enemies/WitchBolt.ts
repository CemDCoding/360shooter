import Phaser from 'phaser';
import { animKey } from '../../config/assets';
import type { StatusOnHit } from '../../contracts';
import { DEFAULT_PROJECTILE_KEY } from './projectileTexture';

/** Per shot: sprite (texture key that exists) and status effect, both from the shooter's config (AP-101). */
export interface BoltOptions {
  spriteKey?: string;
  onHit?: StatusOnHit;
}

/** Projectile of the shooters (witch, camel, mummy, archaeologist). Hit detection against the player is done by the scene. */
export class WitchBolt extends Phaser.Physics.Arcade.Sprite {
  damage = 0;
  private hitStatus: StatusOnHit | undefined;
  private boltKey = DEFAULT_PROJECTILE_KEY;

  constructor(scene: Phaser.Scene) {
    super(scene, -100, -100, DEFAULT_PROJECTILE_KEY);
    scene.add.existing(this);
    scene.physics.add.existing(this);
    this.despawn();
  }

  /**
   * Status effect of this shot (EnemyProjectileDef.onHit of the shooter, AP-97). Overwritten on every fire()
   * (empty if the shooter has none), so a pooled bolt never keeps an old one. It stays readable after
   * despawn(), because the scene despawns the bolt before it applies the hit. Applied by the scene from AP-102 on.
   */
  get onHit(): StatusOnHit | undefined {
    return this.hitStatus;
  }

  /** Texture of the current shot. */
  get spriteKey(): string {
    return this.boltKey;
  }

  fire(
    x: number,
    y: number,
    tx: number,
    ty: number,
    damage: number,
    speed: number,
    opts: BoltOptions = {},
  ): void {
    this.damage = damage;
    this.hitStatus = opts.onHit;
    this.useTexture(opts.spriteKey ?? DEFAULT_PROJECTILE_KEY);
    this.enableBody(true, x, y, true, true);
    this.setActive(true).setVisible(true);
    const angle = Math.atan2(ty - y, tx - x);
    this.setRotation(angle);
    this.setVelocity(Math.cos(angle) * speed, Math.sin(angle) * speed);
    const anim = animKey(this.boltKey);
    if (this.scene.anims.exists(anim)) this.play(anim, true);
    else this.stop();
  }

  despawn(): void {
    this.disableBody(true, true);
    this.setActive(false).setVisible(false);
  }

  /** Switches the texture of a pooled bolt; the square body follows the mean frame side. */
  private useTexture(key: string): void {
    if (key === this.boltKey) return;
    this.stop();
    this.setTexture(key);
    this.boltKey = key;
    const side = Math.max(1, Math.round((this.width + this.height) / 2));
    this.setBodySize(side, side, true);
  }
}

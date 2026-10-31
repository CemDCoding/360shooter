import Phaser from 'phaser';
import { animKey } from '../../config/assets';
import type { StatusOnHit } from '../../contracts';

const KEY = 'witch-bolt';

/** Projectile of the forest witch. Hit detection against the player is done by the scene. */
export class WitchBolt extends Phaser.Physics.Arcade.Sprite {
  damage = 0;
  private hitStatus: StatusOnHit | undefined;

  constructor(scene: Phaser.Scene) {
    super(scene, -100, -100, KEY);
    scene.add.existing(this);
    scene.physics.add.existing(this);
    this.despawn();
  }

  /**
   * Status effect of this shot (EnemyProjectileDef.onHit of the shooter, AP-97). Set on every fire(), so a
   * pooled bolt never keeps an old one. Applied by the scene from AP-102 on.
   */
  get onHit(): StatusOnHit | undefined {
    return this.hitStatus;
  }

  fire(
    x: number,
    y: number,
    tx: number,
    ty: number,
    damage: number,
    speed: number,
    onHit?: StatusOnHit,
  ): void {
    this.damage = damage;
    this.hitStatus = onHit;
    this.enableBody(true, x, y, true, true);
    this.setActive(true).setVisible(true);
    const angle = Math.atan2(ty - y, tx - x);
    this.setRotation(angle);
    this.setVelocity(Math.cos(angle) * speed, Math.sin(angle) * speed);
    const anim = animKey(KEY);
    if (this.scene.anims.exists(anim)) this.play(anim, true);
  }

  despawn(): void {
    this.disableBody(true, true);
    this.setActive(false).setVisible(false);
  }
}

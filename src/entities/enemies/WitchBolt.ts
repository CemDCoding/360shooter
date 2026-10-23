import Phaser from 'phaser';
import { animKey } from '../../config/assets';

const KEY = 'witch-bolt';

/** Projectile of the forest witch. Hit detection against the player is done by the scene. */
export class WitchBolt extends Phaser.Physics.Arcade.Sprite {
  damage = 0;

  constructor(scene: Phaser.Scene) {
    super(scene, -100, -100, KEY);
    scene.add.existing(this);
    scene.physics.add.existing(this);
    this.despawn();
  }

  fire(x: number, y: number, tx: number, ty: number, damage: number, speed: number): void {
    this.damage = damage;
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

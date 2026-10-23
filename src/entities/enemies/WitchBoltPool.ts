import type Phaser from 'phaser';
import { WitchBolt } from './WitchBolt';

const MARGIN = 32;

/** Pool of witch bolts; `bolts` is used for overlap checks (AP-10). */
export class WitchBoltPool {
  readonly bolts: WitchBolt[] = [];

  constructor(private readonly scene: Phaser.Scene) {}

  fire(x: number, y: number, tx: number, ty: number, damage: number, speed: number): WitchBolt {
    let bolt = this.bolts.find((b) => !b.active);
    if (!bolt) {
      bolt = new WitchBolt(this.scene);
      this.bolts.push(bolt);
    }
    bolt.fire(x, y, tx, ty, damage, speed);
    return bolt;
  }

  /** Despawns bolts that left the screen. Call every frame. */
  update(): void {
    const { width, height } = this.scene.scale.gameSize;
    for (const b of this.bolts) {
      if (!b.active) continue;
      if (b.x < -MARGIN || b.x > width + MARGIN || b.y < -MARGIN || b.y > height + MARGIN) {
        b.despawn();
      }
    }
  }

  clear(): void {
    for (const b of this.bolts) b.despawn();
  }
}

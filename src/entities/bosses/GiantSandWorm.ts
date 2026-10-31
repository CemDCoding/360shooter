import type Phaser from 'phaser';
import { BossBase, type BossContext } from './BossBase';

/**
 * Boss "Riesen-Sand-Wurm" (desert 21-25, PE-128). Stub from AP-97: stands where it appeared and only
 * has contact damage. The attacks burrow, spikeVolley and coil follow in AP-100.
 */
export class GiantSandWorm extends BossBase {
  constructor(scene: Phaser.Scene, levelId: number, ctx: BossContext = {}) {
    super(scene, 'giantSandWorm', levelId, ctx);
  }
}

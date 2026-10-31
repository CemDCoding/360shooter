import type Phaser from 'phaser';
import { BossBase, type BossContext } from './BossBase';

/**
 * Boss "Pharao" (oasis 31-40, PE-128). Stub from AP-97: stands where it appeared and only has contact
 * damage. The attacks goldCurse, sarcophagus and sandstorm follow in AP-104.
 */
export class Pharaoh extends BossBase {
  constructor(scene: Phaser.Scene, levelId: number, ctx: BossContext = {}) {
    super(scene, 'pharaoh', levelId, ctx);
  }
}

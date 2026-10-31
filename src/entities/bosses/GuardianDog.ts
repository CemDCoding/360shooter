import type Phaser from 'phaser';
import { BossBase, type BossContext } from './BossBase';

/**
 * Boss "Antiker Wächter-Hund" (pyramids 26-30, PE-128). Stub from AP-97: stands where it appeared and only
 * has contact damage. The attacks runeShield, guardBark and summonMummies follow in AP-103.
 */
export class GuardianDog extends BossBase {
  constructor(scene: Phaser.Scene, levelId: number, ctx: BossContext = {}) {
    super(scene, 'guardianDog', levelId, ctx);
  }
}

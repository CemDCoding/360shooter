import type Phaser from 'phaser';
import type { BossId } from '../../contracts';
import type { BossBase } from './BossBase';
import { ForestGhost } from './ForestGhost';
import { GiantSandWorm } from './GiantSandWorm';
import { GiantStone } from './GiantStone';
import { GuardianDog } from './GuardianDog';
import { Pharaoh } from './Pharaoh';
import { RootMonster, type RootMonsterContext } from './RootMonster';

/** Everything the scene hands to a boss: the shared callbacks plus the per-boss hooks. */
export interface CreateBossContext extends RootMonsterContext {
  /** Giant stone (and M5 bosses): current player position. */
  getPlayerPos?: () => { x: number; y: number };
  /** Giant stone (and M5 bosses): an attack hit the player (damage already scaled). */
  onPlayerHit?: (damage: number) => void;
}

/**
 * Factory for all bosses (AP-20, M5 stubs in AP-97). `levelId` selects the variant (HP, damage, tint, extra
 * attack) inside the boss class via `variantForLevel`. The boss starts hidden; call `spawn(x, y)`.
 */
export function createBoss(
  scene: Phaser.Scene,
  bossId: BossId,
  levelId: number,
  ctx: CreateBossContext = {},
): BossBase {
  switch (bossId) {
    case 'rootMonster':
      return new RootMonster(scene, levelId, ctx);
    case 'forestGhost':
      return new ForestGhost(scene, levelId, ctx);
    case 'giantStone':
      return new GiantStone(scene, levelId, ctx, {
        getPlayerPos: ctx.getPlayerPos,
        onPlayerHit: ctx.onPlayerHit,
      });
    // M5 (AP-97): they get the whole context (onSummon, getPlayerPos, onPlayerHit), so the boss
    // packages AP-100, AP-103 and AP-104 need no change here.
    case 'giantSandWorm':
      return new GiantSandWorm(scene, levelId, ctx);
    case 'guardianDog':
      return new GuardianDog(scene, levelId, ctx);
    case 'pharaoh':
      return new Pharaoh(scene, levelId, ctx);
  }
}

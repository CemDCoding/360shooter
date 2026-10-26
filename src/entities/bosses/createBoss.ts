import type Phaser from 'phaser';
import type { BossId } from '../../contracts';
import type { BossBase } from './BossBase';
import { ForestGhost } from './ForestGhost';
import { GiantStone } from './GiantStone';
import { RootMonster, type RootMonsterContext } from './RootMonster';

/** Everything the scene hands to a boss: the shared callbacks plus the per-boss hooks. */
export interface CreateBossContext extends RootMonsterContext {
  /** Giant stone: current player position. */
  getPlayerPos?: () => { x: number; y: number };
  /** Giant stone: the rolling stone hit the player (damage already scaled). */
  onPlayerHit?: (damage: number) => void;
}

/**
 * Factory for the three bosses (AP-20). `levelId` selects the variant (HP, damage, tint, extra
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
  }
}

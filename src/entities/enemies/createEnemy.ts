import type Phaser from 'phaser';
import type { EnemyId } from '../../contracts';
import { ENEMIES } from '../../config/enemies';
import { AuraEnemy } from './AuraEnemy';
import { ChaseEnemy } from './ChaseEnemy';
import type { Enemy, EnemyContext } from './Enemy';
import { ForestWitch } from './ForestWitch';
import type { WitchBoltPool } from './WitchBoltPool';

export interface CreateEnemyContext extends EnemyContext {
  /** Required for shooter enemies. */
  boltPool?: WitchBoltPool;
}

/** Factory: picks the behavior class via EnemyDef.behavior. A new enemy with a known behavior needs only a config entry. */
export function createEnemy(scene: Phaser.Scene, id: EnemyId, ctx: CreateEnemyContext = {}): Enemy {
  switch (ENEMIES[id].behavior) {
    case 'chase':
      return new ChaseEnemy(scene, id, ctx);
    case 'aura':
      return new AuraEnemy(scene, id, ctx);
    case 'shooter':
      if (!ctx.boltPool) throw new Error(`${id} needs a boltPool`);
      return new ForestWitch(scene, id, { ...ctx, boltPool: ctx.boltPool });
  }
}

/** Pool of enemies. `enemies` holds all instances for overlap checks. */
export class EnemyPool {
  readonly enemies: Enemy[] = [];

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly ctx: CreateEnemyContext,
  ) {}

  spawn(id: EnemyId, x: number, y: number): Enemy {
    let e = this.enemies.find((en) => !en.active && en.def.id === id);
    if (!e) {
      e = createEnemy(this.scene, id, this.ctx);
      this.enemies.push(e);
    }
    e.spawn(x, y);
    return e;
  }

  update(time: number, delta: number): void {
    for (const e of this.enemies) e.update(time, delta);
  }

  clear(): void {
    for (const e of this.enemies) e.despawn();
  }
}

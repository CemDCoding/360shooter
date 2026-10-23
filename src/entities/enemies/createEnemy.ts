import type Phaser from 'phaser';
import type { EnemyId } from '../../contracts';
import { CursedTree } from './CursedTree';
import type { Enemy, EnemyContext } from './Enemy';
import { ForestSpirit } from './ForestSpirit';
import { ForestWitch } from './ForestWitch';
import type { WitchBoltPool } from './WitchBoltPool';
import { ZombieSquirrel } from './ZombieSquirrel';

export interface CreateEnemyContext extends EnemyContext {
  /** Required for shooter enemies. */
  boltPool?: WitchBoltPool;
}

/** Factory: picks the class per id. New enemies need config data and at most one new class. */
export function createEnemy(scene: Phaser.Scene, id: EnemyId, ctx: CreateEnemyContext = {}): Enemy {
  switch (id) {
    case 'cursedTree':
      return new CursedTree(scene, ctx);
    case 'zombieSquirrel':
      return new ZombieSquirrel(scene, ctx);
    case 'forestSpirit':
      return new ForestSpirit(scene, ctx);
    case 'forestWitch':
      if (!ctx.boltPool) throw new Error('forestWitch needs a boltPool');
      return new ForestWitch(scene, { ...ctx, boltPool: ctx.boltPool });
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

export type EnemyId = 'cursedTree' | 'forestWitch' | 'zombieSquirrel' | 'forestSpirit';

export type EnemyBehavior = 'chase' | 'shooter' | 'aura';

export interface EnemyProjectileDef {
  damage: number;
  speed: number;
  intervalMs: number;
  keepDistance: number;
}

export interface EnemyAuraDef {
  radius: number;
  dps: number;
}

export interface EnemyDef {
  id: EnemyId;
  hp: number;
  /** Pixel pro Sekunde */
  speed: number;
  contactDamage: number;
  behavior: EnemyBehavior;
  xp: number;
  spriteKey: string;
  projectile?: EnemyProjectileDef;
  aura?: EnemyAuraDef;
}

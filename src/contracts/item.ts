export type ItemEffect = 'fireRate' | 'damage' | 'size' | 'heal';

export interface ItemDef {
  id: string;
  effect: ItemEffect;
  perStack: number;
  maxStacks: number;
  dropWeight: number;
  spriteKey: string;
}

export interface ItemRules {
  dropChance: number;
  lifetimeMs: number;
}

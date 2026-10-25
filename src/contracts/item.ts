export type ItemEffect = 'doubleShot' | 'shield' | 'rapidFire' | 'heal';

export interface ItemDef {
  id: string;
  effect: ItemEffect;
  perStack: number;
  maxStacks: number;
  dropWeight: number;
  spriteKey: string;
  /** Nur Dauerfeuer (rapidFire): Wirkdauer in ms */
  durationMs?: number;
}

export interface ItemRules {
  dropChance: number;
  lifetimeMs: number;
}

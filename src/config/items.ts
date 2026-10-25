// Balancing (AP-27), Startwerte PE-39 bis PE-43, Feintuning in AP-35.
import type { ItemDef, ItemRules } from '../contracts';

export const ITEMS: readonly ItemDef[] = [
  {
    id: 'doubleShot',
    effect: 'doubleShot',
    perStack: 1,
    maxStacks: 2,
    dropWeight: 30,
    spriteKey: 'item-double-shot',
  },
  {
    id: 'shield',
    effect: 'shield',
    perStack: 60,
    maxStacks: 2,
    dropWeight: 30,
    spriteKey: 'item-shield',
  },
  {
    id: 'rapidFire',
    effect: 'rapidFire',
    perStack: 1,
    maxStacks: 1,
    dropWeight: 30,
    durationMs: 4000,
    spriteKey: 'item-rapid-fire',
  },
  {
    id: 'heal',
    effect: 'heal',
    perStack: 25,
    maxStacks: 1,
    dropWeight: 10,
    spriteKey: 'item-heal',
  },
];

export const ITEM_RULES: ItemRules = { dropChance: 0.08, lifetimeMs: 10000 };

/** Obergrenze der Feuerrate waehrend Dauerfeuer */
export const RAPID_FIRE_MAX_PER_SEC = 20;

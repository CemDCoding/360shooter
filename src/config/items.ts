// Balancing (AP-15), Erklaerung in docs/balancing.md.
import type { ItemDef, ItemRules } from '../contracts';

export const ITEMS: readonly ItemDef[] = [
  {
    id: 'fireRate',
    effect: 'fireRate',
    perStack: 0.2,
    maxStacks: 5,
    dropWeight: 30,
    spriteKey: 'item-fire-rate',
  },
  {
    id: 'damage',
    effect: 'damage',
    perStack: 0.25,
    maxStacks: 5,
    dropWeight: 30,
    spriteKey: 'item-damage',
  },
  {
    id: 'size',
    effect: 'size',
    perStack: 0.25,
    maxStacks: 5,
    dropWeight: 30,
    spriteKey: 'item-size',
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

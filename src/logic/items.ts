import type { ItemDef, ItemRules, WeaponStacks } from '../contracts';
import type { Rng } from './rng';

/** Weighted drop: first checks dropChance, then picks a def by dropWeight. */
export function rollDrop(rng: Rng, rules: ItemRules, defs: readonly ItemDef[]): ItemDef | null {
  if (rng.next() >= rules.dropChance) return null;
  const total = defs.reduce((sum, d) => sum + Math.max(0, d.dropWeight), 0);
  if (total <= 0) return null;
  let roll = rng.next() * total;
  for (const d of defs) {
    roll -= Math.max(0, d.dropWeight);
    if (roll < 0) return d;
  }
  return defs[defs.length - 1] ?? null;
}

export interface ApplyItemResult {
  stacks: WeaponStacks;
  /** Amount to heal (only for heal items), otherwise 0. */
  heal: number;
}

/** Returns new stacks (capped at maxStacks); heal leaves stacks unchanged. */
export function applyItem(stacks: WeaponStacks, def: ItemDef): ApplyItemResult {
  if (def.effect === 'heal') return { stacks: { ...stacks }, heal: def.perStack };
  const next = { ...stacks };
  next[def.effect] = Math.min(def.maxStacks, stacks[def.effect] + 1);
  return { stacks: next, heal: 0 };
}

export function isExpired(spawnedAtMs: number, nowMs: number, lifetimeMs: number): boolean {
  return nowMs - spawnedAtMs >= lifetimeMs;
}

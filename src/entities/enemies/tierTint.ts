import { THEME, type ColorName } from '../../config/theme';

/** Tint tokens of the enemy tiers (AP-134, H-33): step 0 = no tint, from step 3 on the strongest. */
const TIER_TINT: readonly ColorName[] = [
  'game.tier-0',
  'game.tier-1',
  'game.tier-2',
  'game.tier-3',
];

/** Token of a tint step. Unknown, negative or fractional steps count as 0, steps above 3 as 3. */
export function tierTintToken(step: number): ColorName {
  const s = Number.isFinite(step)
    ? Math.min(TIER_TINT.length - 1, Math.max(0, Math.floor(step)))
    : 0;
  return TIER_TINT[s]!;
}

/** Multiplicative tint colour of a step, or null for step 0 (the sprite then keeps its own colours). */
export function tierTintColor(step: number): number | null {
  const token = tierTintToken(step);
  return token === 'game.tier-0' ? null : THEME.colors[token].num;
}

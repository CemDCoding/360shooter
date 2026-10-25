// Boss values (AP-16, behaviour PE-34). Starting values, fine tuning with the boss packages. Only change values here.
import type { BossDef, BossId } from '../contracts';

/** Fairness: every attack is announced at least this long before it hits. */
export const MIN_TELEGRAPH_MS = 700;

/** Seconds of remaining time at which the warning appears and at which the boss appears (PE-18). */
export const BOSS_WARNING_REMAINING_MS = 63_000;
export const BOSS_SPAWN_REMAINING_MS = 60_000;

/** HP +15 % and damage +10 % per level index inside the batch (PE-33). */
export const BOSS_HP_STEP = 0.15;
export const BOSS_DAMAGE_STEP = 0.1;
/** First index inside the batch with the extra attack (3rd level of the batch). */
export const BOSS_EXTRA_ATTACK_INDEX = 2;

/** Spawn rate of normal enemies while the boss is alive (halved, PE-18). */
export const BOSS_SPAWN_RATE_FACTOR = 0.5;

export const BOSSES: Readonly<Record<BossId, BossDef>> = {
  rootMonster: {
    id: 'rootMonster',
    baseHp: 500,
    baseDamage: 10,
    spriteKey: 'boss-root-monster',
    attacks: [
      // Roots break out under the player after the warning.
      { id: 'rootThrust', cooldownMs: 3500, telegraphMs: 1000, damage: 15, extraOnly: false },
      // Calls 3 to 5 cursed trees (the boss reports them via callback).
      { id: 'forestCall', cooldownMs: 10_000, telegraphMs: 1200, damage: 0, extraOnly: false },
      // Ring of roots with one visible gap.
      { id: 'rootRing', cooldownMs: 9000, telegraphMs: 1500, damage: 15, extraOnly: true },
    ],
  },
  forestGhost: {
    id: 'forestGhost',
    baseHp: 600,
    baseDamage: 8,
    spriteKey: 'boss-forest-ghost',
    attacks: [
      // Fan of ghost orbs.
      { id: 'orbFan', cooldownMs: 3500, telegraphMs: 900, damage: 10, extraOnly: false },
      // Turns half transparent and invulnerable for a short time.
      { id: 'fade', cooldownMs: 9000, telegraphMs: 800, damage: 0, extraOnly: false },
      // Splits into 2 decoys for a short time.
      { id: 'decoys', cooldownMs: 12_000, telegraphMs: 1000, damage: 0, extraOnly: true },
    ],
  },
  giantStone: {
    id: 'giantStone',
    baseHp: 800,
    baseDamage: 12,
    spriteKey: 'boss-giant-stone',
    attacks: [
      // Rolls to the middle along a warning line and bounces back.
      { id: 'roll', cooldownMs: 6000, telegraphMs: 1200, damage: 20, extraOnly: false },
    ],
  },
};

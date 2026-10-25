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
      { id: 'fade', cooldownMs: 9000, telegraphMs: 1000, damage: 0, extraOnly: false },
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

/**
 * Fairness (PE-75): from the moment a threat appears until it reaches the (fixed) player,
 * the player has at least this long to react (shoot it down or weaken it).
 */
export const MIN_REACTION_MS = 1000;

/**
 * Behaviour and balance values of the boss entities (AP-67, PE-75).
 * Starting values, balancing after the manual test M3-DEP (see docs/balancing.md).
 * Purely visual constants (depth, colours from THEME) may stay in the entity files.
 */
export const BOSS_TUNING = {
  arena: { width: 640, height: 360, margin: 16 },
  /** Hit radius of the player used for fairness calculations and the stone roll. */
  playerHitRadius: 14,
  rootMonster: {
    /** Root bud of rootThrust: harmless while it grows, lasers weaken it. */
    sprout: { hits: 6, hitRadius: 36 },
    /** Time a root stays up after it broke out (ms). */
    spikeLifetimeMs: 600,
    call: { minTrees: 3, maxTrees: 5, distance: 56, warnRadius: 16 },
    ring: {
      radius: 96,
      thickness: 20,
      spikeCount: 12,
      /** Width of the gap (radians, about 70 degrees). */
      gapRad: 1.2,
      speedPxPerSec: 60,
      spikeRadius: 8,
      /** Share of the attack damage per root that reaches the player. */
      damageShare: 0.25,
    },
  },
  forestGhost: {
    orbitRadius: 110,
    orbitSpeedRadPerSec: 0.6,
    fanCount: 5,
    fanSpreadDeg: 50,
    orbSpeedPxPerSec: 90,
    orbRadius: 4,
    orbLifeMs: 4000,
    warnLineWidth: 10,
    fadeDurationMs: 2500,
    fadeAlpha: 0.3,
    decoyCount: 2,
    decoyDurationMs: 5000,
    decoyAlpha: 0.75,
  },
  giantStone: {
    rim: { rx: 150, ry: 115 },
    rollSpeed: 300,
    returnSpeed: 140,
    vulnerableMs: 2000,
    armorFactor: 0.5,
    splitAt: 0.5,
    baseRadius: 28,
    arriveDist: 6,
    retreatMaxMs: 4000,
    fragmentOffset: 36,
    fragmentMinCenterDist: 80,
  },
} as const;

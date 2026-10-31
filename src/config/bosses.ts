// Boss values (AP-16, behaviour PE-34). Starting values, fine tuning with the boss packages. Only change values here.
import type { BossDef, BossId } from '../contracts';

/** Fairness: every attack is announced at least this long before it hits. */
export const MIN_TELEGRAPH_MS = 700;

/** Remaining time at which the warning appears and at which the boss appears (PE-76: last 30 s, warning 3 s earlier). */
export const BOSS_WARNING_REMAINING_MS = 33_000;
export const BOSS_SPAWN_REMAINING_MS = 30_000;

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
    name: 'Verwurzeltes Baummonster',
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
    name: 'Waldgeist',
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
    name: 'Riesen-Stein',
    baseHp: 800,
    baseDamage: 12,
    spriteKey: 'boss-giant-stone',
    attacks: [
      // Rolls to the middle along a warning line and bounces back.
      { id: 'roll', cooldownMs: 6000, telegraphMs: 1200, damage: 20, extraOnly: false },
    ],
  },
  // M5 (AP-97, PE-128): starting values, behaviour and fine tuning in AP-100, AP-103 and AP-104.
  // Riesen-Sand-Wurm (AP-100): behaviour values in BOSS_TUNING.giantSandWorm.
  giantSandWorm: {
    id: 'giantSandWorm',
    name: 'Riesen-Sand-Wurm',
    baseHp: 1000,
    baseDamage: 12,
    spriteKey: 'boss-sand-worm',
    attacks: [
      // Dives (invulnerable), a sand trail wanders to the player, the worm breaks out next to her
      // inside the announced circle. The mound at the end of the trail can be shot to weaken it.
      { id: 'burrow', cooldownMs: 7000, telegraphMs: 1200, damage: 18, extraOnly: false },
      // Fan of skin spikes (shootable like the ghost orbs).
      { id: 'spikeVolley', cooldownMs: 4000, telegraphMs: 900, damage: 10, extraOnly: false },
      // Body circles the player as a ring with a gap and squeezes; only the head is vulnerable.
      { id: 'coil', cooldownMs: 12_000, telegraphMs: 1500, damage: 15, extraOnly: true },
    ],
  },
  guardianDog: {
    id: 'guardianDog',
    name: 'Antiker Wächter-Hund',
    baseHp: 1300,
    baseDamage: 14,
    spriteKey: 'boss-guardian-dog',
    attacks: [
      // Invulnerable until 3 floating runes are shot down.
      { id: 'runeShield', cooldownMs: 14_000, telegraphMs: 1000, damage: 0, extraOnly: false },
      // Shock wave ring with a gap.
      { id: 'guardBark', cooldownMs: 5000, telegraphMs: 1200, damage: 15, extraOnly: false },
      // Calls 3 mummies (generic summon callback).
      { id: 'summonMummies', cooldownMs: 12_000, telegraphMs: 1200, damage: 0, extraOnly: true },
    ],
  },
  pharaoh: {
    id: 'pharaoh',
    name: 'Pharao',
    baseHp: 1700,
    baseDamage: 14,
    spriteKey: 'boss-pharaoh',
    attacks: [
      // Spiral of gold orbs.
      { id: 'goldCurse', cooldownMs: 4500, telegraphMs: 1000, damage: 10, extraOnly: false },
      // Vanishes and reappears at an announced spot.
      { id: 'sarcophagus', cooldownMs: 9000, telegraphMs: 1200, damage: 0, extraOnly: false },
      // Edge darkens, projectiles come from outside.
      { id: 'sandstorm', cooldownMs: 14_000, telegraphMs: 1500, damage: 8, extraOnly: true },
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
  /** Inner margin to the arena edge. The arena size itself comes from the scene (BossContext.arena, PE-101). */
  arena: { margin: 16 },
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
  /** Riesen-Sand-Wurm (AP-100, PE-128, PE-133). Starting values, balancing in the manual test M5-DEP. */
  giantSandWorm: {
    /** Path of the head while it roams (base arena; wider arenas grow like the stone rim, PE-101). */
    orbit: { rx: 150, ry: 115 },
    orbitSpeedRadPerSec: 0.35,
    /** Speed of the head back to its path after an attack (px/s). */
    returnSpeed: 140,
    /** Head sprite size and body chain (brief: links about 22 px apart, the last link is the tail). */
    headSize: 64,
    segmentCount: 10,
    segmentSpacing: 22,
    segmentSize: 32,
    /** Hit radius of a body link (lasers bounce off, the coil squeezes with it). */
    segmentRadius: 10,
    /** Frame time of the wiggling body links (ms). */
    segmentFrameMs: 250,
    /** Visible spark when a laser bounces off a link (ms). */
    sparkMs: 120,
    burrow: {
      /** Distance of the break-out point from the player (beside her, PE-128). */
      emergeDistance: 64,
      /** Radius of the announced break-out circle; it reaches the player. Damage only inside it. */
      eruptRadius: 60,
      /** How long the break-out hurts (ms, hits once). */
      eruptMs: 300,
      /** Time the worm stays at the break-out point before it returns (ms). */
      surfaceMs: 1200,
      /** Sand mound at the end of the trail: hit radius and laser hits until the break-out is harmless. */
      moundRadius: 16,
      moundHits: 5,
      /** Spacing of the sand strokes of the trail (px). */
      trailStep: 10,
    },
    volley: {
      count: 5,
      spreadDeg: 60,
      /** Top speed; closer to the player the spikes get slower so they keep MIN_REACTION_MS. */
      speedPxPerSec: 90,
      minSpeedPxPerSec: 30,
      spikeRadius: 4,
      lifeMs: 4000,
      warnLineWidth: 8,
    },
    coil: {
      /** Start radius of the ring around the player. */
      radius: 100,
      /** Gap of the ring (radians), at least as wide as the root ring. */
      gapRad: 1.2,
      /** Squeeze speed toward the player (px/s). */
      speedPxPerSec: 60,
      /** Speed of the links into the ring during the announcement (px/s). */
      formSpeedPxPerSec: 260,
      /** Share of the attack damage per link that reaches the player. */
      damageShare: 0.2,
      /** Head hits during the coil until it breaks up (each hit weakens it). */
      breakHits: 6,
      /** The ring stays closed this long before it opens again (ms). */
      holdMs: 200,
      thickness: 20,
    },
  },
  /** Antiker Wächter-Hund (AP-103, PE-128, PE-133). Starting values, balancing in the manual test M5-DEP. */
  guardianDog: {
    /** Path of the dog (same rim as the boss appears on; wider arenas grow like the stone rim, PE-101). */
    orbit: { rx: 150, ry: 115 },
    /** Slow walk of the tank on its path (rad/s). */
    orbitSpeedRadPerSec: 0.2,
    /** Sprite size (brief: 64 x 64). */
    size: 64,
    /** Visible spark when a laser bounces off the shield (ms). */
    sparkMs: 120,
    runeShield: {
      /** Shield circle around the dog: lasers bounce off it while a rune lives. */
      radius: 40,
      runeCount: 3,
      /** Distance of the floating runes from the dog (outside the shield, so lasers reach them first). */
      runeOrbit: 56,
      runeRadius: 8,
      /** Laser hits until a rune breaks. */
      runeHits: 2,
      runeSpeedRadPerSec: 1.2,
      /** Time limit of the invulnerability (ms): then the runes fade even if none was shot. */
      maxMs: 8000,
      /** Dots of the dotted shield ring (shape, not only colour). */
      dotCount: 28,
    },
    guardBark: {
      /** Radius at which the shock wave leaves the dog. */
      startRadius: 36,
      thickness: 12,
      /** Gap of the wave (radians), at least as wide as the root ring gap. */
      gapRad: 1.2,
      /** Arcs of the wave; a laser hit on an arc breaks it (the player can open her own gap). */
      arcCount: 12,
      arcHits: 1,
      /** Top speed; closer to the player the wave gets slower so it keeps MIN_REACTION_MS. */
      speedPxPerSec: 80,
      minSpeedPxPerSec: 30,
    },
    summonMummies: {
      count: 3,
      /** Warning circles at the screen edge where the mummies come in. */
      markerRadius: 14,
    },
  },
} as const;

export type BossId =
  | 'rootMonster'
  | 'forestGhost'
  | 'giantStone'
  // M5 (PE-123, PE-128): desert, pyramids, oasis
  | 'giantSandWorm'
  | 'guardianDog'
  | 'pharaoh';

/** One boss attack. Every attack is shown as a warning for telegraphMs before it hits (fairness). */
export interface BossAttackDef {
  /** Unique within the boss, passed to the subclass hook onAttack. */
  id: string;
  /** Pause after the attack was executed until it may start again (ms). */
  cooldownMs: number;
  /** Warning time before the attack hits (ms), at least 700. */
  telegraphMs: number;
  /** Base damage per hit before the variant multiplier, 0 for attacks that only summon or move. */
  damage: number;
  /** Only used by variants with extraAttack = true (from the 3rd level of a batch). */
  extraOnly: boolean;
}

export interface BossDef {
  id: BossId;
  /** Display name shown in the HUD and on the result screen. */
  name: string;
  baseHp: number;
  /** Contact damage per second of the boss body before the variant multiplier. */
  baseDamage: number;
  spriteKey: string;
  attacks: BossAttackDef[];
}

/** Level specific changes of a boss (PE-33). */
export interface BossVariant {
  /** Position of the level inside its batch, starting with 0. */
  index: number;
  hpMultiplier: number;
  damageMultiplier: number;
  /** Phaser tint colour, 0xffffff = unchanged. */
  tint: number;
  /** true unlocks the attacks with extraOnly. */
  extraAttack: boolean;
}

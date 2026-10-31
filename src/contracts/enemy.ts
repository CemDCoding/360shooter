export type EnemyId =
  | 'cursedTree'
  | 'forestWitch'
  | 'zombieSquirrel'
  | 'forestSpirit'
  // M5 (PE-123, F-19)
  | 'mummy'
  | 'sandWorm'
  | 'armadillo'
  | 'camel'
  | 'snake'
  | 'archaeologist'
  | 'sphinx'
  | 'boar'
  | 'bear'
  | 'fairy';

/**
 * chase: walks to the player. shooter: keeps distance and shoots. aura: damages around itself.
 * charge: slow, then an announced fast dash (PE-127). burrow: dives under the sand and comes up near the player (PE-127).
 */
export type EnemyBehavior = 'chase' | 'shooter' | 'aura' | 'charge' | 'burrow';

/** Path shape on the way to the player: straight line (default) or sideways zigzag (fairy, PE-127). */
export type EnemyMovement = 'straight' | 'zigzag';

/** Status effects a hit puts on the player (PE-127). Applied by the scene from AP-102 on. */
export interface StatusOnHit {
  /** Damage over time: dps for durationMs. A new hit refreshes the duration, no stacking (AP-98). */
  poison?: { dps: number; durationMs: number };
  /** Slower turning: turn speed times turnFactor (0..1) for durationMs. */
  slow?: { turnFactor: number; durationMs: number };
}

export interface EnemyProjectileDef {
  damage: number;
  speed: number;
  intervalMs: number;
  keepDistance: number;
  /** Sprite of the projectile, default `witch-bolt` (AP-101). */
  spriteKey?: string;
  /** Status effect when the projectile hits the player. */
  onHit?: StatusOnHit;
}

export interface EnemyAuraDef {
  radius: number;
  dps: number;
}

/** Charge (behavior 'charge', PE-127): approach slowly, announce, dash in a straight line, recover. */
export interface EnemyChargeDef {
  /** Announcement before the dash (ms), at least MIN_TELEGRAPH_MS (700). */
  telegraphMs: number;
  /** Dash speed in pixels per second. */
  dashSpeed: number;
  /** Duration of the dash (ms). */
  dashMs: number;
  /** Pause after a dash until the next announcement (ms). */
  cooldownMs: number;
  /** Factor on incoming damage while dashing (armadillo rolls: 0.5, boar: 1). */
  dashDamageFactor: number;
}

/** Burrow (behavior 'burrow', PE-127): invulnerable under the sand, comes up near the player. */
export interface EnemyBurrowDef {
  /** Time under the sand (ms), invulnerable and visible as a sand hill. */
  underMs: number;
  /** Time above the sand (ms) before it dives again. */
  surfaceMs: number;
  /** Minimum distance between the surfacing point and the player (pixels), never on top of her. */
  surfaceDistance: number;
  /** Announcement before surfacing (ms), at least MIN_TELEGRAPH_MS (700). */
  telegraphMs: number;
}

export interface EnemyDef {
  id: EnemyId;
  hp: number;
  /** Pixel pro Sekunde */
  speed: number;
  contactDamage: number;
  behavior: EnemyBehavior;
  xp: number;
  /** Muenzwert bei Drop (optional, Standard: Config-Wert) */
  coinValue?: number;
  spriteKey: string;
  projectile?: EnemyProjectileDef;
  aura?: EnemyAuraDef;
  /** Path shape, default 'straight'. */
  movement?: EnemyMovement;
  /** Required for behavior 'charge'. */
  charge?: EnemyChargeDef;
  /** Required for behavior 'burrow'. */
  burrow?: EnemyBurrowDef;
  /** Status effect of the contact with the player (e.g. snake poison). */
  onHit?: StatusOnHit;
}

/** Pets (M8, PE-168, PE-170, PE-179). */
export type PetId = 'bee' | 'penguin' | 'capybara';

export type PetRole = 'sting' | 'snowball' | 'aura';

interface PetBase {
  id: PetId;
  /** German display label in capitals. */
  label: string;
}

/** Damage values are fractions of the current laser damage (PE-179). */
export interface BeeDef extends PetBase {
  role: 'sting';
  speedPxPerSec: number;
  damageFraction: number;
  stingsPerSec: number;
  /** Power-up bonus from level 1: number of extra bees. */
  extraBees: number;
}

export interface PenguinDef extends PetBase {
  role: 'snowball';
  intervalMs: number;
  damageFraction: number;
  /** Slow strength as a fraction (0.4 = 40 % slower). */
  slow: number;
  slowMs: number;
  /** Power-up bonus from level 1: snowball radius factor. */
  radiusMul: number;
}

export interface CapybaraDef extends PetBase {
  role: 'aura';
  auraRadiusPx: number;
  damageFractionPerSec: number;
  slow: number;
  healHp: number;
  healIntervalMs: number;
  /** Power-up bonus from level 1: aura radius factor. */
  auraRadiusMul: number;
}

export type PetDef = BeeDef | PenguinDef | CapybaraDef;

export interface PetRules {
  /** Share of the expected enemies of the round after which the egg hatches. */
  hatchFraction: number;
  /** Share of the expected enemies for each further power-up. */
  powerUpFraction: number;
  maxPowerUps: number;
  /** Count of a boss for the bar (in enemies). */
  bossWeight: number;
  powerUpDamageMul: number;
  powerUpSpeedMul: number;
}

export interface PetRoundState {
  phase: 'egg' | 'hatched';
  xp: number;
  xpToNext: number;
  powerUps: number;
}

/** Burn and slow on one enemy: remaining time and strength. */
export interface EnemyStatusState {
  burnMsLeft: number;
  burnDps: number;
  slowMsLeft: number;
  /** Fraction (0.4 = 40 % slower). */
  slow: number;
}

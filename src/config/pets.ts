// Pets (M8, AP-136, PE-168, PE-170, PE-179): alle Werte sind Startwerte fuer den Handtest, nur hier aendern.
// Schaden ist ein Anteil des aktuellen Laserschadens (PE-179).
import type { PetDef, PetId, PetRules } from '../contracts';

export const PET_IDS: readonly PetId[] = ['bee', 'penguin', 'capybara'];

export const PET_RULES: PetRules = {
  hatchFraction: 0.15,
  powerUpFraction: 0.25,
  maxPowerUps: 3,
  /** A boss counts 10 enemies for the bar (assumed, PE-179). */
  bossWeight: 10,
  powerUpDamageMul: 1.3,
  powerUpSpeedMul: 1.3,
};

export const PETS: readonly PetDef[] = [
  {
    id: 'bee',
    label: 'BIENE',
    role: 'sting',
    speedPxPerSec: 220,
    damageFraction: 0.4,
    stingsPerSec: 2.5,
    extraBees: 1,
  },
  {
    id: 'penguin',
    label: 'PINGUIN',
    role: 'snowball',
    intervalMs: 900,
    damageFraction: 1.2,
    slow: 0.4,
    slowMs: 1500,
    radiusMul: 1.5,
  },
  {
    id: 'capybara',
    label: 'CAPYBARA',
    role: 'aura',
    auraRadiusPx: 70,
    damageFractionPerSec: 0.5,
    slow: 0.3,
    healHp: 2,
    healIntervalMs: 10000,
    auraRadiusMul: 1.3,
  },
];

export function getPet(id: PetId): PetDef {
  const pet = PETS.find((p) => p.id === id);
  if (!pet) throw new Error(`unknown pet ${id}`);
  return pet;
}

/** Texture key of the pet sprite (naming rule for AP-140). */
export function petTextureKey(id: PetId): string {
  return `pet-${id}`;
}

/** Texture key of the egg sprite. */
export function eggTextureKey(id: PetId): string {
  return `egg-${id}`;
}

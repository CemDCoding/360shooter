import { CONTACT_HIT_SECONDS } from '../config/enemies';
import type { EnemyBehavior } from '../contracts';

/**
 * Contact hit rule (AP-112, PE-135). Pure logic, no Phaser.
 * Chasers, chargers and burrowers hit the player once and vanish. Aura enemies and shooters keep their
 * ongoing contact damage per second (Q-57). Bosses and boss parts are not enemies here.
 */
export function dealsContactHit(behavior: EnemyBehavior, contactDamage: number): boolean {
  if (!Number.isFinite(contactDamage) || contactDamage <= 0) return false;
  return behavior === 'chase' || behavior === 'charge' || behavior === 'burrow';
}

/** Damage of the single contact hit: contactDamage times seconds. Invalid input gives 0. */
export function contactHitDamage(contactDamage: number, seconds = CONTACT_HIT_SECONDS): number {
  if (!Number.isFinite(contactDamage) || contactDamage <= 0) return 0;
  if (!Number.isFinite(seconds) || seconds <= 0) return 0;
  return contactDamage * seconds;
}

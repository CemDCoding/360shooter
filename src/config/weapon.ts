// Balancing (AP-15), Erklaerung in docs/balancing.md.
import type { WeaponStats } from '../contracts';

export const WEAPON_BASE: WeaponStats = {
  fireRatePerSec: 3,
  damage: 10,
  projectileScale: 1,
  projectileSpeed: 400,
  range: 360,
};

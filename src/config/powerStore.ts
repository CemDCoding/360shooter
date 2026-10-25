import type { StorablePowerDef } from '../contracts/powerStore';

/**
 * Timed powers that go into the storage slot instead of starting on pickup (PE-70).
 * To add another timed power: add an entry here (id must exist in ITEMS for
 * kind 'item' with durationMs > 0, or in ARMOURS for kind 'armour'). Data only.
 */
export const STORABLE_POWERS: readonly StorablePowerDef[] = [
  { id: 'rapidFire', kind: 'item', label: 'Dauerfeuer' },
  { id: 'fire-ring', kind: 'armour', label: 'Feuerring' },
];

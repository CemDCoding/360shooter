import type { UpgradeLevels } from './upgrade';
import type { EquippedGear } from './gear';
import type { PetId } from './pet';

export interface SaveGame {
  version: 1 | 2 | 3;
  playerXp: number;
  playerLevel: number;
  highestUnlockedLevel: number;
  muted: boolean;
  /** Ab Version 2; optional, damit Staende der Version 1 gueltig bleiben. */
  gold?: number;
  /** Ab Version 2; optional wie gold. */
  upgrades?: UpgradeLevels;
  /** Ab Version 3; optional wie gold. Diamanten (nur Spielwaehrung, PE-177). */
  diamonds?: number;
  /** Ab Version 3; optional wie gold. Level-IDs mit erstem Sieg. */
  wonLevels?: number[];
  /** Ab Version 3; optional wie gold. Ids gekaufter Shop-Artikel. */
  owned?: string[];
  /** Ab Version 3; optional wie gold. */
  equippedGear?: EquippedGear;
  /** Ab Version 3; optional wie gold. */
  activePet?: PetId | null;
  /** Ab Version 3; optional wie gold. Pet-Ruestung je Pet. */
  petGear?: Partial<Record<PetId, string | null>>;
}

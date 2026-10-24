import type { UpgradeLevels } from './upgrade';

export interface SaveGame {
  version: 1 | 2;
  playerXp: number;
  playerLevel: number;
  highestUnlockedLevel: number;
  muted: boolean;
  /** Ab Version 2; optional, damit Staende der Version 1 gueltig bleiben. */
  gold?: number;
  /** Ab Version 2; optional wie gold. */
  upgrades?: UpgradeLevels;
}

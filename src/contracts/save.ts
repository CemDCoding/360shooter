export interface SaveGame {
  version: 1;
  playerXp: number;
  playerLevel: number;
  highestUnlockedLevel: number;
  muted: boolean;
}

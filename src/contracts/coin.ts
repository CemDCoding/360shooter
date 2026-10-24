export interface CoinRules {
  /** Wahrscheinlichkeit 0..1, dass ein besiegter Gegner eine Muenze fallen laesst */
  dropChance: number;
  magnetRadiusPx: number;
  collectRadiusPx: number;
  magnetSpeedPxPerSec: number;
}

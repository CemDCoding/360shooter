// Muenzen (AP-27), Startwerte PE-39 bis PE-43, kalibriert in AP-35, nachgezogen in AP-56 (Gold-Mittel ca. 45 je Level).
import type { CoinRules } from '../contracts';

export const COIN_RULES: CoinRules = {
  dropChance: 0.045,
  magnetRadiusPx: 400,
  collectRadiusPx: 12,
  magnetSpeedPxPerSec: 320,
};

/** Ab diesem Wert wird die grosse Muenze gezeigt */
export const BIG_COIN_MIN_VALUE = 5;
/** Anteil des Goldes, der nach einem Sieg behalten wird */
export const GOLD_KEEP_ON_WIN = 1;
/** Anteil des Goldes, der nach einer Niederlage behalten wird */
export const GOLD_KEEP_ON_LOSS = 0.5;

// Muenzen (AP-27), Startwerte PE-39 bis PE-43, kalibriert in AP-35, nachgezogen in AP-56 (Gold-Mittel ca. 45 je Level).
import type { CoinRules } from '../contracts';

export const COIN_RULES: CoinRules = {
  dropChance: 0.08, // 8 % (Nutzerentscheid, Q-42, AP-70; vorher 4,5 %)
  magnetRadiusPx: 400,
  collectRadiusPx: 12,
  magnetSpeedPxPerSec: 320,
};

/** Sanfter Magnet-Einflug (AP-64, Q-36): Balancing, Startwerte angenommen (PE-72). Hoechstgeschwindigkeit: COIN_RULES.magnetSpeedPxPerSec */
export const COIN_MAGNET_EASE = {
  startSpeedPxPerSec: 60,
  rampMs: 600,
};

/** Ab diesem Wert wird die grosse Muenze gezeigt */
export const BIG_COIN_MIN_VALUE = 4;
/** Anteil des Goldes, der nach einem Sieg behalten wird */
export const GOLD_KEEP_ON_WIN = 1;
/** Anteil des Goldes, der nach einer Niederlage behalten wird */
export const GOLD_KEEP_ON_LOSS = 0.5;

/**
 * Darstellung der Muenze in der Runde (AP-70, PE-78, Q-40): reine Optik, Logik und Einsammelradius bleiben.
 * Startwerte angenommen, Sichtpruefung H-15. Die Platzhalter-Sprites sind nicht goldfarben (H-13), darum
 * hebt eine helle Umrandung die Muenze ab. Farbe nur ueber den Token aus theme.ts.
 * - smallDisplayScale / bigDisplayScale: Anzeigegroesse, nur ganzzahlig (Pixelraster, Brief-Grundsatz 3); klein (coin-field) 6 px auf 12 (Skalierung 2), gross (coin-big) 12 px auf 12 (Skalierung 1; H-25, PE-121). Beide Muenzen sind damit 12 px gross. Die Menue-Symbole (coin-small, 8 px, Skalierung 2) bleiben 16 px.
 * - depth: ueber Gegnern (0) und Hintergrund samt Gluehwuermchen (-100), unter Boss-Gefahren (1,5 bis 2: Telegraph 1, Stacheln/Orbs 2), Items (5) und Spielerin (10).
 * - outlinePx: Staerke der Umrandung in ganzen Bildschirm-Pixeln (vier versetzte Kopien je Muenze, im Pool).
 */
export const COIN_VISUAL = {
  smallDisplayScale: 2,
  bigDisplayScale: 1,
  depth: 1.7,
  outlinePx: 2,
  outlineColorToken: 'game.hit-flash',
} as const;

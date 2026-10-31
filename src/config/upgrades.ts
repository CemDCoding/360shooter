// Upgrades (AP-27), Startwerte PE-39 bis PE-43, Feintuning in AP-35, Stufen 11 bis 15 in AP-105.
import type { UpgradeTrack } from '../contracts';

export interface UpgradeDef {
  label: string;
  /** Zuwachs je Stufe, additiv aufsummiert (Logik: 1 + perLevel * Stufe bei multiplicative, sonst Basis + perLevel * Stufe) */
  mode: 'multiplicative' | 'additive';
  perLevel: number;
}

export const UPGRADES: Readonly<Record<UpgradeTrack, UpgradeDef>> = {
  weaponFireRate: { label: 'Feuerrate', mode: 'multiplicative', perLevel: 0.1 },
  weaponDamage: { label: 'Schaden', mode: 'multiplicative', perLevel: 0.1 },
  playerMaxHp: { label: 'Lebenspunkte', mode: 'additive', perLevel: 10 },
  playerTurnSpeed: { label: 'Drehgeschwindigkeit', mode: 'additive', perLevel: 15 },
};

/**
 * Preis Stufe k auf k+1 = round(COST_BASE * COST_GROWTH^k), k = 0 bis MAX_UPGRADE_LEVEL - 1.
 * Stufen 11 bis 15 (AP-105, PE-129) nutzen dieselbe Formel: 289, 405, 567, 794, 1111 Gold, Stufe 15 kostet je Spur 3864.
 * Die Wirkung je Stufe bleibt gleich (Stufe 15 = +150 % Feuerrate und Schaden, +150 Leben, +225 Grad/s).
 */
export const COST_BASE = 10;
export const COST_GROWTH = 1.4;

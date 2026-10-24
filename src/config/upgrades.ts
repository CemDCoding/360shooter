// Upgrades (AP-27), Startwerte PE-39 bis PE-43, Feintuning in AP-35.
import type { UpgradeTrack } from '../contracts';

export interface UpgradeDef {
  label: string;
  /** Effekt je Stufe: multiplikativ (Faktor je Stufe) oder additiv */
  mode: 'multiplicative' | 'additive';
  perLevel: number;
}

export const UPGRADES: Readonly<Record<UpgradeTrack, UpgradeDef>> = {
  weaponFireRate: { label: 'Feuerrate', mode: 'multiplicative', perLevel: 0.1 },
  weaponDamage: { label: 'Schaden', mode: 'multiplicative', perLevel: 0.1 },
  playerMaxHp: { label: 'Lebenspunkte', mode: 'additive', perLevel: 10 },
  playerTurnSpeed: { label: 'Drehgeschwindigkeit', mode: 'additive', perLevel: 15 },
};

/** Preis Stufe k auf k+1 = round(COST_BASE * COST_GROWTH^k) */
export const COST_BASE = 10;
export const COST_GROWTH = 1.4;

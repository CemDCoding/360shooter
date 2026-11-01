export interface WeaponStats {
  fireRatePerSec: number;
  damage: number;
  projectileScale: number;
  projectileSpeed: number;
  range: number;
  /** Schuesse pro Salve, Standard 1 (optional, damit bestehende Configs gueltig bleiben) */
  shotCount?: number;
}

/** Aktive Item-Effekte der laufenden Runde */
export interface ActivePowers {
  /** 0 = aus, 1..2 = Stufe */
  doubleShotStage: number;
  /** Verbleibende Schadenspunkte, die der Schild abfaengt */
  shieldLeft: number;
  rapidFireMsLeft: number;
  /** Restzeit der aktuellen Doppelschuss-Stufe in ms, 0 = aus (M7, PE-156) */
  doubleShotMsLeft: number;
}

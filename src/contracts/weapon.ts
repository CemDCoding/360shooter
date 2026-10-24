export interface WeaponStats {
  fireRatePerSec: number;
  damage: number;
  projectileScale: number;
  projectileSpeed: number;
  range: number;
  /** Schuesse pro Salve, Standard 1 (optional, damit bestehende Configs gueltig bleiben) */
  shotCount?: number;
}

export interface WeaponStacks {
  fireRate: number;
  damage: number;
  size: number;
}

/** Aktive Item-Effekte der laufenden Runde */
export interface ActivePowers {
  /** 0 = aus, 1..2 = Stufe */
  doubleShotStage: number;
  /** Verbleibende Schadenspunkte, die der Schild abfaengt */
  shieldLeft: number;
  rapidFireMsLeft: number;
}

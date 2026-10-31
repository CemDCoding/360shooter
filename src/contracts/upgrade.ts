export type UpgradeTrack = 'weaponFireRate' | 'weaponDamage' | 'playerMaxHp' | 'playerTurnSpeed';

/** Gekaufte Stufe je Spur, ganze Zahl 0..MAX_UPGRADE_LEVEL */
export type UpgradeLevels = Record<UpgradeTrack, number>;

export const MAX_UPGRADE_LEVEL = 15;

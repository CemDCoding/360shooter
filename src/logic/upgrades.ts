// Upgrades (AP-29): einzige Preisfunktion, Kauf und Faktoren. Reine Funktionen.
import type { SaveGame, UpgradeLevels, UpgradeTrack } from '../contracts';
import { MAX_UPGRADE_LEVEL } from '../contracts';
import { PLAYER } from '../config/player';
import { COST_BASE, COST_GROWTH, UPGRADES } from '../config/upgrades';

export interface UpgradeFactors {
  weaponFireRateMult: number;
  weaponDamageMult: number;
  playerMaxHp: number;
  playerTurnSpeedDegPerSec: number;
}

function zeroLevels(): UpgradeLevels {
  return { weaponFireRate: 0, weaponDamage: 0, playerMaxHp: 0, playerTurnSpeed: 0 };
}

/** Preis von Stufe `level` auf `level + 1`; null auf Maximalstufe oder bei ungueltiger Stufe. */
export function upgradeCost(_track: UpgradeTrack, level: number): number | null {
  if (!Number.isInteger(level) || level < 0 || level >= MAX_UPGRADE_LEVEL) return null;
  return Math.round(COST_BASE * COST_GROWTH ** level);
}

/** Kauft eine Stufe; null bei zu wenig Gold oder Maximalstufe. Der Eingang bleibt unveraendert. */
export function buyUpgrade(save: SaveGame, track: UpgradeTrack): SaveGame | null {
  const levels = save.upgrades ?? zeroLevels();
  const cost = upgradeCost(track, levels[track]);
  const gold = save.gold ?? 0;
  if (cost === null || gold < cost) return null;
  return {
    ...save,
    gold: gold - cost,
    upgrades: { ...levels, [track]: levels[track] + 1 },
  };
}

function effect(track: UpgradeTrack, level: number): number {
  return UPGRADES[track].perLevel * level;
}

/** Wirkung der Stufen als Parameter fuer Waffe und Spielerin (PE-41: +10 % je Stufe, additiv aufsummiert). */
export function upgradeFactors(levels: UpgradeLevels): UpgradeFactors {
  const mult = (track: UpgradeTrack): number =>
    UPGRADES[track].mode === 'multiplicative' ? 1 + effect(track, levels[track]) : 1;
  return {
    weaponFireRateMult: mult('weaponFireRate'),
    weaponDamageMult: mult('weaponDamage'),
    playerMaxHp: PLAYER.maxHp + effect('playerMaxHp', levels.playerMaxHp),
    playerTurnSpeedDegPerSec:
      PLAYER.turnSpeedDegPerSec + effect('playerTurnSpeed', levels.playerTurnSpeed),
  };
}

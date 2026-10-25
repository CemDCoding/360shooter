// Reine Waffen-Geometrie (AP-50): Ausbaustufe, Spiegeln, Handpunkt, Mündung, Tiefe. Ohne Phaser.
import type { UpgradeLevels } from '../contracts';
import { WEAPON_MOUNT } from '../config/weaponMount';

export interface Point {
  x: number;
  y: number;
}

/** Winkel in Grad auf (-180, 180] normieren. */
function normalizeDeg(angleDeg: number): number {
  const a = ((((angleDeg + 180) % 360) + 360) % 360) - 180;
  return a === -180 ? 180 : a;
}

/** Ausbaustufe 0..2 aus der Summe der beiden Waffen-Spuren (0–6, 7–13, 14–20). */
export function weaponStageForUpgrades(
  levels: Pick<UpgradeLevels, 'weaponFireRate' | 'weaponDamage'>,
): number {
  const sum = levels.weaponFireRate + levels.weaponDamage;
  const limits = WEAPON_MOUNT.stageMaxUpgrades;
  for (let stage = 0; stage < limits.length - 1; stage++) {
    if (sum <= limits[stage]) return stage;
  }
  return limits.length - 1;
}

/** Figur spiegelt (und Waffe bekommt flipY), wenn der Betrag des Zielwinkels größer als 90° ist. */
export function faceLeft(angleDeg: number): boolean {
  return Math.abs(normalizeDeg(angleDeg)) > 90;
}

/** Handpunkt in Weltkoordinaten; gespiegelt wird die x-Verschiebung negiert. */
export function handPoint(centerX: number, centerY: number, faceLeftNow: boolean): Point {
  const dx = faceLeftNow ? -WEAPON_MOUNT.hand.x : WEAPON_MOUNT.hand.x;
  return { x: centerX + dx, y: centerY + WEAPON_MOUNT.hand.y };
}

/** Mündung in Weltkoordinaten: Offset vom Griff, bei flipY in y negiert, um den Griff mitrotiert. */
export function muzzlePoint(
  handX: number,
  handY: number,
  angleDeg: number,
  faceLeftNow: boolean,
): Point {
  const ox = WEAPON_MOUNT.muzzle.x;
  const oy = faceLeftNow ? -WEAPON_MOUNT.muzzle.y : WEAPON_MOUNT.muzzle.y;
  const rad = (angleDeg * Math.PI) / 180;
  const cos = Math.cos(rad);
  const sin = Math.sin(rad);
  return { x: handX + ox * cos - oy * sin, y: handY + ox * sin + oy * cos };
}

/** Waffe liegt hinter der Figur beim Zielen nach oben (-160° bis -20°). */
export function weaponBehindFigure(angleDeg: number): boolean {
  const a = normalizeDeg(angleDeg);
  return a >= WEAPON_MOUNT.behindFigureDeg.from && a <= WEAPON_MOUNT.behindFigureDeg.to;
}

/** Frame-Index im Waffen-Sheet: stage 0..2, frameInStage 0 = Ruhe, 1 = Schuss. */
export function weaponFrame(stage: number, frameInStage: number): number {
  return stage * WEAPON_MOUNT.framesPerStage + frameInStage;
}

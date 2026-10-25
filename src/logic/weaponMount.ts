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

/**
 * Bewegt den Spiegelwert linear von current zu target (±1). Der Weg von -1 nach +1 dauert
 * durationMs; kein Überschwingen. durationMs <= 0 springt sofort, dtMs <= 0 ändert nichts.
 */
export function stepMirror(
  current: number,
  target: number,
  dtMs: number,
  durationMs: number,
): number {
  if (durationMs <= 0) return target;
  if (dtMs <= 0) return current;
  const step = (2 * dtMs) / durationMs;
  if (current < target) return Math.min(target, current + step);
  return Math.max(target, current - step);
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

export interface WeaponPose {
  /** Handpunkt = Position des Waffen-Sprites (Drehpunkt = Griff). */
  hand: Point;
  /** Drehung des Waffen-Sprites in Grad. */
  rotationDeg: number;
  /** true, wenn die Waffe vertikal gespiegelt gezeichnet wird (mirror < 0). */
  flipY: boolean;
  /** Waffe hinter der Figur zeichnen. */
  behind: boolean;
  /** Mündung in Weltkoordinaten (Start der Laser). */
  muzzle: Point;
}

/**
 * Eine Quelle für Waffen-Sprite und Laser-Start. mirror = +1 (Figur schaut nach rechts) oder -1
 * (gespiegelt), Zwischenwerte in [-1, 1] sind erlaubt.
 *
 * Annahme: Der Griff bleibt beim Spiegeln am Handpunkt, die Waffe wird um den Griff vertikal
 * gespiegelt (Skalierung (1, mirror) um den Origin). Phaser-`flipY` erfüllt das NICHT: es spiegelt
 * bei Origin != Framemitte um die Framemitte (MultiPipeline: y += -realHeight + 2*originY), der
 * Griff wandert um (frameHeight - 2*grip.y) = -8 px. Der Sprite muss daher mit setScale(1, ±1)
 * statt setFlipY gezeichnet werden.
 */
export function weaponPose(
  centerX: number,
  centerY: number,
  facingDeg: number,
  mirror: number,
): WeaponPose {
  const hand = { x: centerX + WEAPON_MOUNT.hand.x * mirror, y: centerY + WEAPON_MOUNT.hand.y };
  const ox = WEAPON_MOUNT.muzzle.x;
  const oy = WEAPON_MOUNT.muzzle.y * mirror;
  const rad = (facingDeg * Math.PI) / 180;
  const cos = Math.cos(rad);
  const sin = Math.sin(rad);
  return {
    hand,
    rotationDeg: facingDeg,
    flipY: mirror < 0,
    behind: weaponBehindFigure(facingDeg),
    muzzle: { x: hand.x + ox * cos - oy * sin, y: hand.y + ox * sin + oy * cos },
  };
}

/** Frame-Index im Waffen-Sheet: stage 0..2, frameInStage 0 = Ruhe, 1 = Schuss. */
export function weaponFrame(stage: number, frameInStage: number): number {
  return stage * WEAPON_MOUNT.framesPerStage + frameInStage;
}

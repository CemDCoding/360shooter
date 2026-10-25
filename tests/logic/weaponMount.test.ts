import { describe, expect, it } from 'vitest';
import {
  faceLeft,
  handPoint,
  muzzlePoint,
  weaponBehindFigure,
  weaponFrame,
  weaponPose,
  weaponStageForUpgrades,
} from '../../src/logic/weaponMount';
import { WEAPON_MOUNT } from '../../src/config/weaponMount';

const lv = (weaponFireRate: number, weaponDamage: number) => ({ weaponFireRate, weaponDamage });

describe('weaponStageForUpgrades', () => {
  it('uses the sum of both weapon tracks with limits 6/7 and 13/14', () => {
    expect(weaponStageForUpgrades(lv(0, 0))).toBe(0);
    expect(weaponStageForUpgrades(lv(3, 3))).toBe(0);
    expect(weaponStageForUpgrades(lv(4, 3))).toBe(1);
    expect(weaponStageForUpgrades(lv(7, 6))).toBe(1);
    expect(weaponStageForUpgrades(lv(7, 7))).toBe(2);
    expect(weaponStageForUpgrades(lv(10, 10))).toBe(2);
  });
});

describe('faceLeft', () => {
  it('flips only beyond 90 degrees', () => {
    expect(faceLeft(0)).toBe(false);
    expect(faceLeft(90)).toBe(false);
    expect(faceLeft(-90)).toBe(false);
    expect(faceLeft(90.5)).toBe(true);
    expect(faceLeft(-91)).toBe(true);
    expect(faceLeft(180)).toBe(true);
    expect(faceLeft(270)).toBe(false);
  });
});

describe('handPoint', () => {
  it('sits +10 | +9 from the centre, mirrored -10', () => {
    expect(handPoint(100, 50, false)).toEqual({ x: 110, y: 59 });
    expect(handPoint(100, 50, true)).toEqual({ x: 90, y: 59 });
  });
});

describe('muzzlePoint', () => {
  const near = (p: { x: number; y: number }, x: number, y: number): void => {
    expect(p.x).toBeCloseTo(x, 6);
    expect(p.y).toBeCloseTo(y, 6);
  };
  it('is +15 | -5 from the grip at 0 degrees', () => {
    near(muzzlePoint(100, 100, 0, false), 115, 95);
  });
  it('rotates with the weapon when aiming down (90) and up (-90)', () => {
    near(muzzlePoint(100, 100, 90, false), 105, 115);
    near(muzzlePoint(100, 100, -90, false), 95, 85);
  });
  it('accounts for flipY when aiming left (180)', () => {
    near(muzzlePoint(100, 100, 180, true), 85, 95);
  });
});

describe('weaponBehindFigure', () => {
  it('is behind from -160 to -20 degrees only', () => {
    expect(weaponBehindFigure(-90)).toBe(true);
    expect(weaponBehindFigure(-20)).toBe(true);
    expect(weaponBehindFigure(-160)).toBe(true);
    expect(weaponBehindFigure(-19)).toBe(false);
    expect(weaponBehindFigure(-161)).toBe(false);
    expect(weaponBehindFigure(0)).toBe(false);
    expect(weaponBehindFigure(90)).toBe(false);
    expect(weaponBehindFigure(200)).toBe(true);
  });
});

describe('weaponFrame', () => {
  it('maps stage and frame to 0..5', () => {
    expect(weaponFrame(0, 0)).toBe(0);
    expect(weaponFrame(0, 1)).toBe(1);
    expect(weaponFrame(1, 0)).toBe(2);
    expect(weaponFrame(2, 1)).toBe(5);
  });
});

describe('weaponPose (AP-58)', () => {
  const CX = 100;
  const CY = 200;
  const ANGLES = [0, 45, -45, 90, -90, 135, -135, 180];
  const rad = (d: number) => (d * Math.PI) / 180;
  const mirrorFor = (deg: number) => (faceLeft(deg) ? -1 : 1);
  const DIST = Math.sqrt(15 ** 2 + 5 ** 2);

  it('keeps a constant muzzle distance and at least 15 px forward projection', () => {
    for (const a of ANGLES) {
      const p = weaponPose(CX, CY, a, mirrorFor(a));
      const dx = p.muzzle.x - p.hand.x;
      const dy = p.muzzle.y - p.hand.y;
      expect(Math.hypot(dx, dy)).toBeCloseTo(DIST, 6);
      expect(dx * Math.cos(rad(a)) + dy * Math.sin(rad(a))).toBeGreaterThanOrEqual(15 - 1e-6);
    }
  });

  it('is mirror-symmetric: muzzle at 180-theta mirrors the muzzle at theta', () => {
    for (const t of [0, 45, -45, 90, -90]) {
      const right = weaponPose(CX, CY, t, 1).muzzle;
      const leftAngle = 180 - t;
      const left = weaponPose(CX, CY, leftAngle, -1).muzzle;
      expect(left.x).toBeCloseTo(2 * CX - right.x, 6);
      expect(left.y).toBeCloseTo(right.y, 6);
    }
  });

  it('puts the muzzle outside the half figure width (16 px) at 0 and 180 degrees', () => {
    expect(weaponPose(CX, CY, 0, 1).muzzle.x - CX).toBeGreaterThanOrEqual(24);
    expect(CX - weaponPose(CX, CY, 180, -1).muzzle.x).toBeGreaterThanOrEqual(24);
  });

  it('puts the hand at the centre for mirror = 0 and mirrors it for -1', () => {
    expect(weaponPose(CX, CY, 0, 0).hand.x).toBe(CX);
    expect(weaponPose(CX, CY, 180, -1).hand.x).toBe(CX - WEAPON_MOUNT.hand.x);
    expect(weaponPose(CX, CY, 180, -1).flipY).toBe(true);
    expect(weaponPose(CX, CY, 0, 1).flipY).toBe(false);
  });

  // Gegenprobe, unabhaengig von der Formel: Frame-Pixel der Muendung (Rohr endet in
  // weapon-raygun.png bei x=22..23, Zeilen 6..7) und des Griffs durch die explizite Matrix
  // T(hand) * R(facing) * S(1, mirror) * T(-grip).
  function viaMatrix(
    pixel: { x: number; y: number },
    a: number,
    mirror: number,
    hand: { x: number; y: number },
  ) {
    const px = pixel.x - WEAPON_MOUNT.grip.x;
    const py = (pixel.y - WEAPON_MOUNT.grip.y) * mirror;
    const c = Math.cos(rad(a));
    const s = Math.sin(rad(a));
    return { x: hand.x + c * px - s * py, y: hand.y + s * px + c * py };
  }

  it('matches the explicit matrix for the muzzle pixel and the grip, right and left', () => {
    const muzzlePixel = { x: 22, y: 7 };
    for (const a of ANGLES) {
      const m = mirrorFor(a);
      const p = weaponPose(CX, CY, a, m);
      const mz = viaMatrix(muzzlePixel, a, m, p.hand);
      expect(Math.abs(mz.x - p.muzzle.x)).toBeLessThanOrEqual(0.5);
      expect(Math.abs(mz.y - p.muzzle.y)).toBeLessThanOrEqual(0.5);
      const grip = viaMatrix(WEAPON_MOUNT.grip, a, m, p.hand);
      expect(grip.x).toBeCloseTo(p.hand.x, 6);
      expect(grip.y).toBeCloseTo(p.hand.y, 6);
    }
  });
});

import { describe, expect, it } from 'vitest';
import {
  faceLeft,
  handPoint,
  muzzlePoint,
  weaponBehindFigure,
  weaponFrame,
  weaponStageForUpgrades,
} from '../../src/logic/weaponMount';

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

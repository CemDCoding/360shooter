import { describe, expect, it } from 'vitest';
import {
  armourDisplay,
  energyRatio,
  energySegments,
  formatTime,
  funkCase,
  isEnergyLow,
  isTimerWarning,
  layoutRow,
  secondsLeft,
  secondsText,
  shieldRatio,
} from '../../src/scenes/hud/hudMath';

describe('hudMath', () => {
  it('rounds seconds up and guards invalid input', () => {
    expect(secondsLeft(4100)).toBe(5);
    expect(secondsLeft(0)).toBe(0);
    expect(secondsLeft(-5)).toBe(0);
    expect(secondsLeft(NaN)).toBe(0);
  });

  it('computes shield ratio against the cap', () => {
    expect(shieldRatio(90, 60, 3)).toBeCloseTo(0.5);
    expect(shieldRatio(500, 60, 3)).toBe(1);
    expect(shieldRatio(-1, 60, 3)).toBe(0);
    expect(shieldRatio(10, 0, 3)).toBe(0);
  });

  it('shows armour active, then cooldown, then hidden', () => {
    expect(armourDisplay({ id: null, activeMsLeft: 0, cooldownMsLeft: 0 }).phase).toBe('hidden');
    expect(armourDisplay({ id: 'fire-ring', activeMsLeft: 1500, cooldownMsLeft: 8000 })).toEqual({
      phase: 'active',
      sec: 2,
    });
    expect(armourDisplay({ id: 'fire-ring', activeMsLeft: 0, cooldownMsLeft: 3000 })).toEqual({
      phase: 'cooldown',
      sec: 3,
    });
    expect(armourDisplay({ id: 'fire-ring', activeMsLeft: 0, cooldownMsLeft: 0 }).phase).toBe('hidden');
  });

  it('builds ten energy segments for 0, 25 and 100 percent', () => {
    expect(energySegments(0, 10).every((s) => s === 'off')).toBe(true);
    expect(energySegments(1, 10).every((s) => s === 'full')).toBe(true);
    const q = energySegments(0.25, 10);
    expect(q.filter((s) => s === 'full')).toHaveLength(2);
    expect(q[2]).toBe('half');
    expect(q.slice(3).every((s) => s === 'off')).toBe(true);
    expect(energySegments(NaN, 10)).toHaveLength(10);
  });

  it('flags low energy at 25 percent or less and timer below 10 seconds', () => {
    expect(isEnergyLow(energyRatio(25, 100))).toBe(true);
    expect(isEnergyLow(energyRatio(26, 100))).toBe(false);
    expect(energyRatio(5, 0)).toBe(0);
    expect(isTimerWarning(9)).toBe(true);
    expect(isTimerWarning(10)).toBe(false);
    expect(isTimerWarning(0)).toBe(false);
  });

  it('formats time and seconds text with the small s', () => {
    expect(formatTime(102)).toBe('1:42');
    expect(formatTime(-3)).toBe('0:00');
    expect(secondsText(4)).toBe('4s');
    expect(secondsText(NaN)).toBe('0s');
  });

  it('prepares Funk text: upper case, small s only after digits, no sharp s', () => {
    expect(funkCase('4s')).toBe('4s');
    expect(funkCase('Münzen')).toBe('MÜNZEN');
    expect(funkCase('Straße')).toBe('STRASSE');
    expect(funkCase('5s Dauerfeuer')).toBe('5s DAUERFEUER');
    expect(funkCase('3 sekunden')).toBe('3 SEKUNDEN');
  });

  it('lays chips out left to right and skips hidden ones', () => {
    expect(layoutRow([20, null, 30, 10], 4, 8)).toEqual([8, null, 32, 66]);
  });
});

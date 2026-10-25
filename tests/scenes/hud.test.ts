import { describe, expect, it } from 'vitest';
import { armourDisplay, secondsLeft, shieldRatio } from '../../src/scenes/hud/hudMath';

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
});

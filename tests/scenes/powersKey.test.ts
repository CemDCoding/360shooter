import { describe, expect, it } from 'vitest';
import { DOUBLE_SHOT_STAGE_MS } from '../../src/config/items';
import type { ActivePowers } from '../../src/contracts';
import { hudSeconds, powersKey } from '../../src/scenes/hud/hudMath';

const powers = (over: Partial<ActivePowers> = {}): ActivePowers => ({
  doubleShotStage: 1,
  doubleShotMsLeft: DOUBLE_SHOT_STAGE_MS,
  shieldLeft: 0,
  rapidFireMsLeft: 0,
  ...over,
});
const key = (ms: number): string => powersKey(powers({ doubleShotMsLeft: ms }));

describe('hudSeconds', () => {
  it('rounds up and is 0 for non-positive input', () => {
    expect(hudSeconds(1)).toBe(1);
    expect(hudSeconds(1000)).toBe(1);
    expect(hudSeconds(1001)).toBe(2);
    expect(hudSeconds(0)).toBe(0);
    expect(hudSeconds(-5)).toBe(0);
  });
});

describe('powersKey (AP-146, PE-184)', () => {
  it('changes exactly when the double shot time passes below 5000 ms (not earlier, not later)', () => {
    expect(key(5400)).toBe(key(5001));
    expect(key(5000)).not.toBe(key(4999));
  });

  it('does not change within the same second below the warning threshold', () => {
    expect(key(4999)).toBe(key(4500));
    expect(key(4999)).toBe(key(4001));
  });

  it('still changes with the shown second', () => {
    expect(key(4001)).not.toBe(key(4000));
  });

  it('has no warning at stage 0', () => {
    const a = powersKey(powers({ doubleShotStage: 0, doubleShotMsLeft: 0 }));
    expect(a.split('|')[2]).toBe('0');
  });

  it('keeps rapid fire seconds and shield in the key', () => {
    const base = powers();
    expect(powersKey(powers({ rapidFireMsLeft: 3000 }))).not.toBe(powersKey(base));
    expect(powersKey(powers({ rapidFireMsLeft: 2500 }))).toBe(
      powersKey(powers({ rapidFireMsLeft: 2001 })),
    );
    expect(powersKey(powers({ shieldLeft: 10 }))).not.toBe(powersKey(base));
    expect(powersKey(powers({ shieldLeft: 10 }))).toContain('|10|');
  });
});

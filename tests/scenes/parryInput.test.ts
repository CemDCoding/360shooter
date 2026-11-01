import { describe, expect, it, vi } from 'vitest';

// input.ts imports Phaser only for the AimInput class; the routing rule is a pure function.
vi.mock('phaser', () => ({ default: { Scenes: { Events: { SHUTDOWN: 'shutdown' } } } }));

const { routePointer } = await import('../../src/platform/input');

const base = { down: true, onStick: false, stickHeld: false, heldOnCircle: false };

// AP-133: a tap or click is checked against the open quicktime circles first; a hit is used up and does not aim.
describe('routePointer (circle before aiming)', () => {
  it('a press on a circle is used up and does not aim', () => {
    expect(routePointer(base, () => true)).toBe('parry');
  });

  it('a press next to the circles aims as before', () => {
    expect(routePointer(base, () => false)).toBe('aim');
  });

  it('a mouse move never presses a circle (only the press counts)', () => {
    const claim = vi.fn(() => true);
    expect(routePointer({ ...base, down: false }, claim)).toBe('aim');
    expect(claim).not.toHaveBeenCalled();
  });

  it('after a circle press the same pointer does not aim until it is released', () => {
    expect(routePointer({ ...base, down: false, heldOnCircle: true }, () => false)).toBe('held');
  });

  it('the stick keeps priority and never presses a circle', () => {
    const claim = vi.fn(() => true);
    expect(routePointer({ ...base, onStick: true }, claim)).toBe('stick');
    expect(claim).not.toHaveBeenCalled();
  });

  it('while the stick is held another finger may press a circle but never aims', () => {
    expect(routePointer({ ...base, stickHeld: true }, () => true)).toBe('parry');
    expect(routePointer({ ...base, stickHeld: true }, () => false)).toBe('ignore');
    expect(routePointer({ ...base, down: false, stickHeld: true }, () => false)).toBe('ignore');
  });
});

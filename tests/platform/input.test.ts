import { describe, expect, it, vi } from 'vitest';

// input.ts imports Phaser only for the AimInput class; pointer bookkeeping and routing are pure.
vi.mock('phaser', () => ({
  default: { Scenes: { Events: { SHUTDOWN: 'shutdown', RESUME: 'resume' } } },
}));

const { CirclePointers, routePointer, routePointerUp } = await import('../../src/platform/input');

const base = { down: true, onStick: false, stickHeld: false, heldOnCircle: false };

// AP-151: each pointer keeps its own circle (hold, drag) until it goes up; the stick finger is never one of them.
describe('CirclePointers', () => {
  it('claims, frees and reports pointers', () => {
    const p = new CirclePointers();
    p.claim(2);
    p.claim(3);
    expect(p.has(2)).toBe(true);
    expect(p.size).toBe(2);
    expect(routePointerUp(2, p)).toBe('release');
    expect(routePointerUp(2, p)).toBe('none');
    expect(routePointerUp(9, p)).toBe('none');
    expect(p.size).toBe(1);
  });

  it('after a pause, pointers that went up are dropped for cancel, held ones stay', () => {
    const p = new CirclePointers();
    p.claim(1);
    p.claim(2);
    expect(p.dropReleased((id) => id === 2)).toEqual([1]);
    expect(p.has(2)).toBe(true);
    p.clear();
    expect(p.size).toBe(0);
  });
});

describe('routePointer with M9 hold and drag', () => {
  it('second finger: stick held, a press on a circle still goes to the circle', () => {
    expect(routePointer({ ...base, stickHeld: true }, () => true)).toBe('parry');
  });

  it('the moves of a holding pointer stay with its circle, also over the stick area', () => {
    expect(routePointer({ ...base, down: false, heldOnCircle: true }, () => false)).toBe('held');
    expect(
      routePointer(
        { ...base, down: false, heldOnCircle: true, onStick: true, stickHeld: true },
        () => false,
      ),
    ).toBe('held');
  });

  it('the stick finger never presses a circle', () => {
    const claim = vi.fn(() => true);
    expect(routePointer({ ...base, onStick: true }, claim)).toBe('stick');
    expect(claim).not.toHaveBeenCalled();
  });

  it('a pointer without a circle aims, or is ignored while the stick is held', () => {
    expect(routePointer({ ...base, down: false }, () => false)).toBe('aim');
    expect(routePointer({ ...base, down: false, stickHeld: true }, () => false)).toBe('ignore');
  });
});

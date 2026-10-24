import { describe, expect, it } from 'vitest';
import { pointerAngleWhileStick, resolveAim } from '../../src/logic/aimSource';

describe('resolveAim', () => {
  it('stick held beats tap and mouse', () => {
    expect(
      resolveAim({ stickHeld: true, stickAngleRad: 1, pointerAngleRad: 2, lastAngleRad: 3 }),
    ).toEqual({ angleRad: 1, source: 'stick' });
  });
  it('stick in the dead zone keeps the last angle', () => {
    expect(
      resolveAim({ stickHeld: true, stickAngleRad: null, pointerAngleRad: 2, lastAngleRad: 3 }),
    ).toEqual({ angleRad: 3, source: 'stick' });
  });
  it('pointer counts without the stick', () => {
    expect(
      resolveAim({ stickHeld: false, stickAngleRad: null, pointerAngleRad: 2, lastAngleRad: 3 }),
    ).toEqual({ angleRad: 2, source: 'pointer' });
  });
  it('after release the pointer applies again', () => {
    const held = resolveAim({
      stickHeld: true,
      stickAngleRad: 1,
      pointerAngleRad: null,
      lastAngleRad: 0,
    });
    const after = resolveAim({
      stickHeld: false,
      stickAngleRad: 1,
      pointerAngleRad: 2,
      lastAngleRad: held.angleRad,
    });
    expect(after).toEqual({ angleRad: 2, source: 'pointer' });
  });
  it('a second finger while held is ignored (pointer angle null or present)', () => {
    for (const p of [null, 2]) {
      expect(
        resolveAim({ stickHeld: true, stickAngleRad: 1, pointerAngleRad: p, lastAngleRad: 0 })
          .angleRad,
      ).toBe(1);
    }
  });
  it('holds the last angle without any source', () => {
    expect(
      resolveAim({ stickHeld: false, stickAngleRad: null, pointerAngleRad: null, lastAngleRad: 3 }),
    ).toEqual({ angleRad: 3, source: 'hold' });
  });
});

describe('tap A, stick B, release', () => {
  it('keeps the last stick angle instead of jumping back to A', () => {
    let pointer: number | null = 2; // tap A
    let last = 0;
    // stick held at B
    pointer = pointerAngleWhileStick(true, pointer);
    last = resolveAim({
      stickHeld: true,
      stickAngleRad: 1,
      pointerAngleRad: pointer,
      lastAngleRad: last,
    }).angleRad;
    // released
    pointer = pointerAngleWhileStick(false, pointer);
    const r = resolveAim({
      stickHeld: false,
      stickAngleRad: null,
      pointerAngleRad: pointer,
      lastAngleRad: last,
    });
    expect(r).toEqual({ angleRad: 1, source: 'hold' });
  });
});

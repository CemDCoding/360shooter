import { describe, expect, it } from 'vitest';
import { THEME } from '../../src/config/theme';
import { funkScale } from '../../src/scenes/hud/FunkPanel';
import { STICK_CATCH_DIAMETER } from '../../src/scenes/hud/hudMath';

describe('funkScale', () => {
  it('keeps the base scale on the desktop (k = 1)', () => {
    expect(funkScale(1, 1)).toBe(1);
    expect(funkScale(3, 1)).toBe(3);
    expect(funkScale(2, NaN)).toBe(2);
  });

  it('lifts 1x state labels to at least 2x as soon as k > 1', () => {
    expect(funkScale(1, 1.05)).toBe(2);
    expect(funkScale(1, 1.4)).toBe(2);
    expect(funkScale(1, 2.2)).toBe(3);
  });

  it('never goes below the base for larger text', () => {
    expect(funkScale(3, 1.4)).toBe(4);
    expect(funkScale(4, 1.1)).toBe(4);
  });
});

describe('stick tokens', () => {
  it('draws the stick at 88 px with a 28 px knob and a catch area of at least 126 px', () => {
    expect(THEME.sizePx['size.stick']).toBe(88);
    expect(THEME.sizePx['size.stick-knob']).toBe(28);
    const CATCH_DIAMETER = STICK_CATCH_DIAMETER;
    expect(CATCH_DIAMETER).toBeGreaterThanOrEqual(126);
    expect(CATCH_DIAMETER).toBeGreaterThan(THEME.sizePx['size.stick']);
  });
});

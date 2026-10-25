import { describe, expect, it } from 'vitest';
import { bevelRects, motionMs } from '../../src/scenes/menu/menuLogic';

// Reine Geometrie aus menuLogic.ts (kein Phaser nötig).
describe('bevelRects', () => {
  it('draws a 2 px outline around the fill', () => {
    const r = bevelRects(10, 20, 100, 32);
    expect(r.fill).toEqual({ x: 10, y: 20, w: 100, h: 32 });
    expect(r.outline).toEqual({ x: 8, y: 18, w: 104, h: 36 });
  });
  it('puts a 4 px drop shadow with 2 px spread behind the outline', () => {
    const r = bevelRects(10, 20, 100, 32);
    expect(r.shadow).toEqual({ x: 12, y: 22, w: 104, h: 36 });
  });
  it('has light edges top and left, dark edges bottom and right (2 px)', () => {
    const r = bevelRects(10, 20, 100, 32);
    expect(r.hi).toEqual([
      { x: 10, y: 20, w: 100, h: 2 },
      { x: 10, y: 20, w: 2, h: 32 },
    ]);
    expect(r.lo).toEqual([
      { x: 10, y: 50, w: 100, h: 2 },
      { x: 108, y: 20, w: 2, h: 32 },
    ]);
  });
  it('omits the shadow when asked', () => {
    expect(bevelRects(0, 0, 10, 10, false).shadow.w).toBe(0);
  });
});

describe('motionMs', () => {
  it('is 0 with reduced motion and unchanged otherwise', () => {
    expect(motionMs(true, 150)).toBe(0);
    expect(motionMs(false, 150)).toBe(150);
  });
});

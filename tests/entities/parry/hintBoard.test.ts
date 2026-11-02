import { describe, expect, it, vi } from 'vitest';
import type { ParryCircle } from '../../../src/contracts';

// hintBoard.ts reads the glyph height from FunkPanel, which imports Phaser.
vi.mock('phaser', () => ({ default: {} }));

const {
  HINT_RISE,
  HINT_TIMER_GAP,
  RIDDLE_SHEET,
  SCALE_SHEET,
  hintBoardRect,
  hintBoardSize,
  hintContent,
  hudTimerBottom,
  scaleFrame,
} = await import('../../../src/entities/parry/hintBoard');

// AP-151: the choice hint board above the astronaut (brief H-37 8a), clear of the HUD timer.
const choice = (symbol: string, correct = false): ParryCircle => ({
  index: 0,
  angleDeg: 0,
  hitAtMs: 1000,
  kind: 'choice',
  symbol,
  correct,
});

describe('hint board content', () => {
  it('scale for heart and feather, riddle picture by the right leg count', () => {
    expect(hintContent([choice('heart'), choice('feather', true)])?.sheet).toBe(SCALE_SHEET);
    expect(hintContent([choice('legs4', true), choice('legs2')])).toEqual({
      sheet: RIDDLE_SHEET,
      frame: 0,
    });
    expect(hintContent([choice('legs4'), choice('legs2', true)])?.frame).toBe(1);
    expect(hintContent([choice('legs3', true), choice('legs2')])?.frame).toBe(2);
  });

  it('no board without choice circles (e.g. easy parry) or without a known right symbol', () => {
    expect(hintContent([{ index: 0, angleDeg: 0, hitAtMs: 0 }])).toBeNull();
    expect(hintContent([choice('legs2'), choice('legs3')])).toBeNull();
  });

  it('the scale tilts 0 -> 1 -> 2 over motion.parry-tilt; reduced motion shows the end at once', () => {
    expect(scaleFrame(0, false)).toBe(0);
    expect(scaleFrame(160, false)).toBe(1);
    expect(scaleFrame(300, false)).toBe(2);
    expect(scaleFrame(0, true)).toBe(2);
  });

  it('board size: picture at twice its size plus padding and frame', () => {
    expect(hintBoardSize(SCALE_SHEET)).toEqual({ w: 70, h: 54 });
    expect(hintBoardSize(RIDDLE_SHEET)).toEqual({ w: 54, h: 54 });
  });
});

describe('hint board position (HUD k = 1, 1.36, 1.4)', () => {
  const size = hintBoardSize(SCALE_SHEET);

  it('mirrors the bottom of the HUD timer', () => {
    expect(hudTimerBottom(1)).toBe(48);
    expect(hudTimerBottom(1.36)).toBe(57);
    expect(hudTimerBottom(1.4)).toBe(57);
    expect(hudTimerBottom(2)).toBe(57);
    expect(hudTimerBottom(1, 30)).toBe(30 + 24 + 16);
  });

  it.each([1, 1.36, 1.4])('k = %s: centred above the astronaut, never over the timer', (k) => {
    const bottom = hudTimerBottom(k);
    const mid = hintBoardRect({ x: 320, y: 300 }, size, bottom, 640);
    expect(mid.y + mid.h / 2).toBe(300 - HINT_RISE);
    expect(mid.x + mid.w / 2).toBe(320);
    const top = hintBoardRect({ x: 320, y: 120 }, size, bottom, 640);
    expect(top.y).toBe(bottom + HINT_TIMER_GAP);
  });

  it('stays inside the arena horizontally', () => {
    expect(hintBoardRect({ x: 5, y: 300 }, size, 48, 640).x).toBe(0);
    expect(hintBoardRect({ x: 638, y: 300 }, size, 48, 640).x).toBe(640 - size.w);
  });
});

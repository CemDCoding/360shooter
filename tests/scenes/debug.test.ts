import { describe, expect, it } from 'vitest';
import {
  isValidLevelId,
  MAX_LEVEL_ID,
  parseDebugFps,
  parseDebugLevel,
  resolveLevelId,
  resolveStartTarget,
} from '../../src/scenes/debug';

describe('parseDebugLevel', () => {
  it('returns null without parameter', () => {
    expect(parseDebugLevel('')).toBeNull();
    expect(parseDebugLevel('?fps=1')).toBeNull();
  });

  it('reads valid levels', () => {
    expect(parseDebugLevel('?level=0')).toBe(0);
    expect(parseDebugLevel('?level=12')).toBe(12);
    expect(parseDebugLevel('?fps=1&level=20')).toBe(20);
  });

  it('clamps out-of-range numbers to 0..20', () => {
    expect(MAX_LEVEL_ID).toBe(20);
    expect(parseDebugLevel('?level=21')).toBe(20);
    expect(parseDebugLevel('?level=99999999999999999999')).toBe(20);
    expect(parseDebugLevel('?level=-3')).toBe(0);
  });

  it('maps invalid values to 0', () => {
    for (const v of ['', 'abc', '1.5', '1e3', 'NaN', 'Infinity', '0x10', '%3Cscript%3E']) {
      expect(parseDebugLevel(`?level=${v}`)).toBe(0);
    }
  });
});

describe('parseDebugFps', () => {
  it('is only true for fps=1', () => {
    expect(parseDebugFps('?fps=1')).toBe(true);
    expect(parseDebugFps('?level=3&fps=1')).toBe(true);
    expect(parseDebugFps('?fps=0')).toBe(false);
    expect(parseDebugFps('?fps=true')).toBe(false);
    expect(parseDebugFps('')).toBe(false);
  });
});

describe('isValidLevelId', () => {
  it('accepts integers 0..20 only', () => {
    expect(isValidLevelId(0)).toBe(true);
    expect(isValidLevelId(20)).toBe(true);
    expect(isValidLevelId(21)).toBe(false);
    expect(isValidLevelId(-1)).toBe(false);
    expect(isValidLevelId(1.5)).toBe(false);
    expect(isValidLevelId('3')).toBe(false);
    expect(isValidLevelId(undefined)).toBe(false);
  });
});

describe('resolveLevelId', () => {
  it('prefers a valid requested level', () => {
    expect(resolveLevelId(5, '?level=12')).toBe(5);
  });

  it('falls back to the debug parameter', () => {
    expect(resolveLevelId(undefined, '?level=12')).toBe(12);
    expect(resolveLevelId(42, '?level=7')).toBe(7);
  });

  it('defaults to 0', () => {
    expect(resolveLevelId(undefined, '')).toBe(0);
    expect(resolveLevelId('x', '?level=abc')).toBe(0);
  });
});

describe('resolveStartTarget', () => {
  const game = (levelId: number) => ({ scene: 'GameScene', levelId });
  it('starts the menu without level parameter', () => {
    expect(resolveStartTarget('')).toEqual({ scene: 'MenuScene' });
    expect(resolveStartTarget('?fps=1')).toEqual({ scene: 'MenuScene' });
  });
  it('starts GameScene with the clamped level', () => {
    expect(resolveStartTarget('?level=12')).toEqual(game(12));
    expect(resolveStartTarget('?level=20')).toEqual(game(20));
    expect(resolveStartTarget('?level=99')).toEqual(game(20));
    expect(resolveStartTarget('?level=-3')).toEqual(game(0));
    expect(resolveStartTarget('?level=abc')).toEqual(game(0));
    expect(resolveStartTarget('?level=1.5')).toEqual(game(0));
    expect(resolveStartTarget('?level=5&fps=1')).toEqual(game(5));
  });
});

import { describe, expect, it } from 'vitest';
import { LEVEL_COUNT, PROGRESSION } from '../../src/config';
import type { SaveGame } from '../../src/contracts';
import { applyRoundResult, levelForXp, roundXp, xpForLevel } from '../../src/logic/progression';

const base: SaveGame = {
  version: 1,
  playerXp: 0,
  playerLevel: 1,
  highestUnlockedLevel: 0,
  muted: false,
};

describe('xp curve', () => {
  it('level 1 needs 0 xp and the curve is strictly increasing', () => {
    expect(xpForLevel(1, PROGRESSION)).toBe(0);
    expect(xpForLevel(2, PROGRESSION)).toBe(100);
    for (let n = 2; n < 50; n++) {
      expect(xpForLevel(n + 1, PROGRESSION)).toBeGreaterThan(xpForLevel(n, PROGRESSION));
    }
  });

  it('maps xp to level at the thresholds', () => {
    expect(levelForXp(0, PROGRESSION)).toBe(1);
    expect(levelForXp(99, PROGRESSION)).toBe(1);
    expect(levelForXp(100, PROGRESSION)).toBe(2);
    expect(levelForXp(1e12, PROGRESSION)).toBe(1000);
  });
});

describe('roundXp', () => {
  it('gives full xp on win and a share on loss', () => {
    expect(roundXp(200, 'won', PROGRESSION)).toBe(200);
    expect(roundXp(200, 'lost', PROGRESSION)).toBe(100);
    expect(roundXp(-5, 'won', PROGRESSION)).toBe(0);
    expect(roundXp(Number.NaN, 'lost', PROGRESSION)).toBe(0);
  });
});

describe('applyRoundResult', () => {
  it('can level up several times at once', () => {
    const next = applyRoundResult(base, 0, 'won', xpForLevel(5, PROGRESSION), PROGRESSION);
    expect(next.playerLevel).toBe(5);
    expect(next.playerXp).toBe(xpForLevel(5, PROGRESSION));
  });

  it('unlocks the next level only on a win', () => {
    expect(applyRoundResult(base, 0, 'won', 10, PROGRESSION).highestUnlockedLevel).toBe(1);
    expect(applyRoundResult(base, 0, 'lost', 10, PROGRESSION).highestUnlockedLevel).toBe(0);
  });

  it('does not lower progress when replaying an old level', () => {
    const s = { ...base, highestUnlockedLevel: 7 };
    expect(applyRoundResult(s, 2, 'won', 0, PROGRESSION).highestUnlockedLevel).toBe(7);
  });

  it('never unlocks beyond the last level', () => {
    const s = { ...base, highestUnlockedLevel: LEVEL_COUNT - 1 };
    const next = applyRoundResult(s, LEVEL_COUNT - 1, 'won', 0, PROGRESSION);
    expect(next.highestUnlockedLevel).toBe(LEVEL_COUNT - 1);
  });

  it('caps xp and does not mutate the input', () => {
    const s = { ...base, playerXp: 1e9 - 1 };
    const copy = { ...s };
    expect(applyRoundResult(s, 0, 'won', 1000, PROGRESSION).playerXp).toBe(1e9);
    expect(s).toEqual(copy);
  });
});

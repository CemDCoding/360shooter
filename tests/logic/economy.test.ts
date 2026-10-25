import { describe, expect, it } from 'vitest';
import type { SaveGame } from '../../src/contracts';
import { MAX_GOLD as STORAGE_MAX_GOLD } from '../../src/platform/storage';
import { MAX_GOLD, applyRoundGold, goldPayout } from '../../src/logic/economy';

const base: SaveGame = {
  version: 2,
  playerXp: 5,
  playerLevel: 1,
  highestUnlockedLevel: 2,
  muted: false,
  gold: 10,
};

describe('economy', () => {
  it('win keeps everything, loss floors half', () => {
    expect(goldPayout(100, 'won')).toBe(100);
    expect(goldPayout(7, 'lost')).toBe(3);
    expect(goldPayout(0, 'lost')).toBe(0);
  });
  it('handles invalid input', () => {
    expect(goldPayout(-5, 'won')).toBe(0);
    expect(goldPayout(Number.NaN, 'won')).toBe(0);
  });
  it('adds gold without mutating', () => {
    const out = applyRoundGold(base, 7, 'lost');
    expect(out.gold).toBe(13);
    expect(base.gold).toBe(10);
    expect(out.playerXp).toBe(5);
  });
  it('treats missing gold as 0', () => {
    expect(applyRoundGold({ ...base, gold: undefined }, 4, 'won').gold).toBe(4);
  });
  it('caps at MAX_GOLD', () => {
    expect(applyRoundGold({ ...base, gold: MAX_GOLD - 1 }, 50, 'won').gold).toBe(MAX_GOLD);
  });
  it('matches the storage constant', () => {
    expect(MAX_GOLD).toBe(STORAGE_MAX_GOLD);
  });
});

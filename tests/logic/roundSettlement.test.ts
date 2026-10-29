import { describe, expect, it } from 'vitest';
import { COIN_RULES, PROGRESSION } from '../../src/config';
import { settleRound } from '../../src/logic/economy';
import { coinMagnetStep } from '../../src/logic/coins';
import {
  SAVE_KEY,
  defaultSave,
  loadSave,
  writeSave,
  type StorageLike,
} from '../../src/platform/storage';

function memoryStorage(): StorageLike & { writes: number } {
  const m = new Map<string, string>();
  return {
    writes: 0,
    getItem: (k) => m.get(k) ?? null,
    setItem(k, v) {
      this.writes++;
      m.set(k, v);
    },
    removeItem: (k) => void m.delete(k),
  };
}

/** The same steps GameScene.endRound performs, against an in-memory storage. */
function endRound(
  st: StorageLike,
  result: 'won' | 'lost',
  roundCoins: number,
  debug: boolean,
): { saved: boolean; shownGold: number; goldGained: number } {
  const s = settleRound(loadSave(st), 0, result, 10, roundCoins, debug, PROGRESSION);
  const saved = s.shouldWrite ? writeSave(s.next, st) : false;
  return { saved, shownGold: s.shown.gold ?? 0, goldGained: s.goldGained };
}

describe('round settlement chain (AP-88)', () => {
  it('win credits all coins and the menu (loadSave) shows the same gold', () => {
    const st = memoryStorage();
    writeSave({ ...defaultSave(), gold: 20 }, st);
    st.writes = 0;
    const r = endRound(st, 'won', 13, false);
    expect(r.saved).toBe(true);
    expect(st.writes).toBe(1);
    expect(r.goldGained).toBe(13);
    expect(r.shownGold).toBe(33);
    expect(loadSave(st).gold).toBe(33);
  });

  it('loss credits floor(0.5 x coins)', () => {
    const st = memoryStorage();
    const r = endRound(st, 'lost', 7, false);
    expect(r.goldGained).toBe(3);
    expect(loadSave(st).gold).toBe(3);
    expect(r.shownGold).toBe(3);
  });

  it('debug round writes nothing and says so', () => {
    const st = memoryStorage();
    writeSave({ ...defaultSave(), gold: 20 }, st);
    st.writes = 0;
    const s = settleRound(loadSave(st), 0, 'won', 10, 50, true, PROGRESSION);
    expect(s.debugRound).toBe(true);
    expect(s.shouldWrite).toBe(false);
    expect(endRound(st, 'won', 50, true).saved).toBe(false);
    expect(st.writes).toBe(0);
    expect(loadSave(st).gold).toBe(20);
    expect(s.shown.gold).toBe(20);
    expect(s.goldGained).toBe(0);
    expect(st.getItem(SAVE_KEY)).not.toBeNull();
  });

  it('a coin inside the collect radius is collected (roundCoins counting step)', () => {
    let roundCoins = 0;
    const r = coinMagnetStep({ x: 0, y: 0 }, { x: 1, y: 1 }, 16, COIN_RULES, 0);
    if (r.collected) roundCoins += 5;
    expect(roundCoins).toBe(5);
  });
});

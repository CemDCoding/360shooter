import { describe, expect, it } from 'vitest';
import { LEVEL_COUNT } from '../../src/config/levels';
import type { SaveGame } from '../../src/contracts/save';
import {
  SAVE_KEY,
  defaultSave,
  loadSave,
  resetSave,
  writeSave,
  type StorageLike,
} from '../../src/platform/storage';

function memory(initial?: string): StorageLike & { data: Map<string, string> } {
  const data = new Map<string, string>();
  if (initial !== undefined) data.set(SAVE_KEY, initial);
  return {
    data,
    getItem: (k) => data.get(k) ?? null,
    setItem: (k, v) => void data.set(k, v),
    removeItem: (k) => void data.delete(k),
  };
}

const v1 = {
  version: 1,
  playerXp: 50,
  playerLevel: 3,
  highestUnlockedLevel: 2,
  muted: true,
};

const valid: SaveGame = {
  version: 2,
  gold: 120,
  upgrades: { weaponFireRate: 1, weaponDamage: 2, playerMaxHp: 0, playerTurnSpeed: 10 },
  playerXp: 50,
  playerLevel: 3,
  highestUnlockedLevel: 2,
  muted: true,
};

describe('loadSave', () => {
  it('returns default when empty', () => {
    expect(loadSave(memory())).toEqual(defaultSave());
  });
  it('returns default without storage', () => {
    expect(loadSave(null)).toEqual(defaultSave());
  });
  it('loads a valid save', () => {
    expect(loadSave(memory(JSON.stringify(valid)))).toEqual(valid);
  });
  it('drops unknown extra fields', () => {
    expect(loadSave(memory(JSON.stringify({ ...valid, name: 'x' })))).toEqual(valid);
  });
  it('returns default for broken JSON', () => {
    expect(loadSave(memory('{not json'))).toEqual(defaultSave());
  });
  it('returns default for wrong types, versions and shapes', () => {
    for (const bad of [
      { ...valid, playerXp: '50' },
      { ...valid, muted: 'yes' },
      { ...valid, version: 3 },
      { ...valid, playerLevel: 1.5 },
      { ...valid, playerXp: null },
      [],
      null,
      42,
    ]) {
      expect(loadSave(memory(JSON.stringify(bad)))).toEqual(defaultSave());
    }
  });
  it('returns default for out-of-range values', () => {
    for (const bad of [
      { ...valid, playerXp: -1 },
      { ...valid, playerLevel: 0 },
      { ...valid, highestUnlockedLevel: -5 },
      { ...valid, playerLevel: 1e9 },
      { ...valid, playerXp: 1e300 },
    ]) {
      expect(loadSave(memory(JSON.stringify(bad)))).toEqual(defaultSave());
    }
  });
  it('starts with level 0 unlocked', () => {
    expect(defaultSave().highestUnlockedLevel).toBe(0);
  });
  it('accepts 0 and the last level index, rejects others', () => {
    for (const ok of [0, LEVEL_COUNT - 1]) {
      const s = { ...valid, highestUnlockedLevel: ok };
      expect(loadSave(memory(JSON.stringify(s)))).toEqual(s);
    }
    for (const bad of [-1, LEVEL_COUNT, 1.5, '3']) {
      const s = { ...valid, highestUnlockedLevel: bad };
      expect(loadSave(memory(JSON.stringify(s)))).toEqual(defaultSave());
    }
  });
  it('returns default if getItem throws', () => {
    const s = memory();
    s.getItem = () => {
      throw new Error('denied');
    };
    expect(loadSave(s)).toEqual(defaultSave());
  });
});

describe('save v1/v2', () => {
  it('loads v1 keeping xp and unlock, gold and upgrades 0', () => {
    expect(loadSave(memory(JSON.stringify(v1)))).toEqual({
      ...v1,
      version: 2,
      gold: 0,
      upgrades: defaultSave().upgrades,
    });
  });
  it('loads v2', () => {
    expect(loadSave(memory(JSON.stringify(valid)))).toEqual(valid);
  });
  it('default is v2 with zeros', () => {
    expect(defaultSave()).toMatchObject({ version: 2, gold: 0 });
    expect(Object.values(defaultSave().upgrades!)).toEqual([0, 0, 0, 0]);
  });
  it('broken gold becomes 0 and keeps progress', () => {
    for (const bad of [-1, 1.5, 'abc', null, 1e10]) {
      const l = loadSave(memory(JSON.stringify({ ...valid, gold: bad })));
      expect(l).toEqual({ ...valid, gold: 0 });
    }
  });
  it('broken upgrade level becomes 0 only for that track', () => {
    for (const bad of [16, -1, 1.5, 'x']) {
      const l = loadSave(
        memory(JSON.stringify({ ...valid, upgrades: { ...valid.upgrades, weaponDamage: bad } })),
      );
      expect(l).toEqual({ ...valid, upgrades: { ...valid.upgrades, weaponDamage: 0 } });
    }
  });
  it('keeps levels 11 to 15 and old saves with 0 to 10 unchanged', () => {
    const high = { ...valid.upgrades, weaponDamage: 15, playerMaxHp: 11 };
    expect(loadSave(memory(JSON.stringify({ ...valid, upgrades: high })))).toEqual({
      ...valid,
      upgrades: high,
    });
    const old = { ...valid.upgrades, weaponFireRate: 10 };
    expect(loadSave(memory(JSON.stringify({ ...valid, upgrades: old })))).toEqual({
      ...valid,
      upgrades: old,
    });
  });
  it('non-object upgrades become zeros', () => {
    const l = loadSave(memory(JSON.stringify({ ...valid, upgrades: 5 })));
    expect(l).toEqual({ ...valid, upgrades: defaultSave().upgrades });
  });
  it('writeSave writes version 2 with only known fields', () => {
    const s = memory();
    expect(writeSave({ ...v1, version: 1 } as SaveGame, s)).toBe(true);
    const raw = JSON.parse(s.data.get(SAVE_KEY)!);
    expect(raw.version).toBe(2);
    expect(raw.gold).toBe(0);
    expect(Object.keys(raw).sort()).toEqual([
      'gold',
      'highestUnlockedLevel',
      'muted',
      'playerLevel',
      'playerXp',
      'upgrades',
      'version',
    ]);
  });
});

describe('writeSave / resetSave', () => {
  it('round-trips', () => {
    const s = memory();
    expect(writeSave(valid, s)).toBe(true);
    expect(loadSave(s)).toEqual(valid);
  });
  it('catches write errors', () => {
    const s = memory();
    s.setItem = () => {
      throw new Error('quota');
    };
    expect(writeSave(valid, s)).toBe(false);
  });
  it('refuses invalid data', () => {
    const s = memory();
    expect(writeSave({ ...valid, playerXp: -3 }, s)).toBe(false);
    expect(s.data.size).toBe(0);
  });
  it('reset clears gold and upgrades', () => {
    const s = memory(JSON.stringify(valid));
    resetSave(s);
    expect(s.data.size).toBe(0);
    expect(loadSave(s).gold).toBe(0);
  });
  it('resets', () => {
    const s = memory(JSON.stringify(valid));
    resetSave(s);
    expect(loadSave(s)).toEqual(defaultSave());
  });
});

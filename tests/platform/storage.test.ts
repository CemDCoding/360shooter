import { describe, expect, it } from 'vitest';
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

const valid: SaveGame = {
  version: 1,
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
      { ...valid, version: 2 },
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
  it('returns default if getItem throws', () => {
    const s = memory();
    s.getItem = () => {
      throw new Error('denied');
    };
    expect(loadSave(s)).toEqual(defaultSave());
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
  it('resets', () => {
    const s = memory(JSON.stringify(valid));
    resetSave(s);
    expect(loadSave(s)).toEqual(defaultSave());
  });
});

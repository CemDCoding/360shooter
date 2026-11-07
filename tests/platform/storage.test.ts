import { describe, expect, it } from 'vitest';
import { LEVEL_COUNT } from '../../src/config/levels';
import type { SaveGame } from '../../src/contracts/save';
import {
  SAVE_KEY,
  defaultSave,
  loadSave,
  markFinisherSeen,
  resetSave,
  setReduceEffects,
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

const v3Defaults = {
  diamonds: 2,
  wonLevels: [0, 1],
  owned: [] as string[],
  equippedGear: { head: null, body: null, legs: null },
  activePet: null,
  petGear: {},
  easyParry: false,
  seenFinishers: [] as string[],
  reduceEffects: false,
};

const valid: SaveGame = {
  version: 3,
  ...v3Defaults,
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
      { ...valid, version: 4 },
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
      ...v3Defaults,
      version: 3,
      gold: 0,
      upgrades: defaultSave().upgrades,
    });
  });
  it('loads v2 as v3 with retroactive diamonds', () => {
    const v2 = { ...valid, version: 2, diamonds: 99, wonLevels: [5], owned: ['egg-bee'] };
    expect(loadSave(memory(JSON.stringify(v2)))).toEqual(valid);
  });
  it('default is v3 with zeros', () => {
    expect(defaultSave()).toMatchObject({ version: 3, gold: 0, diamonds: 0 });
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
  it('writeSave writes version 3 with only known fields', () => {
    const s = memory();
    expect(writeSave({ ...v1, version: 1 } as SaveGame, s)).toBe(true);
    const raw = JSON.parse(s.data.get(SAVE_KEY)!);
    expect(raw.version).toBe(3);
    expect(raw.gold).toBe(0);
    expect(Object.keys(raw).sort()).toEqual([
      'activePet',
      'diamonds',
      'easyParry',
      'equippedGear',
      'gold',
      'highestUnlockedLevel',
      'muted',
      'owned',
      'petGear',
      'playerLevel',
      'playerXp',
      'reduceEffects',
      'seenFinishers',
      'upgrades',
      'version',
      'wonLevels',
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

describe('save v3 (AP-137)', () => {
  const owned = ['egg-bee', 'petgear-bee-diamond', 'petgear-penguin-diamond'];
  const rich: SaveGame = {
    ...valid,
    diamonds: 7,
    owned,
    activePet: 'bee',
    petGear: { bee: 'petgear-bee-diamond' },
  };
  it('round-trips ownership and equipment', () => {
    expect(loadSave(memory(JSON.stringify(rich)))).toEqual(rich);
  });
  it('migrates v1/v2 once: highest 10 gives levels 0..9 and 14 diamonds', () => {
    const l = loadSave(memory(JSON.stringify({ ...v1, highestUnlockedLevel: 10 })));
    expect(l.wonLevels).toEqual([0, 1, 2, 3, 4, 5, 6, 7, 8, 9]);
    expect(l.diamonds).toBe(14);
    expect(loadSave(memory(JSON.stringify(l)))).toEqual(l);
  });
  it('never counts the last level as won in the migration', () => {
    const l = loadSave(memory(JSON.stringify({ ...v1, highestUnlockedLevel: LEVEL_COUNT - 1 })));
    expect(l.wonLevels).not.toContain(LEVEL_COUNT - 1);
    expect(l.diamonds).toBe(53 - 3);
  });
  it('does not migrate v3 again', () => {
    const l = loadSave(
      memory(JSON.stringify({ ...valid, wonLevels: [], diamonds: 0, highestUnlockedLevel: 10 })),
    );
    expect(l.wonLevels).toEqual([]);
    expect(l.diamonds).toBe(0);
  });
  it('sanitizes manipulated fields, each on its own', () => {
    for (const bad of [-1, 1.5, '3', null, 1e9]) {
      expect(loadSave(memory(JSON.stringify({ ...rich, diamonds: bad }))).diamonds).toBe(0);
    }
    const l = loadSave(
      memory(
        JSON.stringify({
          ...rich,
          wonLevels: [3, 3, -1, 99, 1.5, 'x', 1],
          owned: ['egg-bee', 'egg-bee', 'hax', 5, 'petgear-bee-diamond'],
          activePet: 'penguin',
          petGear: { bee: 'petgear-bee-diamond', penguin: 'petgear-bee-diamond', dog: 'x' },
          equippedGear: { head: 'gear-diamond-body', body: null, legs: 'nope' },
        }),
      ),
    );
    expect(l.wonLevels).toEqual([1, 3]);
    expect(l.owned).toEqual(['egg-bee', 'petgear-bee-diamond']);
    expect(l.activePet).toBeNull();
    expect(l.petGear).toEqual({ bee: 'petgear-bee-diamond' });
    expect(l.equippedGear).toEqual({ head: null, body: null, legs: null });
    expect(l.diamonds).toBe(7);
  });
  it('drops equipment that is not owned and non-array fields', () => {
    const l = loadSave(
      memory(
        JSON.stringify({
          ...rich,
          owned: 'egg-bee',
          wonLevels: 5,
          equippedGear: 3,
          petGear: [],
          activePet: 'bee',
        }),
      ),
    );
    expect(l).toMatchObject({ owned: [], wonLevels: [], activePet: null, petGear: {} });
    expect(l.equippedGear).toEqual({ head: null, body: null, legs: null });
  });
  it('keeps owned gear in the right slot and rejects a wrong slot', () => {
    const own = [...owned, 'gear-diamond-head'];
    const ok = loadSave(
      memory(
        JSON.stringify({
          ...rich,
          owned: own,
          equippedGear: { head: 'gear-diamond-head', body: null, legs: null },
        }),
      ),
    );
    expect(ok.equippedGear?.head).toBe('gear-diamond-head');
    const wrong = loadSave(
      memory(
        JSON.stringify({
          ...rich,
          owned: own,
          equippedGear: { head: null, body: 'gear-diamond-head', legs: null },
        }),
      ),
    );
    expect(wrong.equippedGear?.body).toBeNull();
  });
  it('reset deletes diamonds, purchases, equipment and pets', () => {
    const s = memory(JSON.stringify(rich));
    resetSave(s);
    expect(loadSave(s)).toEqual(defaultSave());
  });
});

describe('easyParry (AP-152)', () => {
  it('is false in the default save and in an old save without the field', () => {
    expect(defaultSave().easyParry).toBe(false);
    expect(loadSave(memory(JSON.stringify(v1))).easyParry).toBe(false);
    const old: Partial<SaveGame> = { ...valid };
    delete old.easyParry;
    expect(loadSave(memory(JSON.stringify(old))).easyParry).toBe(false);
  });
  it('round-trips true', () => {
    const s = memory();
    expect(writeSave({ ...valid, easyParry: true }, s)).toBe(true);
    expect(loadSave(s).easyParry).toBe(true);
  });
  it.each([1, 'true', null, [], {}, 0])('treats %j as false', (bad) => {
    expect(loadSave(memory(JSON.stringify({ ...valid, easyParry: bad }))).easyParry).toBe(false);
  });
  it('keeps the rest of the save when the field is broken', () => {
    const l = loadSave(memory(JSON.stringify({ ...valid, easyParry: 'x' })));
    expect(l.gold).toBe(120);
  });
  it('reset turns it off again', () => {
    const s = memory();
    writeSave({ ...valid, easyParry: true }, s);
    resetSave(s);
    expect(loadSave(s).easyParry).toBe(false);
  });
});

describe('seenFinishers and reduceEffects (AP-161)', () => {
  it('defaults are empty / false, also for an old save without the fields', () => {
    expect(defaultSave().seenFinishers).toEqual([]);
    expect(defaultSave().reduceEffects).toBe(false);
    const l = loadSave(memory(JSON.stringify(v1)));
    expect(l.seenFinishers).toEqual([]);
    expect(l.reduceEffects).toBe(false);
  });
  it('round-trips valid values and drops duplicates', () => {
    const s = memory();
    const save = {
      ...valid,
      seenFinishers: ['moment-pharaoh', 'cinematic-4', 'moment-pharaoh'],
      reduceEffects: true,
    };
    expect(writeSave(save, s)).toBe(true);
    const l = loadSave(s);
    expect(l.seenFinishers).toEqual(['moment-pharaoh', 'cinematic-4']);
    expect(l.reduceEffects).toBe(true);
  });
  it.each([null, 'cinematic-4', 5, {}, true])('treats %j as no seen list', (bad) => {
    const l = loadSave(memory(JSON.stringify({ ...valid, seenFinishers: bad })));
    expect(l.seenFinishers).toEqual([]);
    expect(l.gold).toBe(120);
  });
  it('drops foreign ids and non-strings', () => {
    const raw = { ...valid, seenFinishers: ['moment-giantStone', 'evil', 7, null, '__proto__'] };
    expect(loadSave(memory(JSON.stringify(raw))).seenFinishers).toEqual(['moment-giantStone']);
  });
  it('accepts the 12 choreography ids and drops unknown ones', () => {
    const ids = [
      'moment-rootMonster',
      'moment-forestGhost',
      'moment-giantStone',
      'moment-giantSandWorm',
      'moment-guardianDog',
      'moment-pharaoh',
      'cinematic-4',
      'cinematic-9',
      'cinematic-20',
      'cinematic-25',
      'cinematic-30',
      'cinematic-40',
    ];
    const raw = { ...valid, seenFinishers: [...ids, 'moment-nobody', 'cinematic-5'] };
    expect(loadSave(memory(JSON.stringify(raw))).seenFinishers).toEqual(ids);
    const s = memory(JSON.stringify(valid));
    expect(markFinisherSeen('cinematic-40', s)).toBe(true);
    expect(loadSave(s).seenFinishers).toEqual(['cinematic-40']);
  });
  it('drops the old M10 ids on load, the rest of the save stays (AP-191, PE-251 d)', () => {
    const old = [...[1, 2, 3, 4, 5, 6].map((n) => `stage-${n}`), 'finale-4', 'finale-40'];
    const raw = { ...valid, seenFinishers: [...old, 'cinematic-9', ...old] };
    const l = loadSave(memory(JSON.stringify(raw)));
    expect(l.seenFinishers).toEqual(['cinematic-9']);
    expect(l.gold).toBe(120);
    const onlyOld = loadSave(memory(JSON.stringify({ ...valid, seenFinishers: old })));
    expect(onlyOld.seenFinishers).toEqual([]);
    // writing the migrated save does not bring the old ids back
    const s = memory(JSON.stringify(raw));
    expect(markFinisherSeen('moment-pharaoh', s)).toBe(true);
    expect(loadSave(s).seenFinishers).toEqual(['cinematic-9', 'moment-pharaoh']);
  });
  it.each([1, 'true', null, [], {}, 0])('treats reduceEffects %j as false', (bad) => {
    const l = loadSave(memory(JSON.stringify({ ...valid, reduceEffects: bad })));
    expect(l.reduceEffects).toBe(false);
  });
  it('markFinisherSeen adds once and ignores invalid ids', () => {
    const s = memory(JSON.stringify(valid));
    expect(markFinisherSeen('moment-giantStone', s)).toBe(true);
    markFinisherSeen('moment-giantStone', s);
    markFinisherSeen('nope', s);
    const l = loadSave(s);
    expect(l.seenFinishers).toEqual(['moment-giantStone']);
    expect(l.gold).toBe(120);
  });
  it('setReduceEffects stores the flag and keeps the rest', () => {
    const s = memory(JSON.stringify(valid));
    expect(setReduceEffects(true, s)).toBe(true);
    expect(loadSave(s).reduceEffects).toBe(true);
    setReduceEffects(false, s);
    expect(loadSave(s).reduceEffects).toBe(false);
    expect(loadSave(s).gold).toBe(120);
  });
  it('reset clears both fields', () => {
    const s = memory();
    markFinisherSeen('moment-rootMonster', s);
    setReduceEffects(true, s);
    resetSave(s);
    const l = loadSave(s);
    expect(l.seenFinishers).toEqual([]);
    expect(l.reduceEffects).toBe(false);
  });
});

describe('assistLosses (AP-172)', () => {
  it('is empty in the default save and in an old save without the field', () => {
    expect(defaultSave().assistLosses ?? {}).toEqual({});
    expect(loadSave(memory(JSON.stringify(v1))).assistLosses ?? {}).toEqual({});
    const old: Partial<SaveGame> = { ...valid };
    delete old.assistLosses;
    expect(loadSave(memory(JSON.stringify(old))).assistLosses ?? {}).toEqual({});
  });
  it('round-trips valid entries', () => {
    const s = memory();
    expect(writeSave({ ...valid, assistLosses: { '0': 2, '7': 5 } }, s)).toBe(true);
    expect(loadSave(s).assistLosses).toEqual({ '0': 2, '7': 5 });
  });
  it.each([1, 'x', null, [], [3], true])('treats %j as empty', (bad) => {
    const l = loadSave(memory(JSON.stringify({ ...valid, assistLosses: bad })));
    expect(l.assistLosses ?? {}).toEqual({});
  });
  it('drops unknown level ids and broken counts, keeps the rest', () => {
    const raw = {
      '1': 3,
      '41': 2,
      '-1': 2,
      abc: 2,
      '2': 0,
      '3': 1.5,
      '4': '2',
      '5': -1,
      '6': 1000,
      '07': 2,
    };
    const l = loadSave(memory(JSON.stringify({ ...valid, assistLosses: raw })));
    expect(l.assistLosses).toEqual({ '1': 3, '7': 2 });
    expect(l.gold).toBe(120);
  });
  it('reset deletes the field', () => {
    const s = memory();
    writeSave({ ...valid, assistLosses: { '1': 4 } }, s);
    resetSave(s);
    expect(loadSave(s).assistLosses ?? {}).toEqual({});
  });
});

import { describe, expect, it } from 'vitest';
import type { SaveGame } from '../../src/contracts';
import { defaultSave } from '../../src/platform/storage';
import { gearModifiers } from '../../src/logic/gear';
import {
  applyChoice,
  canBrowse,
  currentIndex,
  effectLines,
  gearSummary,
  nextFocusRow,
  nothingOwned,
  PET_OFFSET,
  previewLayers,
  previewPetPlacement,
  rowOptions,
  setSticker,
  statLines,
  stepIndex,
  stepRow,
  wrapLine,
} from '../../src/scenes/menu/gearPanelLogic';
import panelSource from '../../src/scenes/menu/GearPanel.ts?raw';
import previewSource from '../../src/scenes/menu/GearPreview.ts?raw';

const save = (extra: Partial<SaveGame> = {}): SaveGame => ({ ...defaultSave(), ...extra });
const none = { head: null, body: null, legs: null };

describe('stepIndex', () => {
  it('wraps at both ends', () => {
    expect(stepIndex(3, 2, 1)).toBe(0);
    expect(stepIndex(3, 0, -1)).toBe(2);
    expect(stepIndex(3, 0, 1)).toBe(1);
  });
  it('stays at 0 with only KEINS', () => {
    expect(stepIndex(1, 0, 1)).toBe(0);
    expect(stepIndex(0, 0, -1)).toBe(0);
  });
});

describe('rowOptions', () => {
  it('shows only KEINS without purchases', () => {
    const s = save();
    for (const row of ['head', 'body', 'legs', 'pet', 'petGear'] as const) {
      expect(rowOptions(s, row)).toEqual([{ id: null, label: 'KEINS' }]);
      expect(canBrowse(s, row)).toBe(false);
    }
    expect(nothingOwned(s)).toBe(true);
  });
  it('lists only owned pieces of the slot', () => {
    const s = save({ owned: ['gear-hell-head', 'gear-diamond-head', 'gear-hell-body'] });
    expect(rowOptions(s, 'head').map((o) => o.id)).toEqual([
      null,
      'gear-diamond-head',
      'gear-hell-head',
    ]);
    expect(rowOptions(s, 'legs').map((o) => o.id)).toEqual([null]);
    expect(nothingOwned(s)).toBe(false);
  });
  it('pet armour offers only the active pet and is empty for pet KEINS', () => {
    const owned = ['egg-bee', 'petgear-bee-hell', 'petgear-penguin-diamond'];
    expect(rowOptions(save({ owned }), 'petGear').map((o) => o.id)).toEqual([null]);
    expect(rowOptions(save({ owned, activePet: 'bee' }), 'petGear').map((o) => o.id)).toEqual([
      null,
      'petgear-bee-hell',
    ]);
    expect(rowOptions(save({ owned, activePet: 'bee' }), 'petGear')[1]?.label).toBe('GLUT');
  });
  it('pets need a bought egg', () => {
    expect(rowOptions(save({ owned: ['egg-penguin'] }), 'pet').map((o) => o.id)).toEqual([
      null,
      'penguin',
    ]);
  });
});

describe('stepRow / applyChoice', () => {
  const owned = ['gear-hell-head', 'gear-diamond-head', 'egg-bee', 'petgear-bee-hell'];
  it('browses through owned pieces and back to KEINS', () => {
    let s = save({ owned });
    const seen: (string | null)[] = [];
    for (let i = 0; i < 3; i++) {
      const r = stepRow(s, 'head', 1);
      expect(r?.ok).toBe(true);
      s = r!.save;
      seen.push(s.equippedGear?.head ?? null);
    }
    expect(seen).toEqual(['gear-diamond-head', 'gear-hell-head', null]);
    expect(currentIndex(s, 'head')).toBe(0);
  });
  it('steps backwards from KEINS to the last piece', () => {
    const r = stepRow(save({ owned }), 'head', -1);
    expect(r?.save.equippedGear?.head).toBe('gear-hell-head');
  });
  it('returns null when only KEINS exists', () => {
    expect(stepRow(save(), 'body', 1)).toBeNull();
  });
  it('rejects pieces that are not owned or in the wrong slot', () => {
    const s = save({ owned });
    expect(applyChoice(s, 'head', 'gear-hell-body')).toMatchObject({
      ok: false,
      reason: 'wrong-slot',
    });
    expect(applyChoice(s, 'legs', 'gear-hell-legs')).toMatchObject({
      ok: false,
      reason: 'not-owned',
    });
  });
  it('sets pet and pet armour; armour needs an active pet', () => {
    const s = save({ owned });
    expect(applyChoice(s, 'petGear', 'petgear-bee-hell').ok).toBe(false);
    const withPet = applyChoice(s, 'pet', 'bee');
    expect(withPet.save.activePet).toBe('bee');
    const withGear = applyChoice(withPet.save, 'petGear', 'petgear-bee-hell');
    expect(withGear.save.petGear?.bee).toBe('petgear-bee-hell');
    expect(applyChoice(withGear.save, 'pet', null).save.activePet).toBeNull();
  });
  it('every combination of owned parts is selectable', () => {
    const all = save({
      owned: [
        'gear-hell-head',
        'gear-diamond-body',
        'gear-heaven-legs',
        'egg-bee',
        'petgear-bee-diamond',
      ],
    });
    let s = applyChoice(all, 'head', 'gear-hell-head').save;
    s = applyChoice(s, 'body', 'gear-diamond-body').save;
    s = applyChoice(s, 'legs', 'gear-heaven-legs').save;
    s = applyChoice(s, 'pet', 'bee').save;
    s = applyChoice(s, 'petGear', 'petgear-bee-diamond').save;
    expect(s.equippedGear).toEqual({
      head: 'gear-hell-head',
      body: 'gear-diamond-body',
      legs: 'gear-heaven-legs',
    });
    expect(s.activePet).toBe('bee');
    expect(s.petGear?.bee).toBe('petgear-bee-diamond');
  });
});

describe('nextFocusRow', () => {
  it('skips rows that cannot browse and wraps', () => {
    const s = save({ owned: ['gear-hell-head', 'gear-hell-legs'] });
    expect(nextFocusRow(s, -1, 1)).toBe(0);
    expect(nextFocusRow(s, 0, 1)).toBe(2);
    expect(nextFocusRow(s, 2, 1)).toBe(0);
    expect(nextFocusRow(s, 0, -1)).toBe(2);
    expect(nextFocusRow(save(), -1, 1)).toBe(-1);
  });
});

describe('texts', () => {
  it('lists values of the hell head and body plus diamond legs', () => {
    const m = gearModifiers({
      head: 'gear-hell-head',
      body: 'gear-hell-body',
      legs: 'gear-diamond-legs',
    });
    expect(statLines(m)).toEqual(['+10 MAX. HP', '+21 % SCHADEN']);
    expect(effectLines(m)).toEqual(['KRITISCH 10 %', 'BRAND', 'RÜCKSTOSS']);
  });
  it('shows a damage reduction and a neutral state', () => {
    expect(statLines(gearModifiers({ head: null, body: 'gear-diamond-body', legs: null }))).toEqual(
      ['-10 % ERHALTENER SCHADEN'],
    );
    expect(gearSummary(none)).toEqual({ values: 'WERTE: KEINE', effects: 'EFFEKTE: KEINE' });
  });
  it('adds the set effect for a full set', () => {
    const e = effectLines(
      gearModifiers({
        head: 'gear-diamond-head',
        body: 'gear-diamond-body',
        legs: 'gear-diamond-legs',
      }),
    );
    expect(e[e.length - 1]).toBe('SET: BLOCK ALLE 30 S');
  });
  it('wraps long lines at the separator', () => {
    const lines = wrapLine('EFFEKTE: AAAAAAAAAA · BBBBBBBBBB · CCCCCCCCCC', 30);
    expect(lines).toEqual(['EFFEKTE: AAAAAAAAAA', '  BBBBBBBBBB · CCCCCCCCCC']);
  });
});

describe('setSticker', () => {
  it('is null without a started set', () => {
    expect(setSticker(none)).toBeNull();
  });
  it('shows progress and the missing piece', () => {
    const s = setSticker({
      head: 'gear-hell-head',
      body: 'gear-hell-body',
      legs: 'gear-diamond-legs',
    });
    expect(s).toMatchObject({
      set: 'hell',
      text: 'SET HÖLLE 2/3',
      countText: '2/3',
      missing: 'FEHLT: LAVASTIEFEL',
    });
  });
  it('has no missing piece for a full set', () => {
    const s = setSticker({
      head: 'gear-heaven-head',
      body: 'gear-heaven-body',
      legs: 'gear-heaven-legs',
    });
    expect(s).toMatchObject({ text: 'SET HIMMEL 3/3', missing: null });
  });
});

describe('previewLayers', () => {
  it('orders legs, body, head', () => {
    const l = previewLayers(
      { head: 'gear-hell-head', body: 'gear-hell-body', legs: 'gear-diamond-legs' },
      null,
      null,
    );
    expect(l.gear).toEqual(['gear-diamond-legs', 'gear-hell-body', 'gear-hell-head']);
    expect(l.pet).toBeNull();
  });
  it('adds the pet and its armour only for the matching pet', () => {
    expect(previewLayers(none, 'bee', 'petgear-bee-hell')).toMatchObject({
      pet: 'pet-bee',
      petGear: 'petgear-bee-hell',
    });
    expect(previewLayers(none, 'penguin', 'petgear-bee-hell').petGear).toBeNull();
    expect(previewLayers(none, null, 'petgear-bee-hell').petGear).toBeNull();
  });
});

describe('previewPetPlacement', () => {
  it('keeps the default offset without a fit (window 4, result 3)', () => {
    expect(PET_OFFSET).toEqual({ x: 22, y: 17 });
    expect(previewPetPlacement(4, false)).toEqual({ x: 88, y: 68 });
    expect(previewPetPlacement(3, true)).toEqual({ x: -66, y: 51 });
  });
  it('places the pet fully inside the 64x64 card frame, margin >= 2 px, face mostly free', () => {
    for (const flipX of [false, true]) {
      const p = previewPetPlacement(2, flipX, { w: 64, h: 64 });
      const half = 16; // 16x16 pet at scale 2
      expect(32 - (Math.abs(p.x) + half)).toBeGreaterThanOrEqual(2);
      expect(32 - (p.y + half)).toBeGreaterThanOrEqual(2);
      expect(Math.sign(p.x)).toBe(flipX ? -1 : 1);
      // pet top edge at or below the astronaut centre line: head half stays uncovered
      expect(p.y - half).toBeGreaterThanOrEqual(-2);
    }
  });
});

describe('sources', () => {
  it('panel saves after every change and closes on ESC', () => {
    expect(panelSource).toContain('writeSave(result.save)');
    expect(panelSource).toContain('KeyCodes.ESC');
    expect(panelSource).toContain('export function openGearPanel');
  });
  it('preview puts the layers above the astronaut and honours reduced motion', () => {
    expect(previewSource).toContain("['astronaut', ...layers.gear]");
    expect(previewSource).toContain('prefersReducedMotion()');
    expect(previewSource).toContain('setFlipX');
  });
});

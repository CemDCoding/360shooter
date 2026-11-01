import { describe, expect, it } from 'vitest';
import funkXml from '../../public/assets/fonts/astro-funk.xml?raw';
import kapselXml from '../../public/assets/fonts/astro-kapsel.xml?raw';
import {
  CARD_BUTTON_GAP,
  CARD_BUTTON_H,
  CARD_FOCUS_ORDER,
  FIRST_WIN_NOTE,
  LAST_LEVEL_NOTE,
  POP_STEPS,
  cardRows,
  diamondFact,
  markerFrame,
  popDelays,
  stepCardFocus,
  suitLine,
  weaponLine,
} from '../../src/scenes/menu/homeLogic';

function advances(xml: string): Map<number, number> {
  const m = new Map<number, number>();
  for (const c of xml.matchAll(/<char id="(\d+)"[^>]*xadvance="(\d+)"/g)) {
    m.set(Number(c[1]), Number(c[2]));
  }
  return m;
}
const kapsel = advances(kapselXml);
const funk = advances(funkXml);
const width = (map: Map<number, number>, text: string, scale: number): number => {
  let w = 0;
  for (const ch of text.toUpperCase()) {
    const adv = map.get(ch.codePointAt(0) ?? 0);
    expect(adv, `glyph "${ch}" missing`).toBeDefined();
    w += adv ?? 0;
  }
  return w * scale;
};

// Menu card geometry (MenuScene PROFILE): x 16, y 52, w 184, h 252, pad 12.
const CARD = { y: 52, h: 252, pad: 12, innerW: 184 - 24 };

describe('markerFrame (diamond ticks on the level tiles)', () => {
  it('won levels are filled, open ones hollow, locked ones have none', () => {
    expect(markerFrame(2, 5, [0, 1, 2, 3, 4])).toBe(0);
    expect(markerFrame(5, 5, [0, 1, 2, 3, 4])).toBe(1);
    expect(markerFrame(6, 5, [0, 1, 2, 3, 4])).toBeNull();
  });
  it('a free level without a win stays hollow, a won last level is filled', () => {
    expect(markerFrame(1, 5, [])).toBe(1);
    expect(markerFrame(1, 5, undefined)).toBe(1);
    expect(markerFrame(40, 40, [40])).toBe(0);
  });
});

describe('card focus order', () => {
  it('portrait, shop, upgrades, wrapping both ways', () => {
    expect(CARD_FOCUS_ORDER).toEqual(['portrait', 'shop', 'upgrades']);
    expect(stepCardFocus(-1, 1)).toBe(0);
    expect(stepCardFocus(-1, -1)).toBe(2);
    expect(stepCardFocus(0, 1)).toBe(1);
    expect(stepCardFocus(2, 1)).toBe(0);
    expect(stepCardFocus(0, -1)).toBe(2);
  });
});

describe('card layout', () => {
  const r = cardRows(CARD.y, CARD.h, CARD.pad);
  it('SHOP sits 12 above UPGRADES and both stay inside the card', () => {
    expect(r.upgradesY - CARD_BUTTON_H / 2 - (r.shopY + CARD_BUTTON_H / 2)).toBe(CARD_BUTTON_GAP);
    expect(CARD_BUTTON_GAP).toBe(12);
    expect(r.upgradesY + CARD_BUTTON_H / 2).toBeLessThanOrEqual(CARD.y + CARD.h - CARD.pad);
  });
  it('gold row and weapon row clear the SHOP button', () => {
    expect(r.goldY + 7).toBeLessThan(r.weaponY - 8);
    // weapon icon is 16 high
    expect(r.weaponY + 8).toBeLessThan(r.shopY - CARD_BUTTON_H / 2);
  });
  it('weapon and suit fit in one line (the 24 px weapon icon would not fit: 184 > 160)', () => {
    const w = width(kapsel, weaponLine(20), 1);
    const s = width(kapsel, suitLine(20), 1);
    expect(w + 6 + s).toBeLessThanOrEqual(CARD.innerW);
    expect(24 + 5 + w + 6 + s).toBeGreaterThan(CARD.innerW);
  });
  it('lines are written in one row as in the brief', () => {
    expect(weaponLine(9)).toBe('WAFFE 9/20');
    expect(suitLine(8)).toBe('ANZUG 8/20');
  });
  it('the diamond count (diamond 2x + up to 4 digits) leaves room beside the gold', () => {
    const diamonds = 16 + 4 + width(kapsel, '1000', 2);
    const gold = 22 + width(kapsel, '999', 2);
    expect(gold + 6 + diamonds).toBeLessThanOrEqual(CARD.innerW);
  });
});

describe('diamondFact (result row)', () => {
  it('first win of a normal level', () => {
    expect(diamondFact(1, 13)).toEqual({ badge: '+1', note: `${FIRST_WIN_NOTE} · GESAMT 13` });
  });
  it('last level of a map gives +3 with its own note', () => {
    expect(diamondFact(3, 15)).toEqual({ badge: '+3', note: `${LAST_LEVEL_NOTE} · GESAMT 15` });
  });
  it('nothing gained means no row', () => {
    expect(diamondFact(0, 12)).toBeNull();
    expect(diamondFact(undefined, 12)).toBeNull();
    expect(diamondFact(-1, 12)).toBeNull();
    expect(diamondFact(Number.NaN, 12)).toBeNull();
  });
  it('a bad total counts as 0', () => {
    expect(diamondFact(1, 'x')?.note.endsWith('GESAMT 0')).toBe(true);
  });
  it('the longest row fits next to the facts (Funk 1x, 640 wide, side 32)', () => {
    const badge = width(funk, '+3', 2) + 8;
    const note = width(funk, diamondFact(3, 1000)?.note ?? '', 1);
    expect(182 + 22 + badge + 8 + note).toBeLessThanOrEqual(640 - 32);
  });
});

describe('popDelays', () => {
  it('four steps over the token duration', () => {
    expect(popDelays(200, false)).toEqual([50, 100, 150, 200]);
    expect(POP_STEPS).toBe(4);
  });
  it('shows instantly without motion', () => {
    expect(popDelays(200, true)).toEqual([0]);
  });
});

describe('level grid legend', () => {
  it('four entries fit the 408 wide panel', () => {
    // entry = icon 12 + caption + gap 14 (LevelGrid.addLegend), start x 8
    const captions = ['GESCHAFFT', 'DIAMANT OFFEN', 'AKTUELL', 'GESPERRT'];
    const total = captions.reduce((x, c) => x + 12 + width(kapsel, c, 1) + 14, 8);
    expect(total - 14).toBeLessThanOrEqual(408 - 8);
  });
});

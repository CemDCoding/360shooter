import { describe, expect, it } from 'vitest';
import fontXml from '../../public/assets/fonts/astro-kapsel.xml?raw';
import shopSource from '../../src/scenes/menu/ShopPanel.ts?raw';
import { SHOP_ITEMS } from '../../src/config/shop';
import type { SaveGame } from '../../src/contracts';
import { buy } from '../../src/logic/shop';
import {
  effectText,
  countDownValue,
  focusCount,
  infoView,
  nameScale,
  INFO_ROOM,
  moveFocus,
  shopLayout,
  SHOP_PANEL,
  tabItemIds,
  tileRects,
  tileView,
} from '../../src/scenes/menu/shopLogic';

const base = (over: Partial<SaveGame> = {}): SaveGame =>
  ({ diamonds: 10, owned: [], ...over }) as SaveGame;

describe('shop layout', () => {
  it('panel fits 640x360 with the brief measures', () => {
    expect(SHOP_PANEL.x + SHOP_PANEL.w).toBe(624);
    expect(SHOP_PANEL.y + SHOP_PANEL.h).toBe(348);
    const l = shopLayout();
    expect(l.info.h).toBe(48);
    expect(l.head.h).toBe(32);
    expect(l.info.y + l.info.h).toBeLessThanOrEqual(SHOP_PANEL.y + SHOP_PANEL.h - SHOP_PANEL.pad);
  });

  it('grids fit the area without scrolling', () => {
    const l = shopLayout();
    for (const tab of ['egg', 'gear', 'petGear'] as const) {
      const rs = tileRects(tab, l.grid);
      expect(rs).toHaveLength(tab === 'egg' ? 3 : 9);
      for (const r of rs) {
        expect(r.x).toBeGreaterThanOrEqual(l.grid.x);
        expect(r.x + r.w).toBeLessThanOrEqual(l.grid.x + l.grid.w);
        expect(r.y + r.h).toBeLessThanOrEqual(l.grid.y + l.grid.h);
        expect(r.w).toBeGreaterThanOrEqual(32);
      }
    }
    expect(tileRects('gear', l.grid)[0]?.h).toBe(50);
  });

  it('every tab lists existing shop items', () => {
    const all = new Set(SHOP_ITEMS.map((i) => i.id));
    expect(tabItemIds('gear')).toHaveLength(9);
    expect(tabItemIds('petGear')).toHaveLength(9);
    expect(tabItemIds('egg')).toHaveLength(3);
    for (const id of [...tabItemIds('gear'), ...tabItemIds('petGear'), ...tabItemIds('egg')])
      expect(all.has(id)).toBe(true);
  });
});

describe('tile and info states', () => {
  it('start: nothing selected, no button', () => {
    const v = infoView(base(), null);
    expect(v.lines).toEqual(['WÄHLE EINEN ARTIKEL.']);
    expect(v.button.kind).toBe('none');
  });

  it('buy, too little, owned', () => {
    expect(infoView(base(), 'gear-hell-head').button).toMatchObject({ kind: 'buy', price: 3 });
    const poor = infoView(base({ diamonds: 1 }), 'gear-hell-head');
    expect(poor.button.kind).toBe('short');
    expect(poor.lines).toHaveLength(2);
    expect(poor.lines[1]).toBe('ES FEHLEN 2 DIAMANTEN.');
    const own = infoView(base({ owned: ['gear-hell-head'] }), 'gear-hell-head');
    expect(own.button.kind).toBe('owned');
    expect(own.lines[1]).toBe('ANLEGEN: TIPPE AUF DEIN PORTRÄT.');
  });

  it('pet gear without egg is buyable and says so', () => {
    const v = infoView(base(), 'petgear-bee-hell');
    expect(v.button.kind).toBe('buy');
    expect(v.lines).toContain('PET NOCH NICHT GEKAUFT');
    expect(infoView(base({ owned: ['egg-bee'] }), 'petgear-bee-hell').lines).not.toContain(
      'PET NOCH NICHT GEKAUFT',
    );
  });

  it('all lines are at most two and 40 characters', () => {
    for (const i of SHOP_ITEMS)
      for (const s of [base(), base({ diamonds: 0 }), base({ owned: [i.id] })]) {
        const v = infoView(s, i.id);
        expect(v.lines.length).toBeLessThanOrEqual(2);
        for (const l of v.lines) expect(l.length).toBeLessThanOrEqual(40);
      }
  });

  it('pet gear names use the pet gear set labels', () => {
    expect(infoView(base(), 'petgear-bee-diamond').name).toBe('BIENE · KRISTALL');
    expect(infoView(base(), 'petgear-bee-hell').name).toBe('BIENE · GLUT');
  });

  it('tile view', () => {
    const s = base({ owned: ['egg-bee'] });
    expect(tileView(s, 'egg-bee', null)).toBe('owned');
    expect(tileView(s, 'egg-bee', 'egg-bee')).toBe('selected-owned');
    expect(tileView(s, 'egg-penguin', 'egg-penguin')).toBe('selected');
    expect(tileView(s, 'egg-penguin', null)).toBe('buyable');
  });
});

describe('info row name never runs under the button', () => {
  const adv = new Map<number, number>();
  for (const m of fontXml.matchAll(/<char id="(\d+)"[^>]*xadvance="(\d+)"/g))
    adv.set(Number(m[1]), Number(m[2]));
  const width = (t: string, scale: number): number =>
    [...t].reduce((n, c) => n + (adv.get(c.charCodeAt(0)) ?? 6), 0) * scale;

  it('fits for all items and button states', () => {
    for (const i of SHOP_ITEMS) {
      const states: [string, SaveGame, number][] = [
        ['buy', base(), 14],
        ['short', base({ diamonds: 0 }), 0],
        ['owned', base({ owned: [i.id] }), 14],
      ];
      for (const [, save, lead] of states) {
        const v = infoView(save, i.id);
        if (v.button.kind === 'none') continue;
        const bw = Math.max(112, width(v.button.label, 2) + lead + 20);
        const scale = nameScale(width(v.name, 2), bw);
        expect(width(v.name, scale)).toBeLessThanOrEqual(INFO_ROOM - bw - 8);
      }
    }
  });
});

describe('buy rules used by the panel', () => {
  it('deducts exactly the price; double buy and too poor are impossible', () => {
    const r = buy(base(), 'gear-hell-head');
    expect(r.ok && r.save.diamonds).toBe(7);
    if (r.ok) expect(buy(r.save, 'gear-hell-head').ok).toBe(false);
    expect(buy(base({ diamonds: 2 }), 'gear-hell-head').ok).toBe(false);
  });
});

describe('focus and count down', () => {
  const f = { tabs: 3, tiles: 9, tileCols: 3, hasBuy: true };
  it('moves in rows, wraps and starts at the ends', () => {
    expect(focusCount(f)).toBe(14);
    expect(moveFocus(-1, 'ArrowRight', f)).toBe(0);
    expect(moveFocus(-1, 'ShiftTab', f)).toBe(13);
    expect(moveFocus(3, 'ArrowDown', f)).toBe(6);
    expect(moveFocus(9, 'ArrowDown', f)).toBe(10);
    expect(moveFocus(13, 'Tab', f)).toBe(0);
  });
  it('count down interpolates', () => {
    expect(countDownValue(10, 7, 0)).toBe(10);
    expect(countDownValue(10, 7, 1)).toBe(7);
    expect(countDownValue(10, 7, 2)).toBe(7);
  });
});

describe('ShopPanel source', () => {
  it('writes the save once per buy, has no confirm dialog, closes on ESC', () => {
    expect(shopSource.match(/writeSave\(/g)).toHaveLength(1);
    expect(shopSource).not.toContain('ConfirmDialog');
    expect(shopSource).toContain('KeyCodes.ESC');
    expect(shopSource).toContain('export function openShopPanel');
    expect(shopSource).toContain('prefersReducedMotion');
  });
  it('avoids reserved container field names', () => {
    expect(shopSource).not.toMatch(/private (readonly )?(w|count|next|prev|active)\b/);
  });
});

describe('armour effect texts (AP-171)', () => {
  it('thorns, burn and blast show the laser factor', () => {
    expect(effectText({ kind: 'thorns', damageFactor: 1 })).toContain('1 × LASER');
    expect(effectText({ kind: 'burn', durationMs: 3000, dpsFactor: 0.5 })).toContain('0.5 × LASER');
    expect(effectText({ kind: 'deathBlast', radiusPx: 40, damageFactor: 1.5 })).toContain(
      '1.5 × LASER',
    );
  });
});

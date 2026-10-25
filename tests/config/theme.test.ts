import { describe, expect, it } from 'vitest';
import { THEME, themeColor, type ColorName } from '../../src/config/theme';
// @ts-expect-error reines JS-Skript ohne Typen
import { buildTheme } from '../../scripts/build-theme.mjs';

// Kein @types/node im Projekt: minimale Typen fuer node:fs (Variable verhindert Typaufloesung).
interface Fs {
  readFileSync(p: URL, enc: string): string;
}
const fsName = 'node:fs';
const fs = (await import(/* @vite-ignore */ fsName)) as Fs;
const read = (rel: string): string =>
  fs.readFileSync(new URL(`../../${rel}`, import.meta.url), 'utf8').replace(/\r\n/g, '\n');

const json: unknown = JSON.parse(read('docs/design/export/tokens.resolved.json'));

describe('theme generation', () => {
  it('theme.ts is up to date with buildTheme(tokens.resolved.json)', () => {
    expect(read('src/config/theme.ts')).toBe((buildTheme as (j: unknown) => string)(json));
  });

  it('src/styles/tokens.css equals the design export', () => {
    expect(read('src/styles/tokens.css')).toBe(read('docs/design/export/tokens.css'));
  });

  it('starts with the generated-file header', () => {
    expect(read('src/config/theme.ts')).toMatch(/^\/\/ erzeugt, nicht von Hand ändern/);
  });
});

describe('THEME colors', () => {
  const entries = Object.entries(THEME.colors) as [
    string,
    { num: number; css: string; alpha?: number },
  ][];

  it('has matching num and css for every colour', () => {
    expect(entries.length).toBeGreaterThan(50);
    for (const [name, c] of entries) {
      expect(c.css, name).toMatch(/^#[0-9a-f]{6}$/);
      expect(c.num, name).toBe(parseInt(c.css.slice(1), 16));
    }
  });

  it('keeps alpha within 0..1 and only on alpha tokens', () => {
    for (const [name, c] of entries) {
      if (c.alpha !== undefined) {
        expect(c.alpha, name).toBeGreaterThanOrEqual(0);
        expect(c.alpha, name).toBeLessThanOrEqual(1);
      }
    }
    expect(themeColor('hud.glass').alpha).toBeCloseTo(0xb8 / 255, 3);
    expect(themeColor('menu.scrim').alpha).toBeCloseTo(0xcc / 255, 3);
    expect(themeColor('hud.scrim').alpha).toBeCloseTo(0xd9 / 255, 3);
    expect(themeColor('menu.bg').alpha).toBeUndefined();
  });

  it('contains the required names', () => {
    const required: ColorName[] = [
      'menu.bg',
      'menu.focus',
      'hud.focus',
      'hud.glass',
      'gold.400',
      'red.300',
      'game.laser-raygun',
      'game.shield-ring',
      'game.fire-ring',
      'game.firefly',
      'game.spore',
      'biome.forest-ground',
      'biome.night-ground',
      'biome.elf-ground',
    ];
    for (const n of required) expect(THEME.colors[n], n).toBeDefined();
  });

  it('takes values from the token file, not from hand', () => {
    expect(THEME.colors['menu.bg'].css).toBe('#1a0f24');
    expect(THEME.colors['menu.bg'].num).toBe(0x1a0f24);
    expect(THEME.colors['game.laser-raygun'].css).toBe('#ff8fae');
  });
});

describe('THEME other tokens', () => {
  it('has numeric spacing, sizes and times', () => {
    expect(THEME.spacePx['space.2']).toBe(8);
    expect(THEME.sizePx['size.target']).toBe(32);
    expect(THEME.sizeCount['size.energy-segments']).toBe(10);
    expect(THEME.motionMs['motion.base']).toBe(150);
    expect(THEME.font.family.menu[0]).toBe('Astro Kapsel');
  });

  it('rejects unknown names at type level', () => {
    // @ts-expect-error falscher Tokenname ist ein Typfehler
    const bad: ColorName = 'menu.nope';
    expect(bad).toBe('menu.nope');
  });
});

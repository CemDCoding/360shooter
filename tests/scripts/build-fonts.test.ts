import { describe, expect, it } from 'vitest';

// Kein @types/node im Projekt: minimale Typen (Variable verhindert Typaufloesung).
interface Bytes {
  equals(other: Bytes): boolean;
  toString(enc: string): string;
}
interface Spec {
  id: string;
  file: string;
  face: string;
}
interface Built {
  png: Bytes;
  xml: string;
  chars: number[];
}
interface Mod {
  FONTS: Spec[];
  loadFonts(): Record<string, unknown>;
  buildFont(font: unknown, spec: Spec): Built;
}
const imp = async (name: string): Promise<unknown> => import(/* @vite-ignore */ name);
const fs = (await imp('node:fs')) as { readFileSync(p: URL): Bytes };
const { FONTS, loadFonts, buildFont } = (await imp('../../scripts/build-fonts.mjs')) as Mod;

describe('build-fonts', () => {
  const fonts = loadFonts();

  it('builds identical bytes on every run', () => {
    for (const spec of FONTS) {
      const a = buildFont(fonts[spec.id], spec);
      const b = buildFont(fonts[spec.id], spec);
      expect(a.png.equals(b.png), spec.id).toBe(true);
      expect(a.xml, spec.id).toBe(b.xml);
    }
  });

  it('matches the committed files in public/assets/fonts', () => {
    for (const spec of FONTS) {
      const built = buildFont(fonts[spec.id], spec);
      const png = fs.readFileSync(
        new URL(`../../public/assets/fonts/${spec.file}.png`, import.meta.url),
      );
      const xml = fs.readFileSync(
        new URL(`../../public/assets/fonts/${spec.file}.xml`, import.meta.url),
      );
      expect(png.equals(built.png), `${spec.file}.png`).toBe(true);
      // Git darf die Zeilenenden umwandeln: nur den Inhalt vergleichen
      expect(xml.toString('utf8').replace(/\r\n/g, '\n'), `${spec.file}.xml`).toBe(built.xml);
    }
  });

  it('covers the game characters: Funk has the small s, Kapsel does not', () => {
    const kapsel = buildFont(fonts.kapsel, FONTS[0]).chars;
    const funk = buildFont(fonts.funk, FONTS[1]).chars;
    for (const ch of 'ABCDEFGHIJKLMNOPQRSTUVWXYZÄÖÜ0123456789/%:!.') {
      expect(kapsel, ch).toContain(ch.codePointAt(0));
      expect(funk, ch).toContain(ch.codePointAt(0));
    }
    expect(funk).toContain('s'.codePointAt(0));
    expect(kapsel).not.toContain('s'.codePointAt(0));
  });
});

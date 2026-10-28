import { describe, expect, it } from 'vitest';
import { ASSETS } from '../../src/config/assets';

// Kein @types/node im Projekt: minimale Typen fuer node:fs (Variable verhindert Typaufloesung).
interface Bytes {
  subarray(a: number, b: number): { toString(enc: string): string };
  readUInt32BE(o: number): number;
  readUInt32LE(o: number): number;
  readUInt16LE(o: number): number;
}
interface Fs {
  existsSync(p: URL): boolean;
  readFileSync(p: URL): Bytes;
}
const fsName = 'node:fs';
const fs = (await import(/* @vite-ignore */ fsName)) as Fs;
const existsSync = (rel: string): boolean =>
  fs.existsSync(new URL(`../../public/${rel}`, import.meta.url));
const readFileSync = (rel: string): Bytes =>
  fs.readFileSync(new URL(`../../public/${rel}`, import.meta.url));

describe('asset manifest', () => {
  it('has unique keys and paths', () => {
    expect(new Set(ASSETS.map((a) => a.key)).size).toBe(ASSETS.length);
    expect(new Set(ASSETS.map((a) => a.path)).size).toBe(ASSETS.length);
  });

  it('has a description for every entry', () => {
    for (const a of ASSETS) expect(a.description.length).toBeGreaterThan(0);
  });

  it('has an existing file for every entry', () => {
    for (const a of ASSETS) expect(existsSync(a.path), a.path).toBe(true);
  });

  it('has frame sizes that match the PNG size', () => {
    for (const a of ASSETS.filter((x) => x.kind === 'spritesheet')) {
      const buf = readFileSync(a.path);
      expect(buf.subarray(1, 4).toString('ascii'), a.path).toBe('PNG');
      const w = buf.readUInt32BE(16);
      const h = buf.readUInt32BE(20);
      expect(w, a.path).toBe((a.frameWidth ?? 0) * (a.frames ?? 0));
      expect(h, a.path).toBe(a.frameHeight);
    }
  });

  it('has the M2b coin and item assets with the expected frames', () => {
    const expected: Record<string, [number, number, number]> = {
      'item-double-shot': [16, 16, 2],
      'item-shield': [16, 16, 2],
      'item-rapid-fire': [16, 16, 2],
      'item-fire-ring': [16, 16, 2],
      'coin-small': [8, 8, 4],
      'coin-field': [6, 6, 4],
      'coin-big': [12, 12, 4],
    };
    for (const [key, [w, h, n]] of Object.entries(expected)) {
      const a = ASSETS.find((x) => x.key === key);
      expect(a, key).toBeDefined();
      expect([a?.frameWidth, a?.frameHeight, a?.frames], key).toEqual([w, h, n]);
    }
    for (const key of ['sfx-coin', 'sfx-shield-break']) {
      expect(ASSETS.find((x) => x.key === key)?.kind, key).toBe('audio');
    }
  });

  it('has the M2c design assets: weapon, icons and bitmap fonts', () => {
    const expected: Record<string, [number, number, number]> = {
      'weapon-raygun': [24, 16, 6],
      'ui-icons': [16, 16, 4],
    };
    for (const [key, [w, h, n]] of Object.entries(expected)) {
      const a = ASSETS.find((x) => x.key === key);
      expect(a?.kind, key).toBe('spritesheet');
      expect([a?.frameWidth, a?.frameHeight, a?.frames], key).toEqual([w, h, n]);
    }
    for (const key of ['astro-kapsel', 'astro-funk']) {
      const a = ASSETS.find((x) => x.key === key);
      expect(a?.kind, key).toBe('bitmapFont');
      expect(a?.path, key).toBe(`assets/fonts/${key}.png`);
      expect(a?.xmlPath, key).toBe(`assets/fonts/${key}.xml`);
      expect(existsSync(a?.xmlPath ?? ''), key).toBe(true);
    }
  });

  it('has valid mono 16-bit 44.1 kHz WAV files', () => {
    for (const a of ASSETS.filter((x) => x.kind === 'audio')) {
      const buf = readFileSync(a.path);
      expect(buf.subarray(0, 4).toString('ascii'), a.path).toBe('RIFF');
      expect(buf.readUInt16LE(22), a.path).toBe(1);
      expect(buf.readUInt32LE(24), a.path).toBe(44100);
      expect(buf.readUInt16LE(34), a.path).toBe(16);
    }
  });
});

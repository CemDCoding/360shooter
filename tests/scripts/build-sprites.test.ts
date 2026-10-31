import { describe, expect, it } from 'vitest';
import { ASSETS } from '../../src/config/assets';

// Kein @types/node im Projekt: minimale Typen (Variable verhindert Typaufloesung).
interface Bytes {
  length: number;
  equals(other: Bytes): boolean;
  readUInt32BE(offset: number): number;
  subarray(start: number, end?: number): Bytes;
  [index: number]: number;
}
interface Def {
  key: string;
  frameWidth: number;
  frameHeight: number;
  frames: number;
}
interface Sprite {
  frameWidth: number;
  frameHeight: number;
  palette: Record<string, string>;
  frames: string[][];
}
interface Built {
  png: Bytes;
  width: number;
  height: number;
}
interface Mod {
  SPRITE_KEYS: string[];
  loadSprites(): Record<string, Sprite>;
  buildSprite(sprite: Sprite | undefined, def: Def): Built;
}
const imp = async (name: string): Promise<unknown> => import(/* @vite-ignore */ name);
const fs = (await imp('node:fs')) as { readFileSync(p: URL): Bytes };
const zlib = (await imp('node:zlib')) as { inflateSync(b: Bytes): Bytes };
const { SPRITE_KEYS, loadSprites, buildSprite } = (await imp(
  '../../scripts/build-sprites.mjs',
)) as Mod;

const defs = ASSETS.filter((a) => a.kind === 'spritesheet') as unknown as Def[];

/** Maße und dekodierte RGBA-Pixel einer PNG (Filter 0, RGBA 8 Bit, ein IDAT-Block). */
function decode(png: Bytes): { width: number; height: number; rgba: number[] } {
  const width = png.readUInt32BE(16);
  const height = png.readUInt32BE(20);
  const idatLen = png.readUInt32BE(33);
  const raw = zlib.inflateSync(png.subarray(41, 41 + idatLen));
  const stride = width * 4 + 1;
  const rgba: number[] = [];
  for (let y = 0; y < height; y++) {
    expect(raw[y * stride]).toBe(0);
    for (let i = 1; i < stride; i++) rgba.push(raw[y * stride + i] as number);
  }
  return { width, height, rgba };
}

describe('build-sprites', () => {
  const sprites = loadSprites();

  it('loads exactly the sprites of the manifest with matching geometry', () => {
    expect(defs).toHaveLength(45);
    expect([...SPRITE_KEYS].sort()).toEqual(defs.map((d) => d.key).sort());
    for (const def of defs) {
      const s = sprites[def.key] as Sprite;
      expect(s, def.key).toBeDefined();
      expect(s.frameWidth).toBe(def.frameWidth);
      expect(s.frameHeight).toBe(def.frameHeight);
      expect(s.frames).toHaveLength(def.frames);
      for (const f of s.frames) {
        expect(f).toHaveLength(def.frameHeight);
        for (const row of f) expect(row).toHaveLength(def.frameWidth);
      }
    }
  });

  it('is deterministic and has the expected size', () => {
    for (const def of defs) {
      const a = buildSprite(sprites[def.key], def);
      const b = buildSprite(sprites[def.key], def);
      expect(a.png.equals(b.png)).toBe(true);
      expect(a.width).toBe(def.frameWidth * def.frames);
      expect(a.height).toBe(def.frameHeight);
    }
  });

  it('matches the committed PNGs in public/assets/sprites (size and RGBA pixels)', () => {
    for (const def of defs) {
      const built = decode(buildSprite(sprites[def.key], def).png);
      const committed = decode(
        fs.readFileSync(new URL(`../../public/assets/sprites/${def.key}.png`, import.meta.url)),
      );
      expect(committed.width, def.key).toBe(built.width);
      expect(committed.height, def.key).toBe(built.height);
      expect(committed.rgba.join(), `${def.key} ist veraltet: npm run sprites:build`).toBe(
        built.rgba.join(),
      );
    }
  });

  it('fails with a message on a missing palette char or wrong frame size', () => {
    const def = defs.find((d) => d.key === 'coin-small') as Def;
    const good = sprites[def.key] as Sprite;
    const badPalette: Sprite = { ...good, palette: {} };
    expect(() => buildSprite(badPalette, def)).toThrow(/Palettenzeichen/);
    expect(() => buildSprite({ ...good, frameWidth: good.frameWidth + 1 }, def)).toThrow(
      /Framegroesse/,
    );
    expect(() => buildSprite({ ...good, frames: good.frames.slice(1) }, def)).toThrow(/Frames/);
    expect(() => buildSprite(undefined, def)).toThrow(/fehlt/);
  });
});

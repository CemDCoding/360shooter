import { describe, expect, it } from 'vitest';
import { ASSETS, FINISHER_ATLASES } from '../../src/config/assets';

// Kein @types/node im Projekt: minimale Typen (Variable verhindert Typaufloesung).
interface Bytes {
  length: number;
  equals(other: Bytes): boolean;
  readUInt32BE(offset: number): number;
  toString(enc: string): string;
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
  loadSprites(paths?: string[]): Record<string, Sprite>;
  buildSprite(sprite: Sprite | undefined, def: Def): Built;
  buildAtlas(
    sprites: Record<string, Sprite>,
    sheets: readonly string[],
    imageName: string,
  ): { png: Bytes; json: string; width: number; height: number; count: number };
}
const imp = async (name: string): Promise<unknown> => import(/* @vite-ignore */ name);
const fs = (await imp('node:fs')) as { readFileSync(p: URL): Bytes };
const url = (await imp('node:url')) as { fileURLToPath(u: URL): string };
const zlib = (await imp('node:zlib')) as { inflateSync(b: Bytes): Bytes };
const { SPRITE_KEYS, loadSprites, buildSprite, buildAtlas } = (await imp(
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
    expect(defs).toHaveLength(139);
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
    // Builds every sprite twice, slow under load.
  }, 60_000);

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
  }, 60_000);

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

describe('finisher rig atlas (AP-183, PE-248, PE-252)', () => {
  const sprites = loadSprites();
  const atlasDef = FINISHER_ATLASES[0] as (typeof FINISHER_ATLASES)[number];
  const build = (): ReturnType<Mod['buildAtlas']> =>
    buildAtlas(sprites, atlasDef.sheets, `${atlasDef.key}.png`);

  it('is deterministic, one atlas of 116 images within 4096 px', () => {
    const a = build();
    const b = build();
    expect(a.png.equals(b.png)).toBe(true);
    expect(a.json).toBe(b.json);
    expect(a.count).toBe(116);
    expect(a.width).toBeLessThanOrEqual(4096);
    expect(a.height).toBeLessThanOrEqual(4096);
  });

  it('matches the committed atlas files', () => {
    const a = build();
    const png = fs.readFileSync(new URL(`../../public/${atlasDef.path}`, import.meta.url));
    const json = fs.readFileSync(new URL(`../../public/${atlasDef.jsonPath}`, import.meta.url));
    expect(
      png.equals(a.png),
      'finisher-rig-rootMonster.png ist veraltet: npm run sprites:build',
    ).toBe(true);
    expect(json.toString('utf8').split(String.fromCharCode(13)).join('')).toBe(a.json);
  });

  it('places no two images on top of each other', () => {
    const json = JSON.parse(build().json) as {
      frames: Record<string, { frame: { x: number; y: number; w: number; h: number } }>;
    };
    const r = Object.values(json.frames).map((f) => f.frame);
    for (let i = 0; i < r.length; i++) {
      for (let j = i + 1; j < r.length; j++) {
        const a = r[i] as (typeof r)[number];
        const b = r[j] as (typeof r)[number];
        const apart = a.x + a.w <= b.x || b.x + b.w <= a.x || a.y + a.h <= b.y || b.y + b.h <= a.y;
        expect(apart, `${i}/${j}`).toBe(true);
      }
    }
  });

  it('silhouettes have the same size and exactly the opaque pixels of their image, all white', () => {
    const sils = atlasDef.sheets.filter((k) => k.endsWith('-sil'));
    expect(sils).toHaveLength(18);
    for (const key of sils) {
      const sil = sprites[key] as Sprite;
      const base = sprites[key.slice(0, -4)] as Sprite;
      expect([sil.frameWidth, sil.frameHeight, sil.frames.length]).toEqual([
        base.frameWidth,
        base.frameHeight,
        base.frames.length,
      ]);
      sil.frames.forEach((rows, f) =>
        rows.forEach((row, y) => {
          for (let x = 0; x < row.length; x++) {
            const baseOpaque = (base.frames[f]?.[y]?.[x] ?? '.') !== '.';
            expect(row[x] !== '.', `${key} ${f}/${x}/${y}`).toBe(baseOpaque);
            if (row[x] !== '.') expect(sil.palette[row[x] as string], key).toBe('#ffffff');
          }
        }),
      );
    }
  });

  it('builds the new design file in under 1000 ms', () => {
    const file = url.fileURLToPath(
      new URL('../../docs/design/assets/sprites-m13.js', import.meta.url),
    );
    const t0 = Date.now();
    const only = loadSprites([file]);
    expect(Date.now() - t0).toBeLessThan(1000);
    expect(Object.keys(only)).toHaveLength(39);
  });
});

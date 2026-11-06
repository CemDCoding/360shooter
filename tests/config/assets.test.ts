import { describe, expect, it } from 'vitest';
import { ASSETS, FINISHER_ATLASES } from '../../src/config/assets';
import { GEAR_PIECES } from '../../src/config/gear';
import { PETS } from '../../src/config/pets';
import { SHOP_ITEMS } from '../../src/config/shop';

// Kein @types/node im Projekt: minimale Typen fuer node:fs (Variable verhindert Typaufloesung).
interface Bytes {
  subarray(a: number, b: number): { toString(enc: string): string };
  toString(enc: string): string;
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
  it('has a texture for every shop item and pet (AP-140)', () => {
    const keys = new Set(ASSETS.map((a) => a.key));
    for (const item of SHOP_ITEMS) expect(keys.has(item.id), item.id).toBe(true);
    for (const g of GEAR_PIECES) expect(keys.has(g.id), g.id).toBe(true);
    for (const p of PETS) {
      expect(keys.has(`pet-${p.id}`), p.id).toBe(true);
      expect(keys.has(`egg-${p.id}`), p.id).toBe(true);
    }
  });

  it('has unique keys and unique paths', () => {
    expect(new Set(ASSETS.map((a) => a.key)).size).toBe(ASSETS.length);
    expect(new Set(ASSETS.map((a) => a.path)).size).toBe(ASSETS.length);
  });

  it('has 267 sprites and the 20 desert sprites with their frames and sizes (AP-106)', () => {
    expect(ASSETS.filter((a) => a.kind === 'spritesheet')).toHaveLength(267);
    const expected: Record<string, [number, number, number]> = {
      'enemy-mummy': [32, 32, 4],
      'mummy-wrap': [16, 8, 2],
      'enemy-sand-worm': [24, 24, 4],
      'enemy-armadillo': [32, 32, 4],
      'enemy-camel': [32, 32, 4],
      'camel-spit': [8, 8, 2],
      'enemy-snake': [24, 24, 4],
      'enemy-archaeologist': [32, 32, 4],
      'enemy-sphinx': [48, 48, 4],
      'enemy-boar': [32, 32, 4],
      'enemy-bear': [32, 32, 4],
      'enemy-fairy': [24, 24, 4],
      'boss-sand-worm': [64, 64, 4],
      'boss-sand-worm-body': [32, 32, 3],
      'boss-guardian-dog': [64, 64, 4],
      'boss-pharaoh': [64, 64, 4],
      'boss-pharaoh-orb': [8, 8, 2],
      'tiles-desert': [32, 32, 4],
      'tiles-pyramids': [32, 32, 4],
      'tiles-oasis': [32, 32, 4],
    };
    for (const [key, [w, h, n]] of Object.entries(expected)) {
      const a = ASSETS.find((x) => x.key === key);
      expect(a?.kind, key).toBe('spritesheet');
      expect(a?.path, key).toBe(`assets/sprites/${key}.png`);
      expect(a?.description, key).not.toContain('Platzhalter');
      expect([a?.frameWidth, a?.frameHeight, a?.frames], key).toEqual([w, h, n]);
    }
  });

  it('has the M11/M12 sprites of brief H-43 and the three event sounds (AP-177)', () => {
    const expected: Record<string, [number, number, number]> = {
      'elite-crown': [9, 7, 1],
      'event-markers': [24, 24, 2],
    };
    for (const [key, [w, h, n]] of Object.entries(expected)) {
      const a = ASSETS.find((x) => x.key === key);
      expect(a?.kind, key).toBe('spritesheet');
      expect([a?.frameWidth, a?.frameHeight, a?.frames], key).toEqual([w, h, n]);
    }
    for (const key of ['sfx-event-swarm', 'sfx-event-ring', 'sfx-event-pincer']) {
      expect(ASSETS.find((x) => x.key === key)?.kind, key).toBe('audio');
    }
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

  it('has the 167 rig sheets of part 1 and 2 (AP-183, AP-185): parts with silhouette and ink sheet, effects, props', () => {
    const rig = ASSETS.filter((a) => a.key.startsWith('rig-'));
    // 10 + 8 + 7 + 9 + 4 + 8 + 6 = 52 part sheets (seg and shade count once), 3 sheets each, plus 11 effects and props
    expect(rig).toHaveLength(52 * 3 + 11);
    for (const suffix of ['-sil', '-ink']) {
      const derived = rig.filter((a) => a.key.endsWith(suffix));
      expect(derived).toHaveLength(52);
      for (const s of derived) {
        const base = ASSETS.find((a) => a.key === s.key.slice(0, -suffix.length));
        expect(base, s.key).toBeDefined();
        expect([s.frameWidth, s.frameHeight, s.frames], s.key).toEqual([
          base?.frameWidth,
          base?.frameHeight,
          base?.frames,
        ]);
      }
    }
    const partCount = (prefix: string): number =>
      rig.filter(
        (a) => a.key.startsWith(prefix) && !a.key.endsWith('-sil') && !a.key.endsWith('-ink'),
      ).length;
    expect(partCount('rig-astro-')).toBe(10);
    expect(partCount('rig-root-')).toBe(8);
    expect(partCount('rig-ghost-')).toBe(7);
    expect(partCount('rig-stone-')).toBe(9);
    expect(partCount('rig-worm-')).toBe(4);
    expect(partCount('rig-dog-')).toBe(8);
    expect(partCount('rig-pharaoh-')).toBe(6);
    const fx: Record<string, [number, number, number]> = {
      'rig-fx-root': [8, 8, 8],
      'rig-prop-rosehedge': [80, 28, 3],
      'rig-fx-ground-bulge': [48, 16, 3],
      'rig-fx-ghost': [8, 8, 4],
      'rig-fx-stone': [8, 8, 6],
      'rig-fx-worm': [8, 8, 5],
      'rig-prop-sandwave': [64, 20, 3],
      'rig-fx-dog': [8, 8, 5],
      'rig-prop-torch': [8, 16, 3],
      'rig-fx-pharaoh': [8, 8, 5],
      'rig-prop-riddle': [16, 16, 6],
    };
    for (const [key, size] of Object.entries(fx)) {
      const a = ASSETS.find((x) => x.key === key);
      expect([a?.frameWidth, a?.frameHeight, a?.frames], key).toEqual(size);
    }
    // blade and blade-arc got new sizes and one pose more (H-48, decision 7a)
    expect(ASSETS.find((a) => a.key === 'rig-astro-blade')).toMatchObject({
      frameWidth: 56,
      frameHeight: 9,
      frames: 4,
    });
    expect(ASSETS.find((a) => a.key === 'rig-astro-blade-arc')).toMatchObject({
      frameWidth: 63,
      frameHeight: 50,
      frames: 3,
    });
  });

  it('has one atlas per boss variant within the texture limit (AP-183, AP-185, PE-248, PE-252)', () => {
    expect(FINISHER_ATLASES.map((x) => x.key)).toEqual([
      'finisher-rig-rootMonster',
      'finisher-rig-forestGhost',
      'finisher-rig-giantStone',
      'finisher-rig-giantSandWorm',
      'finisher-rig-guardianDog',
      'finisher-rig-pharaoh',
    ]);
    const imageCounts: Record<string, number> = {
      'finisher-rig-rootMonster': 173,
      'finisher-rig-forestGhost': 187,
      'finisher-rig-giantStone': 177,
      'finisher-rig-giantSandWorm': 161,
      'finisher-rig-guardianDog': 197,
      'finisher-rig-pharaoh': 176,
    };
    for (const atlas of FINISHER_ATLASES) {
      expect(new Set(atlas.sheets).size, atlas.key).toBe(atlas.sheets.length);
      for (const s of atlas.sheets)
        expect(
          ASSETS.some((a) => a.key === s),
          s,
        ).toBe(true);
      // every atlas holds the astronaut with silhouettes and ink images
      for (const part of ['torso', 'blade', 'blade-arc']) {
        for (const suffix of ['', '-sil', '-ink'])
          expect(atlas.sheets, atlas.key).toContain(`rig-astro-${part}${suffix}`);
      }
      const png = readFileSync(atlas.path);
      const w = png.readUInt32BE(16);
      const h = png.readUInt32BE(20);
      expect(w, atlas.key).toBeLessThanOrEqual(4096);
      expect(h, atlas.key).toBeLessThanOrEqual(4096);
      const json = JSON.parse(readFileSync(atlas.jsonPath).toString('utf8')) as {
        frames: Record<string, { frame: { x: number; y: number; w: number; h: number } }>;
      };
      const names = Object.keys(json.frames);
      expect(names, atlas.key).toHaveLength(imageCounts[atlas.key] as number);
      for (const sheet of atlas.sheets) {
        const def = ASSETS.find((a) => a.key === sheet);
        for (let i = 0; i < (def?.frames ?? 0); i++) {
          const name = `${sheet}-${i}`;
          const f = json.frames[name]?.frame;
          expect(f, name).toBeDefined();
          expect([f?.w, f?.h]).toEqual([def?.frameWidth, def?.frameHeight]);
          expect((f?.x ?? 0) + (f?.w ?? 0)).toBeLessThanOrEqual(w);
          expect((f?.y ?? 0) + (f?.h ?? 0)).toBeLessThanOrEqual(h);
        }
      }
      expect(names).toContain('rig-astro-torso-sil-0');
      expect(names).toContain('rig-astro-torso-ink-0');
    }
    const root = FINISHER_ATLASES[0];
    expect(root?.sheets).toHaveLength(57);
    expect(root?.sheets).toContain('rig-fx-root');
    // shared sheets only once per atlas
    const worm = FINISHER_ATLASES.find((a) => a.key === 'finisher-rig-giantSandWorm');
    expect(worm?.sheets.filter((k) => k === 'rig-worm-seg')).toHaveLength(1);
    const dog = FINISHER_ATLASES.find((a) => a.key === 'finisher-rig-guardianDog');
    expect(dog?.sheets.filter((k) => k === 'rig-dog-shade')).toHaveLength(1);
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

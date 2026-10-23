import { afterAll, describe, expect, it } from 'vitest';

// Kein @types/node im Projekt: minimale Typen (Variable verhindert Typaufloesung).
interface Buf {
  writeUInt32BE(v: number, o: number): void;
  writeUInt32LE(v: number, o: number): void;
  writeUInt16LE(v: number, o: number): void;
  write(s: string, o: number, enc: string): void;
  [i: number]: number;
}
interface BufferCtor {
  alloc(n: number): Buf;
}
interface Fs {
  mkdtempSync(prefix: string): string;
  mkdirSync(p: string, o: { recursive: boolean }): void;
  writeFileSync(p: string, d: Buf): void;
  rmSync(p: string, o: { recursive: boolean; force: boolean }): void;
}
interface Result {
  path: string;
  errors: string[];
  warnings: string[];
}
interface Def {
  key: string;
  kind: 'spritesheet' | 'audio';
  path: string;
  frameWidth?: number;
  frameHeight?: number;
  frames?: number;
  description: string;
}
type Check = (dir: string, assets: Def[]) => { results: Result[]; errorCount: number };

const imp = async (name: string): Promise<unknown> => import(/* @vite-ignore */ name);
const fs = (await imp('node:fs')) as Fs;
const os = (await imp('node:os')) as { tmpdir(): string };
const path = (await imp('node:path')) as { join(...p: string[]): string };
const { Buffer } = (await imp('node:buffer')) as unknown as { Buffer: BufferCtor };
const { checkAssets } = (await imp('../../scripts/check-assets.mjs')) as { checkAssets: Check };

const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'check-assets-'));
fs.mkdirSync(path.join(dir, 'assets', 'sprites'), { recursive: true });
fs.mkdirSync(path.join(dir, 'assets', 'sounds'), { recursive: true });
afterAll(() => fs.rmSync(dir, { recursive: true, force: true }));

function png(w: number, h: number, colorType = 6): Buf {
  const b = Buffer.alloc(33);
  [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a].forEach((v, i) => (b[i] = v));
  b.writeUInt32BE(w, 16);
  b.writeUInt32BE(h, 20);
  b[24] = 8;
  b[25] = colorType;
  return b;
}

function wav(channels: number, rate: number, bits: number, dataBytes = 100): Buf {
  const b = Buffer.alloc(44 + dataBytes);
  b.write('RIFF', 0, 'ascii');
  b.writeUInt32LE(36 + dataBytes, 4);
  b.write('WAVE', 8, 'ascii');
  b.write('fmt ', 12, 'ascii');
  b.writeUInt32LE(16, 16);
  b.writeUInt16LE(1, 20);
  b.writeUInt16LE(channels, 22);
  b.writeUInt32LE(rate, 24);
  b.writeUInt32LE((rate * channels * bits) / 8, 28);
  b.writeUInt16LE((channels * bits) / 8, 32);
  b.writeUInt16LE(bits, 34);
  b.write('data', 36, 'ascii');
  b.writeUInt32LE(dataBytes, 40);
  return b;
}

const sprite = (name: string): Def => ({
  key: name,
  kind: 'spritesheet',
  path: `assets/sprites/${name}.png`,
  frameWidth: 32,
  frameHeight: 32,
  frames: 4,
  description: 'Test',
});
const sound = (name: string): Def => ({
  key: `sfx-${name}`,
  kind: 'audio',
  path: `assets/sounds/${name}.wav`,
  description: 'Test',
});
const put = (rel: string, data: Buf): void => fs.writeFileSync(path.join(dir, rel), data);
const run = (a: Def): Result => checkAssets(dir, [a]).results[0];

describe('check-assets', () => {
  it('accepts a correct PNG and WAV', () => {
    put('assets/sprites/ok.png', png(128, 32));
    put('assets/sounds/ok.wav', wav(1, 44100, 16));
    expect(checkAssets(dir, [sprite('ok'), sound('ok')]).errorCount).toBe(0);
  });

  it('reports a PNG with the wrong size clearly', () => {
    put('assets/sprites/big.png', png(64, 64));
    const r = run(sprite('big'));
    expect(r.errors).toHaveLength(1);
    expect(r.errors[0]).toContain('Falsche Groesse: 64x64');
    expect(r.errors[0]).toContain('Erwartet: 128x32');
  });

  it('reports a missing file', () => {
    expect(run(sprite('missing')).errors[0]).toContain('Datei fehlt');
  });

  it('reports a non-PNG file', () => {
    put('assets/sprites/fake.png', wav(1, 44100, 16));
    expect(run(sprite('fake')).errors[0]).toContain('keine gueltige PNG');
  });

  it('warns about a PNG without alpha channel', () => {
    put('assets/sprites/noalpha.png', png(128, 32, 2));
    const r = run(sprite('noalpha'));
    expect(r.errors).toHaveLength(0);
    expect(r.warnings).toHaveLength(1);
  });

  it('reports stereo, wrong rate and wrong bit depth', () => {
    put('assets/sounds/bad.wav', wav(2, 48000, 24));
    const r = run(sound('bad'));
    expect(r.errors).toHaveLength(3);
    expect(r.errors.join(' ')).toContain('mono');
    expect(r.errors.join(' ')).toContain('48000');
    expect(r.errors.join(' ')).toContain('24 Bit');
  });

  it('reports a WAV without audio data', () => {
    put('assets/sounds/empty.wav', wav(1, 44100, 16, 0));
    expect(run(sound('empty')).errors[0]).toContain('keine Audiodaten');
  });

  it('reports a non-WAV file', () => {
    put('assets/sounds/fake.wav', png(1, 1));
    expect(run(sound('fake')).errors[0]).toContain('keine gueltige WAV');
  });
});

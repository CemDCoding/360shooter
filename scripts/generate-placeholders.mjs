// Erzeugt Platzhalter-PNGs und -WAVs fuer das Asset-Manifest (nur Node-Bordmittel).
// Schreibt nur fehlende Dateien. Mit --force werden nur Dateien ersetzt, die der Generator
// selbst erzeugt hat und die seither nicht veraendert wurden (Hash in .placeholders.json).
/* global console, process */
import { createHash } from 'node:crypto';
import { Buffer } from 'node:buffer';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { deflateSync } from 'node:zlib';
import { ASSETS } from '../src/config/assets.ts';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const publicDir = join(root, 'public');
const markerPath = join(publicDir, 'assets', '.placeholders.json');
const force = process.argv.includes('--force');

// ---------- PNG ----------
const crcTable = Array.from({ length: 256 }, (_, n) => {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});
function crc32(buf) {
  let c = 0xffffffff;
  for (const b of buf) c = crcTable[(c ^ b) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}
function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const td = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(td));
  return Buffer.concat([len, td, crc]);
}
function encodePng(width, height, rgba) {
  const stride = width * 4 + 1;
  const raw = Buffer.alloc(stride * height);
  for (let y = 0; y < height; y++) {
    raw[y * stride] = 0;
    rgba.copy(raw, y * stride + 1, y * width * 4, (y + 1) * width * 4);
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // RGBA
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw)),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

// ---------- Formen ----------
const SHAPES = ['circle', 'square', 'diamond', 'triangle'];

function drawFrame(px, sheetW, ox, fw, fh, key, frame, frames) {
  const h = createHash('sha256').update(key).digest();
  const color = [80 + (h[0] % 160), 80 + (h[1] % 160), 80 + (h[2] % 160)];
  const shape = SHAPES[h[3] % SHAPES.length];
  const isTiles = key.startsWith('tiles-');
  const wobble = frame % 2; // Frames leicht verschieden
  const cx = (fw - 1) / 2;
  const cy = (fh - 1) / 2 - wobble;
  const rx = Math.max(1, fw / 2 - 1 - wobble);
  const ry = Math.max(1, fh / 2 - 1 - wobble);
  const shade = 1 - 0.12 * (frame % frames);
  for (let y = 0; y < fh; y++) {
    for (let x = 0; x < fw; x++) {
      const dx = (x - cx) / rx;
      const dy = (y - cy) / ry;
      let inside;
      if (isTiles) inside = true;
      else if (shape === 'circle') inside = dx * dx + dy * dy <= 1;
      else if (shape === 'square') inside = Math.abs(dx) <= 1 && Math.abs(dy) <= 1;
      else if (shape === 'diamond') inside = Math.abs(dx) + Math.abs(dy) <= 1;
      else inside = Math.abs(dx) <= (dy + 1) / 2 && dy >= -1 && dy <= 1;
      if (!inside) continue;
      let c = color.map((v) => Math.round(v * shade));
      if (isTiles && ((x + y) % 8 === 0 || x === 0 || y === 0)) {
        c = c.map((v) => Math.round(v * 0.7));
      }
      // Weisse Markierung rechts zeigt die Blickrichtung
      const ex = cx + rx / 2;
      const ey = cy - ry / 3;
      if (!isTiles && fw >= 16 && fh >= 8 && Math.abs(x - ex) < 1.5 && Math.abs(y - ey) < 1.5) {
        c = [255, 255, 255];
      }
      const i = (y * sheetW + ox + x) * 4;
      px[i] = c[0];
      px[i + 1] = c[1];
      px[i + 2] = c[2];
      px[i + 3] = 255;
    }
  }
}

// ---------- Design-Vorlagen (docs/design/assets/pixel.js, mockups/sprites.html) ----------
// Die Vorlagen werden ganzzahlig 2x vergroessert (12x8 -> 24x16, 8x8 -> 16x16).
const hex = (s) => [1, 3, 5].map((i) => parseInt(s.slice(i, i + 2), 16));
const RAYGUN_PALETTE = {
  o: '#0b0610', // Tinte (Umriss der Waffe, Sprite-Styleguide)
  w: '#f4f1f8',
  l: '#c9c2d6',
  a: '#ff6b8a',
  x: '#ff8fae',
  y: '#fff3b0', // Muendungsleuchten im Schuss-Frame
};
const RAYGUN = [
  [
    '.ooo........',
    'owwwo.......',
    'owwwoooooo..',
    'owlwwwwwwoxo',
    'owwwoooooo..',
    '.owwo.......',
    '..owo.......',
    '..ooo.......',
  ],
  [
    '.oaao.......',
    'owwwo.......',
    'owwwoooooo..',
    'owlwawawaoxo',
    'owwwoooooo..',
    '.owwo.......',
    '..owo.......',
    '..ooo.......',
  ],
  [
    '.oaao.......',
    'owxwo.......',
    'owxwooooooxo',
    'owlwawawaoxo',
    'owwwooooooxo',
    '.owwo.......',
    '..owo.......',
    '..ooo.......',
  ],
];
const ICON_PALETTE = { o: '#14101c', k: '#e8ecf2' }; // Linie + Fuellung, Farben per Tint
const UI_ICONS = [
  // 0 Ton an
  ['....o...', '...oo..o', 'oooko.o.', 'okkko.o.', 'okkko.o.', 'oooko.o.', '...oo..o', '....o...'],
  // 1 Ton aus
  ['....o...', '...oo...', 'oookoo.o', 'okkko.o.', 'okkko.o.', 'oookoo.o', '...oo...', '....o...'],
  // 2 Pause
  ['ooo..ooo', 'oko..oko', 'oko..oko', 'oko..oko', 'oko..oko', 'oko..oko', 'oko..oko', 'ooo..ooo'],
  // 3 Schloss
  ['..oooo..', '.o....o.', '.o....o.', 'oooooooo', 'okkkkkko', 'okkookko', 'okkkkkko', 'oooooooo'],
];

/** Zeichnet Vorlagen (Zeichenraster) 2x vergroessert nebeneinander in ein Spritesheet. */
function makeFromTemplates(frames, palette, fw, fh) {
  const w = fw * frames.length;
  const px = Buffer.alloc(w * fh * 4);
  frames.forEach((rows, f) => {
    rows.forEach((row, ty) => {
      [...row].forEach((k, tx) => {
        if (k === '.') return;
        const c = hex(palette[k]);
        for (let dy = 0; dy < 2; dy++) {
          for (let dx = 0; dx < 2; dx++) {
            const i = ((ty * 2 + dy) * w + f * fw + tx * 2 + dx) * 4;
            px[i] = c[0];
            px[i + 1] = c[1];
            px[i + 2] = c[2];
            px[i + 3] = 255;
          }
        }
      });
    });
  });
  return encodePng(w, fh, px);
}
function makeRaygun(def) {
  // Je Ausbaustufe: Ruhe, Schuss (Muendung 'x' leuchtet im Schuss-Frame)
  const frames = RAYGUN.flatMap((rows) => [rows, rows.map((r) => r.replaceAll('x', 'y'))]);
  return makeFromTemplates(frames, RAYGUN_PALETTE, def.frameWidth, def.frameHeight);
}
function makeUiIcons(def) {
  return makeFromTemplates(UI_ICONS, ICON_PALETTE, def.frameWidth, def.frameHeight);
}
const SPECIAL = { 'weapon-raygun': makeRaygun, 'ui-icons': makeUiIcons };

function makeSprite(def) {
  if (SPECIAL[def.key]) return SPECIAL[def.key](def);
  const { frameWidth: fw, frameHeight: fh, frames } = def;
  const w = fw * frames;
  const px = Buffer.alloc(w * fh * 4);
  for (let f = 0; f < frames; f++) drawFrame(px, w, f * fw, fw, fh, def.key, f, frames);
  return encodePng(w, fh, px);
}

// ---------- WAV ----------
const SOUNDS = {
  'sfx-laser': { f0: 1400, f1: 500, dur: 0.12, wave: 'square' },
  'sfx-hit': { f0: 300, f1: 200, dur: 0.08, wave: 'square' },
  'sfx-enemy-death': { f0: 400, f1: 80, dur: 0.25, wave: 'saw' },
  'sfx-item-pickup': { f0: 600, f1: 1200, dur: 0.15, wave: 'sine' },
  'sfx-player-hurt': { f0: 200, f1: 100, dur: 0.2, wave: 'saw' },
  'sfx-round-won': { f0: 500, f1: 1000, dur: 0.5, wave: 'sine' },
  'sfx-round-lost': { f0: 400, f1: 100, dur: 0.6, wave: 'sine' },
  'sfx-coin': { f0: 900, f1: 1500, dur: 0.1, wave: 'square' },
  'sfx-shield-break': { f0: 700, f1: 150, dur: 0.3, wave: 'saw' },
};
function makeWav(spec) {
  const rate = 44100;
  const n = Math.floor(rate * spec.dur);
  const data = Buffer.alloc(n * 2);
  let phase = 0;
  for (let i = 0; i < n; i++) {
    const t = i / n;
    phase += (spec.f0 + (spec.f1 - spec.f0) * t) / rate;
    const p = phase % 1;
    let s;
    if (spec.wave === 'square') s = p < 0.5 ? 1 : -1;
    else if (spec.wave === 'saw') s = 2 * p - 1;
    else s = Math.sin(2 * Math.PI * p);
    data.writeInt16LE(Math.round(s * 0.3 * (1 - t) * 32767), i * 2);
  }
  const head = Buffer.alloc(44);
  head.write('RIFF', 0, 'ascii');
  head.writeUInt32LE(36 + data.length, 4);
  head.write('WAVEfmt ', 8, 'ascii');
  head.writeUInt32LE(16, 16);
  head.writeUInt16LE(1, 20); // PCM
  head.writeUInt16LE(1, 22); // mono
  head.writeUInt32LE(rate, 24);
  head.writeUInt32LE(rate * 2, 28);
  head.writeUInt16LE(2, 32);
  head.writeUInt16LE(16, 34);
  head.write('data', 36, 'ascii');
  head.writeUInt32LE(data.length, 40);
  return Buffer.concat([head, data]);
}

// ---------- Hauptlauf ----------
const sha = (buf) => createHash('sha256').update(buf).digest('hex');
const marker = existsSync(markerPath) ? JSON.parse(readFileSync(markerPath, 'utf8')) : {};
let written = 0;
for (const def of ASSETS) {
  if (def.kind === 'bitmapFont') continue; // Schriften entstehen nur mit "npm run fonts:build"
  const file = join(publicDir, def.path);
  const content = def.kind === 'audio' ? makeWav(SOUNDS[def.key]) : makeSprite(def);
  let write = false;
  if (!existsSync(file)) write = true;
  // --force: nur Dateien, die der Generator erzeugt hat und die unveraendert sind
  else if (force && marker[def.path] === sha(readFileSync(file))) write = true;
  if (!write) continue;
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(file, content);
  marker[def.path] = sha(content);
  written++;
}
const sorted = Object.fromEntries(Object.entries(marker).sort(([a], [b]) => a.localeCompare(b)));
const markerText = JSON.stringify(sorted, null, 2) + '\n';
if (!existsSync(markerPath) || readFileSync(markerPath, 'utf8') !== markerText) {
  mkdirSync(dirname(markerPath), { recursive: true });
  writeFileSync(markerPath, markerText);
}
console.log(`Placeholders written: ${written} of ${ASSETS.length}`);

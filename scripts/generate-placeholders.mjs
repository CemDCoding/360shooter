// Erzeugt Platzhalter-WAVs (Toene) fuer das Asset-Manifest (nur Node-Bordmittel).
// Sprites entstehen nur mit "npm run sprites:build", Schriften mit "npm run fonts:build".
// Schreibt nur fehlende Dateien. Mit --force werden nur Dateien ersetzt, die der Generator
// selbst erzeugt hat und die seither nicht veraendert wurden (Hash in .placeholders.json).
/* global console, process */
import { createHash } from 'node:crypto';
import { Buffer } from 'node:buffer';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { ASSETS } from '../src/config/assets.ts';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const publicDir = join(root, 'public');
const markerPath = join(publicDir, 'assets', '.placeholders.json');
const force = process.argv.includes('--force');

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
  'sfx-boss-warning': { f0: 300, f1: 900, dur: 0.6, wave: 'square' },
  'sfx-boss-defeated': { f0: 800, f1: 100, dur: 0.8, wave: 'saw' },
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
const audioPaths = new Set(ASSETS.filter((a) => a.kind === 'audio').map((a) => a.path));
// Nur Toene werden gefuehrt; alte Sprite-Eintraege fallen heraus.
const marker = Object.fromEntries(
  Object.entries(existsSync(markerPath) ? JSON.parse(readFileSync(markerPath, 'utf8')) : {}).filter(
    ([p]) => audioPaths.has(p),
  ),
);
let written = 0;
for (const def of ASSETS) {
  if (def.kind !== 'audio') continue; // Sprites: "npm run sprites:build", Schriften: "npm run fonts:build"
  const file = join(publicDir, def.path);
  const content = makeWav(SOUNDS[def.key]);
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
console.log(
  `Placeholders written: ${written} of ${ASSETS.filter((a) => a.kind === 'audio').length}`,
);

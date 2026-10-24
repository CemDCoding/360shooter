// Prueft alle Dateien des Asset-Manifests (PNG-Groesse, WAV-Format) und meldet Fehler auf Deutsch.
// Das Manifest wird direkt aus src/config/assets.ts gelesen (Node 24 entfernt die Typen selbst),
// genau wie in scripts/generate-placeholders.mjs. Es gibt keine zweite Liste.
// Aufruf: npm run assets:check  (Exit-Code 1 bei Fehlern)
/* global console, process */
import { Buffer } from 'node:buffer';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { ASSETS } from '../src/config/assets.ts';

const PNG_SIGNATURE = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];

function checkPng(buf, asset) {
  const errors = [];
  const warnings = [];
  const isPng = buf.length >= 33 && PNG_SIGNATURE.every((b, i) => buf[i] === b);
  if (!isPng) {
    errors.push(
      'Das ist keine gueltige PNG-Datei. Bitte als PNG exportieren (nicht nur umbenennen).',
    );
    return { errors, warnings };
  }
  const width = buf.readUInt32BE(16);
  const height = buf.readUInt32BE(20);
  const colorType = buf[25];
  const expW = asset.frameWidth * asset.frames;
  const expH = asset.frameHeight;
  if (width !== expW || height !== expH) {
    errors.push(
      `Falsche Groesse: ${width}x${height} Pixel. Erwartet: ${expW}x${expH} Pixel ` +
        `(${asset.frames} Frame(s) a ${asset.frameWidth}x${asset.frameHeight}, waagerecht nebeneinander).`,
    );
  }
  const hasAlpha = colorType === 4 || colorType === 6 || buf.includes(Buffer.from('tRNS'));
  if (!hasAlpha) {
    warnings.push('Die PNG hat keinen transparenten Hintergrund (kein Alphakanal).');
  }
  return { errors, warnings };
}

function checkWav(buf) {
  const errors = [];
  if (
    buf.length < 12 ||
    buf.toString('ascii', 0, 4) !== 'RIFF' ||
    buf.toString('ascii', 8, 12) !== 'WAVE'
  ) {
    errors.push(
      'Das ist keine gueltige WAV-Datei. Bitte als WAV exportieren (nicht nur umbenennen).',
    );
    return { errors, warnings: [] };
  }
  let fmt = null;
  let dataSize = null;
  let pos = 12;
  while (pos + 8 <= buf.length) {
    const id = buf.toString('ascii', pos, pos + 4);
    const size = buf.readUInt32LE(pos + 4);
    if (id === 'fmt ' && pos + 8 + 16 <= buf.length) {
      fmt = {
        format: buf.readUInt16LE(pos + 8),
        channels: buf.readUInt16LE(pos + 10),
        rate: buf.readUInt32LE(pos + 12),
        bits: buf.readUInt16LE(pos + 22),
      };
    } else if (id === 'data') {
      dataSize = size;
    }
    pos += 8 + size + (size % 2);
  }
  if (!fmt) {
    errors.push('Der WAV-Kopf ist beschaedigt (kein Format-Abschnitt gefunden).');
    return { errors, warnings: [] };
  }
  if (fmt.format !== 1) {
    errors.push('Die WAV ist nicht unkomprimiert (PCM). Bitte als 16-Bit-PCM-WAV exportieren.');
  }
  if (fmt.channels !== 1) errors.push(`Die WAV hat ${fmt.channels} Kanaele. Erwartet: mono.`);
  if (fmt.rate !== 44100) errors.push(`Falsche Abtastrate: ${fmt.rate} Hz. Erwartet: 44100 Hz.`);
  if (fmt.bits !== 16) errors.push(`Falsche Bittiefe: ${fmt.bits} Bit. Erwartet: 16 Bit.`);
  if (!dataSize) errors.push('Die WAV enthaelt keine Audiodaten (leer).');
  return { errors, warnings: [] };
}

/** Prueft alle Assets. Gibt { results: [{ path, errors, warnings }], errorCount } zurueck. */
export function checkAssets(publicDir, assets = ASSETS) {
  const results = [];
  for (const asset of assets) {
    const file = join(publicDir, asset.path);
    let r;
    if (!existsSync(file)) {
      r = { errors: ['Datei fehlt. Sie muss genau so heissen und hier liegen.'], warnings: [] };
    } else {
      const buf = readFileSync(file);
      r = asset.kind === 'spritesheet' ? checkPng(buf, asset) : checkWav(buf);
    }
    results.push({ path: asset.path, ...r });
  }
  const errorCount = results.reduce((n, r) => n + r.errors.length, 0);
  return { results, errorCount };
}

function main() {
  const root = join(dirname(fileURLToPath(import.meta.url)), '..');
  const { results, errorCount } = checkAssets(join(root, 'public'));
  for (const r of results) {
    for (const e of r.errors) console.error(`FEHLER   public/${r.path}: ${e}`);
    for (const w of r.warnings) console.warn(`HINWEIS  public/${r.path}: ${w}`);
  }
  const bad = results.filter((r) => r.errors.length > 0).length;
  if (errorCount > 0) {
    console.error(`\n${bad} von ${results.length} Dateien sind fehlerhaft. Bitte korrigieren.`);
    process.exit(1);
  }
  console.log(`Alles in Ordnung: ${results.length} Dateien geprueft.`);
}

if (process.argv[1] && fileURLToPath(import.meta.url) === join(process.argv[1])) main();

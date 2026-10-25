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
  // asset === null: Schrift-Atlas, dessen Groesse die XML bestimmt
  const expW = asset ? asset.frameWidth * asset.frames : width;
  const expH = asset ? asset.frameHeight : height;
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

/** Prueft Schrift-PNG (nur Format, Alpha) und die BMFont-XML (Zeichen eindeutig, im Bild). */
function checkBitmapFont(buf, xml) {
  const { errors, warnings } = checkPng(buf, null);
  if (errors.length > 0) return { errors, warnings };
  const imgW = buf.readUInt32BE(16);
  const imgH = buf.readUInt32BE(20);
  if (xml === null) {
    errors.push('Die XML-Datei der Schrift fehlt. Sie entsteht mit "npm run fonts:build".');
    return { errors, warnings };
  }
  if (!/<font[\s>]/.test(xml) || !/<\/font>/.test(xml) || !/<chars[\s>]/.test(xml)) {
    errors.push('Die XML-Datei der Schrift ist kaputt (kein <font> mit <chars>).');
    return { errors, warnings };
  }
  const common = /<common\b[^>]*>/.exec(xml);
  const scaleW = common && /\bscaleW="(\d+)"/.exec(common[0]);
  const scaleH = common && /\bscaleH="(\d+)"/.exec(common[0]);
  if (!scaleW || !scaleH) {
    errors.push('Die XML-Datei der Schrift ist kaputt (<common> ohne scaleW/scaleH).');
  } else if (Number(scaleW[1]) !== imgW || Number(scaleH[1]) !== imgH) {
    errors.push(
      `Die XML passt nicht zum Bild: scaleW/scaleH ${scaleW[1]}x${scaleH[1]}, das Bild ist ${imgW}x${imgH} Pixel.`,
    );
  }
  const tags = xml.match(/<char\b[^>]*\/?>/g) ?? [];
  if (tags.length === 0) errors.push('Die XML-Datei der Schrift enthaelt keine Zeichen.');
  const seen = new Set();
  const num = (tag, name) => {
    const m = new RegExp(`\\b${name}="(-?\\d+)"`).exec(tag);
    return m ? Number(m[1]) : null;
  };
  for (const tag of tags) {
    const [id, x, y, w, h] = ['id', 'x', 'y', 'width', 'height'].map((n) => num(tag, n));
    if ([id, x, y, w, h].some((v) => v === null)) {
      errors.push(`Ein Zeichen in der XML ist unvollstaendig: ${tag.trim()}`);
      continue;
    }
    if (seen.has(id)) errors.push(`Zeichen-ID ${id} kommt in der XML mehrfach vor.`);
    seen.add(id);
    if (x < 0 || y < 0 || w < 0 || h < 0 || x + w > imgW || y + h > imgH) {
      errors.push(
        `Zeichen ${id} liegt nicht im Bild (x=${x}, y=${y}, ${w}x${h}; Bild ${imgW}x${imgH}).`,
      );
    }
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
      if (asset.kind === 'spritesheet') r = checkPng(buf, asset);
      else if (asset.kind === 'bitmapFont') {
        const xmlFile = join(publicDir, asset.xmlPath ?? '');
        const xml = asset.xmlPath && existsSync(xmlFile) ? readFileSync(xmlFile, 'utf8') : null;
        r = checkBitmapFont(buf, xml);
      } else r = checkWav(buf);
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

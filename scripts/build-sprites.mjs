// Baut die Ingame-Sprites aus den Pixeldaten des Designs
// (docs/design/assets/sprites.js, sprites-world.js und sprites-desert.js, window.PX_SPRITES)
// nach public/assets/sprites/<key>.png (RGBA, Frames waagerecht nebeneinander).
// Die Framegroesse und -zahl werden gegen ASSETS (src/config/assets.ts) geprueft.
// Nur Node-Bordmittel, kein Netz. Die Ausgabe ist deterministisch (gleicher Lauf, gleiche Bytes).
// Aufruf: npm run sprites:build
/* global console, process */
import { Buffer } from 'node:buffer';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { runInNewContext } from 'node:vm';
import { deflateSync } from 'node:zlib';
import { ASSETS } from '../src/config/assets.ts';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
// Reihenfolge ist wichtig: sprites-world.js und sprites-desert.js ergaenzen window.PX_SPRITES aus sprites.js.
// PX_TOOLKIT aus sprites-desert.js ist kein Sprite-Schluessel und wird ignoriert (gebaut werden nur Manifest-Schluessel).
const SOURCES = [
  join(root, 'docs', 'design', 'assets', 'sprites.js'),
  join(root, 'docs', 'design', 'assets', 'sprites-world.js'),
  join(root, 'docs', 'design', 'assets', 'sprites-desert.js'),
];
const OUT_DIR = join(root, 'public', 'assets', 'sprites');

/** Alle Spritesheets des Manifests werden aus den Designer-Dateien gebaut. */
const BUILT_DEFS = ASSETS.filter((a) => a.kind === 'spritesheet');

/** Schluessel aller gebauten Sprites im Manifest. */
export const SPRITE_KEYS = BUILT_DEFS.map((a) => a.key);

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
    raw[y * stride] = 0; // Filter 0
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

// ---------- Sprites ----------
/** Liest window.PX_SPRITES aus den Designer-Dateien in einem leeren vm-Kontext (kein Node, kein Netz). */
export function loadSprites(sourcePaths = SOURCES) {
  const sandbox = { window: {} };
  for (const p of sourcePaths) {
    runInNewContext(readFileSync(p, 'utf8'), sandbox, { timeout: 1000 });
  }
  return sandbox.window.PX_SPRITES;
}

/** Prueft ein Sprite gegen die Manifest-Definition und erzeugt das PNG (Buffer) samt Massen. */
export function buildSprite(sprite, def) {
  const key = def.key;
  if (!sprite || !Array.isArray(sprite.frames) || !sprite.palette) {
    throw new Error(`Sprite "${key}" fehlt oder ist unvollstaendig in den Designer-Dateien.`);
  }
  const fw = def.frameWidth;
  const fh = def.frameHeight;
  if (sprite.frameWidth !== fw || sprite.frameHeight !== fh) {
    throw new Error(
      `Sprite "${key}": Framegroesse ${sprite.frameWidth}x${sprite.frameHeight} statt ${fw}x${fh}.`,
    );
  }
  if (sprite.frames.length !== def.frames) {
    throw new Error(`Sprite "${key}": ${sprite.frames.length} Frames statt ${def.frames}.`);
  }
  const width = fw * def.frames;
  const px = Buffer.alloc(width * fh * 4);
  sprite.frames.forEach((rows, f) => {
    if (!Array.isArray(rows) || rows.length !== fh) {
      throw new Error(`Sprite "${key}", Frame ${f}: ${rows?.length} Zeilen statt ${fh}.`);
    }
    rows.forEach((row, y) => {
      if (row.length !== fw) {
        throw new Error(
          `Sprite "${key}", Frame ${f}, Zeile ${y}: ${row.length} Zeichen statt ${fw}.`,
        );
      }
      for (let x = 0; x < fw; x++) {
        const ch = row[x];
        if (ch === '.') continue; // transparent
        const color = Object.hasOwn(sprite.palette, ch) ? sprite.palette[ch] : undefined;
        if (typeof color !== 'string' || !/^#[0-9a-fA-F]{6}$/.test(color)) {
          throw new Error(
            `Sprite "${key}", Frame ${f}, Zeile ${y}: Palettenzeichen "${ch}" fehlt oder ist keine #rrggbb-Farbe.`,
          );
        }
        const i = (y * width + f * fw + x) * 4;
        px[i] = parseInt(color.slice(1, 3), 16);
        px[i + 1] = parseInt(color.slice(3, 5), 16);
        px[i + 2] = parseInt(color.slice(5, 7), 16);
        px[i + 3] = 255;
      }
    });
  });
  return { png: encodePng(width, fh, px), width, height: fh };
}

function main() {
  const sprites = loadSprites();
  mkdirSync(OUT_DIR, { recursive: true });
  for (const def of BUILT_DEFS) {
    const { png, width, height } = buildSprite(sprites[def.key], def);
    writeFileSync(join(root, 'public', def.path), png);
    console.log(`wrote public/${def.path} (${width}x${height})`);
  }
}

if (process.argv[1] && fileURLToPath(import.meta.url) === join(process.argv[1])) main();

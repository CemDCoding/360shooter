// Rasterizes docs/design/assets/app-icon.svg to public/icons/icon-{180,192,512}.png.
// Node built-ins only (no dependencies). A tiny parser reads exactly what the template uses:
// <rect> (x, y, width, height, fill, opacity), <g transform="translate(x y)"> and comments.
// Anything else stops the script with an error (no silent guessing). Nearest neighbour, so
// the pixel art stays sharp. Same input gives the same bytes.
import { Buffer } from 'node:buffer';
import console from 'node:console';
import process from 'node:process';
import { deflateSync } from 'node:zlib';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const SVG_PATH = join(root, 'docs', 'design', 'assets', 'app-icon.svg');
const outDir = join(root, 'public', 'icons');
const SIZES = { 'icon-180.png': 180, 'icon-192.png': 192, 'icon-512.png': 512 };

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

// ---------- SVG ----------
function attrs(tag) {
  const out = {};
  for (const m of tag.matchAll(/([\w:-]+)\s*=\s*"([^"]*)"/g)) out[m[1]] = m[2];
  return out;
}
function num(value, name) {
  const n = Number(value ?? 0);
  if (!Number.isFinite(n)) throw new Error(`Invalid number for ${name}: "${value}"`);
  return n;
}
function color(fill) {
  const m = /^#([0-9a-f]{6})$/i.exec(fill ?? '');
  if (!m) throw new Error(`Unsupported fill "${fill}" (only #rrggbb)`);
  return [0, 2, 4].map((i) => parseInt(m[1].slice(i, i + 2), 16));
}

/** Parses the template into a list of rects in viewBox units (translate already applied). */
export function parseSvg(source) {
  const text = source.replace(/<!--[\s\S]*?-->/g, '');
  const svg = /<svg\b[^>]*>/.exec(text);
  if (!svg) throw new Error('No <svg> element found');
  const vb = /^0 0 (\d+) (\d+)$/.exec(attrs(svg[0]).viewBox ?? '');
  if (!vb || vb[1] !== vb[2]) throw new Error('viewBox must be "0 0 N N"');
  const rects = [];
  const offsets = [[0, 0]];
  for (const m of text
    .slice(svg.index + svg[0].length)
    .matchAll(/<(\/?)([\w:-]+)([^>]*?)(\/?)>/g)) {
    const [, closing, name, rest, selfClosing] = m;
    if (name === 'svg') continue;
    if (name === 'g') {
      if (closing) {
        offsets.pop();
        continue;
      }
      const a = attrs(rest);
      for (const k of Object.keys(a)) {
        if (k !== 'transform') throw new Error(`Unsupported attribute "${k}" on <g>`);
      }
      const t = /^translate\(\s*(-?[\d.]+)[\s,]+(-?[\d.]+)\s*\)$/.exec(a.transform ?? '');
      if (!t) throw new Error(`Unsupported transform "${a.transform}" (only translate(x y))`);
      const [bx, by] = offsets[offsets.length - 1];
      offsets.push([bx + Number(t[1]), by + Number(t[2])]);
      if (selfClosing) offsets.pop();
      continue;
    }
    if (name !== 'rect' || closing) throw new Error(`Unsupported SVG element <${closing}${name}>`);
    const a = attrs(rest);
    for (const k of Object.keys(a)) {
      if (!['x', 'y', 'width', 'height', 'fill', 'opacity'].includes(k)) {
        throw new Error(`Unsupported attribute "${k}" on <rect>`);
      }
    }
    const [ox, oy] = offsets[offsets.length - 1];
    rects.push({
      x: num(a.x, 'x') + ox,
      y: num(a.y, 'y') + oy,
      w: num(a.width, 'width'),
      h: num(a.height, 'height'),
      rgb: color(a.fill),
      opacity: a.opacity === undefined ? 1 : num(a.opacity, 'opacity'),
    });
  }
  if (rects.length === 0) throw new Error('No <rect> found');
  return { size: Number(vb[1]), rects };
}

/** Renders an opaque RGB PNG (nearest neighbour: each pixel samples its centre). */
export function render({ size: view, rects }, size) {
  const raw = Buffer.alloc((size * 3 + 1) * size);
  let p = 0;
  for (let py = 0; py < size; py++) {
    raw[p++] = 0;
    const y = ((py + 0.5) * view) / size;
    for (let px = 0; px < size; px++) {
      const x = ((px + 0.5) * view) / size;
      let rgb = [0, 0, 0];
      for (const r of rects) {
        if (x < r.x || x >= r.x + r.w || y < r.y || y >= r.y + r.h) continue;
        rgb = rgb.map((v, i) => Math.round(v * (1 - r.opacity) + r.rgb[i] * r.opacity));
      }
      raw[p++] = rgb[0];
      raw[p++] = rgb[1];
      raw[p++] = rgb[2];
    }
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8;
  ihdr[9] = 2;
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw)),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

function main() {
  let svg;
  try {
    svg = parseSvg(readFileSync(SVG_PATH, 'utf8'));
  } catch (e) {
    console.error(`app-icon.svg cannot be rendered: ${e.message}`);
    process.exit(1);
  }
  mkdirSync(outDir, { recursive: true });
  for (const [name, size] of Object.entries(SIZES)) {
    writeFileSync(join(outDir, name), render(svg, size));
    console.log(`wrote public/icons/${name}`);
  }
}

if (process.argv[1] && fileURLToPath(import.meta.url) === join(process.argv[1])) main();

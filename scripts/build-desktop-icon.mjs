// Builds build/icon.ico for the Windows .exe (AP-121) from public/icons/icon-512.png.
// Node built-ins only (no dependencies): decodes the PNG (8-bit RGB or RGBA, not interlaced),
// scales it to 256 x 256 with nearest neighbour (pixel art stays sharp), encodes an RGBA PNG
// and wraps it as the single 256-px entry of an ICO file (PNG-in-ICO). Same input, same bytes.
import { Buffer } from 'node:buffer';
import console from 'node:console';
import process from 'node:process';
import { deflateSync, inflateSync } from 'node:zlib';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const SRC = join(root, 'public', 'icons', 'icon-512.png');
const OUT = join(root, 'build', 'icon.ico');
const SIZE = 256;
const PNG_SIGNATURE = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

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
  len.writeUInt32BE(data.length, 0);
  const td = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(td), 0);
  return Buffer.concat([len, td, crc]);
}

function paeth(a, b, c) {
  const p = a + b - c;
  const pa = Math.abs(p - a);
  const pb = Math.abs(p - b);
  const pc = Math.abs(p - c);
  if (pa <= pb && pa <= pc) return a;
  return pb <= pc ? b : c;
}

/** Decodes an 8-bit RGB/RGBA PNG into { width, height, rgba }. Anything else throws. */
function decodePng(buf) {
  if (!buf.subarray(0, 8).equals(PNG_SIGNATURE)) throw new Error('not a PNG file');
  let pos = 8;
  let width = 0;
  let height = 0;
  let colorType = -1;
  const idat = [];
  while (pos < buf.length) {
    const len = buf.readUInt32BE(pos);
    const type = buf.toString('ascii', pos + 4, pos + 8);
    const data = buf.subarray(pos + 8, pos + 8 + len);
    if (type === 'IHDR') {
      width = data.readUInt32BE(0);
      height = data.readUInt32BE(4);
      const depth = data[8];
      colorType = data[9];
      const interlace = data[12];
      if (depth !== 8 || (colorType !== 2 && colorType !== 6) || interlace !== 0) {
        throw new Error(`unsupported PNG (depth ${depth}, colour type ${colorType})`);
      }
    } else if (type === 'IDAT') {
      idat.push(data);
    } else if (type === 'IEND') {
      break;
    }
    pos += 12 + len;
  }
  if (width === 0 || height === 0) throw new Error('PNG without IHDR');
  const bpp = colorType === 6 ? 4 : 3;
  const stride = width * bpp;
  const raw = inflateSync(Buffer.concat(idat));
  if (raw.length !== (stride + 1) * height) throw new Error('unexpected PNG data length');
  const pixels = Buffer.alloc(stride * height);
  for (let y = 0; y < height; y++) {
    const filter = raw[y * (stride + 1)];
    const line = raw.subarray(y * (stride + 1) + 1, (y + 1) * (stride + 1));
    const out = y * stride;
    const prev = y > 0 ? out - stride : -1;
    for (let x = 0; x < stride; x++) {
      const a = x >= bpp ? pixels[out + x - bpp] : 0;
      const b = prev >= 0 ? pixels[prev + x] : 0;
      const c = x >= bpp && prev >= 0 ? pixels[prev + x - bpp] : 0;
      let v;
      if (filter === 0) v = line[x];
      else if (filter === 1) v = line[x] + a;
      else if (filter === 2) v = line[x] + b;
      else if (filter === 3) v = line[x] + ((a + b) >> 1);
      else if (filter === 4) v = line[x] + paeth(a, b, c);
      else throw new Error(`unknown PNG filter ${filter}`);
      pixels[out + x] = v & 0xff;
    }
  }
  const rgba = Buffer.alloc(width * height * 4);
  for (let i = 0; i < width * height; i++) {
    rgba[i * 4] = pixels[i * bpp];
    rgba[i * 4 + 1] = pixels[i * bpp + 1];
    rgba[i * 4 + 2] = pixels[i * bpp + 2];
    rgba[i * 4 + 3] = bpp === 4 ? pixels[i * bpp + 3] : 255;
  }
  return { width, height, rgba };
}

function scaleNearest(img, size) {
  const out = Buffer.alloc(size * size * 4);
  for (let y = 0; y < size; y++) {
    const sy = Math.floor((y * img.height) / size);
    for (let x = 0; x < size; x++) {
      const sx = Math.floor((x * img.width) / size);
      img.rgba.copy(
        out,
        (y * size + x) * 4,
        (sy * img.width + sx) * 4,
        (sy * img.width + sx) * 4 + 4,
      );
    }
  }
  return out;
}

function encodePng(rgba, size) {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8;
  ihdr[9] = 6;
  const raw = Buffer.alloc((size * 4 + 1) * size);
  for (let y = 0; y < size; y++) {
    raw[y * (size * 4 + 1)] = 0;
    rgba.copy(raw, y * (size * 4 + 1) + 1, y * size * 4, (y + 1) * size * 4);
  }
  return Buffer.concat([
    PNG_SIGNATURE,
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

function wrapIco(png) {
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0); // reserved
  header.writeUInt16LE(1, 2); // type: icon
  header.writeUInt16LE(1, 4); // one image
  const entry = Buffer.alloc(16);
  entry[0] = 0; // width 256
  entry[1] = 0; // height 256
  entry[2] = 0; // no palette
  entry[3] = 0; // reserved
  entry.writeUInt16LE(1, 4); // colour planes
  entry.writeUInt16LE(32, 6); // bits per pixel
  entry.writeUInt32LE(png.length, 8);
  entry.writeUInt32LE(header.length + entry.length, 12);
  return Buffer.concat([header, entry, png]);
}

try {
  const img = decodePng(readFileSync(SRC));
  const ico = wrapIco(encodePng(scaleNearest(img, SIZE), SIZE));
  mkdirSync(dirname(OUT), { recursive: true });
  writeFileSync(OUT, ico);
  console.log(`wrote ${OUT} (${SIZE} px, ${ico.length} bytes)`);
} catch (err) {
  console.error(`build-desktop-icon: ${err instanceof Error ? err.message : String(err)}`);
  process.exit(1);
}

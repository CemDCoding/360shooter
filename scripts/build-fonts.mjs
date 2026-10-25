// Baut die Bitmap-Schriften "Astro Kapsel" und "Astro Funk" aus den Glyphen des Designs
// (docs/design/assets/fonts.js, window.PX_FONTS) nach public/assets/fonts/*.png und *.xml.
// Nur Node-Bordmittel, kein Netz. Die Ausgabe ist deterministisch (gleicher Lauf, gleiche Bytes).
// Aufruf: npm run fonts:build
/* global console, process */
import { Buffer } from 'node:buffer';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { runInNewContext } from 'node:vm';
import { deflateSync } from 'node:zlib';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const SOURCE = join(root, 'docs', 'design', 'assets', 'fonts.js');
const OUT_DIR = join(root, 'public', 'assets', 'fonts');
const ATLAS_WIDTH = 128;
const PAD = 1; // transparenter Rand um jedes Zeichen gegen Ausbluten beim Skalieren
const LETTER_SPACING = 1; // Laufweite in Pixeln
const LINE_GAP = 2; // Zeilenabstand: Hoehe + 2 Pixel

/** Schriften: Schluessel in PX_FONTS, Dateiname und Anzeigename. */
export const FONTS = [
  { id: 'kapsel', file: 'astro-kapsel', face: 'Astro Kapsel' },
  { id: 'funk', file: 'astro-funk', face: 'Astro Funk' },
];

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

// ---------- Glyphen ----------
/** Liest window.PX_FONTS aus fonts.js in einem leeren vm-Kontext (kein Zugriff auf Node oder Netz). */
export function loadFonts(sourcePath = SOURCE) {
  const sandbox = { window: {} };
  runInNewContext(readFileSync(sourcePath, 'utf8'), sandbox, { timeout: 1000 });
  return sandbox.window.PX_FONTS;
}

/** Zerlegt die Glyphen einer Schrift in Zeilen und prueft Form und Zeichen. */
function parseGlyphs(font, id) {
  if (!font || !font.g || !Number.isInteger(font.h) || !Number.isInteger(font.space)) {
    throw new Error(`Schrift "${id}" fehlt oder ist unvollstaendig in fonts.js.`);
  }
  const glyphs = [];
  for (const [ch, def] of Object.entries(font.g)) {
    if ([...ch].length !== 1)
      throw new Error(`Schrift "${id}": "${ch}" ist kein einzelnes Zeichen.`);
    const rows = def.split('/');
    const width = rows[0].length;
    if (rows.length !== font.h) {
      throw new Error(`Schrift "${id}", Zeichen "${ch}": ${rows.length} Zeilen statt ${font.h}.`);
    }
    if (width === 0 || rows.some((r) => r.length !== width || /[^#.]/.test(r))) {
      throw new Error(`Schrift "${id}", Zeichen "${ch}": Zeilen ungleich lang oder ungueltig.`);
    }
    glyphs.push({ code: ch.codePointAt(0), rows, width });
  }
  glyphs.sort((a, b) => a.code - b.code);
  return glyphs;
}

/** Packt die Glyphen zeilenweise in einen Atlas und erzeugt PNG und BMFont-XML. */
export function buildFont(font, spec) {
  const glyphs = parseGlyphs(font, spec.id);
  const h = font.h;
  let x = PAD;
  let y = PAD;
  for (const g of glyphs) {
    if (x + g.width + PAD > ATLAS_WIDTH) {
      x = PAD;
      y += h + PAD;
    }
    g.x = x;
    g.y = y;
    x += g.width + PAD;
  }
  const width = ATLAS_WIDTH;
  const height = y + h + PAD;
  const px = Buffer.alloc(width * height * 4);
  for (const g of glyphs) {
    g.rows.forEach((row, ry) => {
      for (let cx = 0; cx < g.width; cx++) {
        if (row[cx] !== '#') continue;
        px.fill(255, ((g.y + ry) * width + g.x + cx) * 4, ((g.y + ry) * width + g.x + cx) * 4 + 4);
      }
    });
  }
  const lines = [
    '<?xml version="1.0"?>',
    '<font>',
    `  <info face="${spec.face}" size="${h}" bold="0" italic="0" charset="" unicode="1" stretchH="100" smooth="0" aa="0" padding="0,0,0,0" spacing="0,0" outline="0"/>`,
    `  <common lineHeight="${h + LINE_GAP}" base="${h}" scaleW="${width}" scaleH="${height}" pages="1" packed="0"/>`,
    '  <pages>',
    `    <page id="0" file="${spec.file}.png"/>`,
    '  </pages>',
    `  <chars count="${glyphs.length + 1}">`,
    // Leerzeichen: kein Bild, nur Vorschub (Breite des Leerzeichens + Laufweite)
    `    <char id="32" x="0" y="0" width="0" height="0" xoffset="0" yoffset="0" xadvance="${font.space + LETTER_SPACING}" page="0" chnl="15"/>`,
    ...glyphs.map(
      (g) =>
        `    <char id="${g.code}" x="${g.x}" y="${g.y}" width="${g.width}" height="${h}" xoffset="0" yoffset="0" xadvance="${g.width + LETTER_SPACING}" page="0" chnl="15"/>`,
    ),
    '  </chars>',
    '</font>',
    '',
  ];
  return {
    png: encodePng(width, height, px),
    xml: lines.join('\n'),
    chars: glyphs.map((g) => g.code),
  };
}

function main() {
  const fonts = loadFonts();
  mkdirSync(OUT_DIR, { recursive: true });
  for (const spec of FONTS) {
    const { png, xml, chars } = buildFont(fonts[spec.id], spec);
    writeFileSync(join(OUT_DIR, `${spec.file}.png`), png);
    writeFileSync(join(OUT_DIR, `${spec.file}.xml`), xml);
    console.log(`wrote public/assets/fonts/${spec.file}.{png,xml} (${chars.length} Zeichen)`);
  }
}

if (process.argv[1] && fileURLToPath(import.meta.url) === join(process.argv[1])) main();

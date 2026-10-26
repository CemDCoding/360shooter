// Erzeugt src/config/theme.ts aus docs/design/export/tokens.resolved.json und kopiert tokens.css.
// Aufruf: npm run theme:build. Die Logik steckt in buildTheme(json), geschrieben wird nur beim direkten Aufruf.
/* global console, process, URL */
import { readFileSync, writeFileSync, copyFileSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const root = new URL('../', import.meta.url);
const SRC_JSON = new URL('docs/design/export/tokens.resolved.json', root);
const SRC_CSS = new URL('docs/design/export/tokens.css', root);
const OUT_TS = new URL('src/config/theme.ts', root);
const OUT_CSS = new URL('src/styles/tokens.css', root);

const HEADER = `// erzeugt, nicht von Hand ändern: scripts/build-theme.mjs (npm run theme:build)
// Quelle: docs/design/export/tokens.resolved.json
`;

/** Flacht ein verschachteltes Objekt zu { 'a.b.c': Blatt } ab. */
function flatten(obj, prefix = '') {
  const out = {};
  for (const [k, v] of Object.entries(obj)) {
    const key = prefix ? `${prefix}.${k}` : k;
    if (v !== null && typeof v === 'object' && !Array.isArray(v)) {
      Object.assign(out, flatten(v, key));
    } else {
      out[key] = v;
    }
  }
  return out;
}

const q = (s) => `'${s}'`;

function colorEntry(hex) {
  const m = /^#([0-9a-f]{6})([0-9a-f]{2})?$/i.exec(hex);
  if (!m) throw new Error(`Unbekanntes Farbformat: ${hex}`);
  const rgb = m[1].toLowerCase();
  const num = `0x${rgb}`;
  if (m[2] === undefined) return `{ num: ${num}, css: '#${rgb}' }`;
  const alpha = Math.round((parseInt(m[2], 16) / 255) * 1000) / 1000;
  return `{ num: ${num}, css: '#${rgb}', alpha: ${alpha} }`;
}

function record(name, entries, doc) {
  const lines = entries.map(([k, v]) => `  ${q(k)}: ${v},`);
  return `/** ${doc} */\nconst ${name} = {\n${lines.join('\n')}\n} as const;\n`;
}

const px = (v) => {
  const m = /^(-?\d+(?:\.\d+)?)px$/.exec(v);
  return m ? Number(m[1]) : null;
};
const ms = (v) => {
  const m = /^(\d+(?:\.\d+)?)ms$/.exec(v);
  if (!m) throw new Error(`Keine Zeit in ms: ${v}`);
  return Number(m[1]);
};

export function buildTheme(json) {
  const base = json.base;
  const colors = Object.entries(flatten(base.color)).map(([k, v]) => [k, colorEntry(v)]);
  const space = Object.entries(flatten({ space: base.space })).map(([k, v]) => [k, px(v)]);
  const border = Object.entries(flatten({ border: base.border })).map(([k, v]) => [k, px(v)]);
  const sizePx = [];
  const sizeCount = [];
  for (const [k, v] of Object.entries(flatten({ size: base.size }))) {
    const n = typeof v === 'number' ? v : px(v);
    if (n === null) throw new Error(`Unbekannte Größe: ${k}=${v}`);
    (typeof v === 'number' ? sizeCount : sizePx).push([k, n]);
  }
  const dur = Object.entries(base.motion.duration).map(([k, v]) => [`motion.${k}`, ms(v)]);
  const easing = Object.entries(base.motion.easing).map(([k, v]) => [`motion.${k}`, q(v)]);
  const blinks = base.motion['banner-blinks'];
  if (typeof blinks !== 'number') throw new Error('motion.banner-blinks fehlt oder ist keine Zahl');
  const motionCount = [['motion.banner-blinks', blinks]];
  const f = base.font;
  const fam = (a) => `[${a.map(q).join(', ')}]`;
  const scale = Object.entries(f.scale).map(([k, v]) => `    ${k}: ${v},`);

  const colorLines = colors.map(([k, v]) => `  ${q(k)}: ${v},`).join('\n');
  const parts = [
    HEADER,
    `interface ThemeColor {
  /** 0xRRGGBB für Phaser */
  readonly num: number;
  /** '#rrggbb' für CSS und Textstile */
  readonly css: string;
  /** nur bei Alpha-Tokens, 0..1 */
  readonly alpha?: number;
}
`,
    `/** Farben, Schlüssel = Tokenname (z. B. 'menu.bg'). */\nconst COLORS = {\n${colorLines}\n} as const satisfies Record<string, ThemeColor>;\n`,
    record('SPACE_PX', space, 'Abstände in px.'),
    record('BORDER_PX', border, 'Rahmenstärken in px.'),
    record('SIZE_PX', sizePx, 'Größen in px.'),
    record('SIZE_COUNT', sizeCount, 'Größen als Anzahl.'),
    record('MOTION_MS', dur, 'Zeiten in ms.'),
    record('MOTION_COUNT', motionCount, 'Bewegung als Anzahl.'),
    record('MOTION_EASING', easing, 'Easing-Angaben (CSS-Schreibweise).'),
    record(
      'OPACITY',
      Object.entries(base.opacity).map(([k, v]) => [k, Number(v)]),
      'Deckkraft-Stufen, 0..1.',
    ),
    `/** Schrift: Familien (Fallback-Reihenfolge), Skalierungsstufen, Zeichenabstand und Zeilenabstand in px. */
const FONT = {
  family: { menu: ${fam(f.family.menu)}, hud: ${fam(f.family.hud)} },
  scale: {
${scale.join('\n')}
  },
  tracking: ${f.tracking},
  lineGap: ${f.lineGap},
} as const;
`,
    `export const THEME = {
  colors: COLORS,
  spacePx: SPACE_PX,
  borderPx: BORDER_PX,
  sizePx: SIZE_PX,
  sizeCount: SIZE_COUNT,
  motionMs: MOTION_MS,
  motionCount: MOTION_COUNT,
  motionEasing: MOTION_EASING,
  font: FONT,
  opacity: OPACITY,
} as const;

export { OPACITY };

export type ColorName = keyof typeof COLORS;
export type SpaceName = keyof typeof SPACE_PX;
export type BorderName = keyof typeof BORDER_PX;
export type SizeName = keyof typeof SIZE_PX;
export type MotionName = keyof typeof MOTION_MS;
export type OpacityName = keyof typeof OPACITY;

/** Farbe nach Tokenname; ein falscher Name ist ein Typfehler. */
export function themeColor(name: ColorName): ThemeColor {
  return COLORS[name];
}
`,
  ];
  return parts.join('\n');
}

const isMain = process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1];
if (isMain) {
  const json = JSON.parse(readFileSync(SRC_JSON, 'utf8'));
  writeFileSync(OUT_TS, buildTheme(json));
  mkdirSync(new URL('src/styles/', root), { recursive: true });
  copyFileSync(SRC_CSS, OUT_CSS);
  console.log('theme: src/config/theme.ts und src/styles/tokens.css geschrieben');
}

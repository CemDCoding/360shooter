// Bausteine des Kassetten-Stils (Menü-Welt): Text in Astro Kapsel, Fase, Balken, Stern. Nur Tokens, keine Farb-Literale.
import Phaser from 'phaser';
import { THEME, themeColor, type ColorName } from '../../config/theme';
import { bevelRects, type Rect } from './menuLogic';

export { bevelRects, motionMs } from './menuLogic';
export type { BevelRects, Rect } from './menuLogic';

export const FONT_KEY = 'astro-kapsel';

export type FontScale = 1 | 2 | 3 | 4;
export type KText = Phaser.GameObjects.BitmapText | Phaser.GameObjects.Text;

/** Ist die Bitmap-Schrift geladen? Sonst bleibt Text unsichtbar (kein Absturz). */
export function hasKapsel(scene: Phaser.Scene): boolean {
  return scene.cache.bitmapFont.exists(FONT_KEY);
}

/** Text in Astro Kapsel: nur Großbuchstaben, ganzzahlig skaliert, Farbe per Tint. */
export function kText(
  scene: Phaser.Scene,
  x: number,
  y: number,
  text: string,
  scale: FontScale,
  color: ColorName,
  originX = 0,
  originY = 0,
): KText {
  const px = Math.round(x);
  const py = Math.round(y);
  if (!hasKapsel(scene)) {
    return scene.add.text(px, py, '').setVisible(false);
  }
  return scene.add
    .bitmapText(px, py, FONT_KEY, text.toUpperCase())
    .setScale(scale)
    .setTint(themeColor(color).num)
    .setOrigin(originX, originY);
}

/** Breite eines Textes in Bildpunkten (0 ohne Schrift). */
export function textWidth(t: KText): number {
  return t instanceof Phaser.GameObjects.BitmapText ? Math.round(t.displayWidth) : 0;
}

function fillRect(g: Phaser.GameObjects.Graphics, r: Rect, color: ColorName): void {
  if (r.w <= 0 || r.h <= 0) return;
  g.fillStyle(themeColor(color).num, themeColor(color).alpha ?? 1).fillRect(r.x, r.y, r.w, r.h);
}

export interface BevelColors {
  fill: ColorName;
  hi: ColorName;
  lo: ColorName;
}

/** Zeichnet Schatten, Umriss, Fläche und Fase. */
export function drawBevel(
  g: Phaser.GameObjects.Graphics,
  x: number,
  y: number,
  w: number,
  h: number,
  colors: BevelColors,
  shadow = true,
): void {
  const r = bevelRects(x, y, w, h, shadow);
  fillRect(g, r.shadow, 'menu.outline');
  fillRect(g, r.outline, 'menu.outline');
  fillRect(g, r.fill, colors.fill);
  for (const lo of r.lo) fillRect(g, lo, colors.lo);
  for (const hi of r.hi) fillRect(g, hi, colors.hi);
}

/** Ring (Fokus oder aktuelles Level) mit Abstand um eine Fläche inklusive Umriss. */
export function drawRing(
  g: Phaser.GameObjects.Graphics,
  x: number,
  y: number,
  w: number,
  h: number,
  gap: number,
  color: ColorName,
): void {
  const t = THEME.borderPx['border.focus'];
  const o = THEME.borderPx['border.menu'] + gap;
  const left = x - o - t;
  const top = y - o - t;
  const rw = w + 2 * (o + t);
  const rh = h + 2 * (o + t);
  fillRect(g, { x: left, y: top, w: rw, h: t }, color);
  fillRect(g, { x: left, y: top + rh - t, w: rw, h: t }, color);
  fillRect(g, { x: left, y: top, w: t, h: rh }, color);
  fillRect(g, { x: left + rw - t, y: top, w: t, h: rh }, color);
}

/** Erfahrungs-Balken: Umriss, Füllung Minze mit heller Oberkante. */
export function drawBar(
  g: Phaser.GameObjects.Graphics,
  x: number,
  y: number,
  w: number,
  fraction: number,
): void {
  const h = 8;
  const bevel = THEME.borderPx['border.menu'];
  fillRect(g, { x: x - bevel, y: y - bevel, w: w + 2 * bevel, h: h + 2 * bevel }, 'menu.outline');
  const filled = fraction <= 0 ? 0 : Math.max(2, Math.round(w * Math.min(1, fraction)));
  if (filled > 0) {
    fillRect(g, { x, y, w: filled, h }, 'menu.done-bg');
    fillRect(g, { x, y, w: filled, h: bevel }, 'menu.done-hi');
  }
}

/** Gestrichelte Linie (2 px, 6 an, 4 aus). */
export function drawDashedRule(
  g: Phaser.GameObjects.Graphics,
  x: number,
  y: number,
  w: number,
  color: ColorName,
): void {
  for (let dx = 0; dx < w; dx += 10) {
    fillRect(g, { x: x + dx, y, w: Math.min(6, w - dx), h: 2 }, color);
  }
}

const STAR = [
  '...oo...',
  '..osso..',
  'oossssoo',
  'osssssso',
  '.osssso.',
  '.osooso.',
  'oso..oso',
  'oo....oo',
] as const;

/** 8x8-Stern als Pixelbild (Umriss und Füllung), nicht nur Farbe: Zeichen für „geschafft“. */
export function drawStar(
  g: Phaser.GameObjects.Graphics,
  x: number,
  y: number,
  outline: ColorName,
  fill: ColorName,
): void {
  STAR.forEach((row, ry) => {
    for (let rx = 0; rx < row.length; rx++) {
      const c = row[rx];
      if (c === '.') continue;
      fillRect(g, { x: x + rx, y: y + ry, w: 1, h: 1 }, c === 'o' ? outline : fill);
    }
  });
}

const LOCK = [
  '..oooo..',
  '.o....o.',
  '.o....o.',
  'oooooooo',
  'okkkkkko',
  'okkookko',
  'okkkkkko',
  'oooooooo',
] as const;

/** 8x8-Schloss für die Legende (o = Umriss, k = Füllung). */
export function drawLock(
  g: Phaser.GameObjects.Graphics,
  x: number,
  y: number,
  outline: ColorName,
  fill: ColorName,
): void {
  LOCK.forEach((row, ry) => {
    for (let rx = 0; rx < row.length; rx++) {
      const c = row[rx];
      if (c === '.') continue;
      fillRect(g, { x: x + rx, y: y + ry, w: 1, h: 1 }, c === 'o' ? outline : fill);
    }
  });
}

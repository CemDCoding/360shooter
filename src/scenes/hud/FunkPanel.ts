import Phaser from 'phaser';
import { THEME, themeColor, type ColorName } from '../../config/theme';
import { chipMetrics, funkCase } from './hudMath';

/** Key of the HUD bitmap font (Astro Funk, 8 px, upper case only plus a small "s"). */
export const FUNK_FONT = 'astro-funk';
/** Glyph height of the font at scale 1. */
export const FUNK_GLYPH_H = 8;
const FALLBACK_ADVANCE = 6;
const CHAMFER = 4;
/** Icon column of a chip icon with a fixed whole scale (coin 8 px at 2x = 16 px). */
const FIXED_ICON_W = 16;

/**
 * Integer font scale for a base scale (1..4) and the HUD factor k (never below the base).
 * Base-1 labels carry state (ENERGIE!, rest time) and must stay readable: above k = 1 they
 * get at least 2x and round up.
 */
export function funkScale(base: number, k: number): number {
  if (!Number.isFinite(k) || k <= 1) return base;
  const s = base === 1 ? Math.max(2, Math.ceil(k)) : Math.round(base * k);
  return Math.min(8, Math.max(base, s));
}

/** Width in px of a Funk text at an integer scale (from the font data, no Phaser object needed). */
export function measureFunk(scene: Phaser.Scene, text: string, scale: number): number {
  const prepared = funkCase(text);
  const entry = scene.cache.bitmapFont.get(FUNK_FONT) as
    { data?: { chars?: Record<number, { xAdvance?: number }> } } | undefined;
  const chars = entry?.data?.chars;
  let w = 0;
  for (const ch of prepared) {
    w += chars?.[ch.codePointAt(0) ?? 0]?.xAdvance ?? FALLBACK_ADVANCE;
  }
  return w * scale;
}

/** Bitmap text in Astro Funk, tinted with a `hud.*` (or other) token colour. */
export function funkText(
  scene: Phaser.Scene,
  x: number,
  y: number,
  text: string,
  scale: number,
  color: ColorName,
): Phaser.GameObjects.BitmapText {
  const t = scene.add.bitmapText(x, y, FUNK_FONT, funkCase(text), FUNK_GLYPH_H * scale);
  t.setTint(themeColor(color).num);
  return t;
}

/** Sets text and colour of a Funk bitmap text. */
export function setFunk(t: Phaser.GameObjects.BitmapText, text: string, color: ColorName): void {
  t.setText(funkCase(text));
  t.setTint(themeColor(color).num);
}

/** Draws a dotted line (1 px dots every 2 px) with a Graphics object. */
export function drawDottedLine(
  g: Phaser.GameObjects.Graphics,
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  color: number,
  alpha = 1,
): void {
  const len = Math.hypot(x2 - x1, y2 - y1);
  const steps = Math.floor(len / 2);
  g.fillStyle(color, alpha);
  for (let i = 0; i <= steps; i++) {
    const t = len === 0 ? 0 : (i * 2) / len;
    g.fillRect(Math.round(x1 + (x2 - x1) * t), Math.round(y1 + (y2 - y1) * t), 1, 1);
  }
}

export interface PanelStyle {
  line: ColorName;
  /** Dotted outline instead of a solid one (dim or loading state). */
  dotted?: boolean;
  /** Soft glow outside the outline (active state). */
  glow?: boolean;
  /** Fill colour, default `hud.glass`. */
  fill?: ColorName;
}

/**
 * Dark glass panel with a 1 px phosphor outline. Optionally with a cut top-left corner
 * (logbook head). Origin is the top-left corner.
 */
export class FunkPanel {
  readonly gfx: Phaser.GameObjects.Graphics;
  private style: PanelStyle = { line: 'hud.line' };

  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    private w: number,
    private h: number,
    private readonly chamfer = false,
    style?: PanelStyle,
  ) {
    this.gfx = scene.add.graphics({ x, y });
    this.setStyle(style ?? this.style);
  }

  get width(): number {
    return this.w;
  }

  get height(): number {
    return this.h;
  }

  setStyle(style: PanelStyle): this {
    this.style = style;
    this.redraw();
    return this;
  }

  setSize(w: number, h: number): this {
    this.w = w;
    this.h = h;
    this.redraw();
    return this;
  }

  setPosition(x: number, y: number): this {
    this.gfx.setPosition(x, y);
    return this;
  }

  setVisible(v: boolean): this {
    this.gfx.setVisible(v);
    return this;
  }

  setDepth(d: number): this {
    this.gfx.setDepth(d);
    return this;
  }

  setAlpha(a: number): this {
    this.gfx.setAlpha(a);
    return this;
  }

  destroy(): void {
    this.gfx.destroy();
  }

  private outline(): { x: number; y: number }[] {
    const { w, h } = this;
    const c = this.chamfer ? CHAMFER : 0;
    const pts = [
      { x: c, y: 0 },
      { x: w, y: 0 },
      { x: w, y: h },
      { x: 0, y: h },
      { x: 0, y: c },
    ];
    return c > 0 ? pts : [{ x: 0, y: 0 }, ...pts.slice(1, 4)];
  }

  private redraw(): void {
    const g = this.gfx;
    const s = this.style;
    const glass = themeColor(s.fill ?? 'hud.glass');
    const line = themeColor(s.line).num;
    const pts = this.outline();
    g.clear();
    if (s.glow) {
      const glow = themeColor('hud.glow');
      g.lineStyle(3, glow.num, glow.alpha ?? 0.45);
      g.strokePoints([...pts, pts[0]], false, false);
    }
    g.fillStyle(glass.num, glass.alpha ?? 1);
    g.fillPoints(pts, true);
    if (s.dotted) {
      for (let i = 0; i < pts.length; i++) {
        const a = pts[i];
        const b = pts[(i + 1) % pts.length];
        drawDottedLine(g, a.x, a.y, b.x, b.y, line);
      }
    } else {
      g.lineStyle(THEME.borderPx['border.hud'], line, 1);
      g.strokePoints([...pts, pts[0]], false, false);
    }
  }
}

export interface ChipIcon {
  key: string;
  frame?: number;
  /** Extra scale factor for sprites smaller than 16 px (default 1). */
  scale?: number;
  /** Keep `scale` whole (no k, no shrink): the box is sized for the sprite at that scale. */
  fixedScale?: boolean;
  /** Optional token colour for the icon (e.g. the dim fire ring). */
  tint?: ColorName;
}

export interface ChipOptions {
  icon?: ChipIcon;
  /** Width of an own small bar (shield); 0 or undefined for none. */
  barW?: number;
  /** HUD factor (hudScale). */
  k: number;
  /** Shrink factor (1 = unchanged, CHIP_SHRINK for the small chips, B3). */
  shrink?: number;
}

/** Chip in the HUD row: glass panel with icon, optional bar and a Funk text. */
export class FunkChip {
  private readonly panel: FunkPanel;
  private readonly icon?: Phaser.GameObjects.Image;
  private readonly bar?: Phaser.GameObjects.Graphics;
  private readonly text: Phaser.GameObjects.BitmapText;
  private readonly textScale: number;
  private readonly padX: number;
  private readonly gap: number;
  private readonly barW: number;
  private readonly iconW: number;
  private readonly chipH: number;
  private x = 0;
  private y = 0;
  private shown = true;
  private textW = 0;
  private barRatio = 0;
  private barColor: ColorName = 'hud.accent';

  constructor(
    private readonly scene: Phaser.Scene,
    opts: ChipOptions,
  ) {
    const k = opts.k;
    const mt = chipMetrics(k, opts.shrink ?? 1);
    this.textScale = mt.textScale;
    this.padX = mt.padX;
    this.gap = mt.gap;
    this.chipH = mt.height;
    this.barW = Math.round((opts.barW ?? 0) * mt.iconFactor);
    const fixed = opts.icon?.fixedScale === true;
    this.iconW = opts.icon ? (fixed ? FIXED_ICON_W : mt.iconW) : 0;
    this.panel = new FunkPanel(scene, 0, 0, 10, this.chipH);
    if (opts.icon) {
      this.icon = scene.add
        .image(0, 0, opts.icon.key, opts.icon.frame ?? 0)
        .setScale(
          opts.icon.fixedScale ? (opts.icon.scale ?? 1) : mt.iconFactor * (opts.icon.scale ?? 1),
        )
        .setOrigin(0, 0.5);
      if (opts.icon.tint) this.icon.setTintFill(themeColor(opts.icon.tint).num);
    }
    if (this.barW > 0) this.bar = scene.add.graphics();
    this.text = funkText(scene, 0, 0, '', this.textScale, 'hud.text').setOrigin(0, 0.5);
  }

  get width(): number {
    return this.panel.width;
  }

  get height(): number {
    return this.chipH;
  }

  get visible(): boolean {
    return this.shown;
  }

  /** Sets text and colour and re-computes the chip width. */
  setContent(text: string, color: ColorName): void {
    setFunk(this.text, text, color);
    this.textW = measureFunk(this.scene, text, this.textScale);
    let w = this.padX * 2 + this.textW;
    if (this.iconW) w += this.iconW + this.gap;
    if (this.barW) w += this.barW + 2 + this.gap;
    this.panel.setSize(Math.round(w), this.chipH);
    this.place();
  }

  setStyle(style: PanelStyle): void {
    this.panel.setStyle(style);
  }

  /** Shield bar fill 0..1 (own outline, no wide surface). */
  setBar(ratio: number, color: ColorName): void {
    this.barRatio = Math.min(1, Math.max(0, Number.isFinite(ratio) ? ratio : 0));
    this.barColor = color;
    this.drawBar();
  }

  setIconTint(color: ColorName | null): void {
    if (!this.icon) return;
    if (color) this.icon.setTintFill(themeColor(color).num);
    else this.icon.clearTint();
  }

  setVisible(v: boolean): void {
    this.shown = v;
    this.panel.setVisible(v);
    this.icon?.setVisible(v);
    this.bar?.setVisible(v);
    this.text.setVisible(v);
  }

  setPosition(x: number, y: number): void {
    this.x = x;
    this.y = y;
    this.place();
  }

  /** Alpha of all parts (blink or fade). */
  setAlpha(a: number): void {
    this.panel.setAlpha(a);
  }

  destroy(): void {
    this.panel.destroy();
    this.icon?.destroy();
    this.bar?.destroy();
    this.text.destroy();
  }

  private place(): void {
    const cy = this.y + this.chipH / 2;
    let cx = this.x + this.padX;
    this.panel.setPosition(this.x, this.y);
    if (this.icon) {
      this.icon.setPosition(cx, cy);
      cx += this.iconW + this.gap;
    }
    if (this.bar) {
      this.bar.setPosition(cx, cy);
      cx += this.barW + 2 + this.gap;
      this.drawBar();
    }
    this.text.setPosition(cx, cy);
  }

  private drawBar(): void {
    const g = this.bar;
    if (!g) return;
    const h = Math.round(this.chipH / 3);
    g.clear();
    g.lineStyle(1, themeColor('hud.line').num, 1);
    g.strokeRect(0.5, -h / 2 + 0.5, this.barW + 1, h);
    g.fillStyle(themeColor(this.barColor).num, 1);
    g.fillRect(1, -h / 2 + 1.5, Math.round((this.barW - 0) * this.barRatio), h - 2);
  }
}

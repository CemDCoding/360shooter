import Phaser from 'phaser';
import { THEME, themeColor } from '../../config/theme';
import { drawDottedLine, FUNK_GLYPH_H, funkText, measureFunk, setFunk } from './FunkPanel';

/** Smallest touch target in logical pixels. */
export const FUNK_MIN_BUTTON = THEME.sizePx['size.target'];
const PAD_X = 12;
const FOCUS_GAP = 2;

export interface FunkButtonOptions {
  /** Text label (upper case, Astro Funk). */
  label?: string;
  /** Icon from a spritesheet instead of or in addition to the label. */
  icon?: { key: string; frame: number };
  /** Main action: accent frame and accent text. */
  primary?: boolean;
  /** Integer font scale, default 2. */
  textScale?: number;
  width?: number;
  height?: number;
  onClick: () => void;
}

type ButtonState = 'normal' | 'hover' | 'down';

/**
 * Button of the radio world: glass, 1 px outline, states normal/hover/pressed/focus/disabled.
 * Container origin is its centre. At least 32x32.
 */
export class FunkButton extends Phaser.GameObjects.Container {
  private readonly gfx: Phaser.GameObjects.Graphics;
  private readonly hit: Phaser.GameObjects.Rectangle;
  private readonly text?: Phaser.GameObjects.BitmapText;
  private readonly icon?: Phaser.GameObjects.Image;
  private readonly bw: number;
  private readonly bh: number;
  private readonly primary: boolean;
  private btnState: ButtonState = 'normal';
  private enabled = true;
  private focused = false;

  constructor(scene: Phaser.Scene, x: number, y: number, opts: FunkButtonOptions) {
    super(scene, x, y);
    const scale = opts.textScale ?? 2;
    this.primary = opts.primary === true;
    const labelW = opts.label ? measureFunk(scene, opts.label, scale) : 0;
    this.bw = Math.max(FUNK_MIN_BUTTON, opts.width ?? Math.round(labelW + PAD_X * 2));
    this.bh = Math.max(FUNK_MIN_BUTTON, opts.height ?? Math.round(FUNK_GLYPH_H * scale + 16));
    this.gfx = scene.add.graphics();
    this.hit = scene.add
      .rectangle(0, 0, this.bw, this.bh, themeColor('hud.screen').num, 0)
      .setInteractive({ useHandCursor: true });
    this.add([this.gfx, this.hit]);
    if (opts.icon) {
      this.icon = scene.add.image(0, 0, opts.icon.key, opts.icon.frame);
      this.add(this.icon);
    }
    if (opts.label) {
      this.text = funkText(scene, 0, 0, opts.label, scale, 'hud.text').setOrigin(0.5);
      this.add(this.text);
    }
    this.setSize(this.bw, this.bh);
    this.hit.on('pointerover', () => this.applyState('hover'));
    this.hit.on('pointerout', () => this.applyState('normal'));
    this.hit.on('pointerdown', () => this.applyState('down'));
    this.hit.on('pointerup', () => {
      if (!this.enabled) return;
      this.applyState('hover');
      opts.onClick();
    });
    this.redraw();
    scene.add.existing(this);
  }

  /** Disabled: dotted dim outline, no input. */
  setEnabled(enabled: boolean): this {
    this.enabled = enabled;
    if (enabled) this.hit.setInteractive({ useHandCursor: true });
    else this.hit.disableInteractive();
    this.redraw();
    return this;
  }

  /** Focus ring (keyboard / default action). */
  setFocused(focused: boolean): this {
    this.focused = focused;
    this.redraw();
    return this;
  }

  /** Replaces the label text. */
  setLabel(label: string): this {
    if (this.text) setFunk(this.text, label, 'hud.text');
    this.redraw();
    return this;
  }

  private applyState(s: ButtonState): void {
    if (!this.enabled) return;
    this.btnState = s;
    this.redraw();
  }

  private redraw(): void {
    const g = this.gfx;
    const hw = this.bw / 2;
    const hh = this.bh / 2;
    const accent = themeColor('hud.accent').num;
    const pressed = this.enabled && this.btnState === 'down';
    g.clear();
    if (pressed) {
      g.fillStyle(accent, 1);
    } else {
      const glass = themeColor('hud.glass');
      g.fillStyle(glass.num, glass.alpha ?? 1);
    }
    g.fillRect(-hw, -hh, this.bw, this.bh);
    if (this.enabled && !pressed && (this.btnState === 'hover' || this.primary)) {
      g.fillStyle(accent, this.btnState === 'hover' ? 0.18 : 0.12);
      g.fillRect(-hw, -hh, this.bw, this.bh);
    }
    const lineColor = !this.enabled
      ? themeColor('hud.line-dim').num
      : this.primary
        ? accent
        : themeColor('hud.line').num;
    if (this.enabled) {
      g.lineStyle(THEME.borderPx['border.hud'], lineColor, 1);
      g.strokeRect(-hw + 0.5, -hh + 0.5, this.bw - 1, this.bh - 1);
    } else {
      drawDottedLine(g, -hw, -hh, hw, -hh, lineColor);
      drawDottedLine(g, hw, -hh, hw, hh, lineColor);
      drawDottedLine(g, hw, hh, -hw, hh, lineColor);
      drawDottedLine(g, -hw, hh, -hw, -hh, lineColor);
    }
    if (this.focused) {
      g.lineStyle(THEME.borderPx['border.focus'], themeColor('hud.focus').num, 1);
      const o = FOCUS_GAP + THEME.borderPx['border.focus'] / 2;
      g.strokeRect(-hw - o, -hh - o, this.bw + o * 2, this.bh + o * 2);
    }
    const fg = !this.enabled
      ? 'hud.line-dim'
      : pressed
        ? 'hud.screen'
        : this.primary
          ? 'hud.accent'
          : 'hud.text';
    if (this.text) this.text.setTint(themeColor(fg).num);
    if (this.icon) {
      if (pressed) this.icon.setTint(themeColor('hud.screen').num);
      else this.icon.setTint(themeColor(this.enabled ? 'hud.accent' : 'hud.line-dim').num);
    }
  }
}

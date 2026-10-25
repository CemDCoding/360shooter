import Phaser from 'phaser';
import { THEME, type ColorName } from '../../config/theme';
import {
  drawBevel,
  drawRing,
  kText,
  textWidth,
  type BevelColors,
  type FontScale,
  type KText,
} from './kassette';

export const MIN_BUTTON_SIZE = THEME.sizePx['size.target'];

export type ButtonVariant = 'primary' | 'secondary' | 'danger' | 'done' | 'icon';

export interface ButtonOptions {
  variant?: ButtonVariant;
  /** Breite in px; ohne Angabe passt sie sich dem Text an. */
  width?: number;
  height?: number;
  /** Schriftgröße 1 oder 2 (ganzzahlig). */
  scale?: FontScale;
  /** Nur Variante icon: Frame in `ui-icons`. */
  iconFrame?: number;
  /** Kleines Bild links vor dem Text (z. B. Münze). */
  leading?: { key: string; frame?: number };
}

interface VariantStyle extends BevelColors {
  fg: ColorName;
}

const STYLES: Record<ButtonVariant, VariantStyle> = {
  primary: {
    fill: 'menu.action-bg',
    hi: 'menu.action-hi',
    lo: 'menu.action-lo',
    fg: 'menu.action-fg',
  },
  secondary: {
    fill: 'menu.surface',
    hi: 'menu.surface-hi',
    lo: 'menu.surface-lo',
    fg: 'menu.text',
  },
  danger: {
    fill: 'menu.danger-bg',
    hi: 'menu.danger-hi',
    lo: 'menu.danger-bg',
    fg: 'menu.danger-fg',
  },
  done: { fill: 'menu.done-bg', hi: 'menu.done-hi', lo: 'menu.done-lo', fg: 'menu.done-fg' },
  icon: { fill: 'menu.surface', hi: 'menu.surface-hi', lo: 'menu.surface-lo', fg: 'menu.text' },
};

const DISABLED: VariantStyle = {
  fill: 'menu.locked-bg',
  hi: 'menu.locked-bg',
  lo: 'menu.locked-bg',
  fg: 'menu.text-disabled',
};

const HOVER_HI: Partial<Record<ButtonVariant, ColorName>> = {
  primary: 'menu.action-hi',
  secondary: 'menu.surface-hi',
  danger: 'menu.danger-hi',
  done: 'menu.done-hi',
  icon: 'menu.surface-hi',
};

/** Breite eines Knopfes aus Textbreite (Polster je 10 px) und Mindestgröße. */
export function buttonWidth(textPx: number, requested?: number): number {
  return Math.max(MIN_BUTTON_SIZE, requested ?? textPx + 20);
}

/** Kassetten-Knopf (mindestens 32x32) mit Hover, gedrückt (2 px versetzt), deaktiviert und Fokus-Ring. */
export class Button extends Phaser.GameObjects.Container {
  private readonly g: Phaser.GameObjects.Graphics;
  private readonly text: KText | null;
  private icon: Phaser.GameObjects.Image | null;
  private textX = 0;
  private iconX = 0;
  private readonly style: VariantStyle;
  private readonly variant: ButtonVariant;
  private readonly bw: number;
  private readonly bh: number;
  private readonly onClick: () => void;
  private enabled = true;
  private hover = false;
  private pressed = false;
  private focused = false;

  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    label: string,
    onClick: () => void,
    opts: ButtonOptions = {},
  ) {
    super(scene, x, y);
    this.variant = opts.variant ?? 'secondary';
    this.style = STYLES[this.variant];
    this.onClick = onClick;
    this.g = scene.add.graphics();
    this.add(this.g);

    if (this.variant === 'icon') {
      this.bw = MIN_BUTTON_SIZE;
      this.bh = MIN_BUTTON_SIZE;
      this.text = null;
      this.icon = scene.textures.exists('ui-icons')
        ? scene.add.image(0, 0, 'ui-icons', opts.iconFrame ?? 0)
        : null;
      if (this.icon) this.add(this.icon);
    } else {
      this.text = kText(scene, 0, 0, label, opts.scale ?? 2, this.style.fg, 0.5, 0.5);
      this.icon = null;
      const lead = opts.leading && scene.textures.exists(opts.leading.key) ? opts.leading : null;
      const textW = textWidth(this.text);
      const leadW = lead ? scene.textures.getFrame(lead.key, lead.frame ?? 0).width : 0;
      const gap = lead ? 6 : 0;
      this.bw = buttonWidth(textW + leadW + gap, opts.width);
      this.bh = Math.max(MIN_BUTTON_SIZE, opts.height ?? MIN_BUTTON_SIZE);
      this.add(this.text);
      if (lead) {
        const total = leadW + gap + textW;
        this.iconX = Math.round(-total / 2 + leadW / 2);
        this.textX = Math.round(-total / 2 + leadW + gap + textW / 2);
        this.icon = scene.add.image(this.iconX, 0, lead.key, lead.frame ?? 0);
        this.add(this.icon);
      }
    }
    this.setSize(this.bw, this.bh);
    this.setInteractive({ useHandCursor: true });
    this.on('pointerover', () => this.applyState({ hover: true }));
    this.on('pointerout', () => this.applyState({ hover: false, pressed: false }));
    this.on('pointerdown', () => this.applyState({ pressed: true }));
    this.on('pointerup', () => {
      const wasPressed = this.pressed;
      this.applyState({ pressed: false });
      if (this.enabled && wasPressed) this.onClick();
    });
    this.render();
    scene.add.existing(this);
  }

  /** Die Beschriftung (leer bei Icon-Knöpfen). */
  get label(): KText | null {
    return this.text;
  }

  get isEnabled(): boolean {
    return this.enabled;
  }

  /** Löst den Klick aus (Tastatur: Eingabe oder Leertaste). */
  activate(): void {
    if (this.enabled) this.onClick();
  }

  /** Deaktivierte Knöpfe sind flach und ohne Schatten und ignorieren Eingaben. */
  setEnabled(enabled: boolean): this {
    this.enabled = enabled;
    if (!enabled) {
      this.hover = false;
      this.pressed = false;
    }
    this.render();
    return this;
  }

  /** Fokus-Ring (2 px, Abstand 4 px) um den Knopf. */
  setFocused(focused: boolean): this {
    this.focused = focused;
    this.render();
    return this;
  }

  private applyState(next: { hover?: boolean; pressed?: boolean }): void {
    if (!this.enabled) return;
    this.hover = next.hover ?? this.hover;
    this.pressed = next.pressed ?? this.pressed;
    this.render();
  }

  private render(): void {
    const g = this.g.clear();
    const s = this.enabled ? this.style : DISABLED;
    const offset = this.enabled && this.pressed ? THEME.spacePx['space.half'] : 0;
    const x = -this.bw / 2 + offset;
    const y = -this.bh / 2 + offset;
    const colors: BevelColors =
      this.enabled && this.hover && !this.pressed
        ? { fill: HOVER_HI[this.variant] ?? s.fill, hi: HOVER_HI[this.variant] ?? s.hi, lo: s.lo }
        : s;
    if (this.enabled) {
      // gedrückt: Fase innen vertauscht, Schatten nur noch 2 px
      drawBevel(
        g,
        x,
        y,
        this.bw,
        this.bh,
        offset ? { fill: s.fill, hi: s.lo, lo: s.lo } : colors,
        !offset,
      );
    } else {
      drawBevel(g, x, y, this.bw, this.bh, s, false);
    }
    if (this.focused)
      drawRing(
        g,
        -this.bw / 2,
        -this.bh / 2,
        this.bw,
        this.bh,
        THEME.spacePx['space.half'],
        'menu.focus',
      );
    this.text?.setPosition(this.textX + offset, offset);
    this.icon?.setPosition(this.iconX + offset, offset);
    this.icon?.setAlpha(this.enabled ? 1 : 0.6);
    if (this.text instanceof Phaser.GameObjects.BitmapText) {
      this.text.setTint(THEME.colors[s.fg].num);
    }
    if (this.variant === 'icon') {
      this.icon?.setTint(THEME.colors[this.enabled ? 'menu.text' : 'menu.text-disabled'].num);
    }
  }
}

export interface KeyboardFocus {
  /** Index des fokussierten Knopfes, -1 solange noch keine Taste gedrückt wurde. */
  current(): number;
  dispose(): void;
}

/**
 * Tastatur-Fokus über eine Gruppe von Knöpfen (Pfeile, Tab, Eingabe, Leertaste).
 * `initial` -1: kein Ring, bis die erste Navigationstaste gedrückt wird.
 */
export function attachKeyboardFocus(
  scene: Phaser.Scene,
  buttons: readonly Button[],
  initial: number,
): KeyboardFocus {
  const keyboard = scene.input.keyboard;
  let index = Math.min(initial, buttons.length - 1);
  const apply = (): void => buttons.forEach((b, i) => b.setFocused(i === index));
  const step = (dir: 1 | -1): void => {
    if (index < 0 && dir === -1) index = 0;
    for (let n = 1; n <= buttons.length; n++) {
      const i = (((index + dir * n) % buttons.length) + buttons.length) % buttons.length;
      if (buttons[i]?.isEnabled) {
        index = i;
        break;
      }
    }
    apply();
  };
  const onKey = (e: KeyboardEvent): void => {
    switch (e.code) {
      case 'ArrowRight':
      case 'ArrowDown':
        step(1);
        break;
      case 'ArrowLeft':
      case 'ArrowUp':
        step(-1);
        break;
      case 'Tab':
        e.preventDefault();
        step(e.shiftKey ? -1 : 1);
        break;
      case 'Enter':
      case 'Space':
        buttons[index]?.activate();
        break;
      default:
    }
  };
  apply();
  keyboard?.on('keydown', onKey);
  return {
    current: () => index,
    dispose: () => {
      keyboard?.off('keydown', onKey);
    },
  };
}

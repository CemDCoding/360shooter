import Phaser from 'phaser';

export const MIN_BUTTON_SIZE = 32;

export interface ButtonOptions {
  width?: number;
  height?: number;
  fontSize?: number;
  fill?: number;
  hoverFill?: number;
  textColor?: string;
  subLabel?: string;
}

/** Touch-friendly button (min 32x32 logical px) with hover and press feedback. */
export class Button extends Phaser.GameObjects.Container {
  readonly label: Phaser.GameObjects.Text;
  private readonly bg: Phaser.GameObjects.Rectangle;
  private readonly fill: number;
  private readonly hoverFill: number;
  private enabled = true;

  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    label: string,
    onClick: () => void,
    opts: ButtonOptions = {},
  ) {
    super(scene, x, y);
    const w = Math.max(MIN_BUTTON_SIZE, opts.width ?? 120);
    const h = Math.max(MIN_BUTTON_SIZE, opts.height ?? 32);
    this.fill = opts.fill ?? 0x2d4a6b;
    this.hoverFill = opts.hoverFill ?? 0x3f6a9a;
    this.bg = scene.add
      .rectangle(0, 0, w, h, this.fill)
      .setStrokeStyle(1, 0xffffff, 0.6)
      .setInteractive({ useHandCursor: true });
    this.label = scene.add
      .text(0, opts.subLabel ? -4 : 0, label, {
        color: opts.textColor ?? '#ffffff',
        fontSize: `${opts.fontSize ?? 14}px`,
      })
      .setOrigin(0.5);
    this.add([this.bg, this.label]);
    if (opts.subLabel) {
      this.add(
        scene.add
          .text(0, h / 2 - 8, opts.subLabel, { color: '#cfd8e3', fontSize: '8px' })
          .setOrigin(0.5),
      );
    }
    this.setSize(w, h);

    this.bg.on('pointerover', () => {
      if (this.enabled) this.bg.setFillStyle(this.hoverFill);
    });
    this.bg.on('pointerout', () => {
      if (this.enabled) this.bg.setFillStyle(this.fill);
      this.setScale(1);
    });
    this.bg.on('pointerdown', () => {
      if (this.enabled) this.setScale(0.95);
    });
    this.bg.on('pointerup', () => {
      if (!this.enabled) return;
      this.setScale(1);
      onClick();
    });
    scene.add.existing(this);
  }

  /** Disabled buttons look grey and ignore input. */
  setEnabled(enabled: boolean): this {
    this.enabled = enabled;
    this.bg.setFillStyle(enabled ? this.fill : 0x444444);
    this.bg.setAlpha(enabled ? 1 : 0.7);
    return this;
  }
}

import Phaser from 'phaser';
import { THEME } from '../../config/theme';
import { prefersReducedMotion } from '../../platform/motion';
import { attachKeyboardFocus, Button, type KeyboardFocus } from './Button';
import { drawBevel, kText, motionMs } from './kassette';

const DIALOG_W = 360;
const DIALOG_H = 112;
const PAD = 16;

/**
 * Kassetten-Dialog Ja/Nein. Die erste Zeile der Nachricht ist der Titel (2x), der Rest die Erklärung (1x).
 * Der Fokus liegt zuerst auf „ABBRECHEN“; der Hintergrund schluckt alle Eingaben darunter.
 */
export class ConfirmDialog extends Phaser.GameObjects.Container {
  private focus: KeyboardFocus | null = null;
  private readonly escKey: Phaser.Input.Keyboard.Key | null;
  private readonly onEsc: () => void;

  constructor(scene: Phaser.Scene, message: string, onConfirm: () => void, onCancel: () => void) {
    const { width, height } = scene.scale;
    super(scene, 0, 0);
    this.setDepth(1000);
    const scrim = THEME.colors['menu.scrim'];
    const backdrop = scene.add
      .rectangle(0, 0, width, height, scrim.num, scrim.alpha)
      .setOrigin(0)
      .setInteractive();
    const [title = '', ...rest] = message.split('\n');
    const left = Math.round((width - DIALOG_W) / 2);
    const top = Math.round(height / 2 - DIALOG_H / 2 - 18);
    const g = scene.add.graphics();
    drawBevel(g, left, top, DIALOG_W, DIALOG_H, {
      fill: 'menu.surface',
      hi: 'menu.surface-hi',
      lo: 'menu.surface-lo',
    });
    const cx = left + DIALOG_W / 2;
    const titleText = kText(scene, cx, top + PAD, title, 2, 'menu.text', 0.5, 0);
    const detailText = kText(
      scene,
      cx,
      top + PAD + 14 + 10,
      rest.join(' '),
      1,
      'menu.text-muted',
      0.5,
      0,
    );
    const btnY = top + DIALOG_H - PAD - 16;
    const yes = new Button(scene, cx, btnY, 'Ja, löschen', onConfirm, { variant: 'danger' });
    const no = new Button(scene, cx, btnY, 'Abbrechen', onCancel, { variant: 'secondary' });
    // nebeneinander mit 16 px Abstand, als Paar zentriert
    const gap = 16;
    const yesW = yes.width;
    const noW = no.width;
    const startX = cx - (yesW + gap + noW) / 2;
    yes.setX(Math.round(startX + yesW / 2));
    no.setX(Math.round(startX + yesW + gap + noW / 2));

    this.add([backdrop, g, titleText, detailText, yes, no]);
    this.focus = attachKeyboardFocus(scene, [yes, no], 1);
    this.onEsc = onCancel;
    this.escKey = scene.input.keyboard?.addKey(Phaser.Input.Keyboard.KeyCodes.ESC) ?? null;
    this.escKey?.on('down', this.onEsc);
    scene.add.existing(this);
    const fade = motionMs(prefersReducedMotion(), THEME.motionMs['motion.fast']);
    if (fade > 0) {
      this.setAlpha(0);
      scene.tweens.add({
        targets: this,
        alpha: 1,
        duration: fade,
        ease: 'Stepped',
        easeParams: [2],
      });
    }
  }

  override destroy(fromScene?: boolean): void {
    this.escKey?.off('down', this.onEsc);
    this.focus?.dispose();
    this.focus = null;
    super.destroy(fromScene);
  }
}

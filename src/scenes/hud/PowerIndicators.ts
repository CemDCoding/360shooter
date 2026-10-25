import Phaser from 'phaser';
import { ITEMS } from '../../config';
import type { ActivePowers } from '../../contracts';
import { secondsLeft, shieldRatio } from './hudMath';

/** Layout values, candidates for the config. */
const SHIELD_BAR_W = 40;
const SHIELD_BAR_H = 6;

/** Double shot stage 0/2, shield bar with remaining points, rapid fire seconds. */
export class PowerIndicators {
  private readonly stageText: Phaser.GameObjects.Text;
  private readonly shieldFill: Phaser.GameObjects.Rectangle;
  private readonly shieldText: Phaser.GameObjects.Text;
  private readonly rapidIcon: Phaser.GameObjects.Image;
  private readonly rapidText: Phaser.GameObjects.Text;
  private readonly perStack: number;
  private readonly maxStacks: number;
  private readonly barW: number;
  private readonly maxStage: number;

  /** Slots start at x with `step` spacing: double shot, shield, rapid fire. */
  constructor(scene: Phaser.Scene, x: number, y: number, step: number, k: number, fontPx: number) {
    const style = { fontFamily: 'monospace', fontSize: `${fontPx}px`, color: '#ffffff' };
    const find = (e: string) => ITEMS.find((i) => i.effect === e);
    this.perStack = find('shield')?.perStack ?? 1;
    this.maxStacks = find('shield')?.maxStacks ?? 1;
    this.maxStage = find('doubleShot')?.maxStacks ?? 2;
    this.barW = SHIELD_BAR_W * k;
    const key = (e: string): string => find(e)?.spriteKey ?? '';

    scene.add.image(x, y, key('doubleShot'), 0).setScale(k);
    this.stageText = scene.add.text(x + 10 * k, y, '', style).setOrigin(0, 0.5).setStroke('#000000', 2);

    const sx = x + step;
    scene.add.image(sx, y, key('shield'), 0).setScale(k);
    scene.add
      .rectangle(sx + 10 * k, y, this.barW + 2, SHIELD_BAR_H * k + 2, 0x000000, 0.6)
      .setOrigin(0, 0.5)
      .setStrokeStyle(1, 0xffffff, 0.8);
    this.shieldFill = scene.add
      .rectangle(sx + 10 * k + 1, y, this.barW, SHIELD_BAR_H * k, 0x3498db)
      .setOrigin(0, 0.5);
    this.shieldText = scene.add
      .text(sx + 10 * k + this.barW / 2, y, '', { ...style, fontSize: `${Math.round(fontPx * 0.8)}px` })
      .setOrigin(0.5)
      .setStroke('#000000', 2);

    const rx = sx + 10 * k + this.barW + 10 * k;
    this.rapidIcon = scene.add.image(rx, y, key('rapidFire'), 0).setScale(k);
    this.rapidText = scene.add.text(rx + 10 * k, y, '', style).setOrigin(0, 0.5).setStroke('#000000', 2);
    this.set({ doubleShotStage: 0, shieldLeft: 0, rapidFireMsLeft: 0 });
  }

  /** Right edge of the rapid fire slot (start for the next indicator). */
  nextX(k: number): number {
    return this.rapidIcon.x + 36 * k;
  }

  set(p: ActivePowers): void {
    const stage = Math.min(this.maxStage, Math.max(0, Math.floor(p.doubleShotStage) || 0));
    this.stageText.setText(`${stage}/${this.maxStage}`);
    this.stageText.setAlpha(stage > 0 ? 1 : 0.5);

    this.shieldFill.width = this.barW * shieldRatio(p.shieldLeft, this.perStack, this.maxStacks);
    this.shieldText.setText(p.shieldLeft > 0 ? String(Math.ceil(p.shieldLeft)) : '');

    const sec = secondsLeft(p.rapidFireMsLeft);
    this.rapidIcon.setVisible(sec > 0);
    this.rapidText.setVisible(sec > 0);
    this.rapidText.setText(`${sec}s`);
  }
}

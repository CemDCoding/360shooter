import Phaser from 'phaser';
import { ITEMS } from '../../config';
import type { ActivePowers } from '../../contracts';
import { FunkChip } from './FunkPanel';
import { secondsLeft, secondsText, shieldRatio } from './hudMath';

/** Layout value (shield bar width at k = 1), candidate for the config. */
const SHIELD_BAR_W = 24;

/**
 * Chips for the active powers only: double shot (stage/max), shield (own small bar and
 * stacks), rapid fire (seconds). An inactive power has no chip and no surface.
 */
export class PowerIndicators {
  readonly doubleShot: FunkChip;
  readonly shield: FunkChip;
  readonly rapidFire: FunkChip;
  private readonly perStack: number;
  private readonly maxStacks: number;
  private readonly maxStage: number;

  constructor(
    scene: Phaser.Scene,
    k: number,
    private readonly onChange: () => void,
  ) {
    const find = (e: string) => ITEMS.find((i) => i.effect === e);
    this.perStack = find('shield')?.perStack ?? 1;
    this.maxStacks = find('shield')?.maxStacks ?? 1;
    this.maxStage = find('doubleShot')?.maxStacks ?? 2;
    const key = (e: string): string => find(e)?.spriteKey ?? '';
    this.doubleShot = new FunkChip(scene, { icon: { key: key('doubleShot') }, k });
    this.shield = new FunkChip(scene, { icon: { key: key('shield') }, barW: SHIELD_BAR_W, k });
    this.rapidFire = new FunkChip(scene, { icon: { key: key('rapidFire') }, k });
    this.set({ doubleShotStage: 0, shieldLeft: 0, rapidFireMsLeft: 0 });
  }

  /** Chips in display order. */
  get chips(): FunkChip[] {
    return [this.doubleShot, this.shield, this.rapidFire];
  }

  set(p: ActivePowers): void {
    const stage = Math.min(this.maxStage, Math.max(0, Math.floor(p.doubleShotStage) || 0));
    this.doubleShot.setVisible(stage > 0);
    if (stage > 0) this.doubleShot.setContent(`${stage}/${this.maxStage}`, 'hud.text');

    const left = Number.isFinite(p.shieldLeft) ? p.shieldLeft : 0;
    this.shield.setVisible(left > 0);
    if (left > 0) {
      const stacks = Math.min(this.maxStacks, Math.ceil(left / this.perStack));
      this.shield.setContent(`${stacks}/${this.maxStacks}`, 'hud.text');
      this.shield.setBar(shieldRatio(left, this.perStack, this.maxStacks), 'game.shield-ring');
    }

    const sec = secondsLeft(p.rapidFireMsLeft);
    this.rapidFire.setVisible(sec > 0);
    if (sec > 0) this.rapidFire.setContent(secondsText(sec), 'hud.text');
    this.onChange();
  }
}

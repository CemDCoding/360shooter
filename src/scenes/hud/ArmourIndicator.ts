import Phaser from 'phaser';
import type { ActiveArmour } from '../../contracts';
import { FunkChip } from './FunkPanel';
import { armourDisplay, secondsText } from './hudMath';

/**
 * Fire ring chip: active = accent frame and glow, cooling down = dotted frame.
 * Invisible without armour.
 */
export class ArmourIndicator {
  readonly chip: FunkChip;

  constructor(scene: Phaser.Scene, k: number, private readonly onChange: () => void) {
    this.chip = new FunkChip(scene, { icon: { key: 'item-fire-ring', frame: 0 }, k });
    this.set({ id: null, activeMsLeft: 0, cooldownMsLeft: 0 });
  }

  set(a: ActiveArmour): void {
    const d = armourDisplay(a);
    const visible = d.phase !== 'hidden';
    this.chip.setVisible(visible);
    if (visible) {
      const active = d.phase === 'active';
      this.chip.setContent(secondsText(d.sec), active ? 'hud.text' : 'hud.text-muted');
      this.chip.setStyle(
        active
          ? { line: 'hud.accent', glow: true }
          : { line: 'hud.line', dotted: true },
      );
      this.chip.setIconTint(active ? null : 'hud.line');
    }
    this.onChange();
  }
}

import Phaser from 'phaser';
import type { ActivePlayerStatus, PlayerStatusKind } from '../../contracts';
import { FunkChip } from './FunkPanel';
import { statusDisplay, type StatusDisplay } from './hudMath';

/** Layout value (remaining-time bar width at k = 1), candidate for the config. */
const STATUS_BAR_W = 24;

/**
 * Chips for the status effects on the player (PE-127, AP-102): label text plus a remaining-time bar,
 * so the state never relies on colour alone. Poison = solid frame with glow, slow = dotted frame.
 * An inactive effect has no chip.
 */
export class StatusIndicator {
  readonly poison: FunkChip;
  readonly slow: FunkChip;
  private readonly peak: Record<PlayerStatusKind, number> = { poison: 0, slow: 0 };
  /** Last display per kind (null: hidden). */
  readonly shown: Record<PlayerStatusKind, StatusDisplay | null> = { poison: null, slow: null };

  constructor(
    scene: Phaser.Scene,
    k: number,
    private readonly onChange: () => void,
  ) {
    this.poison = new FunkChip(scene, { k, barW: STATUS_BAR_W });
    this.slow = new FunkChip(scene, { k, barW: STATUS_BAR_W });
    this.set([]);
  }

  /** Chips in display order. */
  get chips(): FunkChip[] {
    return [this.poison, this.slow];
  }

  set(effects: readonly ActivePlayerStatus[]): void {
    for (const kind of ['poison', 'slow'] as const) {
      const chip = kind === 'poison' ? this.poison : this.slow;
      const entry = effects.find((e) => e.kind === kind);
      const ms = entry && Number.isFinite(entry.remainingMs) ? Math.max(0, entry.remainingMs) : 0;
      // The peak is the longest remaining time seen since the effect started: the bar's full length.
      this.peak[kind] = ms > 0 ? Math.max(this.peak[kind], ms) : 0;
      const d = statusDisplay(kind, ms, this.peak[kind]);
      this.shown[kind] = d;
      chip.setVisible(d !== null);
      if (d) {
        chip.setContent(d.text, 'hud.text');
        chip.setBar(d.ratio, kind === 'poison' ? 'hud.danger' : 'hud.accent');
        chip.setStyle(
          kind === 'poison'
            ? { line: 'hud.danger', glow: true }
            : { line: 'hud.accent', dotted: true },
        );
      }
    }
    this.onChange();
  }
}

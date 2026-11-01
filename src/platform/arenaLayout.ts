/**
 * Pure arena layout logic (no Phaser, no DOM): turns measurements into the wanted arena width and
 * the size of #game, and decides when a wanted width is applied (PE-109: fixed during a round).
 */
import { ARENA } from '../config/arena';
import type { SafeInsets } from '../contracts';
import {
  arenaWidthFor,
  clampedArea,
  fitArena,
  type Insets,
  type VisibleArea,
  type VisualBox,
  type WindowBox,
} from './layout';

export interface ArenaMeasure {
  probeW: number;
  probeH: number;
  insets: Insets;
  vv: VisualBox | null | undefined;
  win: WindowBox | null | undefined;
}

export interface ArenaMeasured {
  area: VisibleArea;
  availW: number;
  availH: number;
  /** Arena width the whole visible area asks for (PE-140, PE-109). */
  wantedW: number;
  /** Insets in arena units for the wanted width (PE-141). */
  wantedInsets: SafeInsets;
}

export const NO_INSETS: SafeInsets = { top: 0, right: 0, bottom: 0, left: 0 };

/** Equality of two inset sets. */
export function sameInsets(a: SafeInsets, b: SafeInsets): boolean {
  return a.top === b.top && a.right === b.right && a.bottom === b.bottom && a.left === b.left;
}

/**
 * Insets in CSS pixels to arena units, rounded up (so a control never ends up under the notch),
 * never negative. An invalid scale gives 0.
 */
export function insetsInArenaUnits(insetsPx: SafeInsets, cssPerUnit: number): SafeInsets {
  const conv = (px: number): number =>
    Number.isFinite(px) && px > 0 && Number.isFinite(cssPerUnit) && cssPerUnit > 0
      ? Math.ceil(px / cssPerUnit - 1e-6)
      : 0;
  return {
    top: conv(insetsPx.top),
    right: conv(insetsPx.right),
    bottom: conv(insetsPx.bottom),
    left: conv(insetsPx.left),
  };
}

/**
 * Insets of the visible area as seen from the canvas, in arena units. Bars around the canvas
 * (iPad 4:3) already take up part of an inset, so only the rest counts.
 */
export function arenaInsetsFor(area: VisibleArea, arenaW: number): SafeInsets {
  const f = fitArena(area.width, area.height, NO_INSETS, arenaW, ARENA.height);
  const barR = Math.max(0, area.width - f.offsetX - f.width);
  const barB = Math.max(0, area.height - f.offsetY - f.height);
  return insetsInArenaUnits(
    {
      top: area.insets.top - f.offsetY,
      right: area.insets.right - barR,
      bottom: area.insets.bottom - barB,
      left: area.insets.left - f.offsetX,
    },
    f.scale,
  );
}

/**
 * Measurements (probe, insets, visualViewport, inner size) to visible area and wanted width. The
 * width follows the whole visible area (PE-140); the insets only become `wantedInsets` for the
 * scenes. `availW/availH` (room inside the insets) are kept for the layout overlay.
 */
export function measureArena(m: ArenaMeasure): ArenaMeasured {
  const area = clampedArea(m.probeW, m.probeH, m.insets, m.vv, m.win);
  const availW = Math.max(0, area.width - area.insets.left - area.insets.right);
  const availH = Math.max(0, area.height - area.insets.top - area.insets.bottom);
  const wantedW = arenaWidthFor(area.width, area.height);
  return { area, availW, availH, wantedW, wantedInsets: arenaInsetsFor(area, wantedW) };
}

export interface HostBox {
  left: number;
  top: number;
  width: number;
  height: number;
}

/**
 * CSS box of #game for the arena width the game really runs with (whole pixels). #game covers the
 * whole visible area, also under notch and home bar (PE-140): FIT leaves only rounding rests,
 * unless the width is capped at 640 or 900.
 */
export function hostBoxFor(area: VisibleArea, currentW: number): HostBox {
  const f = fitArena(area.width, area.height, NO_INSETS, currentW, ARENA.height);
  return {
    left: area.x + f.offsetX,
    top: area.y + f.offsetY,
    width: Math.floor(f.width),
    height: Math.floor(f.height),
  };
}

/**
 * Controller for the width the game runs with. A wanted width is applied at once while no round
 * exists, and at the latest when a round starts (also "Nochmal"); while a round runs (also paused)
 * it is only remembered and applied when the round ends.
 */
/** Why a width was applied: round start, round end, or a new measurement outside a round. */
export type WidthChangeReason = 'start' | 'end' | 'want';

export class ArenaWidthController {
  private current: number | null = null;
  private wanted: number = ARENA.baseWidth;
  private curInsets: SafeInsets = NO_INSETS;
  private wantInsets: SafeInsets = NO_INSETS;
  private running = false;
  private changes = 0;
  private reason: WidthChangeReason | null = null;

  /** Number of applied width changes (for the layout overlay). */
  get changeCount(): number {
    return this.changes;
  }

  /** Reason of the last applied change, null before the first one. */
  get lastChange(): WidthChangeReason | null {
    return this.reason;
  }

  /** Width the game runs with; null until the first measurement. */
  get currentW(): number | null {
    return this.current;
  }

  get wantedW(): number {
    return this.wanted;
  }

  /** Insets (arena units) the scenes see; they change together with the width (Q-61). */
  get currentInsets(): SafeInsets {
    return this.curInsets;
  }

  get roundRunning(): boolean {
    return this.running;
  }

  /**
   * New measurement. Returns the width when the width or the insets were applied (the caller
   * compares it with the game size), else null. Insets follow the same rule as the width.
   */
  want(w: number, insets: SafeInsets = NO_INSETS): number | null {
    this.wanted = w;
    this.wantInsets = insets;
    if (this.current === null) {
      this.current = w; // first layout, before the game exists
      this.curInsets = insets;
      return null;
    }
    return this.sync('want');
  }

  /** A round starts (GameScene start or restart): apply the wanted width first, then freeze. */
  roundStart(): number | null {
    this.running = false;
    const w = this.sync('start');
    this.running = true;
    return w;
  }

  /** The round ended (GameScene shutdown): apply a deferred width. */
  roundEnd(): number | null {
    this.running = false;
    return this.sync('end');
  }

  /**
   * Safety net against a missed scene event: `alive` is the real GameScene state (starting,
   * running, paused or sleeping). A round that no longer exists ends here (applies a deferred
   * width); a round that exists without a seen start is frozen without changing the width.
   */
  syncRound(alive: boolean): number | null {
    if (alive && !this.running) {
      this.running = true;
      return null;
    }
    if (!alive && this.running) return this.roundEnd();
    return null;
  }

  private sync(reason: WidthChangeReason): number | null {
    if (this.current === null || this.running) return null;
    if (this.wanted === this.current && sameInsets(this.wantInsets, this.curInsets)) return null;
    this.current = this.wanted;
    this.curInsets = this.wantInsets;
    this.changes += 1;
    this.reason = reason;
    return this.current;
  }
}

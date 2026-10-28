/**
 * Pure arena layout logic (no Phaser, no DOM): turns measurements into the wanted arena width and
 * the size of #game, and decides when a wanted width is applied (PE-109: fixed during a round).
 */
import { ARENA } from '../config/arena';
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
  /** Arena width the safe area asks for (PE-99, PE-109). */
  wantedW: number;
}

/** Measurements (probe, insets, visualViewport, inner size) to visible area and wanted width. */
export function measureArena(m: ArenaMeasure): ArenaMeasured {
  const area = clampedArea(m.probeW, m.probeH, m.insets, m.vv, m.win);
  const availW = Math.max(0, area.width - area.insets.left - area.insets.right);
  const availH = Math.max(0, area.height - area.insets.top - area.insets.bottom);
  return { area, availW, availH, wantedW: arenaWidthFor(availW, availH) };
}

export interface HostBox {
  left: number;
  top: number;
  width: number;
  height: number;
}

/** CSS box of #game for the arena width the game really runs with (whole pixels). */
export function hostBoxFor(area: VisibleArea, currentW: number): HostBox {
  const f = fitArena(area.width, area.height, area.insets, currentW, ARENA.height);
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
export class ArenaWidthController {
  private current: number | null = null;
  private wanted: number = ARENA.baseWidth;
  private running = false;

  /** Width the game runs with; null until the first measurement. */
  get currentW(): number | null {
    return this.current;
  }

  get wantedW(): number {
    return this.wanted;
  }

  get roundRunning(): boolean {
    return this.running;
  }

  /** New measurement. Returns the width to set on the game when it changed, else null. */
  want(w: number): number | null {
    this.wanted = w;
    if (this.current === null) {
      this.current = w; // first layout, before the game exists
      return null;
    }
    return this.sync();
  }

  /** A round starts (GameScene start or restart): apply the wanted width first, then freeze. */
  roundStart(): number | null {
    this.running = false;
    const w = this.sync();
    this.running = true;
    return w;
  }

  /** The round ended (GameScene shutdown): apply a deferred width. */
  roundEnd(): number | null {
    this.running = false;
    return this.sync();
  }

  private sync(): number | null {
    if (this.current === null || this.wanted === this.current || this.running) return null;
    this.current = this.wanted;
    return this.current;
  }
}

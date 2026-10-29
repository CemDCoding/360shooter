/**
 * Measuring aid, active only with `?layout=1` or the stored flag (gesture): shows the numbers the
 * layout is based on.
 */

export interface LayoutReportInput {
  innerW: number;
  innerH: number;
  vv?: { width: number; height: number; offsetLeft: number; offsetTop: number } | null;
  screenW: number;
  screenH: number;
  dpr: number;
  probe: {
    width: number;
    height: number;
    top: number;
    right: number;
    bottom: number;
    left: number;
  };
  game: { x: number; y: number; width: number; height: number };
  standaloneMedia: boolean;
  standaloneNav: boolean | undefined;
  landscape: boolean;
  /** Arena width the safe area asks for, and the width the game currently runs with. */
  arenaDesiredW: number;
  arenaCurrentW: number;
  /** Visible safe area (clampedArea) and the room left inside its insets. */
  area: {
    x: number;
    y: number;
    width: number;
    height: number;
    insets: { top: number; right: number; bottom: number; left: number };
  };
  availW: number;
  availH: number;
  /** Computed box of #game (hostBoxFor), before the browser applies it. */
  host: { left: number; top: number; width: number; height: number };
  /** Real canvas box (getBoundingClientRect), null before the game exists. */
  canvas: { x: number; y: number; width: number; height: number } | null;
  /** Phaser scale manager sizes, null before the game exists. */
  scale: {
    game: { width: number; height: number };
    display: { width: number; height: number };
    parent: { width: number; height: number };
  } | null;
  roundRunning: boolean;
  widthChanges: number;
  lastChange: string | null;
}

const r = (n: number): string => (Number.isFinite(n) ? String(Math.round(n * 100) / 100) : '?');
const size = (s: { width: number; height: number }): string => `${r(s.width)}x${r(s.height)}`;

/** Text lines for the overlay; tolerates a missing visualViewport, canvas or scale manager. */
export function layoutReport(i: LayoutReportInput): string[] {
  const vv = i.vv
    ? `vv ${r(i.vv.width)}x${r(i.vv.height)} @${r(i.vv.offsetLeft)},${r(i.vv.offsetTop)}`
    : 'vv none';
  const a = i.area;
  const c = i.canvas;
  // Rest = window edge to canvas edge, left and right (CSS px).
  const canvas = c
    ? `canvas ${size(c)} @${r(c.x)},${r(c.y)} rest l${r(c.x)} r${r(i.innerW - c.x - c.width)}`
    : 'canvas none';
  const scale = i.scale
    ? `phaser game ${size(i.scale.game)} disp ${size(i.scale.display)} par ${size(i.scale.parent)}`
    : 'phaser none';
  return [
    `inner ${r(i.innerW)}x${r(i.innerH)}`,
    vv,
    `screen ${r(i.screenW)}x${r(i.screenH)} dpr ${r(i.dpr)}`,
    `probe ${r(i.probe.width)}x${r(i.probe.height)} ins t${r(i.probe.top)} r${r(i.probe.right)} b${r(i.probe.bottom)} l${r(i.probe.left)}`,
    `area ${size(a)} @${r(a.x)},${r(a.y)} ins t${r(a.insets.top)} r${r(a.insets.right)} b${r(a.insets.bottom)} l${r(a.insets.left)}`,
    `avail ${r(i.availW)}x${r(i.availH)}`,
    `host ${size(i.host)} @${r(i.host.left)},${r(i.host.top)}`,
    `game ${r(i.game.width)}x${r(i.game.height)} @${r(i.game.x)},${r(i.game.y)}`,
    canvas,
    scale,
    `arena want ${r(i.arenaDesiredW)} now ${r(i.arenaCurrentW)} round ${i.roundRunning}`,
    `width changes ${r(i.widthChanges)} last ${i.lastChange ?? 'none'}`,
    `standalone media ${i.standaloneMedia} nav ${String(i.standaloneNav)}`,
    `orientation ${i.landscape ? 'landscape' : 'portrait'}`,
  ];
}

/** True when the URL asks for the overlay. */
export function layoutDebugWanted(search: string): boolean {
  return new URLSearchParams(search).get('layout') === '1';
}

/**
 * localStorage key of the overlay flag (set and cleared by the gesture, layoutGesture.ts). The
 * value is only "on" or absent, no personal data (R2). Safari and the home screen app each have
 * their own storage, so the flag is set separately in both.
 */
export const LAYOUT_FLAG_KEY = '360shooter.layoutDebug.v1';
const FLAG_ON = '1';

/** The subset of `Storage` the flag needs. */
export interface FlagStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

/** localStorage, or null when it is missing or access throws (private mode). */
export function layoutFlagStorage(): FlagStorage | null {
  try {
    return typeof localStorage === 'undefined' ? null : localStorage;
  } catch {
    return null;
  }
}

/** Reads the flag; missing or failing storage means "off". */
export function readLayoutFlag(storage: FlagStorage | null | undefined): boolean {
  try {
    return storage?.getItem(LAYOUT_FLAG_KEY) === FLAG_ON;
  } catch {
    return false;
  }
}

/** Stores or clears the flag; returns false when the storage is missing or fails. */
export function writeLayoutFlag(storage: FlagStorage | null | undefined, on: boolean): boolean {
  if (!storage) return false;
  try {
    if (on) storage.setItem(LAYOUT_FLAG_KEY, FLAG_ON);
    else storage.removeItem(LAYOUT_FLAG_KEY);
    return true;
  } catch {
    return false;
  }
}

export interface LayoutDebug {
  readonly active: boolean;
  /** Shows or hides the overlay (created on first show). */
  setActive(on: boolean): void;
  /** New lines; only rendered while active. */
  update(lines: string[]): void;
}

/** The overlay (DOM only). Nothing is added to the page until it is switched on. */
export function createLayoutDebug(initiallyActive: boolean): LayoutDebug {
  let el: HTMLPreElement | null = null;
  let active = false;
  let last: string[] = [];
  const render = (): void => {
    if (el) el.textContent = last.join('\n');
  };
  const api: LayoutDebug = {
    get active() {
      return active;
    },
    setActive(on) {
      active = on && typeof document !== 'undefined';
      if (active && !el) {
        el = document.createElement('pre');
        // Inside the safe area (top left), so neither notch nor Safari bar covers it.
        el.style.cssText = [
          'position:fixed',
          'left:env(safe-area-inset-left)',
          'top:env(safe-area-inset-top)',
          'margin:0',
          'padding:var(--space-1)',
          'z-index:2000',
          'pointer-events:none',
          'font:10px/1.2 monospace',
          'color:var(--color-menu-text)',
          'background:var(--color-menu-bg)',
          'opacity:0.85',
        ].join(';');
        document.body.appendChild(el);
      }
      if (el) el.style.display = active ? 'block' : 'none';
      render();
    },
    update(lines) {
      last = lines;
      if (active) render();
    },
  };
  if (initiallyActive) api.setActive(true);
  return api;
}

export type ArenaWidthAction = 'keep' | 'apply' | 'defer';

/**
 * Decides what to do with a newly wanted arena width (PE-109): the width never changes while a
 * round (GameScene active, paused or sleeping) exists; the change waits until the round ends.
 */
export function decideArenaWidth(
  desired: number,
  current: number,
  gameSceneRunning: boolean,
): ArenaWidthAction {
  if (desired === current) return 'keep';
  return gameSceneRunning ? 'defer' : 'apply';
}

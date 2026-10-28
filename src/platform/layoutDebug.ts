/** Measuring aid, active only with `?layout=1`: shows the numbers the layout is based on. */

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
}

const r = (n: number): string => (Number.isFinite(n) ? String(Math.round(n * 100) / 100) : '?');

/** Text lines for the overlay; tolerates a missing visualViewport. */
export function layoutReport(i: LayoutReportInput): string[] {
  const vv = i.vv
    ? `vv ${r(i.vv.width)}x${r(i.vv.height)} @${r(i.vv.offsetLeft)},${r(i.vv.offsetTop)}`
    : 'vv none';
  return [
    `inner ${r(i.innerW)}x${r(i.innerH)}`,
    vv,
    `screen ${r(i.screenW)}x${r(i.screenH)} dpr ${r(i.dpr)}`,
    `probe ${r(i.probe.width)}x${r(i.probe.height)} ins t${r(i.probe.top)} r${r(i.probe.right)} b${r(i.probe.bottom)} l${r(i.probe.left)}`,
    `game ${r(i.game.width)}x${r(i.game.height)} @${r(i.game.x)},${r(i.game.y)}`,
    `standalone media ${i.standaloneMedia} nav ${String(i.standaloneNav)}`,
    `arena want ${r(i.arenaDesiredW)} now ${r(i.arenaCurrentW)}`,
    `orientation ${i.landscape ? 'landscape' : 'portrait'}`,
  ];
}

/** True when the URL asks for the overlay. */
export function layoutDebugWanted(search: string): boolean {
  return new URLSearchParams(search).get('layout') === '1';
}

/** Creates the overlay (DOM only) and returns an updater, or null without the parameter. */
export function createLayoutDebug(): ((lines: string[]) => void) | null {
  if (typeof document === 'undefined' || !layoutDebugWanted(window.location.search)) return null;
  const el = document.createElement('pre');
  el.style.cssText = [
    'position:fixed',
    'right:0',
    'bottom:0',
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
  return (lines) => {
    el.textContent = lines.join('\n');
  };
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

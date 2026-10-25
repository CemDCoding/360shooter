import Phaser from 'phaser';
import { BootScene } from './scenes/BootScene';
import { PreloadScene } from './scenes/PreloadScene';
import { MenuScene } from './scenes/MenuScene';
import { GameScene } from './scenes/GameScene';
import { HudScene } from './scenes/HudScene';
import { ResultScene } from './scenes/ResultScene';
import { clampedArea, fitArena, RELAYOUT_DELAYS_MS } from './platform/layout';
import { createLayoutDebug, layoutReport } from './platform/layoutDebug';
import { THEME } from './config/theme';

const ARENA_W = 640;
const ARENA_H = 360;
const debugUpdate = createLayoutDebug();

/** Sizes #game to the arena fitted into the safe area (notch, home bar), centred there. */
function layoutArena(): void {
  const host = document.getElementById('game');
  const probe = document.getElementById('safe');
  if (!host || !probe) return;
  const cs = getComputedStyle(probe);
  const px = (v: string): number => Number.parseFloat(v) || 0;
  const insets = {
    top: px(cs.paddingTop),
    right: px(cs.paddingRight),
    bottom: px(cs.paddingBottom),
    left: px(cs.paddingLeft),
  };
  // visualViewport is the truth on iOS (toolbar, rotation); 100dvh alone can be stale.
  const vv = window.visualViewport;
  const area = clampedArea(probe.clientWidth, probe.clientHeight, insets, vv, {
    width: window.innerWidth,
    height: window.innerHeight,
  });
  const f = fitArena(area.width, area.height, area.insets, ARENA_W, ARENA_H);
  host.style.right = 'auto';
  host.style.bottom = 'auto';
  host.style.left = `${area.x + f.offsetX}px`;
  host.style.top = `${area.y + f.offsetY}px`;
  host.style.width = `${Math.floor(f.width)}px`;
  host.style.height = `${Math.floor(f.height)}px`;
  debugUpdate?.(
    layoutReport({
      innerW: window.innerWidth,
      innerH: window.innerHeight,
      vv,
      screenW: window.screen.width,
      screenH: window.screen.height,
      dpr: window.devicePixelRatio,
      probe: { width: probe.clientWidth, height: probe.clientHeight, ...insets },
      game: host.getBoundingClientRect(),
      standaloneMedia: window.matchMedia?.('(display-mode: standalone)').matches ?? false,
      standaloneNav: (navigator as Navigator & { standalone?: boolean }).standalone,
      landscape: window.innerWidth >= window.innerHeight,
    }),
  );
}

layoutArena();

const game = new Phaser.Game({
  type: Phaser.AUTO,
  parent: 'game',
  width: ARENA_W,
  height: ARENA_H,
  pixelArt: true,
  backgroundColor: THEME.colors['menu.bg'].css,
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
  physics: {
    default: 'arcade',
    arcade: { gravity: { x: 0, y: 0 } },
  },
  scene: [BootScene, PreloadScene, MenuScene, GameScene, HudScene, ResultScene],
});

const relayout = (): void => {
  layoutArena();
  game.scale.refresh();
};

// Debounced: every trigger re-measures now-ish and again after RELAYOUT_DELAYS_MS, because the
// iOS home screen app can report stale sizes at start and fires no event once they settle.
let pending: number[] = [];
const scheduleRelayout = (): void => {
  for (const id of pending) window.clearTimeout(id);
  pending = RELAYOUT_DELAYS_MS.map((ms) => window.setTimeout(relayout, ms));
  requestAnimationFrame(() => requestAnimationFrame(relayout));
};

// Each listener is registered exactly once (this module runs once; scene changes do not re-run it).
window.addEventListener('resize', relayout);
window.addEventListener('orientationchange', scheduleRelayout);
window.addEventListener('load', scheduleRelayout);
window.addEventListener('pageshow', scheduleRelayout);
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible') scheduleRelayout();
});
window.matchMedia?.('(orientation: landscape)').addEventListener?.('change', scheduleRelayout);
window.matchMedia?.('(display-mode: standalone)').addEventListener?.('change', scheduleRelayout);
// iOS toolbar changes and pinch/scroll offsets only fire on visualViewport.
window.visualViewport?.addEventListener('resize', relayout);
window.visualViewport?.addEventListener('scroll', relayout);
// Covers a start where `load` already fired before this module ran.
scheduleRelayout();

import Phaser from 'phaser';
import { BootScene } from './scenes/BootScene';
import { PreloadScene } from './scenes/PreloadScene';
import { MenuScene } from './scenes/MenuScene';
import { GameScene } from './scenes/GameScene';
import { HudScene } from './scenes/HudScene';
import { ResultScene } from './scenes/ResultScene';
import {
  arenaWidthFor,
  clampedArea,
  fitArena,
  RELAYOUT_DELAYS_MS,
} from './platform/layout';
import { createLayoutDebug, decideArenaWidth, layoutReport } from './platform/layoutDebug';
import { ARENA } from './config/arena';
import { THEME } from './config/theme';

const debugUpdate = createLayoutDebug();

/*
 * PE-109: the arena width follows the safe area's aspect ratio (arenaWidthFor), but stays fixed
 * while a round exists (GameScene active, paused or sleeping). A width wanted meanwhile is only
 * remembered (`wantedW`) and applied when the GameScene shuts down. Menu and result scenes are
 * restarted after a change so that their layout matches the new width.
 */
let currentW: number | null = null; // null until the Phaser game exists
let wantedW: number = ARENA.baseWidth;
// Assigned once below; declared early because the helpers above need it (they run only later).
// eslint-disable-next-line prefer-const
let game: Phaser.Game | undefined;
let shutdownHooked = false;

const roundRunning = (): boolean =>
  !!game &&
  (game.scene.isActive('GameScene') ||
    game.scene.isPaused('GameScene') ||
    game.scene.isSleeping('GameScene'));

/** Applies the wanted width if no round exists; restarts open menu or result scenes. */
function applyWantedWidth(): void {
  if (!game || currentW === null) return;
  const action = decideArenaWidth(wantedW, currentW, roundRunning());
  if (action !== 'apply') return;
  currentW = wantedW;
  game.scale.setGameSize(currentW, ARENA.height);
  for (const key of ['MenuScene', 'ResultScene']) {
    if (!game.scene.isActive(key)) continue;
    const scene = game.scene.getScene(key);
    scene.scene.restart(scene.sys.settings.data);
  }
}

/** Registers (once) the listener that applies a deferred width when the round ends. */
function hookGameSceneEnd(): void {
  if (shutdownHooked || !game) return;
  const scene = game.scene.getScene('GameScene');
  if (!scene) return;
  shutdownHooked = true;
  scene.events.on(Phaser.Scenes.Events.SHUTDOWN, () => {
    // After the current scene switch, so a restarted round counts as running again.
    window.setTimeout(() => {
      applyWantedWidth();
      relayout();
    }, 0);
  });
}

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
  const availW = Math.max(0, area.width - area.insets.left - area.insets.right);
  const availH = Math.max(0, area.height - area.insets.top - area.insets.bottom);
  wantedW = arenaWidthFor(availW, availH);
  if (currentW === null) currentW = wantedW; // first layout, before new Phaser.Game
  else applyWantedWidth();
  const f = fitArena(area.width, area.height, area.insets, currentW, ARENA.height);
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
      arenaDesiredW: wantedW,
      arenaCurrentW: currentW,
    }),
  );
}

layoutArena();

game = new Phaser.Game({
  type: Phaser.AUTO,
  parent: 'game',
  width: currentW ?? ARENA.baseWidth,
  height: ARENA.height,
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

function relayout(): void {
  hookGameSceneEnd();
  layoutArena();
  game?.scale.refresh();
}
game.events.once(Phaser.Core.Events.READY, hookGameSceneEnd);

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

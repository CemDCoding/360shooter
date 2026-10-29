import Phaser from 'phaser';
import { BootScene } from './scenes/BootScene';
import { PreloadScene } from './scenes/PreloadScene';
import { MenuScene } from './scenes/MenuScene';
import { GameScene } from './scenes/GameScene';
import { HudScene } from './scenes/HudScene';
import { ResultScene } from './scenes/ResultScene';
import { RELAYOUT_DELAYS_MS } from './platform/layout';
import { ArenaWidthController, hostBoxFor, measureArena } from './platform/arenaLayout';
import {
  createLayoutDebug,
  layoutDebugWanted,
  layoutFlagStorage,
  layoutReport,
  readLayoutFlag,
  writeLayoutFlag,
} from './platform/layoutDebug';
import { HoldGesture } from './platform/layoutGesture';
import { ARENA } from './config/arena';
import { THEME } from './config/theme';

// Layout overlay: `?layout=1` or the stored flag; the flag is toggled by the gesture below.
const flagStorage = layoutFlagStorage();
const debug = createLayoutDebug(
  layoutDebugWanted(window.location.search) || readLayoutFlag(flagStorage),
);

/*
 * PE-109: the arena width follows the safe area's aspect ratio (arenaWidthFor), but stays fixed
 * while a round exists. The controller applies a wanted width at once outside a round, when a
 * round starts (also "Nochmal") and when it ends; menu and result scenes restart after a change.
 */
const widths = new ArenaWidthController();
// Assigned once below; declared early because the helpers need it (they run only later).
// eslint-disable-next-line prefer-const
let game: Phaser.Game | undefined;
let hooked = false;

/** Restarts open menu or result scenes so that their layout matches a new width. */
function restartMenus(): void {
  if (!game) return;
  for (const key of ['MenuScene', 'ResultScene']) {
    if (!game.scene.isActive(key)) continue;
    const scene = game.scene.getScene(key);
    scene.scene.restart(scene.sys.settings.data);
  }
}

/** True while a round exists (GameScene starting, running, paused or sleeping). */
function roundAlive(): boolean {
  const scene = game?.scene.getScene('GameScene');
  if (!scene) return false;
  const status = scene.sys.settings.status;
  return status >= Phaser.Scenes.START && status <= Phaser.Scenes.SLEEPING;
}

/** Registers (once) the GameScene listeners: the width is applied at round start and round end. */
function hookGameScene(): void {
  if (hooked || !game) return;
  const scene = game.scene.getScene('GameScene');
  if (!scene) return;
  hooked = true;
  // START comes before init/create, so the new round already sees the final width.
  scene.events.on(Phaser.Scenes.Events.START, () => {
    relayoutWith(widths.roundStart() !== null);
  });
  scene.events.on(Phaser.Scenes.Events.SHUTDOWN, () => {
    relayoutWith(widths.roundEnd() !== null);
  });
}

/**
 * Sizes #game to the arena fitted into the safe area (notch, home bar), centred there. Order
 * (AP-96, H-c): 1. game width, 2. #game box, 3. Phaser reads the new #game box, then fits the
 * canvas. Phaser's refresh() alone fits into the cached parent size and would keep the canvas
 * sized for the previous #game box. `widthChanged` is true when a round event applied a width.
 */
function layoutArena(widthChanged = false): void {
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
  const m = measureArena({
    probeW: probe.clientWidth,
    probeH: probe.clientHeight,
    insets,
    vv,
    win: { width: window.innerWidth, height: window.innerHeight },
  });
  // A round that ended without a seen SHUTDOWN releases its width here (H-b safety net).
  const ended = game ? widths.syncRound(roundAlive()) !== null : false;
  const wanted = widths.want(m.wantedW) !== null;
  const changed = widthChanged || ended || wanted;
  const width = widths.currentW ?? m.wantedW;
  if (changed && game) game.scale.setGameSize(width, ARENA.height);
  const box = hostBoxFor(m.area, width);
  host.style.right = 'auto';
  host.style.bottom = 'auto';
  host.style.left = `${box.left}px`;
  host.style.top = `${box.top}px`;
  host.style.width = `${box.width}px`;
  host.style.height = `${box.height}px`;
  if (game) {
    game.scale.getParentBounds();
    game.scale.refresh();
  }
  if (changed) restartMenus();
  if (!debug.active) return;
  const sm = game?.scale;
  debug.update(
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
      arenaDesiredW: widths.wantedW,
      arenaCurrentW: widths.currentW ?? m.wantedW,
      area: m.area,
      availW: m.availW,
      availH: m.availH,
      host: box,
      canvas: game?.canvas ? game.canvas.getBoundingClientRect() : null,
      scale: sm ? { game: sm.gameSize, display: sm.displaySize, parent: sm.parentSize } : null,
      roundRunning: widths.roundRunning,
      widthChanges: widths.changeCount,
      lastChange: widths.lastChange,
    }),
  );
}

layoutArena();

game = new Phaser.Game({
  type: Phaser.AUTO,
  parent: 'game',
  width: widths.currentW ?? ARENA.baseWidth,
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

/** Re-measures and lays out; `widthChanged` only from the round events (never an Event object). */
function relayoutWith(widthChanged: boolean): void {
  hookGameScene();
  layoutArena(widthChanged);
}
function relayout(): void {
  relayoutWith(false);
}
game.events.once(Phaser.Core.Events.READY, hookGameScene);

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

/*
 * Gesture for the overlay: three fingers held for 2 s outside a round toggles the stored flag.
 * Passive capture listeners only count fingers; they never cancel or stop an event, so Phaser
 * input (buttons, joystick) is not affected.
 */
const gesture = new HoldGesture();
let gestureTimer: number | undefined;
const onTouches = (e: TouchEvent): void => {
  const now = performance.now();
  if (gestureTimer !== undefined) window.clearTimeout(gestureTimer);
  gestureTimer = undefined;
  const due = gesture.touches(e.touches.length, now, roundAlive());
  if (due === null) return;
  gestureTimer = window.setTimeout(
    () => {
      gestureTimer = undefined;
      if (!gesture.check(performance.now(), roundAlive())) return;
      const on = !debug.active;
      writeLayoutFlag(flagStorage, on);
      debug.setActive(on);
      relayout();
    },
    due - now + 20,
  );
};
for (const type of ['touchstart', 'touchend', 'touchcancel'] as const) {
  window.addEventListener(type, onTouches, { passive: true, capture: true });
}

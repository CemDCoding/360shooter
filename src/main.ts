import Phaser from 'phaser';
import { BootScene } from './scenes/BootScene';
import { PreloadScene } from './scenes/PreloadScene';
import { MenuScene } from './scenes/MenuScene';
import { GameScene } from './scenes/GameScene';
import { HudScene } from './scenes/HudScene';
import { ResultScene } from './scenes/ResultScene';
import { RELAYOUT_DELAYS_MS } from './platform/layout';
import { ArenaWidthController, hostBoxFor, measureArena } from './platform/arenaLayout';
import { createLayoutDebug, layoutReport } from './platform/layoutDebug';
import { ARENA } from './config/arena';
import { THEME } from './config/theme';

const debugUpdate = createLayoutDebug();

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

/** Sets a new game width (if the controller returned one); restarts open menu or result scenes. */
function applyWidth(w: number | null): void {
  if (w === null || !game) return;
  game.scale.setGameSize(w, ARENA.height);
  for (const key of ['MenuScene', 'ResultScene']) {
    if (!game.scene.isActive(key)) continue;
    const scene = game.scene.getScene(key);
    scene.scene.restart(scene.sys.settings.data);
  }
}

/** Registers (once) the GameScene listeners: the width is applied at round start and round end. */
function hookGameScene(): void {
  if (hooked || !game) return;
  const scene = game.scene.getScene('GameScene');
  if (!scene) return;
  hooked = true;
  // START comes before init/create, so the new round already sees the final width.
  scene.events.on(Phaser.Scenes.Events.START, () => {
    applyWidth(widths.roundStart());
    relayout();
  });
  scene.events.on(Phaser.Scenes.Events.SHUTDOWN, () => {
    applyWidth(widths.roundEnd());
    relayout();
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
  const m = measureArena({
    probeW: probe.clientWidth,
    probeH: probe.clientHeight,
    insets,
    vv,
    win: { width: window.innerWidth, height: window.innerHeight },
  });
  applyWidth(widths.want(m.wantedW));
  const box = hostBoxFor(m.area, widths.currentW ?? m.wantedW);
  host.style.right = 'auto';
  host.style.bottom = 'auto';
  host.style.left = `${box.left}px`;
  host.style.top = `${box.top}px`;
  host.style.width = `${box.width}px`;
  host.style.height = `${box.height}px`;
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
      arenaDesiredW: widths.wantedW,
      arenaCurrentW: widths.currentW ?? m.wantedW,
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

function relayout(): void {
  hookGameScene();
  layoutArena();
  game?.scale.refresh();
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

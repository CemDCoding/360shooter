import Phaser from 'phaser';
import { BootScene } from './scenes/BootScene';
import { PreloadScene } from './scenes/PreloadScene';
import { MenuScene } from './scenes/MenuScene';
import { GameScene } from './scenes/GameScene';
import { HudScene } from './scenes/HudScene';
import { ResultScene } from './scenes/ResultScene';
import { fitArena, visibleArea } from './platform/layout';
import { THEME } from './config/theme';

const ARENA_W = 640;
const ARENA_H = 360;

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
  const area = visibleArea(probe.clientWidth, probe.clientHeight, insets, window.visualViewport);
  const f = fitArena(area.width, area.height, area.insets, ARENA_W, ARENA_H);
  host.style.right = 'auto';
  host.style.bottom = 'auto';
  host.style.left = `${area.x + f.offsetX}px`;
  host.style.top = `${area.y + f.offsetY}px`;
  host.style.width = `${Math.floor(f.width)}px`;
  host.style.height = `${Math.floor(f.height)}px`;
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
window.addEventListener('resize', relayout);
window.addEventListener('orientationchange', () => {
  setTimeout(relayout, 200);
  setTimeout(relayout, 600);
});
// One registration each: iOS toolbar changes and pinch/scroll offsets only fire on visualViewport.
window.visualViewport?.addEventListener('resize', relayout);
window.visualViewport?.addEventListener('scroll', relayout);

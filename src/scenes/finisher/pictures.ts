// Skip hint of the finisher (AP-160, brief H-39). Only theme tokens; works with the Canvas renderer.
// The M10 picture blocks (cutIn, panels, frames, title) were removed in AP-191.
import type Phaser from 'phaser';
import { THEME, themeColor } from '../../config/theme';
import { FUNK_FONT, FUNK_GLYPH_H, funkText } from '../hud/FunkPanel';
import { DEPTH } from './context';
import { ARROW_CELLS, ARROW_SCALE, hintBox, type FinisherLayout } from './layout';

/** "TIPPEN: WEITER" (Funk x1) with arrow on glass, bottom right inside the insets; does not blink. */
export function createSkipHint(ctx: {
  scene: Phaser.Scene;
  layout: FinisherLayout;
}): Phaser.GameObjects.Container | null {
  const scene = ctx.scene;
  if (!scene.cache.bitmapFont.exists(FUNK_FONT)) return null;
  const text = funkText(scene, 0, 0, 'TIPPEN: WEITER', 1, 'finisher.skip-text');
  const hb = hintBox(ctx.layout, Math.round(text.width), FUNK_GLYPH_H);
  text.setPosition(hb.textX, hb.textY);
  const g = scene.add.graphics();
  const glass = themeColor('hud.glass');
  const line = THEME.borderPx['border.hud'];
  g.fillStyle(glass.num, glass.alpha ?? 1).fillRect(hb.box.x, hb.box.y, hb.box.w, hb.box.h);
  g.lineStyle(line, themeColor('hud.line').num, 1).strokeRect(
    hb.box.x + line / 2,
    hb.box.y + line / 2,
    hb.box.w - line,
    hb.box.h - line,
  );
  g.fillStyle(themeColor('finisher.skip-text').num, 1);
  for (const c of ARROW_CELLS) {
    g.fillRect(
      hb.arrowX + c.x * ARROW_SCALE,
      hb.arrowY + c.y * ARROW_SCALE,
      c.w * ARROW_SCALE,
      c.h * ARROW_SCALE,
    );
  }
  return scene.add.container(0, 0, [g, text]).setDepth(DEPTH.hint).setVisible(false);
}

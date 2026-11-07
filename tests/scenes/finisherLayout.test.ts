import { describe, expect, it } from 'vitest';
import { LEVEL_COUNT } from '../../src/config/levels';
import { THEME } from '../../src/config/theme';
import { CHOREO_VARIANT_IDS, type SafeInsets } from '../../src/contracts';
import {
  ARROW_H,
  BAR_H,
  TITLE_GAP,
  finisherLayout,
  hintBox,
  speedlineWedges,
  tokenColor,
} from '../../src/scenes/finisher/layout';
import {
  SHAKE_HALF_MS,
  SHAKE_STEP_MS,
  SOUND_CHARGE,
  SOUND_HIT,
  cutInOffset,
  letterboxVisible,
  titleScaleAt,
} from '../../src/scenes/finisher/timing';
import { debugFinisherData, isFinisherStartData } from '../../src/scenes/finisher/startData';

const WIDTHS = [640, 734, 800, 900];
const H = 360;
const NONE: SafeInsets = { top: 0, right: 0, bottom: 0, left: 0 };
const NOTCH: SafeInsets = { top: 0, right: 44, bottom: 21, left: 44 };

describe('finisherLayout', () => {
  it.each(WIDTHS)('fills width %i: title and hint inside the insets', (w) => {
    for (const insets of [NONE, NOTCH]) {
      const l = finisherLayout(w, H, insets, true);
      expect(l.titleY).toBe(BAR_H + TITLE_GAP);
      expect(l.titleCenterX).toBe(Math.round((insets.left + w - insets.right) / 2));
      const hb = hintBox(l, 84, 8);
      expect(hb.box.x + hb.box.w).toBe(w - insets.right - THEME.sizePx['size.finisher-skip-inset']);
      expect(hb.box.y + hb.box.h).toBeLessThanOrEqual(H - BAR_H - 8);
      expect(hb.box.y + hb.box.h).toBeLessThanOrEqual(H - insets.bottom - 8);
      expect(hb.box.x).toBeGreaterThanOrEqual(insets.left);
      expect(hb.box.h).toBe(4 + ARROW_H + 4);
      expect(l.cutInTop + l.cutInH / 2).toBe(H / 2);
    }
  });

  it('puts the hint 8 px above the edge without bars and the title stays at 52', () => {
    const l = finisherLayout(640, H, NONE, false);
    expect(l.hintBottom).toBe(H - 8);
    expect(l.titleY).toBe(52);
  });

  it('keeps the title below a large top inset', () => {
    expect(finisherLayout(640, H, { ...NONE, top: 60 }, true).titleY).toBe(72);
  });

  it.each(WIDTHS)('draws 28 speedlines that reach past every corner at width %i', (w) => {
    const n = THEME.sizeCount['size.finisher-speedlines'];
    const wedges = speedlineWedges(w / 2, 180, w, H, n, 1);
    expect(wedges).toHaveLength(28);
    for (const q of wedges) {
      expect(q).toHaveLength(4);
      const inner = Math.hypot(q[0].x - q[1].x, q[0].y - q[1].y);
      const outer = Math.hypot(q[2].x - q[3].x, q[2].y - q[3].y);
      expect(inner).toBeCloseTo(1);
      expect(outer).toBeCloseTo(2);
    }
    expect(speedlineWedges(100, 100, w, H, n, 1)).toEqual(speedlineWedges(100, 100, w, H, n, 1));
  });

  it('uses only finisher tokens for step colours', () => {
    expect(tokenColor('finisher.bg-elf', 'finisher.ink')).toBe(THEME.colors['finisher.bg-elf']);
    expect(tokenColor('menu.bg', 'finisher.ink')).toBe(THEME.colors['finisher.ink']);
    expect(tokenColor('#ff0000', 'finisher.ink')).toBe(THEME.colors['finisher.ink']);
  });
});

describe('step timing', () => {
  it('slides the bars in within 160 ms in 3 whole steps', () => {
    expect([0, 52, 54, 107, 160, 2000].map((t) => letterboxVisible(t, 40))).toEqual([
      0, 0, 13, 27, 40, 40,
    ]);
  });

  it('shows the title first 2 steps larger, then final, without fading', () => {
    expect(titleScaleAt(0, 4)).toBe(6);
    expect(titleScaleAt(199, 4)).toBe(6);
    expect(titleScaleAt(200, 4)).toBe(4);
    expect(titleScaleAt(0, 3)).toBe(5);
  });

  it('keeps the shake rhythm in tokens', () => {
    expect(SHAKE_STEP_MS).toBe(THEME.motionMs['motion.rig-shake-step']);
    expect(SHAKE_HALF_MS).toBe(THEME.motionMs['motion.rig-shake-half']);
  });

  it('moves the cut-in in 120 ms, holds 360 ms and leaves to the right in 120 ms', () => {
    expect(cutInOffset(0, 600, 700)).toBe(-700);
    expect(cutInOffset(60, 600, 700)).toBe(-350);
    expect(cutInOffset(120, 600, 700)).toBe(0);
    expect(cutInOffset(479, 600, 700)).toBe(0);
    expect(cutInOffset(540, 600, 700)).toBe(350);
    expect(cutInOffset(600, 600, 700)).toBe(700);
  });
});

describe('placeholder sounds (PE-237)', () => {
  it('keeps the two keys the choreographies use', () => {
    expect(SOUND_CHARGE).toBe('sfx-finisher-charge');
    expect(SOUND_HIT).toBe('sfx-finisher-hit');
  });
});

describe('start data', () => {
  it('builds valid debug data for every level, without result', () => {
    for (let l = 0; l < LEVEL_COUNT; l++) {
      const d = debugFinisherData(l, 734, H, false);
      expect(isFinisherStartData(d)).toBe(true);
      expect(d.result).toBeUndefined();
      expect(d.boss.texture.startsWith('boss-')).toBe(true);
      expect(d.player.texture).toBe('astronaut');
      expect(CHOREO_VARIANT_IDS).toContain(d.plan.variantId);
    }
    expect(debugFinisherData(40, 640, H, true).plan.reduced).toBe(true);
  });

  it('rejects broken start data', () => {
    const ok = debugFinisherData(3, 640, H, false);
    expect(isFinisherStartData(null)).toBe(false);
    expect(isFinisherStartData({ ...ok, plan: { ...ok.plan, choreo: undefined } })).toBe(false);
    expect(isFinisherStartData({ ...ok, boss: { ...ok.boss, x: Number.NaN } })).toBe(false);
    expect(isFinisherStartData({ ...ok, player: { ...ok.player, scale: 0 } })).toBe(false);
    expect(isFinisherStartData({ ...ok, result: { won: true } })).toBe(true);
  });
});

import { describe, expect, it } from 'vitest';
import { FINISHER_RULES } from '../../src/config/finishers';
import { LEVEL_COUNT } from '../../src/config/levels';
import { THEME } from '../../src/config/theme';
import {
  CHOREO_VARIANT_IDS,
  FINISHER_VARIANT_IDS,
  type FinisherPlan,
  type SafeInsets,
} from '../../src/contracts';
import { CHOREOS } from '../../src/config/choreo';
import {
  DEFAULT_FINISHER_SOURCE,
  buildFinisher,
  choreoVariantId,
  isFlashSafe,
} from '../../src/logic/finisher';
import {
  ARROW_H,
  BAR_H,
  BEAM_TOTAL_H,
  TITLE_GAP,
  actorScreen,
  beamBands,
  beamSpan,
  finisherLayout,
  hintBox,
  hitPoint,
  panelLayout,
  speedlineWedges,
  tokenColor,
} from '../../src/scenes/finisher/layout';
import {
  SOUND_CHARGE,
  SOUND_DAWN,
  SOUND_HIT,
  SOUND_SIGNAL,
  beamProgress,
  beamWindow,
  cutInOffset,
  effectRate,
  frameAt,
  hitImageAt,
  impactPhase,
  letterboxVisible,
  panelsVisible,
  pictureStarts,
  shakeOffset,
  soundCues,
  titleScaleAt,
} from '../../src/scenes/finisher/timing';
import { debugFinisherData, isFinisherStartData } from '../../src/scenes/finisher/startData';
import { particleCount } from '../../src/scenes/finisher/particles';

const WIDTHS = [640, 734, 800, 900];
const H = 360;
const NONE: SafeInsets = { top: 0, right: 0, bottom: 0, left: 0 };
const NOTCH: SafeInsets = { top: 0, right: 44, bottom: 21, left: 44 };

/** One level per variant (stage levels and the six finales). */
const VARIANT_LEVELS = [0, 5, 10, 21, 26, 31, 4, 9, 20, 25, 30, 40];

function plans(reduceEffects: boolean): FinisherPlan[] {
  return VARIANT_LEVELS.map((l) => buildFinisher(l, { reduceEffects, seen: [] }));
}

describe('finisherLayout', () => {
  it.each(WIDTHS)(
    'fills width %i: bars full width, picture centred, title and hint inside the insets',
    (w) => {
      for (const insets of [NONE, NOTCH]) {
        const l = finisherLayout(w, H, insets, true);
        expect(l.barTop).toEqual({ x: 0, y: 0, w, h: BAR_H });
        expect(l.barBottom).toEqual({ x: 0, y: H - BAR_H, w, h: BAR_H });
        expect(l.picture.w).toBe(640);
        expect(l.picture.h).toBe(360);
        expect(l.picture.x).toBe(Math.round((w - 640) / 2));
        expect(l.titleY).toBe(BAR_H + TITLE_GAP);
        expect(l.titleCenterX).toBe(Math.round((insets.left + w - insets.right) / 2));
        const hb = hintBox(l, 84, 8);
        expect(hb.box.x + hb.box.w).toBe(
          w - insets.right - THEME.sizePx['size.finisher-skip-inset'],
        );
        expect(hb.box.y + hb.box.h).toBeLessThanOrEqual(H - BAR_H - 8);
        expect(hb.box.y + hb.box.h).toBeLessThanOrEqual(H - insets.bottom - 8);
        expect(hb.box.x).toBeGreaterThanOrEqual(insets.left);
        expect(hb.box.h).toBe(4 + ARROW_H + 4);
        expect(l.cutInTop + l.cutInH / 2).toBe(H / 2);
      }
    },
  );

  it('puts the hint 8 px above the edge without bars and the title stays at 52', () => {
    const l = finisherLayout(640, H, NONE, false);
    expect(l.hintBottom).toBe(H - 8);
    expect(l.titleY).toBe(52);
  });

  it('keeps the title below a large top inset', () => {
    expect(finisherLayout(640, H, { ...NONE, top: 60 }, true).titleY).toBe(72);
  });

  it.each(WIDTHS)('lays out three panels across width %i', (w) => {
    const p = panelLayout(w, NOTCH);
    expect(p.portrait.points[0]).toEqual({ x: 0, y: 0 });
    expect(p.hit.points[1].x).toBe(w);
    expect(p.beam.points[1].x).toBe(w);
    expect(p.portrait.anchor.x).toBeGreaterThanOrEqual(NOTCH.left);
    expect(p.astronaut.x).toBeGreaterThanOrEqual(NOTCH.left);
    expect(p.beamToX).toBeGreaterThan(p.beamFromX);
  });
});

describe('actors, hit point, speedlines, beam', () => {
  it('zooms around the hit point and keeps a copy inside the arena', () => {
    const hit = { x: 480, y: 180 };
    expect(actorScreen(hit, hit, 2, 640, H, 64, 64)).toEqual(hit);
    expect(actorScreen({ x: 320, y: 180 }, hit, 2, 640, H, 32, 32)).toEqual({ x: 160, y: 180 });
    expect(actorScreen({ x: 100, y: 180 }, hit, 2, 640, H, 32, 32).x).toBe(32);
  });

  it('writes into a reused point when given', () => {
    const out = { x: 0, y: 0 };
    expect(actorScreen({ x: 320, y: 180 }, { x: 480, y: 180 }, 2, 640, H, 32, 32, out)).toBe(out);
    expect(out).toEqual({ x: 160, y: 180 });
  });

  it('clamps the hit point into the arena', () => {
    expect(hitPoint({ x: -5, y: 999 }, 640, H)).toEqual({ x: 0, y: H });
    expect(hitPoint({ x: Number.NaN, y: 10 }, 640, H)).toEqual({ x: 320, y: 10 });
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

  it('builds the beam from core, 3 px rims and dithered bands, growing in 3 steps', () => {
    const b = beamBands(180, 0, 640);
    expect(b.core.h).toBe(6);
    expect(b.rimTop.h).toBe(3);
    expect(b.rimBottom.h).toBe(3);
    expect(b.rimTop.y + 3).toBe(b.core.y);
    expect(b.glowBottom.y + b.glowBottom.h - b.glowTop.y).toBe(BEAM_TOTAL_H);
    // A thin band, far from a full-screen change (no flash).
    expect(BEAM_TOTAL_H / H).toBeLessThan(0.1);
    expect(beamSpan(true, 900, 1 / 3)).toEqual({ x: 0, w: 300 });
    expect(beamSpan(false, 900, 1 / 3)).toEqual({ x: 600, w: 300 });
    expect([0, 19, 20, 40, 60, 500].map(beamProgress)).toEqual([1 / 3, 1 / 3, 2 / 3, 1, 1, 1]);
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

  it('shakes 6 px and halves every 80 ms', () => {
    const amp = (t: number): number => {
      const o = shakeOffset(t, 6);
      return Math.max(Math.abs(o.x), Math.abs(o.y));
    };
    expect(amp(0)).toBe(6);
    expect(amp(79)).toBe(6);
    expect(amp(80)).toBe(3);
    expect(amp(160)).toBe(2);
    expect(amp(1000)).toBe(0);
  });

  it('moves the cut-in in 120 ms, holds 360 ms and leaves to the right in 120 ms', () => {
    expect(cutInOffset(0, 600, 700)).toBe(-700);
    expect(cutInOffset(60, 600, 700)).toBe(-350);
    expect(cutInOffset(120, 600, 700)).toBe(0);
    expect(cutInOffset(479, 600, 700)).toBe(0);
    expect(cutInOffset(540, 600, 700)).toBe(350);
    expect(cutInOffset(600, 600, 700)).toBe(700);
  });

  it('finds the picture of a time and skips dropped pictures', () => {
    expect(frameAt([100, 0, 200], 0)).toBe(0);
    expect(frameAt([100, 0, 200], 100)).toBe(2);
    expect(frameAt([100, 0, 200], 299)).toBe(2);
    expect(frameAt([100, 0, 200], 300)).toBe(-1);
    expect(frameAt([100], -1)).toBe(-1);
  });

  it('shows panels 120 ms apart and splits an impact pair in two halves', () => {
    expect([0, 119, 120, 240, 900].map(panelsVisible)).toEqual([1, 1, 2, 3, 3]);
    expect(impactPhase(99, 200)).toBe(0);
    expect(impactPhase(100, 200)).toBe(1);
  });

  it('freezes the effect clock in a hitstop and slows it in a slowmo', () => {
    const plan = buildFinisher(5, { reduceEffects: false, seen: [] });
    expect(effectRate(plan.steps, 50)).toBe(0);
    expect(effectRate(plan.steps, 500)).toBeCloseTo(0.3);
    expect(effectRate(plan.steps, 1500)).toBe(1);
  });
});

describe('beam window and sounds (AP-160 decisions)', () => {
  it('has one beam only in stage 3 to 6, over the colour background and before the hit image', () => {
    for (const reduce of [false, true]) {
      for (const plan of plans(reduce)) {
        const w = beamWindow(plan);
        if (plan.isFinale || plan.stage < 3) {
          expect(w).toBeNull();
          continue;
        }
        expect(w).not.toBeNull();
        const bg = plan.steps.find((s) => s.block === 'bgColor');
        const hit = plan.steps.find((s) => s.block === 'frames');
        expect(bg).toBeDefined();
        expect(w!.atMs).toBeGreaterThanOrEqual(bg!.atMs);
        expect(w!.atMs + w!.durationMs).toBe(hit!.atMs);
        const cutIn = plan.steps.find((s) => s.block === 'cutIn');
        if (cutIn) expect(w!.atMs).toBe(cutIn.atMs + cutIn.durationMs);
      }
    }
    expect(beamWindow(buildFinisher(10, { reduceEffects: false, seen: [] }))).toEqual({
      atMs: 120,
      durationMs: 400,
    });
    expect(beamWindow(buildFinisher(21, { reduceEffects: false, seen: [] }))).toEqual({
      atMs: 800,
      durationMs: 300,
    });
  });

  it('knows when the hit image is shown (plan speedlines step aside then)', () => {
    const p4 = buildFinisher(21, { reduceEffects: false, seen: [] });
    expect(hitImageAt(p4, 900)).toBe(false);
    expect(hitImageAt(p4, 1100)).toBe(true);
    expect(hitImageAt(buildFinisher(10, { reduceEffects: false, seen: [] }), 520)).toBe(true);
    expect(hitImageAt(buildFinisher(4, { reduceEffects: false, seen: [] }), 1200)).toBe(false);
  });

  it('keeps every plan flash safe with and without reduce effects (the beam adds no step)', () => {
    for (const reduce of [false, true]) {
      for (const plan of plans(reduce)) expect(isFlashSafe(plan)).toBe(true);
    }
  });

  it('cues charge, hit and signal inside the sequence, dawn only in level 40', () => {
    for (const reduce of [false, true]) {
      for (const plan of plans(reduce)) {
        const cues = soundCues(plan);
        const keys = cues.map((c) => c.key);
        for (const c of cues) {
          expect(c.atMs).toBeGreaterThanOrEqual(0);
          expect(c.atMs).toBeLessThan(plan.totalMs);
        }
        expect(cues.map((c) => c.atMs)).toEqual([...cues.map((c) => c.atMs)].sort((a, b) => a - b));
        expect(keys).toContain(SOUND_HIT);
        expect(keys.filter((k) => k === SOUND_SIGNAL)).toHaveLength(1);
        expect(keys.includes(SOUND_DAWN)).toBe(plan.variantId === 'finale-40');
        if (plan.isFinale || plan.stage >= 4) expect(keys).toContain(SOUND_CHARGE);
      }
    }
  });

  it('places the sounds on the matching moments', () => {
    // The M10 expectations hold for the M10 sequence (no register); a level with a choreography in CHOREOS
    // plays that one instead, so only its presence is checked there.
    const M10 = { ...DEFAULT_FINISHER_SOURCE, choreos: undefined };
    for (const level of [0, 4, 21, 40]) {
      const registered = CHOREOS[choreoVariantId(level)] !== undefined;
      const plan = buildFinisher(level, { reduceEffects: false, seen: [] });
      expect(plan.choreo !== undefined, `level ${level}`).toBe(registered);
    }
    const at = (level: number, key: string, reduce = false): number[] =>
      soundCues(buildFinisher(level, { reduceEffects: reduce, seen: [] }, M10))
        .filter((c) => c.key === key)
        .map((c) => c.atMs);
    expect(at(0, SOUND_HIT)).toEqual([120]); // hit image
    expect(at(0, SOUND_SIGNAL)).toEqual([1000]); // "BEZWUNGEN!"
    expect(at(21, SOUND_CHARGE)).toEqual([200]); // cut-in
    expect(at(21, SOUND_HIT)).toEqual([900]); // impact frame
    expect(at(21, SOUND_HIT, true)).toEqual([1100]); // without impact: hit image
    expect(at(4, SOUND_CHARGE)).toEqual([600 + 500]); // picture 1
    const plan40 = buildFinisher(40, { reduceEffects: false, seen: [] }, M10);
    const starts = pictureStarts(plan40);
    expect(starts).toHaveLength(18);
    expect(at(40, SOUND_CHARGE)).toEqual([starts[3], starts[11]]);
    expect(at(40, SOUND_HIT)).toEqual([starts[7], starts[12]]);
    expect(at(40, SOUND_DAWN)).toEqual([starts[16]]);
    const name = plan40.steps.find((s) => s.block === 'title' && s.titleKind === 'name');
    expect(name?.atMs).toBe(starts[12]);
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
      // Level 0 plays the player test sequence of AP-182 (a choreography variant), the rest M10.
      expect([...FINISHER_VARIANT_IDS, ...CHOREO_VARIANT_IDS]).toContain(d.plan.variantId);
    }
    expect(debugFinisherData(40, 640, H, true).plan.reduced).toBe(true);
  });

  it('rejects broken start data', () => {
    const ok = debugFinisherData(3, 640, H, false);
    expect(isFinisherStartData(null)).toBe(false);
    expect(isFinisherStartData({ ...ok, plan: { ...ok.plan, steps: 'x' } })).toBe(false);
    expect(isFinisherStartData({ ...ok, boss: { ...ok.boss, x: Number.NaN } })).toBe(false);
    expect(isFinisherStartData({ ...ok, player: { ...ok.player, scale: 0 } })).toBe(false);
    expect(isFinisherStartData({ ...ok, result: { won: true } })).toBe(true);
  });

  it('never spawns more particles than the strength allows, capped by maxParticles', () => {
    expect(particleCount(70, 0.7)).toBe(49);
    expect(particleCount(70, undefined)).toBe(70);
    expect(particleCount(70, 5)).toBe(70);
    expect(70 + 30).toBeLessThanOrEqual(FINISHER_RULES.maxParticles);
  });
});

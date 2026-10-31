import { describe, expect, it } from 'vitest';
import { BOSSES } from '../../src/config/bosses';
import { STORABLE_POWERS } from '../../src/config/powerStore';
import { THEME } from '../../src/config/theme';
import { slotStatus } from '../../src/logic/powerStore';
import {
  armourDisplay,
  bannerBlink,
  bossBarLook,
  bossBarRect,
  bossBarState,
  bossDisplayName,
  bossPercentLeft,
  bossTrailTop,
  CHIP_SHRINK,
  chipMetrics,
  itemMsLeft,
  patternCells,
  patternWidth,
  PIXEL_LOCK,
  PIXEL_STAR,
  slotPanelStyle,
  energyRatio,
  energySegments,
  formatTime,
  funkCase,
  isEnergyLow,
  isTimerWarning,
  layoutRow,
  powerBlock,
  powerSlotRects,
  rectInArena,
  rectsOverlap,
  type Rect,
  secondsLeft,
  secondsText,
  shieldRatio,
  slotIconScale,
  STICK_CATCH_DIAMETER,
} from '../../src/scenes/hud/hudMath';

describe('hudMath', () => {
  it('rounds seconds up and guards invalid input', () => {
    expect(secondsLeft(4100)).toBe(5);
    expect(secondsLeft(0)).toBe(0);
    expect(secondsLeft(-5)).toBe(0);
    expect(secondsLeft(NaN)).toBe(0);
  });

  it('computes shield ratio against the cap', () => {
    expect(shieldRatio(90, 60, 3)).toBeCloseTo(0.5);
    expect(shieldRatio(500, 60, 3)).toBe(1);
    expect(shieldRatio(-1, 60, 3)).toBe(0);
    expect(shieldRatio(10, 0, 3)).toBe(0);
  });

  it('shows armour active, then cooldown, then hidden', () => {
    expect(armourDisplay({ id: null, activeMsLeft: 0, cooldownMsLeft: 0 }).phase).toBe('hidden');
    expect(armourDisplay({ id: 'fire-ring', activeMsLeft: 1500, cooldownMsLeft: 8000 })).toEqual({
      phase: 'active',
      sec: 2,
    });
    expect(armourDisplay({ id: 'fire-ring', activeMsLeft: 0, cooldownMsLeft: 3000 })).toEqual({
      phase: 'cooldown',
      sec: 3,
    });
    expect(armourDisplay({ id: 'fire-ring', activeMsLeft: 0, cooldownMsLeft: 0 }).phase).toBe(
      'hidden',
    );
  });

  it('builds ten energy segments for 0, 25 and 100 percent', () => {
    expect(energySegments(0, 10).every((s) => s === 'off')).toBe(true);
    expect(energySegments(1, 10).every((s) => s === 'full')).toBe(true);
    const q = energySegments(0.25, 10);
    expect(q.filter((s) => s === 'full')).toHaveLength(2);
    expect(q[2]).toBe('half');
    expect(q.slice(3).every((s) => s === 'off')).toBe(true);
    expect(energySegments(NaN, 10)).toHaveLength(10);
  });

  it('flags low energy at 25 percent or less and timer below 10 seconds', () => {
    expect(isEnergyLow(energyRatio(25, 100))).toBe(true);
    expect(isEnergyLow(energyRatio(26, 100))).toBe(false);
    expect(energyRatio(5, 0)).toBe(0);
    expect(isTimerWarning(9)).toBe(true);
    expect(isTimerWarning(10)).toBe(false);
    expect(isTimerWarning(0)).toBe(false);
  });

  it('formats time and seconds text with the small s', () => {
    expect(formatTime(102)).toBe('1:42');
    expect(formatTime(-3)).toBe('0:00');
    expect(secondsText(4)).toBe('4s');
    expect(secondsText(NaN)).toBe('0s');
  });

  it('prepares Funk text: upper case, small s only after digits, no sharp s', () => {
    expect(funkCase('4s')).toBe('4s');
    expect(funkCase('Münzen')).toBe('MÜNZEN');
    expect(funkCase('Straße')).toBe('STRASSE');
    expect(funkCase('5s Dauerfeuer')).toBe('5s DAUERFEUER');
    expect(funkCase('3 sekunden')).toBe('3 SEKUNDEN');
  });

  it('lays chips out left to right and skips hidden ones', () => {
    expect(layoutRow([20, null, 30, 10], 4, 8)).toEqual([8, null, 32, 66]);
  });
});

describe('power slots layout (H-14)', () => {
  const W = 640;
  const H = 360;
  const base = {
    size: THEME.sizePx['size.hud-slot'],
    gap: THEME.sizePx['size.hud-slot-gap'],
    margin: THEME.spacePx['space.2'],
  };
  /** HudScene: MAX_K = 1.4; boss bar 200 x 8 with margin 8, name line (Funk 1x/2x + 3 px) above. */
  const bossArea = (k: number) => {
    const bar = bossBarRect(W, H, k, 200, 8, 8);
    const labelH = 8 * (k > 1 ? 2 : 1) + 3;
    return { x: bar.x, y: bar.y - labelH, w: bar.w, h: bar.h + labelH };
  };
  /** VirtualStick: catch circle bottom right, edge margin 24 (bounding square). */
  const stickArea = () => {
    const r = STICK_CATCH_DIAMETER / 2;
    return { x: W - 24 - 2 * r, y: H - 24 - 2 * r, w: 2 * r, h: 2 * r };
  };
  /** Top HUD band: energy panel, chip row, timer, mute and pause stay in the top half. */
  const topBand = { x: 0, y: 0, w: W, h: H / 2 };

  it('places 40x40 slots bottom left with margin 8 and gap 8 at 1x, in STORABLE_POWERS order', () => {
    const rects = powerSlotRects(STORABLE_POWERS.length, 1, H, base);
    expect(rects).toEqual([
      { x: 8, y: 312, w: 40, h: 40 },
      { x: 56, y: 312, w: 40, h: 40 },
    ]);
    expect(STORABLE_POWERS.map((p) => p.id)).toEqual(['rapidFire', 'fire-ring']);
  });

  it('scales size, gap and margins with the HUD factor', () => {
    const rects = powerSlotRects(2, 1.4, H, base);
    expect(rects[0]).toEqual({ x: 11, y: 293, w: 56, h: 56 });
    expect(rects[1].x).toBe(11 + 56 + 11);
    expect(powerSlotRects(2, NaN, H, base)[0].w).toBe(40);
    expect(powerSlotRects(-1, 1, H, base)).toEqual([]);
  });

  it.each([1, 1.2, 1.4])('keeps slots inside the arena and off other HUD areas at k = %s', (k) => {
    const rects = powerSlotRects(STORABLE_POWERS.length, k, H, base);
    for (const r of rects) {
      expect(rectInArena(r, W, H)).toBe(true);
      expect(r.w).toBeGreaterThanOrEqual(THEME.sizePx['size.target']);
      expect(rectsOverlap(r, bossArea(k))).toBe(false);
      expect(rectsOverlap(r, stickArea())).toBe(false);
      expect(rectsOverlap(r, topBand)).toBe(false);
    }
    expect(rectsOverlap(rects[0], rects[1])).toBe(false);
  });

  it('detects overlap only for shared area', () => {
    expect(rectsOverlap({ x: 0, y: 0, w: 10, h: 10 }, { x: 10, y: 0, w: 5, h: 5 })).toBe(false);
    expect(rectsOverlap({ x: 0, y: 0, w: 10, h: 10 }, { x: 9, y: 9, w: 5, h: 5 })).toBe(true);
    expect(rectInArena({ x: -1, y: 0, w: 5, h: 5 }, W, H)).toBe(false);
  });

  it('picks an integer icon scale that fits into the slot', () => {
    expect(slotIconScale(40, 16, 3)).toBe(2);
    expect(slotIconScale(56, 16, 3)).toBe(3);
    expect(slotIconScale(200, 16, 3)).toBe(3);
    expect(slotIconScale(10, 16, 3)).toBe(1);
    expect(slotIconScale(40, 0, 3)).toBe(1);
  });
});

describe('powerBlock', () => {
  const rapid = { id: 'rapidFire', kind: 'item' as const };
  const ring = { id: 'fire-ring', kind: 'armour' as const };
  const idle = { doubleShotStage: 0, shieldLeft: 0, rapidFireMsLeft: 0 };
  const noArmour = { id: null, activeMsLeft: 0, cooldownMsLeft: 0 };

  it('blocks rapid fire while it runs and shows the seconds left', () => {
    expect(powerBlock(rapid, idle, noArmour)).toEqual({ blocked: false, sec: 0 });
    expect(powerBlock(rapid, { ...idle, rapidFireMsLeft: 5200 }, noArmour)).toEqual({
      blocked: true,
      sec: 6,
    });
  });

  it('blocks the fire ring while active and during the cooldown', () => {
    expect(powerBlock(ring, idle, noArmour)).toEqual({ blocked: false, sec: 0 });
    expect(
      powerBlock(ring, idle, { id: 'fire-ring', activeMsLeft: 3000, cooldownMsLeft: 0 }),
    ).toEqual({
      blocked: true,
      sec: 3,
    });
    expect(powerBlock(ring, idle, { id: null, activeMsLeft: 0, cooldownMsLeft: 11500 })).toEqual({
      blocked: true,
      sec: 12,
    });
  });

  it('feeds slotStatus: empty, ready and blocked', () => {
    const stored = { stored: ['fire-ring'] };
    const cooling = { id: null, activeMsLeft: 0, cooldownMsLeft: 1000 };
    expect(slotStatus(stored, 'rapidFire', powerBlock(rapid, idle, noArmour).blocked)).toBe(
      'empty',
    );
    expect(slotStatus(stored, 'fire-ring', powerBlock(ring, idle, noArmour).blocked)).toBe('ready');
    expect(slotStatus(stored, 'fire-ring', powerBlock(ring, idle, cooling).blocked)).toBe(
      'blocked',
    );
  });

  it('reads the item lock from the power state, not from a fixed id (V-14 e)', () => {
    expect(itemMsLeft('rapidFire', { ...idle, rapidFireMsLeft: 900 })).toBe(900);
    expect(itemMsLeft('rapidFire', idle)).toBe(0);
    // Items without a timed state field never block.
    expect(itemMsLeft('shield', { ...idle, shieldLeft: 3 })).toBe(0);
    expect(itemMsLeft('unknown', idle)).toBe(0);
    expect(
      powerBlock({ id: 'shield', kind: 'item' }, { ...idle, rapidFireMsLeft: 5000 }, noArmour)
        .blocked,
    ).toBe(false);
    // The fire ring follows the armour state, independent of rapid fire.
    expect(powerBlock(ring, { ...idle, rapidFireMsLeft: 5000 }, noArmour)).toEqual({
      blocked: false,
      sec: 0,
    });
    expect(
      powerBlock(rapid, idle, { id: 'fire-ring', activeMsLeft: 3000, cooldownMsLeft: 0 }),
    ).toEqual({
      blocked: false,
      sec: 0,
    });
  });
});

describe('slotPanelStyle (V-14 b)', () => {
  const s = (look: 'empty' | 'ready' | 'blocked', pressed = false, flashing = false) =>
    slotPanelStyle({ look, pressed, flashing });

  it('picks the frame per state', () => {
    expect(s('empty')).toEqual({ line: 'hud.line', dotted: true });
    expect(s('ready')).toEqual({ line: 'hud.accent', glow: true });
    expect(s('blocked')).toEqual({ line: 'hud.line-dim' });
    expect(s('ready', false, true)).toEqual({ line: 'hud.accent', glow: true, fill: 'hud.flash' });
    expect(s('ready', true)).toEqual({ line: 'hud.accent', fill: 'hud.accent' });
  });

  it('lets blocked beat the store flash', () => {
    expect(s('blocked', false, true)).toEqual({ line: 'hud.line-dim' });
    expect(s('empty', false, true)).toEqual({ line: 'hud.line', dotted: true });
  });
});

describe('power slot size at odd k (V-14 c)', () => {
  const base = {
    size: THEME.sizePx['size.hud-slot'],
    gap: THEME.sizePx['size.hud-slot-gap'],
    margin: THEME.spacePx['space.2'],
  };

  it.each([1, 1.125, 1.2, 1.375, 1.4])(
    'uses whole pixels and a whole-pixel centre at k = %s',
    (k) => {
      for (const r of powerSlotRects(2, k, 360, base)) {
        for (const v of [r.x, r.y, r.w, r.h]) expect(Number.isInteger(v)).toBe(true);
        expect(Number.isInteger(r.x + r.w / 2)).toBe(true);
        expect(Number.isInteger(r.y + r.h / 2)).toBe(true);
      }
    },
  );

  it('rounds the size to an even value at k = 1.125', () => {
    const [a, b] = powerSlotRects(2, 1.125, 360, base);
    expect(a).toEqual({ x: 9, y: 360 - 9 - 46, w: 46, h: 46 });
    expect(b.x).toBe(9 + 46 + 9);
  });
});

describe('boss HUD (H-14, 5a and 7a)', () => {
  it('rounds the boss percentage up', () => {
    expect(bossPercentLeft(380, 1000)).toBe(38);
    expect(bossPercentLeft(381, 1000)).toBe(39);
    expect(bossPercentLeft(1, 1000)).toBe(1);
    expect(bossPercentLeft(0.3, 1)).toBe(30);
    expect(bossPercentLeft(0, 1000)).toBe(0);
    expect(bossPercentLeft(1000, 1000)).toBe(100);
    expect(bossPercentLeft(2, 1)).toBe(100);
    expect(bossPercentLeft(NaN, 1)).toBe(0);
    expect(bossPercentLeft(5, 0)).toBe(0);
  });

  it('blinks the banner exactly three times with motion.blink, not with reduced motion', () => {
    const blink = THEME.motionMs['motion.blink'];
    // yoyo + repeat 2 = three full blinks, then the tween ends at full alpha.
    expect(bannerBlink(3, blink, false)).toEqual({ repeat: 2, durationMs: blink });
    expect(bannerBlink(3, blink, true)).toBeNull();
    expect(bannerBlink(0, blink, false)).toBeNull();
    expect(bannerBlink(3, 0, false)).toBeNull();
  });

  it('chooses the bar state: immune beats critical, critical at 25 % or less', () => {
    expect(bossBarState(74, 100, false)).toBe('normal');
    expect(bossBarState(26, 100, false)).toBe('normal');
    expect(bossBarState(25, 100, false)).toBe('critical');
    expect(bossBarState(19, 100, false)).toBe('critical');
    expect(bossBarState(62, 100, true)).toBe('immune');
    expect(bossBarState(10, 100, true)).toBe('immune');
  });

  it('maps each state to tag, colours and frame', () => {
    expect(bossBarLook('normal')).toEqual({
      tag: 'BOSS',
      tagColor: 'hud.danger',
      fill: 'hud.danger',
      dotted: false,
      lock: false,
    });
    expect(bossBarLook('critical')).toEqual({
      tag: 'SCHWACH!',
      tagColor: 'hud.accent',
      fill: 'hud.danger',
      dotted: false,
      lock: false,
    });
    expect(bossBarLook('immune')).toEqual({
      tag: 'IMMUN',
      tagColor: 'hud.text-muted',
      fill: 'hud.danger-dim',
      dotted: true,
      lock: true,
    });
  });

  it('keeps the lost piece as a trail and extends it on quick follow-up hits', () => {
    expect(bossTrailTop(0.64, 0.58, null)).toBe(0.64);
    expect(bossTrailTop(0.58, 0.5, 0.64)).toBe(0.64);
    expect(bossTrailTop(0.58, 0.58, 0.64)).toBeNull();
    expect(bossTrailTop(1, 1, null)).toBeNull();
  });

  it('has timing tokens for hit flash and trail', () => {
    expect(THEME.motionMs['motion.hit']).toBe(120);
    expect(THEME.motionMs['motion.trail']).toBe(300);
  });

  it('names every boss and falls back for unknown ids', () => {
    expect(bossDisplayName('giantStone')).toBe('Riesen-Stein');
    expect(bossDisplayName('toString')).toBe('Boss');
    expect(bossDisplayName(undefined)).toBe('Boss');
    expect(Object.keys(BOSSES).sort()).toEqual([
      'forestGhost',
      'giantSandWorm',
      'giantStone',
      'guardianDog',
      'pharaoh',
      'rootMonster',
    ]);
    for (const def of Object.values(BOSSES)) expect(bossDisplayName(def.id)).toBe(def.name);
    expect(bossDisplayName('rootMonster')).toBe('Verwurzeltes Baummonster');
    expect(bossDisplayName('forestGhost')).toBe('Waldgeist');
  });

  it('turns pixel patterns into cells', () => {
    expect(patternCells(['# ', ' #'])).toEqual([
      [0, 0],
      [1, 1],
    ]);
    expect(patternWidth(PIXEL_LOCK)).toBe(5);
    expect(patternWidth(PIXEL_STAR)).toBe(7);
    expect(PIXEL_LOCK.length).toBeLessThanOrEqual(8);
    expect(PIXEL_STAR.length).toBeLessThanOrEqual(8);
  });
});

describe('phone HUD layout (H-23, AP-86)', () => {
  const H = 360;
  const ADV = 6; // font advance fallback per glyph at scale 1
  const textW = (n: number, scale: number) => n * ADV * scale;
  const base = {
    size: THEME.sizePx['size.hud-slot'],
    gap: THEME.sizePx['size.hud-slot-gap'],
    margin: THEME.spacePx['space.2'],
  };

  /** Mirror of HudScene.create with wide chip content (three glyphs) and all chips visible. */
  function layout(W: number, k: number) {
    const m = Math.round(8 * k);
    const pad = Math.round(8 * k);
    const numW = textW(3, 3);
    const segsW = 10 * Math.round(8 * k) + 9 * Math.max(2, Math.round(2 * k));
    const lab = k <= 1 ? 1 : Math.max(2, Math.ceil(k));
    const eh = 24 + pad * 2;
    const ew = pad * 2 + numW + Math.round(8 * k) + Math.max(segsW, textW(8, lab));
    const energy = { x: m, y: m, w: ew, h: eh };
    const tw = textW(5, 3) + pad * 2;
    const timer = { x: Math.round(W / 2 - tw / 2), y: m, w: tw, h: eh };
    const btn = Math.round(THEME.sizePx['size.target'] * Math.max(1, k));
    const pause = { x: W - m - btn, y: m, w: btn, h: btn };
    const mute = { x: pause.x - m - btn, y: m, w: btn, h: btn };
    const rowY = m + eh + Math.round(4 * k);
    const chips: Rect[] = [];
    let x = m;
    // [bar width at k = 1, small chip]: coin, double shot, shield (with bar), rapid fire, fire ring
    const specs: [number, boolean][] = [
      [0, true],
      [0, true],
      [24, true],
      [0, false],
      [0, false],
    ];
    for (const [bar, small] of specs) {
      const mt = chipMetrics(k, small ? CHIP_SHRINK : 1);
      const bw = Math.round(bar * mt.iconFactor);
      const w = Math.round(
        mt.padX * 2 + textW(3, mt.textScale) + mt.iconW + mt.gap + (bw ? bw + 2 + mt.gap : 0),
      );
      chips.push({ x, y: rowY, w, h: mt.height });
      x += w + Math.round(4 * k);
    }
    // Status chips (GIFT 3s / LAHM 3s, 7 glyphs, bar 24) sit in a second row below the first one.
    const rowH = Math.max(...chips.map((c) => c.h));
    const statusMt = chipMetrics(k);
    const statusW = Math.round(
      statusMt.padX * 2 +
        textW(7, statusMt.textScale) +
        Math.round(24 * statusMt.iconFactor) +
        2 +
        statusMt.gap,
    );
    let sx = m;
    for (let i = 0; i < 2; i++) {
      chips.push({ x: sx, y: rowY + rowH + Math.round(4 * k), w: statusW, h: statusMt.height });
      sx += statusW + Math.round(4 * k);
    }
    const slots = powerSlotRects(2, 1, H, base, m);
    const bar = bossBarRect(W, H, k, 200, 8, 8);
    return { m, energy, timer, pause, mute, chips, slots, bar };
  }

  const combos: [number, number][] = [];
  for (const W of [640, 734, 800, 900]) for (const k of [1, 1.36, 1.4]) combos.push([W, k]);

  it.each(combos)('has no overlaps and stays in the arena at width %s, k = %s', (W, k) => {
    const l = layout(W, k);
    const rects = [l.energy, l.timer, l.pause, l.mute, ...l.chips, ...l.slots, l.bar];
    for (const r of rects) expect(rectInArena(r, W, H)).toBe(true);
    for (let i = 0; i < rects.length; i++)
      for (let j = i + 1; j < rects.length; j++)
        expect(rectsOverlap(rects[i], rects[j])).toBe(false);
  });

  it.each(combos)('keeps the margin m on all edges at width %s, k = %s', (W, k) => {
    const l = layout(W, k);
    expect(l.energy.x).toBe(l.m);
    expect(l.energy.y).toBe(l.m);
    expect(l.chips[0].x).toBe(l.m);
    expect(l.slots[0].x).toBe(l.m);
    expect(W - (l.pause.x + l.pause.w)).toBe(l.m);
    expect(l.mute.x + l.mute.w + l.m).toBe(l.pause.x);
    expect(H - (l.slots[0].y + l.slots[0].h)).toBe(l.m);
    expect(H - (l.bar.y + l.bar.h)).toBe(l.m);
    expect(l.slots[0].w).toBe(40);
    expect(l.slots[1].x - (l.slots[0].x + 40)).toBe(8);
  });

  it('takes the slot margin separately from size and gap', () => {
    expect(powerSlotRects(2, 1, H, base, 11)).toEqual([
      { x: 11, y: 309, w: 40, h: 40 },
      { x: 59, y: 309, w: 40, h: 40 },
    ]);
  });
});

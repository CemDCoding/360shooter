import { describe, expect, it } from 'vitest';
import { STORABLE_POWERS } from '../../src/config/powerStore';
import { THEME } from '../../src/config/theme';
import { slotStatus } from '../../src/logic/powerStore';
import {
  armourDisplay,
  bossBarRect,
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
    expect(armourDisplay({ id: 'fire-ring', activeMsLeft: 0, cooldownMsLeft: 0 }).phase).toBe('hidden');
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
    expect(powerBlock(rapid, { ...idle, rapidFireMsLeft: 5200 }, noArmour)).toEqual({ blocked: true, sec: 6 });
  });

  it('blocks the fire ring while active and during the cooldown', () => {
    expect(powerBlock(ring, idle, noArmour)).toEqual({ blocked: false, sec: 0 });
    expect(powerBlock(ring, idle, { id: 'fire-ring', activeMsLeft: 3000, cooldownMsLeft: 0 })).toEqual({
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
    expect(slotStatus(stored, 'rapidFire', powerBlock(rapid, idle, noArmour).blocked)).toBe('empty');
    expect(slotStatus(stored, 'fire-ring', powerBlock(ring, idle, noArmour).blocked)).toBe('ready');
    expect(slotStatus(stored, 'fire-ring', powerBlock(ring, idle, cooling).blocked)).toBe('blocked');
  });
});

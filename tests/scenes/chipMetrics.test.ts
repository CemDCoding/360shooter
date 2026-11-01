import { describe, expect, it } from 'vitest';
import {
  CHIP_SHRINK,
  chipMetrics,
  chipShrink,
  SHRUNK_CHIPS,
  timebarMetrics,
  timebarState,
  type ChipId,
} from '../../src/scenes/hud/hudMath';
import { THEME } from '../../src/config/theme';
import { funkScale } from '../../src/scenes/hud/FunkPanel';

const KS = [1, 1.36, 1.4];

// No @types/node in the project: minimal types for node:fs (variable avoids type resolution).
interface Fs {
  readFileSync(p: URL, enc: string): string;
}
const fsName = 'node:fs';
const fs = (await import(/* @vite-ignore */ fsName)) as Fs;

describe('flat icon silhouettes (V-18)', () => {
  it('never tints slot or chip icons multiplicatively', () => {
    for (const f of ['PowerSlots.ts', 'FunkPanel.ts']) {
      const src = fs.readFileSync(new URL(`../../src/scenes/hud/${f}`, import.meta.url), 'utf8');
      expect(src).not.toMatch(/icon\s*\??\.setTint\(/);
      expect(src).not.toMatch(/\.setTint\([^)]*\)\.setAlpha/);
    }
  });
});

describe('chipMetrics (B3, PE-119)', () => {
  it.each(KS)('shrink 1 gives the old measures at k = %s', (k) => {
    const m = chipMetrics(k, 1);
    expect(m.height).toBe(Math.round(24 * k));
    expect(m.padX).toBe(Math.round(6 * k));
    expect(m.gap).toBe(Math.round(4 * k));
    expect(m.iconW).toBe(Math.round(16 * k));
    expect(m.textScale).toBe(funkScale(2, k));
  });

  it.each(KS)('shrunk chip is at least 10 percent lower with a whole text step at k = %s', (k) => {
    const a = chipMetrics(k, 1);
    const b = chipMetrics(k, CHIP_SHRINK);
    expect(b.height).toBeLessThanOrEqual(a.height * 0.9);
    expect(Number.isInteger(b.textScale)).toBe(true);
    expect(b.textScale).toBeGreaterThanOrEqual(2);
    expect(b.height).toBeGreaterThan(8 * b.textScale);
    expect(b.padX).toBeLessThanOrEqual(a.padX);
    expect(b.iconW).toBeLessThan(a.iconW);
  });

  it('gives 20 px at k = 1 and 28 px at k = 1.36', () => {
    expect(chipMetrics(1, CHIP_SHRINK).height).toBe(20);
    expect(chipMetrics(1.36, CHIP_SHRINK).height).toBe(28);
  });

  it('is monotonic in k', () => {
    let prev = 0;
    for (const k of [1, 1.1, 1.2, 1.3, 1.36, 1.4]) {
      const h = chipMetrics(k, CHIP_SHRINK).height;
      expect(h).toBeGreaterThanOrEqual(prev);
      prev = h;
    }
  });

  it('shrinks exactly the coin counter, double shot chip and shield chip', () => {
    expect([...SHRUNK_CHIPS].sort()).toEqual(['coin', 'doubleShot', 'shield']);
    const all: ChipId[] = ['coin', 'doubleShot', 'shield', 'rapidFire', 'armour'];
    for (const id of all) {
      const small = (SHRUNK_CHIPS as readonly string[]).includes(id);
      expect(chipShrink(id)).toBe(small ? CHIP_SHRINK : 1);
    }
    expect(chipShrink('rapidFire')).toBe(1);
    expect(chipShrink('armour')).toBe(1);
  });
});

describe('time strip of the double shot chip (AP-134)', () => {
  it('is 4 px high at k = 1 and 5 px at k = 1.36 and 1.4, with a 1 px gap', () => {
    expect(timebarMetrics(1)).toEqual({ barH: 2, stripH: 4, gap: 1 });
    expect(timebarMetrics(1.36)).toEqual({ barH: 3, stripH: 5, gap: 1 });
    expect(timebarMetrics(1.4)).toEqual({ barH: 3, stripH: 5, gap: 1 });
  });

  it('never falls below the minimum height and ignores broken k', () => {
    expect(timebarMetrics(0.5).barH).toBe(2);
    expect(timebarMetrics(Number.NaN).stripH).toBe(4);
  });

  it('leaves the chip height unchanged', () => {
    for (const k of KS) {
      expect(chipMetrics(k, chipShrink('doubleShot')).height).toBe(
        Math.round(THEME.sizePx['size.hud-chip-h'] * k * CHIP_SHRINK),
      );
    }
  });

  it('fills from the left with msLeft / stage length', () => {
    expect(timebarState(20_000, 20_000).ratio).toBe(1);
    expect(timebarState(10_000, 20_000).ratio).toBe(0.5);
    expect(timebarState(0, 20_000).ratio).toBe(0);
    expect(timebarState(30_000, 20_000).ratio).toBe(1);
    expect(timebarState(-5, 20_000).ratio).toBe(0);
    expect(timebarState(Number.NaN, 20_000).ratio).toBe(0);
    expect(timebarState(5, 0).ratio).toBe(0);
  });

  it('warns strictly below 5000 ms (motion.timebar-warn)', () => {
    expect(THEME.motionMs['motion.timebar-warn']).toBe(5000);
    expect(timebarState(5000, 20_000).warn).toBe(false);
    expect(timebarState(4999, 20_000).warn).toBe(true);
    expect(timebarState(20_000, 20_000).warn).toBe(false);
  });

  it('uses only tokens in FunkPanel (no hex literals)', () => {
    const src = fs.readFileSync(
      new URL('../../src/scenes/hud/FunkPanel.ts', import.meta.url),
      'utf8',
    );
    expect(src).not.toMatch(/0x[0-9a-fA-F]{6}|#[0-9a-fA-F]{6}/);
  });
});

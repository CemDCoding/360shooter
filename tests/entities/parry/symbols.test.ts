import { describe, expect, it } from 'vitest';
import { BOSSES } from '../../../src/config/bosses';
import {
  HOLD_FRAMES,
  hitFrame,
  holdSymbolFrame,
  symbolFrame,
  targetFrame,
} from '../../../src/entities/parry/symbols';
import { motifFrame, ATTACK_MOTIF } from '../../../src/entities/parry/motifs';

// AP-151: symbol key -> frame of parry-symbols (14x14, 21 frames) and attack -> motif (parry-motifs, 10 frames).
const SYMBOL_FRAMES = 21;
const MOTIF_FRAMES = 10;

const patternSymbols = () =>
  Object.values(BOSSES).flatMap((b) =>
    b.attacks.flatMap((a) => (a.parryPattern?.steps ?? []).map((s) => s.symbol)),
  );

describe('symbol frames (brief H-37)', () => {
  it('maps the design symbols to their frames', () => {
    expect(symbolFrame('rose')).toBe(2);
    expect(symbolFrame('spindle')).toBe(3);
    expect(symbolFrame('pebble')).toBe(4);
    expect(symbolFrame('ghost')).toBe(5);
    expect(symbolFrame('mist')).toBe(6);
    expect(symbolFrame('sun')).toBe(9);
    expect(symbolFrame('rope')).toBe(10);
    expect(symbolFrame('head')).toBe(11);
    expect(symbolFrame('heart')).toBe(13);
    expect(symbolFrame('feather')).toBe(14);
    expect(symbolFrame('legs4')).toBe(15);
    expect(symbolFrame('legs2')).toBe(16);
    expect(symbolFrame('legs3')).toBe(17);
    expect(symbolFrame('sand')).toBe(18);
  });

  it('every symbol used in a boss pattern has a frame inside the sheet', () => {
    for (const s of patternSymbols()) {
      if (s === undefined) continue;
      const f = symbolFrame(s);
      expect(f, s).not.toBeNull();
      expect(f as number).toBeGreaterThanOrEqual(0);
      expect(f as number).toBeLessThan(SYMBOL_FRAMES);
    }
  });

  it('unknown or missing symbols have no frame (the circle shows its number)', () => {
    expect(symbolFrame(undefined)).toBeNull();
    expect(symbolFrame('toString')).toBeNull();
    expect(symbolFrame('nope')).toBeNull();
  });

  it('hold symbols grow: bud, half from 3/8, full at 8/8; reduced motion skips the half', () => {
    expect(HOLD_FRAMES.rose).toEqual([0, 1, 2]);
    expect(holdSymbolFrame('rose', 0, 8, false)).toBe(0);
    expect(holdSymbolFrame('rose', 2, 8, false)).toBe(0);
    expect(holdSymbolFrame('rose', 3, 8, false)).toBe(1);
    expect(holdSymbolFrame('rose', 8, 8, false)).toBe(2);
    expect(holdSymbolFrame('rose', 5, 8, true)).toBe(0);
    expect(holdSymbolFrame('rose', 8, 8, true)).toBe(2);
    expect(holdSymbolFrame('sun', 3, 8, false)).toBe(8);
    expect(holdSymbolFrame('pebble', 3, 8, false)).toBe(4);
    expect(holdSymbolFrame(undefined, 3, 8, false)).toBeNull();
  });

  it('the beat head falls asleep on a hit; drag targets show link and lane', () => {
    expect(hitFrame('head')).toBe(12);
    expect(hitFrame('rose')).toBeNull();
    expect(targetFrame('drag', 'rope')).toBe(19);
    expect(targetFrame('drag', 'pebble')).toBe(20);
    expect(targetFrame('tap', 'pebble')).toBeNull();
    expect(targetFrame('drag', undefined)).toBeNull();
  });
});

describe('attack motifs (brief H-37)', () => {
  it('every attack with a pattern has a motif inside the sheet', () => {
    for (const b of Object.values(BOSSES)) {
      for (const a of b.attacks) {
        if (!a.parryPattern) continue;
        const f = motifFrame(a.id);
        expect(f, a.id).not.toBeNull();
        expect(f as number).toBeLessThan(MOTIF_FRAMES);
      }
    }
  });

  it('unknown attacks have no motif', () => {
    expect(motifFrame('nope')).toBeNull();
    expect(motifFrame('constructor')).toBeNull();
    expect(Object.values(ATTACK_MOTIF).every((f) => f >= 0 && f < MOTIF_FRAMES)).toBe(true);
  });
});

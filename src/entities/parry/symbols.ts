// Symbol key -> sprite frame of the quicktime sheets (AP-151, brief H-37 "Symbol-Schlüssel -> Frame").
// The keys come from the attack patterns (AP-148, src/config/bosses.ts); the frames from
// docs/design/assets/sprites-m9.js. Pure tables, no Phaser import.
import type { ParryKind } from '../../contracts';

/** Sheet of the monochrome circle symbols (14x14, tinted). */
export const SYMBOL_SHEET = 'parry-symbols';
/** Sheet of the wavy decoy edge (44x44): frame 0 intact, frame 1 broken ("TRUG!"). */
export const DECOY_EDGE_SHEET = 'parry-decoy-edge';
export const DECOY_EDGE_FRAME = 0;
export const DECOY_BROKEN_FRAME = 1;
/** Small M9 UI icons (8x8): 0 box off, 1 box on, 2 "z". */
export const UI_ICONS_M9_SHEET = 'ui-icons-m9';
export const SLEEP_Z_FRAME = 2;

/** Frame of each symbol on a circle (resting look). */
export const SYMBOL_FRAME: Readonly<Record<string, number>> = {
  rose: 2,
  spindle: 3,
  pebble: 4,
  ghost: 5,
  mist: 6,
  sun: 9,
  rope: 10,
  head: 11,
  heart: 13,
  feather: 14,
  legs4: 15,
  legs2: 16,
  legs3: 17,
  sand: 18,
};

/** hold: frames by hold progress (bud -> half -> full), switching at 3/8 and 8/8. */
export const HOLD_FRAMES: Readonly<Record<string, readonly [number, number, number]>> = {
  rose: [0, 1, 2],
  sun: [7, 8, 9],
};

/** Frame after a hit (perfect or good), tinted in the grade colour instead of star or check. */
export const HIT_FRAME: Readonly<Record<string, number>> = {
  head: 12,
};

/** Target symbols of a drag circle: rope -> worm link (sand worm), pebble -> stone lane (giant quarrel). */
export const TARGET_FRAME: Readonly<Record<string, number>> = {
  rope: 19,
  pebble: 20,
};

/** Frame of a symbol, or null if the key is unknown (then the circle shows its number like M7). */
export function symbolFrame(symbol: string | undefined): number | null {
  if (symbol === undefined) return null;
  return Object.prototype.hasOwnProperty.call(SYMBOL_FRAME, symbol) ? SYMBOL_FRAME[symbol] : null;
}

/**
 * Frame of a hold symbol after `filled` of `segments` steps: bud below 3/8, half from 3/8, full at 8/8.
 * Reduced motion skips the middle frame. Symbols without hold frames use their resting frame.
 */
export function holdSymbolFrame(
  symbol: string | undefined,
  filled: number,
  segments: number,
  reduced: boolean,
): number | null {
  if (symbol === undefined) return null;
  const frames = Object.prototype.hasOwnProperty.call(HOLD_FRAMES, symbol)
    ? HOLD_FRAMES[symbol]
    : null;
  if (!frames) return symbolFrame(symbol);
  if (filled >= segments) return frames[2];
  if (!reduced && filled * 8 >= 3 * segments) return frames[1];
  return frames[0];
}

/** Frame shown after a hit (beat head falls asleep), or null for star / check. */
export function hitFrame(symbol: string | undefined): number | null {
  if (symbol === undefined) return null;
  return Object.prototype.hasOwnProperty.call(HIT_FRAME, symbol) ? HIT_FRAME[symbol] : null;
}

/** Frame of the drag target symbol for a circle of `kind` with `symbol`, or null (no symbol). */
export function targetFrame(
  kind: ParryKind | undefined,
  symbol: string | undefined,
): number | null {
  if (kind !== 'drag' || symbol === undefined) return null;
  return Object.prototype.hasOwnProperty.call(TARGET_FRAME, symbol) ? TARGET_FRAME[symbol] : null;
}

/** Safe-area helpers for the scenes (RS-02, PE-141): pure functions plus one registry read. No Phaser import. */
import { SAFE_INSETS_KEY, type SafeInsets } from '../contracts';

export const NO_SAFE_INSETS: SafeInsets = { top: 0, right: 0, bottom: 0, left: 0 };

/** Non-negative finite number, else 0. */
function unit(value: unknown): number {
  return typeof value === 'number' && Number.isFinite(value) && value > 0 ? value : 0;
}

/** Insets from the Phaser registry (set by main.ts before the scene starts); a missing or broken value means 0. */
export function readSafeInsets(registry: { get(key: string): unknown }): SafeInsets {
  const raw = registry.get(SAFE_INSETS_KEY) as Partial<SafeInsets> | undefined;
  if (!raw || typeof raw !== 'object') return NO_SAFE_INSETS;
  return {
    top: unit(raw.top),
    right: unit(raw.right),
    bottom: unit(raw.bottom),
    left: unit(raw.left),
  };
}

/** Distance of a control to one canvas edge: the design margin or the inset, whichever is larger. */
export function edge(designMargin: number, inset: number): number {
  return Math.max(designMargin, unit(inset));
}

/** The four edge distances for one design margin. */
export function edges(designMargin: number, insets: SafeInsets): SafeInsets {
  return {
    top: edge(designMargin, insets.top),
    right: edge(designMargin, insets.right),
    bottom: edge(designMargin, insets.bottom),
    left: edge(designMargin, insets.left),
  };
}

/**
 * Left edge of a span of width `w` that wants to sit at `x` but must stay inside `[minX, maxX]`.
 * If the span is wider than the room, the left limit wins.
 */
export function clampSpan(x: number, w: number, minX: number, maxX: number): number {
  return Math.max(minX, Math.min(x, maxX - w));
}

/**
 * Left offset of the 640 menu layout in a wider arena: centred (PE-102) but never inside the left
 * inset and never so far right that it ends inside the right inset, as far as the room allows.
 */
export function insetContentOffset(
  width: number,
  baseWidth: number,
  insets: Pick<SafeInsets, 'left' | 'right'>,
): number {
  const centred = Math.max(0, Math.round((width - baseWidth) / 2));
  const lo = unit(insets.left);
  const hi = width - baseWidth - unit(insets.right);
  if (hi < lo) return centred;
  return Math.max(lo, Math.min(centred, hi));
}

/** Side margins of the result layout in layout units: `max(design, inset - offset)` per side. */
export function sideMargins(
  design: number,
  width: number,
  baseWidth: number,
  offset: number,
  insets: Pick<SafeInsets, 'left' | 'right'>,
): { left: number; right: number } {
  const rightGap = Math.max(0, width - baseWidth - offset);
  return {
    left: edge(design, unit(insets.left) - offset),
    right: edge(design, unit(insets.right) - rightGap),
  };
}

/** Upward shift of a layout whose lowest control ends at `lowest` of `height`, so it clears the bottom inset. */
export function liftForBottom(height: number, lowest: number, bottomInset: number): number {
  return Math.max(0, unit(bottomInset) - Math.max(0, height - lowest));
}

/** Centre of the stick's catch circle bottom right: the whole circle keeps `max(margin, inset)` to the edges. */
export function stickCenter(
  width: number,
  height: number,
  catchRadius: number,
  margin: number,
  insets: Pick<SafeInsets, 'right' | 'bottom'>,
): { x: number; y: number } {
  return {
    x: width - edge(margin, insets.right) - catchRadius,
    y: height - edge(margin, insets.bottom) - catchRadius,
  };
}

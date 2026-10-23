import { LEVEL_COUNT } from '../config/levels';

/** Highest valid level index (0-based). */
export const MAX_LEVEL_ID = LEVEL_COUNT - 1;

/** True if `value` is an integer level index inside 0..MAX_LEVEL_ID. */
export function isValidLevelId(value: unknown): value is number {
  return (
    typeof value === 'number' && Number.isInteger(value) && value >= 0 && value <= MAX_LEVEL_ID
  );
}

/**
 * Reads the debug parameter `?level=n` from a query string.
 * Returns null if the parameter is missing. Non-numeric values give 0,
 * numbers are truncated and clamped to 0..MAX_LEVEL_ID.
 */
export function parseDebugLevel(search: string): number | null {
  const raw = new URLSearchParams(search).get('level');
  if (raw === null) return null;
  const trimmed = raw.trim();
  if (!/^-?\d+$/.test(trimmed)) return 0;
  const n = Number.parseInt(trimmed, 10);
  if (!Number.isFinite(n)) return 0;
  return Math.min(MAX_LEVEL_ID, Math.max(0, n));
}

/** True if the debug FPS display is requested via `?fps=1`. */
export function parseDebugFps(search: string): boolean {
  return new URLSearchParams(search).get('fps') === '1';
}

/**
 * Level for GameScene: a valid requested levelId wins, otherwise the debug
 * parameter `?level=n`, otherwise level 0.
 */
export function resolveLevelId(requested: unknown, search: string): number {
  if (isValidLevelId(requested)) return requested;
  return parseDebugLevel(search) ?? 0;
}

/** Arena size in arena units (PE-99). Height is fixed, width follows the screen aspect. */
export interface ArenaSize {
  width: number;
  height: number;
}

/** Arena size plus the inner margin that entities must keep to the edge. */
export interface ArenaRect extends ArenaSize {
  margin: number;
}

/**
 * Safe-area insets in arena units (RS-02, PE-140/PE-141): the part of each canvas edge that lies
 * under notch, Dynamic Island or home bar. The canvas covers the whole screen, scenes keep their
 * controls and texts inside these insets. Whole units, rounded up, never negative.
 */
export interface SafeInsets {
  top: number;
  right: number;
  bottom: number;
  left: number;
}

/**
 * Phaser registry key of the current `SafeInsets`. Set together with the arena width: at once
 * outside a round, during a round only from its end (PE-109, Q-61). A missing value means 0.
 */
export const SAFE_INSETS_KEY = 'safeInsets';

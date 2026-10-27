/** Arena size in arena units (PE-99). Height is fixed, width follows the screen aspect. */
export interface ArenaSize {
  width: number;
  height: number;
}

/** Arena size plus the inner margin that entities must keep to the edge. */
export interface ArenaRect extends ArenaSize {
  margin: number;
}

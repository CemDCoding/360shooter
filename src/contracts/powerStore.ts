/** A timed power that can be stored and activated on command (PE-70). */
export interface StorablePowerDef {
  id: string;
  kind: 'item' | 'armour';
  label: string;
}

/** Round-only storage: at most one entry per id, order = pickup order. */
export interface PowerStoreState {
  readonly stored: readonly string[];
}

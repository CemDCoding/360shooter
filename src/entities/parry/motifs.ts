// Coloured motif left in the "PARRY!" shield (AP-151, brief H-37 "PARRY! mit Motiv", decision 9a).
// Pure table by attack id; no game advantage, also shown with easy parry.

/** Sheet of the coloured motifs (16x16, not tinted). */
export const MOTIF_SHEET = 'parry-motifs';
/** Gap between the motif and the word "PARRY!" in arena units (brief H-37). */
export const MOTIF_GAP = 6;

/** Attack id -> frame of parry-motifs. Attacks without an entry (e.g. burrow) show "PARRY!" as before. */
export const ATTACK_MOTIF: Readonly<Record<string, number>> = {
  rootThrust: 0, // rose
  rootRing: 0, // rose
  orbFan: 1, // pebble
  decoys: 2, // ghost
  roll: 3, // sun
  quarrel: 4, // stones
  coil: 5, // rope
  guardBark: 6, // sleep
  heartScale: 7, // feather
  goldCurse: 8, // sphinx
  sandstorm: 9, // mirage
};

/** Motif frame of an attack, or null if it has none. */
export function motifFrame(attackId: string | undefined): number | null {
  if (attackId === undefined) return null;
  return Object.prototype.hasOwnProperty.call(ATTACK_MOTIF, attackId)
    ? ATTACK_MOTIF[attackId]
    : null;
}

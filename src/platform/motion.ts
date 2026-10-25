// Bewegungseinstellung des Geräts (Grundsatz 7 des Design-Briefs): reduzierte Bewegung respektieren.

/** true, wenn das Gerät reduzierte Bewegung wünscht; ohne matchMedia immer false. */
export function prefersReducedMotion(): boolean {
  if (typeof globalThis.matchMedia !== 'function') return false;
  try {
    return globalThis.matchMedia('(prefers-reduced-motion: reduce)').matches === true;
  } catch {
    return false;
  }
}

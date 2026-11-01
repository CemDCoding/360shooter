// Reine Logik fuer Hauptmenue-Karte, Level-Marken und Ergebnis-Diamanten (M8, AP-145, ohne Phaser).

/** Frame von `diamond-marker`: 0 = gewonnen (gefuellt), 1 = Diamant noch offen (hohl). */
export type MarkerFrame = 0 | 1;

/**
 * Diamant-Marke einer Kachel: gewonnene Level (in `wonLevels`) tragen den gefuellten Diamanten,
 * freie Level ohne Sieg (auch die aktuelle Kachel) den hohlen, gesperrte Level keine Marke.
 */
export function markerFrame(
  levelId: number,
  highestUnlockedLevel: number,
  wonLevels: readonly number[] | undefined,
): MarkerFrame | null {
  if (levelId > highestUnlockedLevel) return null;
  return (wonLevels ?? []).includes(levelId) ? 0 : 1;
}

/** Tab-Reihenfolge der Karte: Portrait, SHOP, UPGRADES. -1 = noch kein Fokus. */
export const CARD_FOCUS_ORDER = ['portrait', 'shop', 'upgrades'] as const;
export type CardFocus = (typeof CARD_FOCUS_ORDER)[number];

/** Naechster Fokus-Index bei Tab (dir 1) bzw. Umschalt+Tab (dir -1), mit Umlauf. */
export function stepCardFocus(index: number, dir: 1 | -1, count = CARD_FOCUS_ORDER.length): number {
  if (count <= 0) return -1;
  if (index < 0) return dir === 1 ? 0 : count - 1;
  return (((index + dir) % count) + count) % count;
}

/** Hoehe der Knoepfe und Abstand SHOP zu UPGRADES (H-35). */
export const CARD_BUTTON_H = 32;
export const CARD_BUTTON_GAP = 12;

/** Senkrechte Mitten der Kartenzeilen: Gold/Diamanten, Waffe/Anzug und die Knoepfe SHOP, UPGRADES. */
export function cardRows(
  cardY: number,
  cardH: number,
  pad: number,
): { goldY: number; weaponY: number; shopY: number; upgradesY: number } {
  const barY = cardY + pad + 64 + 10;
  const ruleY = barY + 8 + 6 + 7 + 10;
  const goldY = ruleY + 2 + 8 + 6;
  const upgradesY = cardY + cardH - pad - CARD_BUTTON_H / 2;
  return {
    goldY,
    weaponY: goldY + 20,
    shopY: upgradesY - CARD_BUTTON_H - CARD_BUTTON_GAP,
    upgradesY,
  };
}

/** Hoechste Summe je Upgrade-Gruppe (Waffe, Anzug). */
export const MAX_SUM = 20;

/** Waffen- und Anzug-Zaehler der Karte, in einer Zeile (WAFFE links, ANZUG rechts). */
export const weaponLine = (sum: number): string => `WAFFE ${sum}/${MAX_SUM}`;
export const suitLine = (sum: number): string => `ANZUG ${sum}/${MAX_SUM}`;

/** Texte der Ergebnis-Zeile DIAMANTEN. */
export interface DiamondFact {
  badge: string;
  note: string;
}

export const FIRST_WIN_NOTE = 'ERSTER SIEG';
export const LAST_LEVEL_NOTE = 'ERSTER SIEG · LETZTES LEVEL DER MAP';

/** Zeile DIAMANTEN; null, wenn nichts gutgeschrieben wurde (kein erster Sieg). */
export function diamondFact(gained: unknown, total: unknown): DiamondFact | null {
  if (typeof gained !== 'number' || !Number.isFinite(gained) || gained <= 0) return null;
  const g = Math.floor(gained);
  const t =
    typeof total === 'number' && Number.isFinite(total) && total > 0 ? Math.floor(total) : 0;
  return {
    badge: `+${g}`,
    note: `${g >= 3 ? LAST_LEVEL_NOTE : FIRST_WIN_NOTE} · GESAMT ${t}`,
  };
}

/** Stufen der Diamant-Zeile (motion.diamond-pop in 4 Stufen). */
export const POP_STEPS = 4;

/** Verzoegerungen in ms (aufsteigend); ohne Bewegung nur [0] (sofort). */
export function popDelays(totalMs: number, reduced: boolean): number[] {
  if (reduced || !(totalMs > 0)) return [0];
  return Array.from({ length: POP_STEPS }, (_, i) => Math.round((totalMs / POP_STEPS) * (i + 1)));
}

// Reine Hilfsfunktionen der Menü-Szenen (ohne Phaser, testbar).
import { THEME } from '../../config/theme';
import type { LevelGroup } from './levelGroups';

export type TileState = 'done' | 'current' | 'locked';

/** Level unter dem höchsten freien sind geschafft, das höchste freie ist aktuell, alle darüber gesperrt. */
export function tileState(levelId: number, highestUnlockedLevel: number): TileState {
  if (levelId < highestUnlockedLevel) return 'done';
  return levelId === highestUnlockedLevel ? 'current' : 'locked';
}

/** Bereich einer Gruppe als Text, z. B. "0-4" (die Schrift hat nur den kurzen Strich). */
export function groupRange(group: LevelGroup): string {
  const first = group.cells[0]?.id ?? 0;
  const last = group.cells[group.cells.length - 1]?.id ?? first;
  return `${first}-${last}`;
}

/** Pips einer Upgrade-Zeile: `total` Felder, die ersten `level` sind gefüllt. */
export function pipStates(level: number, total: number): boolean[] {
  const filled = Math.min(Math.max(0, Math.floor(level)), total);
  return Array.from({ length: total }, (_, i) => i < filled);
}

/** Beschriftung des Kaufen-Knopfes je Zustand (Text, nie nur Farbe). */
export function buyCaption(
  cost: number | null,
  gold: number,
): { text: string; state: 'buy' | 'poor' | 'max' } {
  if (cost === null) return { text: 'MAX', state: 'max' };
  if (gold < cost) return { text: `${cost} ZU TEUER`, state: 'poor' };
  return { text: `KAUFEN ${cost}`, state: 'buy' };
}

/** Nächste Waffen-Ausbaustufe (1-basiert) und die Summe, ab der sie gilt; null bei der letzten Stufe. */
export function nextWeaponStage(
  stage: number,
  stageMaxUpgrades: readonly number[],
): { stage: number; fromSum: number } | null {
  if (stage >= stageMaxUpgrades.length - 1) return null;
  return { stage: stage + 2, fromSum: (stageMaxUpgrades[stage] ?? 0) + 1 };
}

/** Leerer Spielstand: noch nichts erspielt (Willkommens-Hinweis im Menü). */
export function isFreshSave(save: {
  playerXp: number;
  highestUnlockedLevel: number;
  gold?: number;
}): boolean {
  return save.playerXp === 0 && save.highestUnlockedLevel === 0 && (save.gold ?? 0) === 0;
}

export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface BevelRects {
  shadow: Rect;
  outline: Rect;
  fill: Rect;
  hi: Rect[];
  lo: Rect[];
}

/** Rechtecke einer Kassetten-Fläche: 2-px-Fase, 2-px-Umriss, 4-px-Schatten (mit 2 px Ausdehnung). */
export function bevelRects(x: number, y: number, w: number, h: number, shadow = true): BevelRects {
  const bevel = THEME.borderPx['border.menu'];
  const drop = THEME.spacePx['space.1'];
  return {
    shadow: shadow
      ? { x: x + drop - bevel, y: y + drop - bevel, w: w + 2 * bevel, h: h + 2 * bevel }
      : { x, y, w: 0, h: 0 },
    outline: { x: x - bevel, y: y - bevel, w: w + 2 * bevel, h: h + 2 * bevel },
    fill: { x, y, w, h },
    hi: [
      { x, y, w, h: bevel },
      { x, y, w: bevel, h },
    ],
    lo: [
      { x, y: y + h - bevel, w, h: bevel },
      { x: x + w - bevel, y, w: bevel, h },
    ],
  };
}

/** Dauer einer Bewegung in ms; bei „weniger Bewegung“ 0 (Grundsatz 7). */
export function motionMs(reduced: boolean, ms: number): number {
  return reduced ? 0 : ms;
}

/** Horizontal offset that centres the base-width layout in a wider arena (PE-102); never negative. */
export function centerOffset(width: number, baseWidth: number): number {
  return Math.max(0, Math.round((width - baseWidth) / 2));
}

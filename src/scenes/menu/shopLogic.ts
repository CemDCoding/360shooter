// Reine Layout- und Zustandsfunktionen des Shop-Fensters (AP-141, ohne Phaser, testbar).
import type { GearEffectDef, GearSet, GearStats, PetId, SaveGame } from '../../contracts';
import { GEAR_PIECES, GEAR_SETS, GEAR_SLOTS, PET_GEAR_SET_LABELS } from '../../config/gear';
import { PETS, PET_IDS } from '../../config/pets';
import { eggItemId, getShopItem, petGearItemId } from '../../config/shop';
import { buyBlocker } from '../../logic/shop';

export type ShopTab = 'egg' | 'gear' | 'petGear';
export const SHOP_TABS: readonly { id: ShopTab; label: string }[] = [
  { id: 'egg', label: 'EIER' },
  { id: 'gear', label: 'RÜSTUNG' },
  { id: 'petGear', label: 'PET-RÜSTUNG' },
];

/** Größtes Textmaß: Kapsel-Zeilen der Infozeile (Brief H-35). */
export const MAX_LINE_CHARS = 40;

// Maße (Brief H-35, Tabelle "Shop"): Panel x 216-624, y 52-348, Innenabstand 10.
export const SHOP_PANEL = { x: 216, y: 52, w: 408, h: 296, pad: 10 } as const;
export const HEAD_H = 32;
export const TAB_H = 28;
export const TAB_GAP = 6;
export const INFO_H = 48;
export const ROW_HEAD_W = 70;
export const COL_HEAD_H = 10;
export const TILE_H = 50;
export const TILE_GAP_X = 8;
export const TILE_GAP_Y = 4;
export const EGG_TILE_H = 160;

export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface ShopLayout {
  inner: Rect;
  head: Rect;
  grid: Rect;
  info: Rect;
}

export function shopLayout(): ShopLayout {
  const { x, y, w, h, pad } = SHOP_PANEL;
  const inner = { x: x + pad, y: y + pad, w: w - 2 * pad, h: h - 2 * pad };
  const head = { x: inner.x, y: inner.y, w: inner.w, h: HEAD_H };
  const info = { x: inner.x, y: inner.y + inner.h - INFO_H, w: inner.w, h: INFO_H };
  const gridTop = head.y + head.h + 4;
  const grid = { x: inner.x, y: gridTop, w: inner.w, h: info.y - 4 - gridTop };
  return { inner, head, grid, info };
}

/** Kacheln eines Reiters: 3x3 mit Zeilenkopf (Rüstung, Pet-Rüstung) oder drei hohe Eier. */
export function tileRects(tab: ShopTab, grid: Rect): Rect[] {
  if (tab === 'egg') {
    const w = Math.floor((grid.w - 2 * TILE_GAP_X) / 3);
    return [0, 1, 2].map((c) => ({
      x: grid.x + c * (w + TILE_GAP_X),
      y: grid.y,
      w,
      h: EGG_TILE_H,
    }));
  }
  const left = grid.x + ROW_HEAD_W + TILE_GAP_X;
  const w = Math.floor((grid.x + grid.w - left - 2 * TILE_GAP_X) / 3);
  const top = grid.y + COL_HEAD_H + 2;
  const out: Rect[] = [];
  for (let r = 0; r < 3; r++)
    for (let c = 0; c < 3; c++)
      out.push({
        x: left + c * (w + TILE_GAP_X),
        y: top + r * (TILE_H + TILE_GAP_Y),
        w,
        h: TILE_H,
      });
  return out;
}

/** Artikel-Ids der Kacheln eines Reiters in Anzeigereihenfolge (Zeile für Zeile). */
export function tabItemIds(tab: ShopTab): string[] {
  if (tab === 'egg') return PET_IDS.map(eggItemId);
  if (tab === 'gear')
    return GEAR_SETS.flatMap((set) => GEAR_SLOTS.map((slot) => `gear-${set}-${slot}`));
  return PET_IDS.flatMap((pet) => GEAR_SETS.map((set) => petGearItemId(pet, set)));
}

export type TileView = 'buyable' | 'selected' | 'owned' | 'selected-owned';

export function isOwned(save: SaveGame, itemId: string): boolean {
  return (save.owned ?? []).includes(itemId);
}

export function tileView(save: SaveGame, itemId: string, selectedId: string | null): TileView {
  const owned = isOwned(save, itemId);
  const sel = selectedId === itemId;
  if (owned) return sel ? 'selected-owned' : 'owned';
  return sel ? 'selected' : 'buyable';
}

export type InfoButton =
  | { kind: 'none' }
  | { kind: 'buy'; label: string; price: number }
  | { kind: 'short'; label: string }
  | { kind: 'owned'; label: string };

export interface InfoView {
  name: string;
  lines: string[];
  button: InfoButton;
}

const SET_BONUS_TEXT: Record<GearSet, string> = {
  diamond: 'SET: ALLE 30 S BLOCKT EIN TREFFER',
  hell: 'SET: ALLE 20 S FEUERRING FÜR 3 S',
  heaven: 'SET: +1 LEBEN ALLE 2 S',
};

export const PET_ROLE_TEXT: Record<PetId, string> = {
  bee: 'STICHT NAHE GEGNER',
  penguin: 'WIRFT SCHNEEBÄLLE',
  capybara: 'AURA UND HEILUNG',
};

function pct(mul: number): string {
  const v = Math.round((mul - 1) * 100);
  return `${v >= 0 ? '+' : ''}${v}%`;
}

/** Werte eines Teils, z. B. "+10 LEBEN · SCHADEN +10%". */
export function statsText(stats: GearStats): string {
  const parts: string[] = [];
  if (stats.maxHpAdd) parts.push(`+${stats.maxHpAdd} LEBEN`);
  if (stats.damageMul) parts.push(`SCHADEN ${pct(stats.damageMul)}`);
  if (stats.fireRateMul) parts.push(`FEUERRATE ${pct(stats.fireRateMul)}`);
  if (stats.turnSpeedMul) parts.push(`DREHEN ${pct(stats.turnSpeedMul)}`);
  if (stats.damageTakenMul) parts.push(`SCHADEN ERHALTEN ${pct(stats.damageTakenMul)}`);
  return parts.join(' · ');
}

export function effectText(e: GearEffectDef): string {
  switch (e.kind) {
    case 'blockChance':
      return `${Math.round(e.chance * 100)}% BLOCKT EINEN TREFFER`;
    case 'thorns':
      return `DORNEN: ${e.damage} SCHADEN ZURÜCK`;
    case 'knockback':
      return 'STÖSST GEGNER ZURÜCK';
    case 'crit':
      return `${Math.round(e.chance * 100)}% KRITISCH, SCHADEN x${e.mul}`;
    case 'burn':
      return `BRENNT ${e.durationMs / 1000} S, ${e.dps} SCHADEN/S`;
    case 'deathBlast':
      return 'GEGNER EXPLODIEREN KLEIN';
    case 'healBoost':
      return `HEILUNG x${e.mul}`;
    case 'pierce':
      return `LASER TRIFFT ${e.extraTargets} ZIEL MEHR`;
    case 'magnet':
      return `MAGNET x${e.magnetMul}, ITEMS LÄNGER`;
  }
}

/** Zustand von Name, Zeilen und Knopf der Infozeile; Zeilen sind höchstens zwei und 40 Zeichen lang. */
export function infoView(save: SaveGame, itemId: string | null): InfoView {
  if (!itemId) return { name: '', lines: ['WÄHLE EINEN ARTIKEL.'], button: { kind: 'none' } };
  const item = getShopItem(itemId);
  if (!item) return { name: '', lines: ['WÄHLE EINEN ARTIKEL.'], button: { kind: 'none' } };
  let name = item.id.toUpperCase();
  let lines: string[] = [];
  if (item.category === 'gear') {
    const p = GEAR_PIECES.find((g) => g.id === item.gearId);
    if (p) {
      name = p.label;
      const stats = statsText(p.stats);
      lines = stats ? [stats, effectText(p.effect)] : [effectText(p.effect), SET_BONUS_TEXT[p.set]];
    }
  } else if (item.category === 'egg' && item.petId) {
    const pet = PETS.find((x) => x.id === item.petId);
    name = `EI ${pet?.label ?? ''}`.trim();
    lines = [PET_ROLE_TEXT[item.petId], 'SCHLÜPFT IN DER RUNDE.'];
  } else if (item.category === 'petGear' && item.petId && item.set) {
    const pet = PETS.find((x) => x.id === item.petId);
    name = `${pet?.label ?? ''} · ${PET_GEAR_SET_LABELS[item.set]}`;
    lines = [`RÜSTUNG FÜR ${pet?.label ?? 'PET'}`];
    if (!isOwned(save, eggItemId(item.petId))) lines.push('PET NOCH NICHT GEKAUFT');
  }
  lines = lines.slice(0, 2);

  const blocker = buyBlocker(save, itemId);
  let button: InfoButton;
  if (blocker === 'already-owned') {
    button = { kind: 'owned', label: 'GEKAUFT' };
    lines = [lines[0] ?? '', 'ANLEGEN: TIPPE AUF DEIN PORTRÄT.'];
  } else if (blocker === 'not-enough-diamonds') {
    const missing = item.price - (save.diamonds ?? 0);
    button = { kind: 'short', label: 'ZU WENIG' };
    lines = [lines[0] ?? '', `ES FEHLEN ${missing} DIAMANTEN.`];
  } else {
    button = { kind: 'buy', label: `KAUFEN ${item.price}`, price: item.price };
  }
  return { name, lines: lines.filter((l) => l !== ''), button };
}

/** Tastaturfokus: 0-2 Reiter, danach Kacheln, dann ggf. Kaufknopf, zuletzt Schließen. */
export interface FocusLayout {
  tabs: number;
  tiles: number;
  tileCols: number;
  hasBuy: boolean;
}

export function focusCount(f: FocusLayout): number {
  return f.tabs + f.tiles + (f.hasBuy ? 1 : 0) + 1;
}

export type FocusKey = 'ArrowLeft' | 'ArrowRight' | 'ArrowUp' | 'ArrowDown' | 'Tab' | 'ShiftTab';

/** Nächster Fokus-Index; hoch/runter springt in Kacheln um eine Zeile. */
export function moveFocus(index: number, key: FocusKey, f: FocusLayout): number {
  const n = focusCount(f);
  if (index < 0) return key === 'ArrowLeft' || key === 'ArrowUp' || key === 'ShiftTab' ? n - 1 : 0;
  const tileStart = f.tabs;
  const tileEnd = f.tabs + f.tiles;
  const inTiles = index >= tileStart && index < tileEnd;
  if ((key === 'ArrowUp' || key === 'ArrowDown') && inTiles) {
    const next = index + (key === 'ArrowDown' ? f.tileCols : -f.tileCols);
    if (next >= tileStart && next < tileEnd) return next;
  }
  const dir = key === 'ArrowLeft' || key === 'ArrowUp' || key === 'ShiftTab' ? -1 : 1;
  return (((index + dir) % n) + n) % n;
}

/** Zahl oben beim Herunterzählen: Wert nach Anteil t (0..1) zwischen alt und neu. */
export function countDownValue(from: number, to: number, t: number): number {
  const c = Math.min(1, Math.max(0, t));
  return Math.round(from + (to - from) * c);
}

// Reine Logik des Ausruestungs-Fensters (M8, AP-142, PE-174): Optionen, Blaettern, Texte. Ohne Phaser.
import type {
  EquippedGear,
  GearEffectDef,
  GearModifiers,
  GearSet,
  GearSetBonusDef,
  GearSlot,
  PetId,
  SaveGame,
} from '../../contracts';
import type { ColorName } from '../../config/theme';
import {
  GEAR_PIECES,
  GEAR_SETS,
  GEAR_SLOTS,
  GEAR_SET_LABELS,
  PET_GEAR_SET_LABELS,
} from '../../config/gear';
import { PETS } from '../../config/pets';
import { eggItemId, getShopItem, petGearItemId, petGearTextureKey } from '../../config/shop';
import { gearModifiers, gearTextureKeys, setProgress } from '../../logic/gear';
import { equipGear, equipPetGear, setActivePet, type EquipResult } from '../../logic/shop';

export type GearRow = GearSlot | 'pet' | 'petGear';

/** Reihenfolge der Zeilen im Fenster. */
export const GEAR_ROWS: readonly GearRow[] = ['head', 'body', 'legs', 'pet', 'petGear'];

export const GEAR_ROW_LABELS: Readonly<Record<GearRow, string>> = {
  head: 'KOPF',
  body: 'OBERTEIL',
  legs: 'HOSE+SCHUHE',
  pet: 'PET',
  petGear: 'PET-RÜSTUNG',
};

/** Farbe eines Sets (Farbfeld und Pips). */
export const SET_COLORS: Readonly<Record<GearSet, ColorName>> = {
  diamond: 'sprite.gear-ice',
  hell: 'sprite.gear-lava',
  heaven: 'sprite.gear-gold',
};

export const NONE_LABEL = 'KEINS';

export interface GearOption {
  /** Id des Teils bzw. Pets; null = KEINS. */
  id: string | null;
  label: string;
  set?: GearSet;
  petId?: PetId;
}

const NONE: GearOption = { id: null, label: NONE_LABEL };

function owns(save: SaveGame, id: string): boolean {
  return (save.owned ?? []).includes(id);
}

/** Auswahl einer Zeile: KEINS zuerst, dann nur gekaufte Teile (Pet-Rüstung: nur des aktiven Pets). */
export function rowOptions(save: SaveGame, row: GearRow): GearOption[] {
  const out: GearOption[] = [NONE];
  if (row === 'pet') {
    for (const p of PETS) {
      if (owns(save, eggItemId(p.id))) out.push({ id: p.id, label: p.label, petId: p.id });
    }
  } else if (row === 'petGear') {
    const pet = save.activePet ?? null;
    if (pet) {
      for (const set of GEAR_SETS) {
        const id = petGearItemId(pet, set);
        if (owns(save, id)) out.push({ id, label: PET_GEAR_SET_LABELS[set], set, petId: pet });
      }
    }
  } else {
    for (const p of GEAR_PIECES) {
      if (p.slot === row && owns(save, p.id)) out.push({ id: p.id, label: p.label, set: p.set });
    }
  }
  return out;
}

/** Aktuell angelegte Id einer Zeile (null = KEINS). */
export function currentId(save: SaveGame, row: GearRow): string | null {
  if (row === 'pet') return save.activePet ?? null;
  if (row === 'petGear') {
    const pet = save.activePet ?? null;
    return pet ? (save.petGear?.[pet] ?? null) : null;
  }
  return save.equippedGear?.[row] ?? null;
}

/** Index der aktuellen Wahl in der Liste; unbekannte Ids zählen als KEINS. */
export function currentIndex(save: SaveGame, row: GearRow): number {
  const i = rowOptions(save, row).findIndex((o) => o.id === currentId(save, row));
  return i < 0 ? 0 : i;
}

/** Eine Zeile kann blättern, sobald es mehr als KEINS gibt. */
export function canBrowse(save: SaveGame, row: GearRow): boolean {
  return rowOptions(save, row).length > 1;
}

/** Nächster Index mit Umlauf (Ende springt zum Anfang, Anfang zum Ende). */
export function stepIndex(length: number, index: number, dir: 1 | -1): number {
  if (length <= 1) return 0;
  return (((index + dir) % length) + length) % length;
}

/** Wählt eine Option einer Zeile; die Rückgabe enthält den neuen Stand (noch nicht gespeichert). */
export function applyChoice(save: SaveGame, row: GearRow, id: string | null): EquipResult {
  if (row === 'pet') return setActivePet(save, id as PetId | null);
  if (row === 'petGear') {
    const pet = save.activePet ?? null;
    if (!pet) return { ok: false, reason: 'wrong-pet', save };
    return equipPetGear(save, pet, id);
  }
  return equipGear(save, row, id);
}

/** Blättert eine Zeile um einen Schritt; null, wenn es nichts zu blättern gibt. */
export function stepRow(save: SaveGame, row: GearRow, dir: 1 | -1): EquipResult | null {
  const options = rowOptions(save, row);
  if (options.length <= 1) return null;
  const next = options[stepIndex(options.length, currentIndex(save, row), dir)];
  return applyChoice(save, row, next?.id ?? null);
}

/** Erste Zeile, die blättern kann, ab `from` in Richtung `dir` (mit Umlauf); -1 wenn keine. */
export function nextFocusRow(save: SaveGame, from: number, dir: 1 | -1): number {
  const n = GEAR_ROWS.length;
  for (let step = 1; step <= n; step++) {
    const i = (((from + dir * step) % n) + n) % n;
    const row = GEAR_ROWS[i];
    if (row && canBrowse(save, row)) return i;
  }
  return -1;
}

/** True, wenn noch nichts Ausrüstbares gekauft wurde (Hinweis auf den Shop). */
export function nothingOwned(save: SaveGame): boolean {
  return !(save.owned ?? []).some((id) => getShopItem(id) !== undefined);
}

function pct(mul: number): number {
  return Math.round((mul - 1) * 100);
}

/** Werte als Kurztexte, z. B. "+20 MAX. HP", "-10 % ERHALTENER SCHADEN". */
export function statLines(m: GearModifiers): string[] {
  const out: string[] = [];
  if (m.maxHpAdd > 0) out.push(`+${Math.round(m.maxHpAdd)} MAX. HP`);
  const dmg = pct(m.damageMul);
  if (dmg !== 0) out.push(`${dmg > 0 ? '+' : '-'}${Math.abs(dmg)} % SCHADEN`);
  const rate = pct(m.fireRateMul);
  if (rate !== 0) out.push(`${rate > 0 ? '+' : '-'}${Math.abs(rate)} % FEUERRATE`);
  const turn = pct(m.turnSpeedMul);
  if (turn !== 0) out.push(`${turn > 0 ? '+' : '-'}${Math.abs(turn)} % DREHTEMPO`);
  const taken = Math.round((1 - m.damageTakenMul) * 100);
  if (taken !== 0) out.push(`${taken > 0 ? '-' : '+'}${Math.abs(taken)} % ERHALTENER SCHADEN`);
  return out;
}

function effectText(e: GearEffectDef): string {
  switch (e.kind) {
    case 'blockChance':
      return `BLOCK ${Math.round(e.chance * 100)} %`;
    case 'thorns':
      return `DORNEN ${e.damage}`;
    case 'knockback':
      return 'RÜCKSTOSS';
    case 'crit':
      return `KRITISCH ${Math.round(e.chance * 100)} %`;
    case 'burn':
      return 'BRAND';
    case 'deathBlast':
      return 'EXPLOSION';
    case 'healBoost':
      return `HEILUNG ×${e.mul}`;
    case 'pierce':
      return 'DURCHSCHUSS';
    case 'magnet':
      return 'MAGNET';
  }
}

function setBonusText(b: GearSetBonusDef): string {
  switch (b.kind) {
    case 'timedBlock':
      return `SET: BLOCK ALLE ${Math.round(b.intervalMs / 1000)} S`;
    case 'autoRing':
      return 'SET: FEUERRING';
    case 'regen':
      return 'SET: REGENERATION';
  }
}

/** Kurztexte der Effekte: Einzelteile, dann Set-Effekte. */
export function effectLines(m: GearModifiers): string[] {
  return [...m.effects.map(effectText), ...m.setBonuses.map(setBonusText)];
}

export interface GearSummary {
  values: string;
  effects: string;
}

/** "WERTE: …" und "EFFEKTE: …" der angelegten Rüstung. */
export function gearSummary(equipped: EquippedGear): GearSummary {
  const m = gearModifiers(equipped);
  const stats = statLines(m);
  const effects = effectLines(m);
  return {
    values: `WERTE: ${stats.length ? stats.join(' · ') : 'KEINE'}`,
    effects: `EFFEKTE: ${effects.length ? effects.join(' · ') : 'KEINE'}`,
  };
}

/** Bricht Text an " · " in Zeilen mit höchstens `maxChars` Zeichen; Folgezeilen werden eingerückt. */
export function wrapLine(text: string, maxChars: number, maxLines = 2): string[] {
  const parts = text.split(' · ');
  const lines: string[] = [];
  let line = '';
  for (const part of parts) {
    const joined = line ? `${line} · ${part}` : part;
    if (line && joined.length > maxChars) {
      lines.push(line);
      line = `  ${part}`;
    } else {
      line = joined;
    }
  }
  if (line) lines.push(line);
  return lines.slice(0, maxLines);
}

export interface SetSticker {
  set: GearSet;
  /** "SET HÖLLE" */
  title: string;
  count: number;
  total: number;
  /** "2/3" */
  countText: string;
  /** Voller Hinweis wie "SET HÖLLE 2/3". */
  text: string;
  /** "FEHLT: LAVASTIEFEL" oder null bei vollem Set. */
  missing: string | null;
}

/** Aufkleber des am weitesten angefangenen Sets; null ohne angefangenes Set. */
export function setSticker(equipped: EquippedGear): SetSticker | null {
  const top = setProgress(equipped)[0];
  if (!top) return null;
  let missing: string | null = null;
  if (!top.complete) {
    for (const slot of GEAR_SLOTS) {
      const piece = GEAR_PIECES.find((p) => p.set === top.set && p.slot === slot);
      if (piece && equipped[slot] !== piece.id) {
        missing = `FEHLT: ${piece.label}`;
        break;
      }
    }
  }
  return {
    set: top.set,
    title: `SET ${GEAR_SET_LABELS[top.set]}`,
    count: top.count,
    total: top.total,
    countText: `${top.count}/${top.total}`,
    text: top.text,
    missing,
  };
}

export interface PreviewLayers {
  /** Teile von unten nach oben: Hose+Schuhe, Oberteil, Kopf. */
  gear: string[];
  pet: string | null;
  petGear: string | null;
}

/** Texturen der Vorschau; Pet-Rüstung nur mit gekauftem Satz-Teil des aktiven Pets. */
export function previewLayers(
  equipped: EquippedGear,
  pet: PetId | null,
  petGearId: string | null,
): PreviewLayers {
  const item = petGearId ? getShopItem(petGearId) : undefined;
  const petGear =
    pet && item && item.category === 'petGear' && item.petId === pet && item.set
      ? petGearTextureKey(pet, item.set)
      : null;
  return { gear: gearTextureKeys(equipped), pet: pet ? `pet-${pet}` : null, petGear };
}

/** Default pet offset from the astronaut centre, in units of the preview scale (mockup: 88 / 68 px at 4x). */
export const PET_OFFSET = { x: 22, y: 17 };
/** Pet sprite edge in source pixels. */
export const PET_SIZE = 16;
/** Minimum gap between the pet and the frame edge in the fitted placement, in px. */
export const PET_FIT_MARGIN = 2;

export interface PreviewFit {
  w: number;
  h: number;
}

/**
 * Pet centre relative to the astronaut centre, in px. Without `fit` the default offset applies
 * (window and result screen). With `fit` (frame centred on the astronaut) the pet sits in front of
 * the astronaut at the bottom right of the frame, PET_FIT_MARGIN px from the edges, so it lies
 * fully inside. With flipX the pet moves to the bottom left. The pet top edge stays at or below
 * the frame centre line, so it never covers the upper (head) half of the astronaut.
 */
export function previewPetPlacement(
  scale: number,
  flipX: boolean,
  fit?: PreviewFit,
): { x: number; y: number } {
  const sign = flipX ? -1 : 1;
  if (!fit) return { x: PET_OFFSET.x * scale * sign, y: PET_OFFSET.y * scale };
  const half = (PET_SIZE * scale) / 2;
  return {
    x: (fit.w / 2 - PET_FIT_MARGIN - half) * sign,
    y: fit.h / 2 - PET_FIT_MARGIN - half,
  };
}

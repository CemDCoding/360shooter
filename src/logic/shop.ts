// Kaufen und Ausruesten (M8, AP-137, PE-183): reine Funktionen ohne Speicherzugriff, Kauf ohne Rueckfrage.
import type { GearSlot, PetId, SaveGame } from '../contracts';
import { PET_IDS } from '../config/pets';
import { getGearPiece } from '../config/gear';
import { eggItemId, getShopItem } from '../config/shop';

export type ShopFailure = 'unknown-item' | 'already-owned' | 'not-enough-diamonds';
export type EquipFailure = 'unknown-item' | 'not-owned' | 'wrong-slot' | 'wrong-pet';

export type BuyResult =
  { ok: true; save: SaveGame } | { ok: false; reason: ShopFailure; save: SaveGame };

export type EquipResult =
  { ok: true; save: SaveGame } | { ok: false; reason: EquipFailure; save: SaveGame };

function owns(save: SaveGame, itemId: string): boolean {
  return (save.owned ?? []).includes(itemId);
}

/** Grund, warum ein Kauf nicht geht, sonst null. */
export function buyBlocker(save: SaveGame, itemId: string): ShopFailure | null {
  const item = getShopItem(itemId);
  if (!item) return 'unknown-item';
  if (owns(save, itemId)) return 'already-owned';
  if ((save.diamonds ?? 0) < item.price) return 'not-enough-diamonds';
  return null;
}

export function canBuy(save: SaveGame, itemId: string): boolean {
  return buyBlocker(save, itemId) === null;
}

/** Kauft einen Artikel; bei Fehler bleibt der Stand unveraendert (dieselbe Referenz). */
export function buy(save: SaveGame, itemId: string): BuyResult {
  const reason = buyBlocker(save, itemId);
  if (reason) return { ok: false, reason, save };
  const item = getShopItem(itemId)!;
  return {
    ok: true,
    save: {
      ...save,
      diamonds: (save.diamonds ?? 0) - item.price,
      owned: [...(save.owned ?? []), itemId],
    },
  };
}

/** Ruestungsteil in den Slot legen (null: Slot leeren). */
export function equipGear(save: SaveGame, slot: GearSlot, gearId: string | null): EquipResult {
  const current = save.equippedGear ?? { head: null, body: null, legs: null };
  if (!(slot in current)) return { ok: false, reason: 'wrong-slot', save };
  if (gearId !== null) {
    const piece = getGearPiece(gearId);
    if (!piece) return { ok: false, reason: 'unknown-item', save };
    if (piece.slot !== slot) return { ok: false, reason: 'wrong-slot', save };
    if (!owns(save, gearId)) return { ok: false, reason: 'not-owned', save };
  }
  return { ok: true, save: { ...save, equippedGear: { ...current, [slot]: gearId } } };
}

/** Aktives Pet setzen (null: keines); nur mit gekauftem Ei. */
export function setActivePet(save: SaveGame, petId: PetId | null): EquipResult {
  if (petId !== null) {
    if (!PET_IDS.includes(petId)) return { ok: false, reason: 'unknown-item', save };
    if (!owns(save, eggItemId(petId))) return { ok: false, reason: 'not-owned', save };
  }
  return { ok: true, save: { ...save, activePet: petId } };
}

/** Pet-Ruestung anlegen (null: ablegen); nur gekauft und fuer dieses Pet. */
export function equipPetGear(save: SaveGame, petId: PetId, petGearId: string | null): EquipResult {
  if (!PET_IDS.includes(petId)) return { ok: false, reason: 'unknown-item', save };
  if (petGearId !== null) {
    const item = getShopItem(petGearId);
    if (!item || item.category !== 'petGear') return { ok: false, reason: 'unknown-item', save };
    if (item.petId !== petId) return { ok: false, reason: 'wrong-pet', save };
    if (!owns(save, petGearId)) return { ok: false, reason: 'not-owned', save };
  }
  return { ok: true, save: { ...save, petGear: { ...(save.petGear ?? {}), [petId]: petGearId } } };
}

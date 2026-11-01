// Shop-Katalog (M8, AP-136, PE-172, PE-173): Preise und Diamanten, nur hier aendern.
import type { DiamondRules, GearSet, GearSlot, PetId, ShopItemDef } from '../contracts';
import { GEAR_PIECES, GEAR_SETS, GEAR_SLOTS } from './gear';
import { BATCH_STARTS, LEVEL_COUNT } from './levels';
import { PET_IDS } from './pets';

export const EGG_PRICE = 5;
export const GEAR_PRICE = 3;
export const PET_GEAR_PRICE = 2;

export const DIAMOND_RULES: DiamondRules = { perLevel: 1, perMapFinal: 3 };

/** Last level of every map, derived from the batch starts (not entered by hand). */
export const MAP_FINAL_LEVELS: readonly number[] = BATCH_STARTS.map((b, i) =>
  i + 1 < BATCH_STARTS.length ? BATCH_STARTS[i + 1].first - 1 : LEVEL_COUNT - 1,
);

/** Diamonds for the first win of a level. */
export function diamondsForLevel(levelId: number): number {
  return MAP_FINAL_LEVELS.includes(levelId) ? DIAMOND_RULES.perMapFinal : DIAMOND_RULES.perLevel;
}

/** Texture key of a pet armour (naming rule for AP-140). */
export function petGearTextureKey(pet: PetId, set: GearSet): string {
  return `petgear-${pet}-${set}`;
}

/** Id of the egg item of a pet. */
export function eggItemId(pet: PetId): string {
  return `egg-${pet}`;
}

/** Id of the pet armour item. */
export function petGearItemId(pet: PetId, set: GearSet): string {
  return petGearTextureKey(pet, set);
}

export const SHOP_ITEMS: readonly ShopItemDef[] = [
  ...PET_IDS.map((petId): ShopItemDef => ({
    id: eggItemId(petId),
    category: 'egg',
    price: EGG_PRICE,
    petId,
  })),
  ...GEAR_PIECES.map((p): ShopItemDef => ({
    id: p.id,
    category: 'gear',
    price: GEAR_PRICE,
    gearId: p.id,
    set: p.set,
  })),
  ...PET_IDS.flatMap((petId) =>
    GEAR_SETS.map((set): ShopItemDef => ({
      id: petGearItemId(petId, set),
      category: 'petGear',
      price: PET_GEAR_PRICE,
      petId,
      set,
    })),
  ),
];

export function getShopItem(id: string): ShopItemDef | undefined {
  return SHOP_ITEMS.find((i) => i.id === id);
}

/** Frame of `gear-icons` (9 frames): set * 3 + slot (H-35, PE-183). */
export function gearIconIndex(set: GearSet, slot: GearSlot): number {
  return GEAR_SETS.indexOf(set) * GEAR_SLOTS.length + GEAR_SLOTS.indexOf(slot);
}

/** Frame of `petgear-icons` (9 frames): pet * 3 + set (H-35, PE-183). */
export function petGearIconIndex(pet: PetId, set: GearSet): number {
  return PET_IDS.indexOf(pet) * GEAR_SETS.length + GEAR_SETS.indexOf(set);
}

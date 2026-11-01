import type { GearSet } from './gear';
import type { PetId } from './pet';

/** Shop (M8, PE-172, PE-177). Diamonds are a pure in-game currency, stored locally only. */
export type ShopCategory = 'egg' | 'gear' | 'petGear';

export interface ShopItemDef {
  id: string;
  category: ShopCategory;
  /** Price in diamonds. */
  price: number;
  /** egg and petGear: the pet. */
  petId?: PetId;
  /** gear: the piece id. */
  gearId?: string;
  /** gear and petGear: the set. */
  set?: GearSet;
}

export interface DiamondRules {
  /** Diamonds for the first win of a level. */
  perLevel: number;
  /** Diamonds for the first win of the last level of a map. */
  perMapFinal: number;
}

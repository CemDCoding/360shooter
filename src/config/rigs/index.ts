// Register of the figures for the finisher choreographies (M13, AP-181, RS-06.1, PE-251).
// All seven rigs are real: astronaut and rootMonster (AP-183, H-46), the other five bosses (AP-185, H-48).
import type { RigDef, RigId } from '../../contracts';
import { ASTRONAUT_RIG } from './astronaut';
import { FOREST_GHOST_RIG } from './forestGhost';
import { GIANT_SAND_WORM_RIG } from './giantSandWorm';
import { GIANT_STONE_RIG } from './giantStone';
import { GUARDIAN_DOG_RIG } from './guardianDog';
import { PHARAOH_RIG } from './pharaoh';
import { ROOT_MONSTER_RIG } from './rootMonster';

export const RIGS: Readonly<Record<RigId, RigDef>> = {
  astronaut: ASTRONAUT_RIG,
  rootMonster: ROOT_MONSTER_RIG,
  forestGhost: FOREST_GHOST_RIG,
  giantStone: GIANT_STONE_RIG,
  giantSandWorm: GIANT_SAND_WORM_RIG,
  guardianDog: GUARDIAN_DOG_RIG,
  pharaoh: PHARAOH_RIG,
};

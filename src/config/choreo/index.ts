// Register of the finisher choreographies (M13, AP-181, RS-06.1, PE-251).
// `undefined` = no choreography yet, the M10 sequence plays (fallback until AP-191).
// Later packages replace only their own entry (and add their own file next to this one).
import type { ChoreoDef, ChoreoVariantId } from '../../contracts';
import { CINEMATIC_9, MOMENT_FOREST_GHOST } from './forestGhost';
import { CINEMATIC_25, MOMENT_GIANT_SAND_WORM } from './giantSandWorm';
import { CINEMATIC_20, MOMENT_GIANT_STONE } from './giantStone';
import { CINEMATIC_4, MOMENT_ROOT_MONSTER } from './rootMonster';

export const CHOREOS: Readonly<Record<ChoreoVariantId, ChoreoDef | undefined>> = {
  'moment-rootMonster': MOMENT_ROOT_MONSTER,
  'moment-forestGhost': MOMENT_FOREST_GHOST,
  'moment-giantStone': MOMENT_GIANT_STONE,
  'moment-giantSandWorm': MOMENT_GIANT_SAND_WORM,
  'moment-guardianDog': undefined,
  'moment-pharaoh': undefined,
  'cinematic-4': CINEMATIC_4,
  'cinematic-9': CINEMATIC_9,
  'cinematic-20': CINEMATIC_20,
  'cinematic-25': CINEMATIC_25,
  'cinematic-30': undefined,
  'cinematic-40': undefined,
};

// Register of the finisher choreographies (M13, AP-181, RS-06.1, PE-251).
// `undefined` = no choreography yet, the M10 sequence plays (fallback until AP-191).
// Later packages replace only their own entry (and add their own file next to this one).
import type { ChoreoDef, ChoreoVariantId } from '../../contracts';

export const CHOREOS: Readonly<Record<ChoreoVariantId, ChoreoDef | undefined>> = {
  'moment-rootMonster': undefined,
  'moment-forestGhost': undefined,
  'moment-giantStone': undefined,
  'moment-giantSandWorm': undefined,
  'moment-guardianDog': undefined,
  'moment-pharaoh': undefined,
  'cinematic-4': undefined,
  'cinematic-9': undefined,
  'cinematic-20': undefined,
  'cinematic-25': undefined,
  'cinematic-30': undefined,
  'cinematic-40': undefined,
};

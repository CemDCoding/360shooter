// Stage presets of the finisher choreographies (M13, AP-195, Q-97, PE-259). The `fx` event has only a `name`,
// so the world of a shot is chosen by the name `stage-world:<preset id>` (no contract change); the values
// live here and are drawn by `scenes/finisher/fx/stage.ts`. One preset per `world()` parametrisation used in
// the storyboards `docs/design/mockups/m13b-*.html` (library `m13b-boards.js`); a choreography only enters
// the name.
//
// Naming: `<bossId>-moment` is the world of the fight moment, `<bossId>-moment-<n>` a changed world at
// board G<n>/S<n>/W<n>/H<n>/R<n> of the moment. Cinematic: `<bossId>-<shot>` is the world at the start of
// shot <shot> (board "<shot>a"), `<bossId>-<shot><letter>` a changed world at board "<shot><letter>".
// Positions are in the 640 x 360 choreography stage (origin top left of the stage); the ground line is
// `size.rig-ground`.
import { THEME } from '../theme';

/** Worlds with a backdrop colour `color.finisher.bg-<world>` and ground colours `color.biome.<world>-ground*`. */
export const STAGE_WORLDS = ['forest', 'night', 'elf', 'desert', 'pyramid', 'oasis'] as const;
export type StageWorld = (typeof STAGE_WORLDS)[number];

/** Moon or sun: centre (x, y) and radius in px. */
export interface StageBody {
  x: number;
  y: number;
  r: number;
}

export interface StageSpec {
  world: StageWorld;
  /** Crescent moon (stars colour, cut by the backdrop colour). */
  moon?: StageBody;
  /** Gold sun with a see-through halo. */
  sun?: StageBody;
  /** Opacity of the ground mist 0..1; missing or 0 = no mist. */
  mist?: number;
  /** Opacity of the dark layer over the backdrop 0..1; missing = `STAGE_DARK_DEFAULT`. */
  dark?: number;
  /** Seed of stars, silhouettes, mist and ground flecks (fixed, no flicker). */
  seed: number;
}

/** Default dark layer of the mockup `world()`. */
export const STAGE_DARK_DEFAULT = 0.45;
/** Default seed of the mockup `world()`. */
export const STAGE_SEED = 4;

const GROUND = THEME.sizePx['size.rig-ground'];
const body = (x: number, y: number, r: number): StageBody => ({ x, y, r });

export const STAGES: Readonly<Record<string, StageSpec>> = {
  // Forest ghost (night): moment with moon top right, cinematic with moon left.
  'forestGhost-moment': { world: 'night', moon: body(560, 90, 20), mist: 0.12, seed: STAGE_SEED },
  'forestGhost-moment-8': { world: 'night', moon: body(560, 90, 20), mist: 0.06, seed: STAGE_SEED },
  'forestGhost-moment-9': { world: 'night', moon: body(560, 90, 20), seed: STAGE_SEED },
  'forestGhost-1': { world: 'night', moon: body(140, 80, 24), mist: 0.35, seed: STAGE_SEED },
  'forestGhost-1b': { world: 'night', moon: body(140, 80, 24), mist: 0.3, seed: STAGE_SEED },
  'forestGhost-1c': { world: 'night', moon: body(140, 80, 24), mist: 0.12, seed: STAGE_SEED },
  'forestGhost-3b': { world: 'night', moon: body(176, 196, 30), seed: STAGE_SEED },
  'forestGhost-5b': { world: 'night', moon: body(140, 80, 24), seed: STAGE_SEED },

  // Giant stone (elf): stars and spikes, no moon or sun, the same world everywhere.
  'giantStone-moment': { world: 'elf', seed: STAGE_SEED },
  'giantStone-1': { world: 'elf', seed: STAGE_SEED },

  // Sand worm (desert): dunes with a sun.
  'giantSandWorm-moment': { world: 'desert', sun: body(120, 100, 22), seed: STAGE_SEED },
  'giantSandWorm-1': { world: 'desert', sun: body(200, 90, 24), seed: STAGE_SEED },
  'giantSandWorm-3b': { world: 'desert', sun: body(190, 120, 28), seed: STAGE_SEED },

  // Guardian dog (pyramid): tomb wall, the dark layer carries the mood (torches belong to the boss module).
  'guardianDog-moment': { world: 'pyramid', dark: 0.6, seed: STAGE_SEED },
  'guardianDog-1': { world: 'pyramid', dark: 0.85, seed: STAGE_SEED },
  'guardianDog-1c': { world: 'pyramid', dark: 0.75, seed: STAGE_SEED },
  'guardianDog-2': { world: 'pyramid', dark: 0.7, seed: STAGE_SEED },
  'guardianDog-3': { world: 'pyramid', dark: 0.65, seed: STAGE_SEED },
  'guardianDog-3b': { world: 'pyramid', dark: 0.6, seed: STAGE_SEED },
  'guardianDog-3c': { world: 'pyramid', dark: 0.5, seed: STAGE_SEED },
  'guardianDog-4c': { world: 'pyramid', dark: 0.55, seed: STAGE_SEED },

  // Pharaoh (oasis): night at the oasis, at the end the sun rises (the dawn band belongs to the boss module).
  'pharaoh-moment': { world: 'oasis', dark: 0.5, moon: body(110, 90, 20), seed: STAGE_SEED },
  'pharaoh-1': { world: 'oasis', dark: 0.55, moon: body(120, 80, 20), seed: STAGE_SEED },
  'pharaoh-3': { world: 'oasis', dark: 0.75, seed: STAGE_SEED },
  'pharaoh-5': { world: 'oasis', dark: 0.55, moon: body(560, 80, 20), seed: STAGE_SEED },
  'pharaoh-6': { world: 'oasis', dark: 0.45, moon: body(560, 80, 20), seed: STAGE_SEED },
  'pharaoh-6b': { world: 'oasis', dark: 0.3, sun: body(330, GROUND - 6, 30), seed: STAGE_SEED },
  'pharaoh-6c': { world: 'oasis', dark: 0.15, sun: body(330, GROUND - 40, 44), seed: STAGE_SEED },
};

/** Preset of an id; own keys only, null for an unknown id (an id like `constructor` finds nothing). */
export function stageOf(id: string): StageSpec | null {
  return Object.prototype.hasOwnProperty.call(STAGES, id) ? STAGES[id] : null;
}

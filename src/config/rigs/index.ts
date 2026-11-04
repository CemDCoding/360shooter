// Register of the figures for the finisher choreographies (M13, AP-181, RS-06.1, PE-251).
// astronaut and rootMonster are the real rigs (AP-183); the others are one placeholder part until AP-185 to AP-190.
// Later packages change only their own entry; frame names come with "Design uebernehmen" (H-46).
import type { RigDef, RigId } from '../../contracts';
import { ASTRONAUT_RIG } from './astronaut';
import { ROOT_MONSTER_RIG } from './rootMonster';

function placeholder(id: RigId): RigDef {
  return {
    id,
    parts: [
      {
        id: 'body',
        frame: `${id}-body`,
        silhouette: `${id}-body-white`,
        originX: 0.5,
        originY: 0.5,
        x: 0,
        y: 0,
        order: 0,
      },
    ],
  };
}

export const RIGS: Readonly<Record<RigId, RigDef>> = {
  astronaut: ASTRONAUT_RIG,
  rootMonster: ROOT_MONSTER_RIG,
  forestGhost: placeholder('forestGhost'),
  giantStone: placeholder('giantStone'),
  giantSandWorm: placeholder('giantSandWorm'),
  guardianDog: placeholder('guardianDog'),
  pharaoh: placeholder('pharaoh'),
};

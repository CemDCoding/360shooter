// Rig of the pharaoh: 6 parts, no arms (crook and flail), drawn 64 px, scale 3 in the moment, 4 in the cinematic (M13, AP-185).
// Generated from docs/design/assets/sprites-m13b.js (PX_RIGS, H-48); tests/config/rigs.test.ts compares it with the source.
// Ink images (Q-92) follow the name pattern <sheet>-ink-<index> like the silhouettes; the rig lists only the base images.
import type { RigDef } from '../../contracts';

export const PHARAOH_RIG: RigDef = {
  id: 'pharaoh',
  parts: [
    {
      id: 'robe',
      frame: 'rig-pharaoh-robe-0',
      poses: {
        rest: 'rig-pharaoh-robe-0',
        'gilded-half': 'rig-pharaoh-robe-1',
        gilded: 'rig-pharaoh-robe-2',
      },
      silhouette: 'rig-pharaoh-robe-sil-0',
      originX: 0.5,
      originY: 0.867,
      x: 0,
      y: -9,
      order: 0,
    },
    {
      id: 'collar',
      frame: 'rig-pharaoh-collar-0',
      poses: { rest: 'rig-pharaoh-collar-0', gilded: 'rig-pharaoh-collar-1' },
      silhouette: 'rig-pharaoh-collar-sil-0',
      originX: 0.5,
      originY: 0.467,
      x: 0,
      y: -28,
      parent: 'robe',
      order: 1,
    },
    {
      id: 'flail',
      frame: 'rig-pharaoh-flail-0',
      poses: {
        rest: 'rig-pharaoh-flail-0',
        raised: 'rig-pharaoh-flail-1',
        gilded: 'rig-pharaoh-flail-2',
      },
      silhouette: 'rig-pharaoh-flail-sil-0',
      originX: 0.4,
      originY: 0.519,
      x: 0,
      y: -17,
      parent: 'robe',
      order: 2,
    },
    {
      id: 'crook',
      frame: 'rig-pharaoh-crook-0',
      poses: {
        rest: 'rig-pharaoh-crook-0',
        raised: 'rig-pharaoh-crook-1',
        gilded: 'rig-pharaoh-crook-2',
      },
      silhouette: 'rig-pharaoh-crook-sil-0',
      originX: 0.619,
      originY: 0.577,
      x: 0,
      y: -17,
      parent: 'robe',
      order: 3,
    },
    {
      id: 'head',
      frame: 'rig-pharaoh-head-0',
      poses: {
        rest: 'rig-pharaoh-head-0',
        glare: 'rig-pharaoh-head-1',
        cracked: 'rig-pharaoh-head-2',
        gilded: 'rig-pharaoh-head-3',
      },
      silhouette: 'rig-pharaoh-head-sil-0',
      originX: 0.5,
      originY: 0.778,
      x: 0,
      y: -30,
      parent: 'robe',
      order: 4,
    },
    {
      id: 'orb-ring',
      frame: 'rig-pharaoh-orb-ring-0',
      poses: {
        spin1: 'rig-pharaoh-orb-ring-0',
        spin2: 'rig-pharaoh-orb-ring-1',
        spin3: 'rig-pharaoh-orb-ring-2',
      },
      silhouette: 'rig-pharaoh-orb-ring-sil-0',
      originX: 0.493,
      originY: 0.481,
      x: 0,
      y: -30,
      order: 5,
    },
  ],
};

/** Order in which the parts turn gold (pose "gilded"), no contract field. */
export const PHARAOH_GILD_ORDER = ['robe', 'flail', 'crook', 'collar', 'head'] as const;

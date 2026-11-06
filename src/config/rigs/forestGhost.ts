// Rig of the forest ghost: 7 parts, drawn 48 px, scale 3 in the moment, 4 in the cinematic (M13, AP-185).
// Generated from docs/design/assets/sprites-m13b.js (PX_RIGS, H-48); tests/config/rigs.test.ts compares it with the source.
// Ink images (Q-92) follow the name pattern <sheet>-ink-<index> like the silhouettes; the rig lists only the base images.
import type { RigDef } from '../../contracts';

export const FOREST_GHOST_RIG: RigDef = {
  id: 'forestGhost',
  parts: [
    {
      id: 'tail-wisp',
      frame: 'rig-ghost-tail-wisp-0',
      poses: {
        rest: 'rig-ghost-tail-wisp-0',
        flow: 'rig-ghost-tail-wisp-1',
        stretch: 'rig-ghost-tail-wisp-2',
        trug: 'rig-ghost-tail-wisp-3',
      },
      silhouette: 'rig-ghost-tail-wisp-sil-0',
      originX: 0.5,
      originY: 0.1,
      x: 0,
      y: 0,
      parent: 'body',
      order: 0,
    },
    {
      id: 'antenna-right',
      frame: 'rig-ghost-antenna-right-0',
      poses: {
        rest: 'rig-ghost-antenna-right-0',
        swept: 'rig-ghost-antenna-right-1',
        trug: 'rig-ghost-antenna-right-2',
      },
      silhouette: 'rig-ghost-antenna-right-sil-0',
      originX: 0.2,
      originY: 0.769,
      x: 8,
      y: -25,
      parent: 'body',
      order: 1,
    },
    {
      id: 'antenna-left',
      frame: 'rig-ghost-antenna-left-0',
      poses: {
        rest: 'rig-ghost-antenna-left-0',
        swept: 'rig-ghost-antenna-left-1',
        trug: 'rig-ghost-antenna-left-2',
      },
      silhouette: 'rig-ghost-antenna-left-sil-0',
      originX: 0.867,
      originY: 0.769,
      x: -8,
      y: -25,
      parent: 'body',
      order: 2,
    },
    {
      id: 'arm-right',
      frame: 'rig-ghost-arm-right-0',
      poses: {
        rest: 'rig-ghost-arm-right-0',
        reach: 'rig-ghost-arm-right-1',
        trug: 'rig-ghost-arm-right-2',
      },
      silhouette: 'rig-ghost-arm-right-sil-0',
      originX: 0.059,
      originY: 0.714,
      x: 11,
      y: -9,
      parent: 'body',
      order: 3,
    },
    {
      id: 'arm-left',
      frame: 'rig-ghost-arm-left-0',
      poses: {
        rest: 'rig-ghost-arm-left-0',
        reach: 'rig-ghost-arm-left-1',
        trug: 'rig-ghost-arm-left-2',
      },
      silhouette: 'rig-ghost-arm-left-sil-0',
      originX: 0.941,
      originY: 0.714,
      x: -11,
      y: -9,
      parent: 'body',
      order: 4,
    },
    {
      id: 'body',
      frame: 'rig-ghost-body-0',
      poses: {
        rest: 'rig-ghost-body-0',
        stretch: 'rig-ghost-body-1',
        dissolve1: 'rig-ghost-body-2',
        dissolve2: 'rig-ghost-body-3',
        trug: 'rig-ghost-body-4',
      },
      silhouette: 'rig-ghost-body-sil-0',
      originX: 0.5,
      originY: 0.976,
      x: 0,
      y: -13,
      order: 5,
    },
    {
      id: 'face',
      frame: 'rig-ghost-face-0',
      poses: { rest: 'rig-ghost-face-0', wail: 'rig-ghost-face-1', trug: 'rig-ghost-face-2' },
      silhouette: 'rig-ghost-face-sil-0',
      originX: 0.5,
      originY: 0.5,
      x: 0,
      y: -11,
      parent: 'body',
      order: 6,
    },
  ],
};

/** Offsets (px, unscaled) of the parts at the pose "stretch" relative to their default offsets (PX_RIGS anchors, no contract field). */
export const FOREST_GHOST_ANCHORS = {
  stretch: {
    'tail-wisp': [0, 0],
    'antenna-right': [-2, -10],
    'antenna-left': [2, -10],
    'arm-right': [-2, -4],
    'arm-left': [2, -4],
    face: [0, -4],
  },
} as const;

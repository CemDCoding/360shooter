// Shared state of the finisher modules (AP-160, AP-182): what the choreography player gets from the scene.
import type Phaser from 'phaser';
import type { FinisherPlan, FinisherStartData } from '../../contracts';
import type { FinisherLayout } from './layout';
import type { TextureBank } from './textures';

/** Depth of the skip hint (screen layer, above everything of the choreography). */
export const DEPTH = { hint: 100 } as const;

// ---------------------------------------------------------------------------
// Choreography player (M13, AP-182, §4 "Rig und Choreografie (M13)", PE-246 to PE-248, H-46)
// ---------------------------------------------------------------------------

/** Draw order of the choreography objects (one world camera, one screen camera). */
export const CHOREO_DEPTH = {
  /** Stage world (AP-195): sky, silhouettes, ground; behind everything else. */
  stage: 4,
  /** Boss effects on the ground (bulge, hedge). */
  ground: 14,
  /** Afterimage copies, behind the figures. */
  afterimage: 16,
  /** Figures; each actor adds its index. */
  figure: 20,
  particles: 30,
  slash: 32,
  impact: 60,
  /** Screen camera from here on. */
  flash: 70,
  /** Cinema bars (AP-195): over ring, impact and flash, under the texts. */
  bars: 80,
  text: 90,
} as const;

/** Display object the player positions; the Phaser game objects match it structurally. */
export type ChoreoObject = Phaser.GameObjects.GameObject;

/**
 * What the choreography player gets from the scene. No Phaser import at run time, so the player is testable
 * with a stand-in scene (`webgl: false` = Canvas renderer, only Canvas-safe means are used).
 */
export interface ChoreoContext {
  scene: Phaser.Scene;
  data: FinisherStartData;
  plan: FinisherPlan;
  layout: FinisherLayout;
  /** True when the renderer is WebGL; only then tint is added (never carrying, PE-246). */
  webgl: boolean;
  /** Left edge of the 640 px choreography stage in a wider arena. */
  stageX: number;
  textures: TextureBank;
  /** Bitmap font of titles and names. */
  fontKey: string;
  /** Plays an existing placeholder sound (PE-237). */
  playSound(key: string): void;
  /** Registers an object of the world (zoomed and shaken by the choreography camera). */
  addWorld(obj: ChoreoObject): void;
  /** Registers an object of the screen layer (not zoomed: flash, text, skip hint). */
  addUi(obj: ChoreoObject): void;
}

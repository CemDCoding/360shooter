// Shared state of the finisher building blocks (AP-160): what every block module gets from the scene.
import type Phaser from 'phaser';
import type { FinisherPlan, FinisherStartData, SafeInsets } from '../../contracts';
import type { FinisherLayout, Point } from './layout';
import type { TextureBank } from './textures';

/** Draw order from back to front (one camera, depth only). */
export const DEPTH = {
  /** Colour background, speedlines, beam; shaken. */
  back: 10,
  /** Copies of boss and astronaut, shards; shaken. */
  world: 20,
  scrim: 30,
  picture: 40,
  panels: 50,
  impact: 60,
  cutIn: 70,
  bars: 80,
  title: 90,
  hint: 100,
} as const;

/** One running block: updated every frame until the timeline stops it. */
export interface BlockEffect {
  /** `seqMs`: sequence time since the block start; `fxMs`: effect time since the block start. */
  update(seqMs: number, fxMs: number): void;
  destroy(): void;
}

export interface FinisherContext {
  scene: Phaser.Scene;
  data: FinisherStartData;
  plan: FinisherPlan;
  layout: FinisherLayout;
  insets: SafeInsets;
  /** Boss position, centre of zoom, speedlines and shards. */
  hit: Point;
  /** Boss index 0..5 (frame of portrait, hit image and shards). */
  bossIndex: number;
  /** Shaken containers. */
  back: Phaser.GameObjects.Container;
  world: Phaser.GameObjects.Container;
  textures: TextureBank;
  /** True when the renderer is WebGL (tint works); Canvas falls back to untinted text and no shadow. */
  webgl: boolean;
  /** Integer zoom of the actor copies (1 or 2). */
  zoom: number;
  /** Current whole-pixel shake offset of `back` and `world`. */
  shake: Point;
  actors: ActorCopies;
}

// ---------------------------------------------------------------------------
// Choreography player (M13, AP-182, §4 "Rig und Choreografie (M13)", PE-246 to PE-248, H-46)
// ---------------------------------------------------------------------------

/** Draw order of the choreography objects (one world camera, one screen camera). */
export const CHOREO_DEPTH = {
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

/** Boss copy: shown, hidden (hit image, gone) or as a see-through ghost while it shakes away. */
export type BossMode = 'shown' | 'hidden' | 'ghost';

export interface ActorCopies {
  boss: Phaser.GameObjects.Image;
  player: Phaser.GameObjects.Image;
  bossMode: BossMode;
  setBossMode(mode: BossMode): void;
  /** Shows the astronaut copy (over the colour background, stage 3 to 6). */
  setPlayerShown(shown: boolean): void;
  /** Screen positions and scales with the current zoom. */
  bossScreen(): { x: number; y: number; scale: number };
  playerScreen(): { x: number; y: number; scale: number };
}

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

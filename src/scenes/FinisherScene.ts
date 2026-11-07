// Boss finisher overlay (M10 AP-160, M13 AP-182, AP-191, RS-04.1 to RS-04.3, design brief H-39, PE-203).
// Plays one FinisherPlan over the paused game scene with the ChoreoPlayer (figures from parts, world
// camera with zoom and scroll, screen camera for flash, text and hint), also with the Canvas renderer.
// Ends when the player is done or on skip: with `result` it stops GameScene (and the HUD) and starts
// ResultScene, without it (debug) the menu. The M10 block timeline was removed in AP-191.
import Phaser from 'phaser';
import { FINISHER_SCENE_KEY, type ChoreoDef, type FinisherStartData } from '../contracts';
import { RIGS } from '../config/rigs';
import { canSkip } from '../logic/finisher';
import { getSoundService } from '../platform/audio';
import { FONT_KEY } from './menu/kassette';
import { readSafeInsets } from './safeInsets';
import { ChoreoPlayer } from './finisher/choreoPlayer';
import type { ChoreoContext } from './finisher/context';
import { finisherLayout } from './finisher/layout';
import { createSkipHint } from './finisher/pictures';
import { atlasToLoad, choreoOf, isFinisherStartData } from './finisher/startData';
import { TextureBank } from './finisher/textures';

const GAME_KEY = 'GameScene';
const HUD_KEY = 'HudScene';
const RESULT_KEY = 'ResultScene';
const MENU_KEY = 'MenuScene';
/** Width of the choreography stage (arena px of the H-46 boards); wider arenas centre it. */
const CHOREO_STAGE_W = 640;

export class FinisherScene extends Phaser.Scene {
  private startData: FinisherStartData | null = null;
  /** `result` of the start data, kept even when the rest is unusable, so a boss win never hangs. */
  private result: unknown = undefined;
  private hint: Phaser.GameObjects.Container | null = null;
  private done = false;
  private inputBound = false;
  /** Player of `plan.choreo`, its context and the screen camera. */
  private player: ChoreoPlayer | null = null;
  private choreoCtx: ChoreoContext | null = null;
  private uiCam: Phaser.Cameras.Scene2D.Camera | null = null;

  constructor() {
    super(FINISHER_SCENE_KEY);
  }

  init(data: unknown): void {
    this.startData = isFinisherStartData(data) ? data : null;
    this.result =
      data && typeof data === 'object' ? (data as { result?: unknown }).result : undefined;
    this.hint = null;
    this.done = false;
    this.inputBound = false;
    this.player = null;
    this.choreoCtx = null;
    this.uiCam = null;
  }

  /** M13: loads the rig atlas of the choreography once; a missing file leaves the game-sprite fallback. */
  preload(): void {
    const plan = this.startData?.plan;
    const def = plan ? choreoOf(plan) : null;
    if (!def) return;
    const atlas = atlasToLoad(def, (key) => this.textures.exists(key));
    if (atlas) this.load.atlas(atlas.key, atlas.path, atlas.jsonPath);
  }

  create(): void {
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, this.cleanup, this);
    const data = this.startData;
    const choreo = data ? choreoOf(data.plan) : null;
    if (!data || !choreo) {
      this.finish();
      return;
    }
    this.cameras.main.setBackgroundColor('rgba(0,0,0,0)');
    this.createChoreo(data, choreo);
  }

  /**
   * The choreography is played by the ChoreoPlayer on the main camera (world: zoom, scroll, shake), a
   * second camera shows the screen layer (flash, text, skip hint) unzoomed. Both cameras are removed by
   * Phaser on SHUTDOWN (the camera manager rebuilds the main camera on the next start).
   */
  private createChoreo(data: FinisherStartData, def: ChoreoDef): void {
    const width = this.scale.width;
    const height = this.scale.height;
    const layout = finisherLayout(width, height, readSafeInsets(this.registry), false);
    const main = this.cameras.main.setRoundPixels(true);
    const uiCam = this.cameras.add(0, 0, width, height).setRoundPixels(true);
    uiCam.setBackgroundColor('rgba(0,0,0,0)');
    this.uiCam = uiCam;
    const sound = getSoundService(this.game);
    const ctx: ChoreoContext = {
      scene: this,
      data,
      plan: data.plan,
      layout,
      webgl: this.sys.renderer.type === Phaser.WEBGL,
      stageX: Math.round((width - CHOREO_STAGE_W) / 2),
      textures: new TextureBank(this),
      fontKey: FONT_KEY,
      playSound: (key) => {
        if (!this.done) sound.play(key);
      },
      addWorld: (obj) => {
        uiCam.ignore(obj);
      },
      addUi: (obj) => {
        main.ignore(obj);
      },
    };
    this.choreoCtx = ctx;
    this.player = new ChoreoPlayer(ctx, def, main, { rigs: RIGS });
    const hint = createSkipHint({ scene: this, layout });
    if (hint) ctx.addUi(hint);
    this.hint = hint;
    this.bindInput();
  }

  update(_time: number, delta: number): void {
    const player = this.player;
    if (!player || this.done) return;
    player.update(Math.max(0, delta));
    const plan = this.choreoCtx?.plan;
    this.hint?.setVisible(!!plan && canSkip(plan, player.elapsedMs));
    if (player.done) this.finish();
  }

  private readonly onSkip = (): void => {
    const plan = this.startData?.plan;
    if (this.done || !plan || !this.player) return;
    if (canSkip(plan, this.player.elapsedMs)) this.finish();
  };

  private bindInput(): void {
    this.input.on(Phaser.Input.Events.POINTER_DOWN, this.onSkip);
    this.input.keyboard?.on('keydown', this.onSkip);
    this.inputBound = true;
  }

  private unbindInput(): void {
    if (!this.inputBound) return;
    this.input.off(Phaser.Input.Events.POINTER_DOWN, this.onSkip);
    this.input.keyboard?.off('keydown', this.onSkip);
    this.inputBound = false;
  }

  /**
   * End (played to the end or skipped): with `result` stop GameScene and the HUD and show the result,
   * without it (debug start) go to the menu. Objects are removed in cleanup() on SHUTDOWN.
   */
  private finish(): void {
    if (this.done) return;
    this.done = true;
    this.unbindInput();
    if (this.result !== undefined && this.result !== null) {
      for (const key of [GAME_KEY, HUD_KEY]) {
        if (this.scene.isActive(key) || this.scene.isPaused(key) || this.scene.isSleeping(key)) {
          this.scene.stop(key);
        }
      }
      this.scene.start(RESULT_KEY, this.result as object);
    } else {
      this.scene.start(MENU_KEY);
    }
  }

  /** SHUTDOWN: removes the player objects, generated textures and the input listeners. */
  private cleanup(): void {
    this.done = true;
    this.unbindInput();
    this.hint?.destroy();
    this.hint = null;
    // Player objects and generated textures; the cameras go with the camera manager (SHUTDOWN).
    this.player?.destroy();
    this.player = null;
    this.choreoCtx?.textures.destroy();
    this.choreoCtx = null;
    this.uiCam = null;
    this.tweens.timeScale = 1;
  }
}

// Boss finisher overlay (M10, AP-160, RS-04.1 to RS-04.3, design brief H-39, PE-203).
// Plays one FinisherPlan with its own camera and its own copies of boss and astronaut over the paused
// game scene, full arena width, also with the Canvas renderer. Ends after `plan.totalMs` or on skip:
// with `result` it stops GameScene (and the HUD) and starts ResultScene, without it (debug) the menu.
import Phaser from 'phaser';
import {
  FINISHER_SCENE_KEY,
  type FinisherPlan,
  type FinisherStartData,
  type FinisherStep,
} from '../contracts';
import { FINISHER_RULES } from '../config/finishers';
import { OPACITY } from '../config/theme';
import { canSkip } from '../logic/finisher';
import { getSoundService } from '../platform/audio';
import { readSafeInsets } from './safeInsets';
import { hitstop, shake, slowmo, zoom } from './finisher/camera';
import {
  DEPTH,
  type ActorCopies,
  type BlockEffect,
  type BossMode,
  type FinisherContext,
} from './finisher/context';
import { actorScreen, finisherLayout, hitPoint } from './finisher/layout';
import { beam, bgColor, flash, impactFrame, letterbox, speedlines } from './finisher/overlays';
import { ParticleSystem, particles, shatter } from './finisher/particles';
import { createSkipHint, cutIn, frames, panels, title } from './finisher/pictures';
import { releaseTimeline } from './finisher/shutdown';
import { isFinisherStartData } from './finisher/startData';
import { TextureBank } from './finisher/textures';
import { beamWindow, effectRate, soundCues } from './finisher/timing';

const GAME_KEY = 'GameScene';
const HUD_KEY = 'HudScene';
const RESULT_KEY = 'ResultScene';
const MENU_KEY = 'MenuScene';
/** Fallback texture of a missing actor (transparent, built into Phaser). */
const EMPTY_TEXTURE = '__DEFAULT';

interface Running {
  effect: BlockEffect;
  seqStart: number;
  fxStart: number;
}

export class FinisherScene extends Phaser.Scene {
  private startData: FinisherStartData | null = null;
  /** `result` of the start data, kept even when the rest is unusable, so a boss win never hangs. */
  private result: unknown = undefined;
  private ctx: FinisherContext | null = null;
  private timeline: Phaser.Time.Timeline | null = null;
  private readonly running = new Set<Running>();
  private particleSystem: ParticleSystem | null = null;
  private hint: Phaser.GameObjects.Container | null = null;
  private fxNow = 0;
  private done = false;
  private inputBound = false;

  constructor() {
    super(FINISHER_SCENE_KEY);
  }

  init(data: unknown): void {
    this.startData = isFinisherStartData(data) ? data : null;
    this.result =
      data && typeof data === 'object' ? (data as { result?: unknown }).result : undefined;
    this.ctx = null;
    this.timeline = null;
    this.running.clear();
    this.particleSystem = null;
    this.hint = null;
    this.fxNow = 0;
    this.done = false;
    this.inputBound = false;
  }

  create(): void {
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, this.cleanup, this);
    const data = this.startData;
    if (!data) {
      this.finish();
      return;
    }
    this.cameras.main.setBackgroundColor('rgba(0,0,0,0)');
    const plan = data.plan;
    const width = this.scale.width;
    const height = this.scale.height;
    const insets = readSafeInsets(this.registry);
    const layout = finisherLayout(
      width,
      height,
      insets,
      plan.steps.some((s) => s.block === 'letterbox'),
    );
    const hit = hitPoint(data.boss, width, height);
    const back = this.add.container(0, 0).setDepth(DEPTH.back);
    const world = this.add.container(0, 0).setDepth(DEPTH.world);
    const ctx: FinisherContext = {
      scene: this,
      data,
      plan,
      layout,
      insets,
      hit,
      bossIndex: Math.min(5, Math.max(0, plan.stage - 1)),
      back,
      world,
      textures: new TextureBank(this),
      webgl: this.sys.renderer.type === Phaser.WEBGL,
      zoom: 1,
      shake: { x: 0, y: 0 },
      actors: null as unknown as ActorCopies,
    };
    ctx.actors = this.createActors(ctx);
    this.ctx = ctx;
    this.particleSystem = new ParticleSystem(ctx);
    this.hint = createSkipHint(ctx);
    this.timeline = this.add.timeline(this.timelineEvents(plan));
    this.bindInput();
    this.timeline.play();
  }

  /** Timeline from `plan.steps`: start and end of every block, the beam, the sounds and the end. */
  private timelineEvents(plan: FinisherPlan): Phaser.Types.Time.TimelineEventConfig[] {
    const events: Phaser.Types.Time.TimelineEventConfig[] = [];
    const block = (atMs: number, durationMs: number, make: () => BlockEffect | null): void => {
      let entry: Running | null = null;
      events.push({
        at: atMs,
        run: () => {
          entry = this.startBlock(make);
        },
      });
      events.push({
        at: atMs + durationMs,
        run: () => {
          if (entry) this.stopBlock(entry);
        },
      });
    };
    for (const step of plan.steps) {
      block(step.atMs, step.durationMs, () => this.makeBlock(step));
    }
    const beamAt = beamWindow(plan);
    if (beamAt) block(beamAt.atMs, beamAt.durationMs, () => (this.ctx ? beam(this.ctx) : null));
    const sound = getSoundService(this.game);
    for (const cue of soundCues(plan)) {
      events.push({
        at: cue.atMs,
        run: () => {
          if (!this.done) sound.play(cue.key);
        },
      });
    }
    events.push({ at: plan.totalMs, run: () => this.finish() });
    return events;
  }

  private makeBlock(step: FinisherStep): BlockEffect | null {
    const ctx = this.ctx;
    const ps = this.particleSystem;
    if (!ctx || !ps) return null;
    switch (step.block) {
      case 'hitstop':
        return hitstop();
      case 'slowmo':
        return slowmo(ctx, step);
      case 'zoom':
        return zoom(ctx);
      case 'shake':
        return shake(ctx);
      case 'letterbox':
        return letterbox(ctx, step);
      case 'speedlines':
        return speedlines(ctx, step);
      case 'bgColor':
        return bgColor(ctx, step);
      case 'impactFrame':
        return impactFrame(ctx, step);
      case 'flash':
        return flash(ctx, step);
      case 'cutIn':
        return cutIn(ctx, step);
      case 'panels':
        return panels(ctx, step);
      case 'particles':
        return particles(ctx, step, ps);
      case 'shatter':
        return shatter(ctx, step, ps);
      case 'title':
        return title(ctx, step);
      case 'frames':
        return frames(ctx, step);
      default:
        return null;
    }
  }

  private startBlock(make: () => BlockEffect | null): Running | null {
    if (this.done || !this.timeline) return null;
    const effect = make();
    if (!effect) return null;
    const entry: Running = { effect, seqStart: this.timeline.elapsed, fxStart: this.fxNow };
    this.running.add(entry);
    effect.update(0, 0);
    return entry;
  }

  private stopBlock(entry: Running): void {
    if (!this.running.delete(entry)) return;
    entry.effect.destroy();
  }

  private createActors(ctx: FinisherContext): ActorCopies {
    const { data, layout, hit } = ctx;
    const make = (a: FinisherStartData['boss']): Phaser.GameObjects.Image => {
      const ok = this.textures.exists(a.texture);
      const img = this.add
        .image(0, 0, ok ? a.texture : EMPTY_TEXTURE, ok ? (a.frame ?? 0) : undefined)
        .setFlipX(a.flipX === true)
        .setVisible(false);
      ctx.world.add(img);
      return img;
    };
    const boss = make(data.boss);
    const player = make(data.player);
    // One result object per actor, reused every frame (read it right away, it changes on the next call).
    const screen = (
      img: Phaser.GameObjects.Image,
      a: FinisherStartData['boss'],
      out: { x: number; y: number; scale: number },
    ) => {
      out.scale = a.scale * ctx.zoom;
      actorScreen(
        a,
        hit,
        ctx.zoom,
        layout.width,
        layout.height,
        (img.width * out.scale) / 2,
        (img.height * out.scale) / 2,
        out,
      );
      return out;
    };
    const bossAt = { x: 0, y: 0, scale: 1 };
    const playerAt = { x: 0, y: 0, scale: 1 };
    const actors: ActorCopies = {
      boss,
      player,
      bossMode: 'hidden',
      setBossMode(mode: BossMode) {
        actors.bossMode = mode;
        boss.setVisible(mode !== 'hidden').setAlpha(mode === 'ghost' ? OPACITY.ghost : 1);
      },
      setPlayerShown(shown: boolean) {
        player.setVisible(shown && !ctx.plan.isFinale);
      },
      bossScreen: () => screen(boss, data.boss, bossAt),
      playerScreen: () => screen(player, data.player, playerAt),
    };
    // Finales show their own pictures; the stages start on the boss copy.
    actors.setBossMode(ctx.plan.isFinale ? 'hidden' : 'shown');
    return actors;
  }

  update(_time: number, delta: number): void {
    const ctx = this.ctx;
    const tl = this.timeline;
    if (this.done || !ctx || !tl) return;
    const seq = tl.elapsed;
    const dtFx = Math.max(0, delta) * effectRate(ctx.plan.steps, seq);
    this.fxNow += dtFx;
    for (const r of this.running) r.effect.update(seq - r.seqStart, this.fxNow - r.fxStart);
    this.particleSystem?.update(dtFx);
    ctx.back.setPosition(ctx.shake.x, ctx.shake.y);
    ctx.world.setPosition(ctx.shake.x, ctx.shake.y);
    const b = ctx.actors.bossScreen();
    ctx.actors.boss.setPosition(b.x, b.y).setScale(b.scale);
    const p = ctx.actors.playerScreen();
    ctx.actors.player.setPosition(p.x, p.y).setScale(p.scale);
    this.hint?.setVisible(ctx.plan.skippable && seq >= FINISHER_RULES.skipLockMs);
  }

  private readonly onSkip = (): void => {
    const plan = this.startData?.plan;
    if (this.done || !plan || !this.timeline) return;
    if (canSkip(plan, this.timeline.elapsed)) this.finish();
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
    this.timeline?.stop();
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

  /** SHUTDOWN: removes every block, object, generated texture, the timeline and the input listeners. */
  private cleanup(): void {
    this.done = true;
    this.unbindInput();
    for (const r of this.running) r.effect.destroy();
    this.running.clear();
    this.particleSystem?.destroy();
    this.particleSystem = null;
    this.hint?.destroy();
    this.hint = null;
    // Phaser destroys the timeline itself on SHUTDOWN; a second destroy() would throw.
    this.timeline = releaseTimeline(this.timeline);
    if (this.ctx) {
      this.ctx.back.destroy();
      this.ctx.world.destroy();
      this.ctx.textures.destroy();
      this.ctx = null;
    }
    this.tweens.timeScale = 1;
  }
}

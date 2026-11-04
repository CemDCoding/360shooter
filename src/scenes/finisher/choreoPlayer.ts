// Choreography player of the finisher scene (M13, AP-182, §4 "Rig und Choreografie (M13)", PE-246 to
// PE-252, brief H-46). Plays one ChoreoDef in real time:
// - Clock: real ms since the start (the frame delta, never frames); `sampleClock` maps it to choreography
//   time (slow motion via `timeScale`, the clock stands during a `hitStop`), `sampleTrack` gives every value.
// - Figures: one flat Container per actor (rig.ts); parts move by easing, poses switch frames.
// - Events start when the choreography clock passes `atMs`; their `durationMs` counts in real time.
// - Everything is built in the constructor (figures, afterimage pools, spark pool, flash, texts, impact
//   images, boss effects); `update` only sets values. No Phaser import at run time.
import type Phaser from 'phaser';
import type {
  BossId,
  ChoreoCamera,
  ChoreoDef,
  ChoreoEvent,
  ChoreoTrack,
  RigDef,
  RigId,
} from '../../contracts';
import { CHOREO_RULES } from '../../config/finishers';
import { THEME } from '../../config/theme';
import {
  prepareChoreo,
  sampleClock,
  sampleTrack,
  type ChoreoClock,
  type ChoreoClockSample,
} from '../../logic/choreo';
import { CHOREO_DEPTH, type ChoreoContext } from './context';
import { BOSS_FX, findFx, type BossFxModule, type FxApi, type FxInstance } from './fx';
import { centredX, tokenColor } from './layout';
import {
  RigFigure,
  atlasKey,
  axisShake,
  bossRigOf,
  isPartProperty,
  rigScale,
  splitTarget,
  type PartWorld,
} from './rig';
import { cameraAt, shakeInto, type CameraLike } from './shots';
import { SPARK_LIFE_MS, SparkPool, sparkTexture } from './sparks';
import { titleScaleAt } from './timing';
import {
  AFTERIMAGE_COPIES,
  AFTERIMAGE_FADE_MS,
  AFTERIMAGE_GAP_MS,
  AfterimagePool,
  PartHistory,
  SLASH_FX,
  slashFx,
} from './trails';

const S = THEME.sizePx;
const C = THEME.sizeCount;
const EMPTY_TEXTURE = '__DEFAULT';

/** Registers the player needs; tests pass their own rigs and effects. */
export interface ChoreoPlayerSource {
  rigs: Readonly<Partial<Record<RigId, RigDef>>>;
  fx?: Readonly<Partial<Record<BossId, BossFxModule>>>;
}

/** A part (`part` >= 0) or the whole figure (`part` -1). */
interface PartRef {
  fig: RigFigure;
  part: number;
}

interface Binding extends PartRef {
  track: ChoreoTrack;
}

/** One event while it runs: started when the clock passes `at`, stopped after `durationMs` real time. */
interface Runner {
  at: number;
  durationMs: number;
  startedAt: number;
  /** Before the figures are solved (shake and hit-white of parts). */
  pre?(sinceMs: number): void;
  /** After the figures are solved (trails, overlays, effects). */
  post?(sinceMs: number, dtMs: number): void;
  start(): void;
  stop(): void;
  destroy(): void;
}

const NOOP = (): void => {};

export class ChoreoPlayer {
  /** Real length (ms) including slow motion and hit stops. */
  readonly realMs: number;
  /** Real time since the start. */
  elapsedMs = 0;
  /** Choreography time of the last frame. */
  choreoMs = 0;
  frozen = false;
  done = false;

  readonly figures: RigFigure[] = [];
  readonly atlas: string;
  readonly bossId: BossId | null;
  private readonly byRig = new Map<string, RigFigure>();
  /** Real-time segments, built once; sampled every frame without allocation. */
  private readonly clock: ChoreoClock;
  private readonly tick: ChoreoClockSample = { choreoMs: 0, frozen: false, done: false };
  private readonly bindings: Binding[] = [];
  private readonly poseTracks = new Map<RigFigure, (ChoreoTrack | null)[]>();
  private readonly runners: Runner[] = [];
  private readonly active: Runner[] = [];
  private next = 0;
  private readonly histories: PartHistory[] = [];
  private readonly pools = new Map<string, AfterimagePool>();
  private sparks: SparkPool | null = null;
  private flashRect: Phaser.GameObjects.Rectangle | null = null;
  private readonly cam: ChoreoCamera = { scrollX: 0, scrollY: 0, zoom: 1 };
  private readonly screenShake = { x: 0, y: 0 };
  private readonly shakeTmp = { x: 0, y: 0 };
  private readonly world: PartWorld = { x: 0, y: 0, angle: 0, scaleX: 1, scaleY: 1 };
  private readonly fxApi: FxApi;

  constructor(
    private readonly ctx: ChoreoContext,
    readonly def: ChoreoDef,
    private readonly camera: CameraLike,
    source: ChoreoPlayerSource,
  ) {
    this.clock = prepareChoreo(def);
    this.realMs = this.clock.realMs;
    this.atlas = atlasKey(def);
    this.bossId = bossRigOf(def);
    const bossScale = this.bossId ? rigScale(this.bossId, def) : C['size.rig-scale-boss-moment'];
    this.fxApi = {
      ctx,
      atlas: this.atlas,
      bossScale,
      figure: (rigId) => this.byRig.get(rigId) ?? null,
      boss: () => (this.bossId ? (this.byRig.get(this.bossId) ?? null) : null),
    };
    this.buildFigures(source.rigs);
    this.bindTracks();
    const fx = source.fx ?? BOSS_FX;
    const events = [...def.events].sort((a, b) => a.atMs - b.atMs);
    for (const ev of events) {
      const r = this.makeRunner(ev, this.bossId ? fx[this.bossId] : undefined);
      if (r) this.runners.push(r);
    }
    this.update(0);
  }

  private buildFigures(rigs: ChoreoPlayerSource['rigs']): void {
    const { scene, data } = this.ctx;
    this.def.actors.forEach((actor, index) => {
      const rig = rigs[actor.rigId];
      if (!rig || this.byRig.has(actor.rigId)) return;
      const copy = actor.rigId === 'astronaut' ? data.player : data.boss;
      const loaded = scene.textures.exists(copy.texture);
      const fig = new RigFigure(
        this.ctx,
        actor,
        rig,
        this.atlas,
        loaded ? { texture: copy.texture, frame: copy.frame } : { texture: EMPTY_TEXTURE },
        rigScale(actor.rigId, this.def),
        index,
      );
      this.figures.push(fig);
      this.byRig.set(actor.rigId, fig);
      this.poseTracks.set(
        fig,
        rig.parts.map(() => null),
      );
    });
  }

  /** Resolves `<rigId>.<partId>` or `<rigId>`; null for unknown targets. */
  private ref(target: string): PartRef | null {
    const { rigId, partId } = splitTarget(target);
    const fig = this.byRig.get(rigId);
    if (!fig) return null;
    if (partId === null) return { fig, part: -1 };
    const part = fig.partIndex(partId);
    return part < 0 ? null : { fig, part };
  }

  private refs(targets: readonly string[]): PartRef[] {
    const out: PartRef[] = [];
    for (const t of targets) {
      const r = this.ref(t);
      if (r) out.push(r);
    }
    return out;
  }

  private bindTracks(): void {
    for (const track of this.def.tracks) {
      if (track.target === 'camera' || !isPartProperty(track.property)) continue;
      const r = this.ref(track.target);
      if (!r) continue;
      this.bindings.push({ ...r, track });
      if (track.property === 'pose' && r.part >= 0) {
        const list = this.poseTracks.get(r.fig);
        if (list) list[r.part] = track;
      }
    }
  }

  /** Afterimage pool of one part (made once, shared by every afterimage event of the part). */
  private pool(fig: RigFigure, part: number): AfterimagePool {
    const key = `${fig.rig.id}.${part}`;
    let pool = this.pools.get(key);
    if (!pool) {
      const history = new PartHistory(fig, part);
      this.histories.push(history);
      pool = new AfterimagePool(this.ctx, history);
      this.pools.set(key, pool);
    }
    return pool;
  }

  /** Part refs with the whole figure expanded to its parts. */
  private partsOf(targets: readonly string[]): PartRef[] {
    const out: PartRef[] = [];
    for (const r of this.refs(targets)) {
      if (r.part >= 0) out.push(r);
      else r.fig.parts.forEach((_, i) => out.push({ fig: r.fig, part: i }));
    }
    return out;
  }

  /** Centre of the boss figure (impact image, sparks without a place). */
  private bossCentre(out: { x: number; y: number }): void {
    const boss = this.fxApi.boss();
    if (!boss) {
      out.x = this.ctx.layout.center.x;
      out.y = this.ctx.layout.center.y;
      return;
    }
    out.x = boss.container.x;
    out.y = Math.round((boss.top() + boss.container.y) / 2);
  }

  private makeRunner(ev: ChoreoEvent, bossFx: BossFxModule | undefined): Runner | null {
    const base = { at: ev.atMs, startedAt: 0, start: NOOP, stop: NOOP, destroy: NOOP };
    const rules = CHOREO_RULES;
    switch (ev.kind) {
      case 'hitStop': {
        const targets = this.refs(ev.targets);
        const amp = S['size.finisher-shake'] * (ev.strength ?? 1);
        // "Reduce effects" drops the shake (brief H-46); the hit stop itself stays in the clock.
        const reduced = this.ctx.plan.reduced;
        return {
          ...base,
          durationMs: Math.max(0, ev.ms),
          pre: (since) => {
            if (reduced) return;
            const o = axisShake(since, amp);
            for (let i = 0; i < targets.length; i++) {
              const t = targets[i];
              if (t.part < 0) {
                if (ev.axis === 'x') t.fig.rootShakeX += o;
                else t.fig.rootShakeY += o;
              } else if (ev.axis === 'x') t.fig.shakeX[t.part] += o;
              else t.fig.shakeY[t.part] += o;
            }
          },
        };
      }
      case 'afterimage': {
        const pools = this.partsOf(ev.parts).map((r) => this.pool(r.fig, r.part));
        const copies = Math.max(1, Math.min(AFTERIMAGE_COPIES, Math.floor(ev.copies)));
        const gap = ev.spacingMs > 0 ? ev.spacingMs : AFTERIMAGE_GAP_MS;
        const fade = ev.fadeMs > 0 ? ev.fadeMs : AFTERIMAGE_FADE_MS;
        const trail = Math.max(0, ev.durationMs ?? 0);
        return {
          ...base,
          durationMs: trail + fade,
          start: () => {
            for (const p of pools) p.follow(this.elapsedMs, copies, gap);
          },
          post: (since) => {
            for (let i = 0; i < pools.length; i++) {
              if (since < trail) pools[i].follow(this.elapsedMs, copies, gap);
              else pools[i].fade(since - trail, fade);
            }
          },
          stop: () => {
            for (const p of pools) p.hide();
          },
        };
      }
      case 'particles': {
        const tex = sparkTexture(this.ctx.scene.textures, this.atlas, ev.texture);
        if (!tex) return null;
        if (!this.sparks) this.sparks = new SparkPool(this.ctx);
        const sparks = this.sparks;
        const follow = ev.follow ? this.ref(ev.follow) : null;
        const total = Math.max(0, Math.floor(ev.count));
        const window = Math.max(0, ev.durationMs ?? 0);
        const at = { x: 0, y: 0 };
        let spawned = 0;
        const origin = (): void => {
          if (follow && follow.part >= 0) {
            const w = follow.fig.worldOf(follow.part, this.world);
            at.x = w.x;
            at.y = w.y;
          } else if (follow) {
            at.x = follow.fig.container.x;
            at.y = Math.round((follow.fig.top() + follow.fig.container.y) / 2);
          } else if (ev.at) {
            at.x = this.ctx.stageX + ev.at.x;
            at.y = ev.at.y;
          } else this.bossCentre(at);
        };
        return {
          ...base,
          durationMs: window,
          start: () => {
            spawned = 0;
          },
          post: (since) => {
            const due = window <= 0 ? total : Math.min(total, Math.floor((total * since) / window));
            if (due <= spawned) return;
            origin();
            sparks.spawn(due - spawned, at.x, at.y, tex.key, tex.frame, SPARK_LIFE_MS);
            spawned = due;
          },
        };
      }
      case 'hitWhite': {
        const parts = this.partsOf(ev.targets);
        return {
          ...base,
          durationMs: ev.durationMs ?? rules.hitStopMinMs,
          pre: () => {
            for (let i = 0; i < parts.length; i++) parts[i].fig.white[parts[i].part] = 1;
          },
        };
      }
      case 'impact': {
        const scene = this.ctx.scene;
        if (!scene.textures.exists(ev.texture)) return null;
        const texture = scene.textures.get(ev.texture);
        const index = Math.min(5, Math.max(0, this.ctx.plan.stage - 1));
        const img = scene.add
          .image(0, 0, ev.texture, texture.has(String(index)) ? index : undefined)
          .setScale(C['size.finisher-frame-scale'])
          .setDepth(CHOREO_DEPTH.impact)
          .setVisible(false);
        this.ctx.addWorld(img);
        const at = { x: 0, y: 0 };
        return {
          ...base,
          durationMs: ev.durationMs ?? rules.hitStopMinMs,
          start: () => {
            this.bossCentre(at);
            img.setPosition(at.x, at.y).setVisible(true);
          },
          stop: () => {
            img.setVisible(false);
          },
          destroy: () => {
            img.destroy();
          },
        };
      }
      case 'flash': {
        const rect = this.flash();
        const color = tokenColor(ev.color, 'finisher.paper');
        return {
          ...base,
          durationMs: ev.durationMs ?? rules.hitStopMinMs,
          start: () => {
            rect.setFillStyle(color.num, ev.strength ?? 1).setVisible(true);
          },
          stop: () => {
            rect.setVisible(false);
          },
        };
      }
      case 'shake': {
        const amp = S['size.finisher-shake'] * (ev.strength ?? 1);
        return {
          ...base,
          durationMs: ev.durationMs ?? rules.hitStopMaxMs,
          post: (since) => {
            shakeInto(since, amp, this.shakeTmp);
            this.screenShake.x += this.shakeTmp.x;
            this.screenShake.y += this.shakeTmp.y;
          },
        };
      }
      case 'timeScale':
        // Handled by the clock (sampleChoreo); nothing to show.
        return { ...base, durationMs: 0 };
      case 'text':
        return this.textRunner(ev, base);
      case 'sound':
        return {
          ...base,
          durationMs: 0,
          start: () => this.ctx.playSound(ev.key),
        };
      case 'fx': {
        const factory = ev.name === SLASH_FX ? slashFx : findFx(bossFx, ev.name);
        if (!factory) return null;
        const inst: FxInstance = factory(this.fxApi, ev);
        return {
          ...base,
          durationMs:
            ev.durationMs ?? (ev.name === SLASH_FX ? rules.hitStopMaxMs : Number.POSITIVE_INFINITY),
          start: () => inst.start(),
          post: (since, dt) => inst.update(since, dt),
          stop: () => inst.stop(),
          destroy: () => inst.destroy(),
        };
      }
    }
  }

  /** One full-arena rectangle in the screen layer, shared by all flash events. */
  private flash(): Phaser.GameObjects.Rectangle {
    if (!this.flashRect) {
      const { width, height } = this.ctx.layout;
      this.flashRect = this.ctx.scene.add
        .rectangle(0, 0, width, height, THEME.colors['finisher.paper'].num)
        .setOrigin(0, 0)
        .setDepth(CHOREO_DEPTH.flash)
        .setVisible(false);
      this.ctx.addUi(this.flashRect);
    }
    return this.flashRect;
  }

  /** Title or name in the bitmap font, two sizes without fading; tint only under WebGL (PE-246). */
  private textRunner(
    ev: Extract<ChoreoEvent, { kind: 'text' }>,
    base: Pick<Runner, 'at' | 'startedAt' | 'start' | 'stop' | 'destroy'>,
  ): Runner | null {
    const scene = this.ctx.scene;
    if (!scene.cache.bitmapFont.exists(this.ctx.fontKey)) return null;
    const isName = ev.color === 'finisher.name';
    const finalScale = isName ? C['size.finisher-name-scale'] : C['size.finisher-title-scale'];
    const label = scene.add
      .bitmapText(0, 0, this.ctx.fontKey, ev.text.toUpperCase())
      .setDepth(CHOREO_DEPTH.text)
      .setVisible(false);
    if (this.ctx.webgl) label.setTint(tokenColor(ev.color, 'finisher.title').num);
    this.ctx.addUi(label);
    const localW = label.getTextBounds(false).local.width;
    let scale = 0;
    const place = (s: number): void => {
      scale = s;
      label
        .setScale(s)
        .setPosition(centredX(this.ctx.layout.titleCenterX, localW * s), this.ctx.layout.titleY);
    };
    return {
      ...base,
      durationMs: ev.durationMs ?? Number.POSITIVE_INFINITY,
      start: () => {
        place(titleScaleAt(0, finalScale));
        label.setVisible(true);
      },
      post: (since) => {
        const s = titleScaleAt(since, finalScale);
        if (s !== scale) place(s);
      },
      stop: () => {
        label.setVisible(false);
      },
      destroy: () => {
        label.destroy();
      },
    };
  }

  /** Advances the player by `dtMs` real time (the frame delta). */
  update(dtMs: number): void {
    if (this.done) return;
    const dt = Number.isFinite(dtMs) && dtMs > 0 ? dtMs : 0;
    this.elapsedMs += dt;
    const before = this.choreoMs;
    const clock = sampleClock(this.clock, this.elapsedMs, this.tick);
    this.choreoMs = clock.choreoMs;
    this.frozen = clock.frozen;
    // Sparks run in a hit stop (§4) and slow down with the clock in slow motion.
    const rate = clock.frozen || dt === 0 ? 1 : Math.min(1, (this.choreoMs - before) / dt);

    while (this.next < this.runners.length && this.runners[this.next].at <= this.choreoMs) {
      const r = this.runners[this.next++];
      r.startedAt = this.elapsedMs;
      this.active.push(r);
      r.start();
    }

    // Index loops only: nothing (iterators, closures, arrays) is allocated per frame.
    const figs = this.figures;
    const active = this.active;
    for (let i = 0; i < figs.length; i++) figs[i].beginFrame();
    for (let i = 0; i < this.bindings.length; i++) {
      const b = this.bindings[i];
      const v = sampleTrack(b.track, this.choreoMs);
      if (v !== undefined) b.fig.set(b.part, b.track.property, v);
    }
    for (let i = 0; i < active.length; i++) active[i].pre?.(this.elapsedMs - active[i].startedAt);
    for (let i = 0; i < figs.length; i++) {
      figs[i].apply(this.elapsedMs, this.poseTracks.get(figs[i]), this.choreoMs);
    }
    for (let i = 0; i < this.histories.length; i++) this.histories[i].record(this.elapsedMs);

    this.screenShake.x = 0;
    this.screenShake.y = 0;
    for (let i = 0; i < active.length; i++) {
      active[i].post?.(this.elapsedMs - active[i].startedAt, dt);
    }
    this.sparks?.update(dt * Math.max(0, rate));

    cameraAt(this.def, this.choreoMs, this.cam);
    this.camera.setZoom(this.cam.zoom);
    this.camera.setScroll(
      this.cam.scrollX + this.screenShake.x,
      this.cam.scrollY + this.screenShake.y,
    );

    for (let i = this.active.length - 1; i >= 0; i--) {
      const r = this.active[i];
      if (this.elapsedMs - r.startedAt < r.durationMs) continue;
      r.stop();
      this.active[i] = this.active[this.active.length - 1];
      this.active.pop();
    }
    if (this.elapsedMs >= this.realMs) this.done = true;
  }

  /** Number of runners (prepared events) and of those still running; for tests. */
  get runnerCount(): number {
    return this.runners.length;
  }

  get activeCount(): number {
    return this.active.length;
  }

  /** Spark pool, null without particle events; for tests. */
  get sparkPool(): SparkPool | null {
    return this.sparks;
  }

  /** Afterimage pools by `<rigId>.<partIndex>`; for tests. */
  get afterimagePools(): ReadonlyMap<string, AfterimagePool> {
    return this.pools;
  }

  destroy(): void {
    for (const r of this.runners) r.destroy();
    this.runners.length = 0;
    this.active.length = 0;
    for (const p of this.pools.values()) p.destroy();
    this.pools.clear();
    this.histories.length = 0;
    this.sparks?.destroy();
    this.sparks = null;
    this.flashRect?.destroy();
    this.flashRect = null;
    for (const fig of this.figures) fig.destroy();
    this.figures.length = 0;
    this.byRig.clear();
    this.done = true;
  }
}

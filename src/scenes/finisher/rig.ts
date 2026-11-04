// Figures made of parts for the choreography player (M13, AP-182, §4 "Rig und Choreografie (M13)", PE-246,
// PE-247, PE-252, brief H-46). A figure is ONE flat Container whose children are the part images: the
// parent link of a part (at most one level) is solved here in figure space, so the draw order of all parts
// stays free (`order` = child order) and no container is nested. No Phaser import at run time.
import type Phaser from 'phaser';
import type {
  ChoreoActor,
  ChoreoDef,
  ChoreoProperty,
  ChoreoTrack,
  RigDef,
  RigId,
  RigPartDef,
} from '../../contracts';
import { THEME } from '../../config/theme';
import { CHOREO_DEPTH, type ChoreoContext } from './context';

const C = THEME.sizeCount;
const DEG = Math.PI / 180;

/** Atlas key of a choreography: `finisher-rig-<BossId>` from the boss rig of `actors` (PE-252). */
export function atlasKey(def: ChoreoDef): string {
  const boss = bossRigOf(def);
  return `finisher-rig-${boss ?? 'astronaut'}`;
}

/** The boss rig of a choreography (the first actor that is not the astronaut). */
export function bossRigOf(def: ChoreoDef): Exclude<RigId, 'astronaut'> | null {
  const a = def.actors.find((x) => x.rigId !== 'astronaut');
  return a ? (a.rigId as Exclude<RigId, 'astronaut'>) : null;
}

/** Scale of a figure: astronaut always `size.rig-scale-astronaut`, a boss per variant kind (H-46). */
export function rigScale(rigId: RigId, def: ChoreoDef): number {
  if (rigId === 'astronaut') return C['size.rig-scale-astronaut'];
  return def.variantId.startsWith('cinematic-')
    ? C['size.rig-scale-boss-cinematic']
    : C['size.rig-scale-boss-moment'];
}

/** Rotation in the code: parts without `freeRotate` turn at most `size.rig-fine-rotate` degrees (PE-247). */
export function fineAngle(part: Pick<RigPartDef, 'freeRotate'> | null, angle: number): number {
  if (part?.freeRotate) return angle;
  const max = C['size.rig-fine-rotate'];
  return Math.min(max, Math.max(-max, angle));
}

/** Drawn smear poses (`smear`, the blade arc `arc1`/`arc2`): they stand `motion.rig-smear` (H-46 11a). */
export function isSmearPose(pose: string | undefined): boolean {
  return pose !== undefined && (pose === 'smear' || /^arc\d+$/.test(pose));
}

/** Frame of a pose; unknown or no pose = the base frame. */
export function poseFrame(part: RigPartDef, pose: string | undefined): string {
  return (pose !== undefined && part.poses?.[pose]) || part.frame;
}

/**
 * Silhouette frame of a part frame (PE-252 c): the base frame uses `part.silhouette`, any other frame
 * `<Bogen>-<Index>` maps to `<Bogen>-sil-<Index>` (same index). Frames without an index fall back to
 * `part.silhouette`.
 */
export function silhouetteFrame(part: RigPartDef, frame: string): string {
  if (frame === part.frame) return part.silhouette;
  const m = /^(.*)-(\d+)$/.exec(frame);
  return m ? `${m[1]}-sil-${m[2]}` : part.silhouette;
}

/** Hold state of a smear pose of one part (real time). */
export interface SmearState {
  /** Smear pose shown right now, null when none. */
  shown: string | null;
  /** Real time (ms) the shown smear pose started. */
  since: number;
  /** Smear pose that used up its time while the track still sits on it. */
  spent: string | null;
}

export function newSmearState(): SmearState {
  return { shown: null, since: 0, spent: null };
}

/**
 * Pose to show for a sampled pose. A smear pose stands at least `smearMs` real time (one frame even at
 * 30 fps) and at most twice that: a track that stays on it longer (slow motion) shows `next`, the next
 * pose of the track, instead. Smear poses are poses, not events: they never count as flash.
 */
export function resolvePose(
  st: SmearState,
  sampled: string | undefined,
  next: string | undefined,
  nowMs: number,
  smearMs: number,
): string | undefined {
  if (st.spent !== null && sampled !== st.spent) st.spent = null;
  if (st.shown !== null) {
    const age = nowMs - st.since;
    if (age < smearMs) return st.shown;
    if (sampled === st.shown) {
      if (age < 2 * smearMs) return st.shown;
      st.spent = st.shown;
      st.shown = null;
      return next;
    }
    st.shown = null;
  }
  if (st.spent !== null) return next;
  if (sampled !== undefined && isSmearPose(sampled)) {
    st.shown = sampled;
    st.since = nowMs;
  }
  return sampled;
}

/** First pose of a `pose` track after `choreoMs` that differs from `current` (lookahead for a long smear). */
export function nextPose(
  track: ChoreoTrack,
  choreoMs: number,
  current: string | undefined,
): string | undefined {
  for (let i = 0; i < track.keys.length; i++) {
    const k = track.keys[i];
    if (k.atMs > choreoMs && typeof k.value === 'string' && k.value !== current) return k.value;
  }
  return undefined;
}

/** Whole-pixel decaying shake along one axis (same rhythm as the M10 shake: 20 ms steps, halves every 80 ms). */
export function axisShake(tMs: number, amplitude: number): number {
  if (tMs < 0) return 0;
  const a = Math.round(amplitude * 0.5 ** Math.floor(tMs / AXIS_SHAKE_HALF_MS));
  if (a <= 0) return 0;
  return Math.floor(tMs / AXIS_SHAKE_STEP_MS) % 2 === 0 ? a : -a;
}
const AXIS_SHAKE_STEP_MS = 20;
const AXIS_SHAKE_HALF_MS = 80;

/** World transform of a part (stage coordinates of the world camera). */
export interface PartWorld {
  x: number;
  y: number;
  angle: number;
  scaleX: number;
  scaleY: number;
}

/** Game sprite of a figure, used while its atlas is not loaded (placeholder figures, AP-181). */
export interface FigureFallback {
  texture: string;
  frame?: string | number;
}

/** Properties a track may set on a part or a figure root. */
const PART_PROPS: readonly ChoreoProperty[] = [
  'x',
  'y',
  'angle',
  'scaleX',
  'scaleY',
  'alpha',
  'pose',
  'order',
];

export function isPartProperty(p: ChoreoProperty): boolean {
  return PART_PROPS.includes(p);
}

/**
 * One figure: a flat Container with one Image per part, all created once in the constructor. Per frame
 * the player resets the state (`beginFrame`), writes track values, lets the effects add shake and
 * hit-white, then `apply` solves the parents and sets the images (no object is created after the start).
 */
export class RigFigure {
  readonly container: Phaser.GameObjects.Container;
  readonly images: Phaser.GameObjects.Image[] = [];
  readonly parts: readonly RigPartDef[];
  readonly scale: number;
  readonly flip: number;
  /** Parent index per part, -1 for a root part. */
  private readonly parent: Int8Array;
  /** Roots first, then children (a parent is solved before its children). */
  private readonly solveOrder: number[];
  /** Silhouette frame per frame of every part (built once). */
  private readonly silOf: Map<string, string>[];
  private readonly useAtlas: boolean;
  private readonly fallbackSil: string | null;
  private readonly shownKey: string[];
  private readonly lastOrder: Int16Array;
  readonly smear: SmearState[];

  // Per-part state, reset every frame.
  readonly ox: Float64Array;
  readonly oy: Float64Array;
  readonly ang: Float64Array;
  readonly sx: Float64Array;
  readonly sy: Float64Array;
  readonly alpha: Float64Array;
  readonly order: Int16Array;
  readonly shakeX: Float64Array;
  readonly shakeY: Float64Array;
  readonly white: Uint8Array;
  readonly pose: (string | undefined)[];
  /** Pose actually shown after the smear rule. */
  readonly shownPose: (string | undefined)[];

  // Solved transforms in figure space.
  readonly lx: Float64Array;
  readonly ly: Float64Array;
  readonly la: Float64Array;
  readonly lsx: Float64Array;
  readonly lsy: Float64Array;

  // Root state, reset every frame.
  x = 0;
  y = 0;
  angle = 0;
  rootScaleX = 1;
  rootScaleY = 1;
  rootAlpha = 1;
  rootOrder = 0;
  rootShakeX = 0;
  rootShakeY = 0;

  constructor(
    private readonly ctx: ChoreoContext,
    readonly actor: ChoreoActor,
    readonly rig: RigDef,
    readonly atlas: string,
    private readonly fallback: FigureFallback,
    scale: number,
    index: number,
  ) {
    const scene = ctx.scene;
    const n = rig.parts.length;
    this.parts = rig.parts;
    this.scale = scale;
    this.flip = actor.flipX ? -1 : 1;
    this.useAtlas = scene.textures.exists(atlas);
    this.fallbackSil = this.useAtlas
      ? null
      : ctx.textures.silhouette(
          fallback.texture,
          fallback.frame,
          THEME.colors['finisher.paper'].css,
        );
    this.parent = new Int8Array(n).fill(-1);
    rig.parts.forEach((p, i) => {
      if (p.parent !== undefined) this.parent[i] = rig.parts.findIndex((q) => q.id === p.parent);
    });
    this.solveOrder = [
      ...rig.parts.map((_, i) => i).filter((i) => this.parent[i] < 0),
      ...rig.parts.map((_, i) => i).filter((i) => this.parent[i] >= 0),
    ];
    this.silOf = rig.parts.map((p) => {
      const m = new Map<string, string>();
      for (const f of [p.frame, ...Object.values(p.poses ?? {})]) m.set(f, silhouetteFrame(p, f));
      return m;
    });
    this.ox = new Float64Array(n);
    this.oy = new Float64Array(n);
    this.ang = new Float64Array(n);
    this.sx = new Float64Array(n);
    this.sy = new Float64Array(n);
    this.alpha = new Float64Array(n);
    this.order = new Int16Array(n);
    this.lastOrder = new Int16Array(n).fill(-1);
    this.shakeX = new Float64Array(n);
    this.shakeY = new Float64Array(n);
    this.white = new Uint8Array(n);
    this.pose = new Array<string | undefined>(n).fill(undefined);
    this.shownPose = new Array<string | undefined>(n).fill(undefined);
    this.shownKey = new Array<string>(n).fill('');
    this.smear = rig.parts.map(() => newSmearState());
    this.lx = new Float64Array(n);
    this.ly = new Float64Array(n);
    this.la = new Float64Array(n);
    this.lsx = new Float64Array(n);
    this.lsy = new Float64Array(n);

    this.container = scene.add.container(0, 0).setDepth(CHOREO_DEPTH.figure + index);
    for (const p of rig.parts) {
      const img = this.useAtlas
        ? scene.add.image(0, 0, atlas, p.frame)
        : scene.add.image(0, 0, fallback.texture, fallback.frame);
      img.setOrigin(p.originX, p.originY);
      this.images.push(img);
      this.container.add(img);
    }
    ctx.addWorld(this.container);
    this.beginFrame();
    this.apply(0);
  }

  partIndex(id: string): number {
    return this.parts.findIndex((p) => p.id === id);
  }

  /** Resets the state to the rest pose of the rig and the start position of the actor. */
  beginFrame(): void {
    for (let i = 0; i < this.parts.length; i++) {
      const p = this.parts[i];
      this.ox[i] = p.x;
      this.oy[i] = p.y;
      this.ang[i] = 0;
      this.sx[i] = 1;
      this.sy[i] = 1;
      this.alpha[i] = 1;
      this.order[i] = p.order;
      this.shakeX[i] = 0;
      this.shakeY[i] = 0;
      this.white[i] = 0;
      this.pose[i] = undefined;
    }
    this.x = this.actor.x;
    this.y = this.actor.y;
    this.angle = 0;
    this.rootScaleX = 1;
    this.rootScaleY = 1;
    this.rootAlpha = 1;
    this.rootOrder = 0;
    this.rootShakeX = 0;
    this.rootShakeY = 0;
  }

  /** Writes one sampled track value; `part` -1 = the figure root. */
  set(part: number, prop: ChoreoProperty, value: number | string): void {
    if (prop === 'pose') {
      if (part >= 0 && typeof value === 'string') this.pose[part] = value;
      return;
    }
    if (typeof value !== 'number' || !Number.isFinite(value)) return;
    if (part < 0) {
      if (prop === 'x') this.x = value;
      else if (prop === 'y') this.y = value;
      else if (prop === 'angle') this.angle = value;
      else if (prop === 'scaleX') this.rootScaleX = value;
      else if (prop === 'scaleY') this.rootScaleY = value;
      else if (prop === 'alpha') this.rootAlpha = value;
      else if (prop === 'order') this.rootOrder = value;
      return;
    }
    if (prop === 'x') this.ox[part] = value;
    else if (prop === 'y') this.oy[part] = value;
    else if (prop === 'angle') this.ang[part] = value;
    else if (prop === 'scaleX') this.sx[part] = value;
    else if (prop === 'scaleY') this.sy[part] = value;
    else if (prop === 'alpha') this.alpha[part] = value;
    else if (prop === 'order') this.order[part] = Math.round(value);
  }

  /** Solves the parents (one level) in figure space and writes containers and images. */
  apply(nowMs: number, poseTracks?: readonly (ChoreoTrack | null)[], choreoMs = 0): void {
    const smearMs = THEME.motionMs['motion.rig-smear'];
    for (let s = 0; s < this.solveOrder.length; s++) {
      const i = this.solveOrder[s];
      const part = this.parts[i];
      const a = fineAngle(part, this.ang[i]);
      const p = this.parent[i];
      if (p < 0) {
        this.lx[i] = this.ox[i] + this.shakeX[i];
        this.ly[i] = this.oy[i] + this.shakeY[i];
        this.la[i] = a;
        this.lsx[i] = this.sx[i];
        this.lsy[i] = this.sy[i];
      } else {
        const ox = this.ox[i] * this.lsx[p];
        const oy = this.oy[i] * this.lsy[p];
        const r = this.la[p] * DEG;
        const cos = Math.cos(r);
        const sin = Math.sin(r);
        this.lx[i] = this.lx[p] + cos * ox - sin * oy + this.shakeX[i];
        this.ly[i] = this.ly[p] + sin * ox + cos * oy + this.shakeY[i];
        this.la[i] = this.la[p] + a;
        this.lsx[i] = this.lsx[p] * this.sx[i];
        this.lsy[i] = this.lsy[p] * this.sy[i];
      }
      const track = poseTracks?.[i] ?? null;
      const sampled = this.pose[i];
      const next = track ? nextPose(track, choreoMs, sampled) : undefined;
      this.shownPose[i] = resolvePose(this.smear[i], sampled, next, nowMs, smearMs);
      this.showFrame(i);
      this.images[i]
        .setPosition(this.lx[i], this.ly[i])
        .setAngle(this.la[i])
        .setScale(this.lsx[i], this.lsy[i])
        .setAlpha(this.alpha[i]);
    }
    let reorder = false;
    for (let i = 0; i < this.parts.length; i++) {
      if (this.order[i] !== this.lastOrder[i]) {
        this.lastOrder[i] = this.order[i];
        this.images[i].setDepth(this.order[i]);
        reorder = true;
      }
    }
    if (reorder) this.container.sort('depth');
    this.container
      .setPosition(this.ctx.stageX + this.x + this.rootShakeX, this.y + this.rootShakeY)
      .setAngle(fineAngle(null, this.angle))
      .setScale(this.scale * this.rootScaleX * this.flip, this.scale * this.rootScaleY)
      .setAlpha(this.rootAlpha)
      .setDepth(CHOREO_DEPTH.figure + this.rootOrder);
  }

  /** Frame the part shows right now (pose after the smear rule). */
  frameOf(i: number): string {
    return poseFrame(this.parts[i], this.shownPose[i]);
  }

  /** Shows a part frame on another image (afterimage copy): atlas when loaded, else the game sprite. */
  showOn(img: Phaser.GameObjects.Image, frame: string): void {
    if (this.useAtlas) img.setTexture(this.atlas, frame);
    else img.setTexture(this.fallback.texture, this.fallback.frame);
  }

  /** True when the part images come from the atlas (false = placeholder with the game sprite). */
  get atlasLoaded(): boolean {
    return this.useAtlas;
  }

  private showFrame(i: number): void {
    const img = this.images[i];
    const frame = this.frameOf(i);
    if (this.useAtlas) {
      const want = this.white[i] ? (this.silOf[i].get(frame) ?? this.parts[i].silhouette) : frame;
      if (this.shownKey[i] === want) return;
      this.shownKey[i] = want;
      const atlas = this.ctx.scene.textures.get(this.atlas);
      img.setFrame(atlas.has(want) ? want : frame);
      return;
    }
    // Placeholder: the game sprite, and for hit-white its silhouette drawn once at the start.
    const white = this.white[i] === 1 && this.fallbackSil !== null;
    const want = white ? (this.fallbackSil as string) : this.fallback.texture;
    if (this.shownKey[i] === want) return;
    this.shownKey[i] = want;
    if (white) img.setTexture(want);
    else img.setTexture(this.fallback.texture, this.fallback.frame);
  }

  /** World transform of part `i` after `apply` (stage coordinates of the world camera). */
  worldOf(i: number, out: PartWorld): PartWorld {
    const c = this.container;
    const csx = c.scaleX;
    const csy = c.scaleY;
    const r = c.angle * DEG;
    const px = csx * this.lx[i];
    const py = csy * this.ly[i];
    out.x = c.x + Math.cos(r) * px - Math.sin(r) * py;
    out.y = c.y + Math.sin(r) * px + Math.cos(r) * py;
    out.angle = c.angle + (csx * csy < 0 ? -this.la[i] : this.la[i]);
    out.scaleX = csx * this.lsx[i];
    out.scaleY = csy * this.lsy[i];
    return out;
  }

  /** Highest point of the figure (smallest y) in world coordinates, from the part images. */
  top(): number {
    let top = this.container.y;
    const c = this.container;
    for (let i = 0; i < this.images.length; i++) {
      const h = this.images[i].height;
      if (!Number.isFinite(h)) continue;
      const y = c.y + Math.abs(c.scaleY) * (this.ly[i] - this.parts[i].originY * h * this.lsy[i]);
      if (y < top) top = y;
    }
    return top;
  }

  destroy(): void {
    this.container.destroy();
    this.images.length = 0;
  }
}

/** Splits a track target into figure and part (`<rigId>.<partId>`, or a rig id alone). */
export function splitTarget(target: string): { rigId: string; partId: string | null } {
  const dot = target.indexOf('.');
  return dot < 0
    ? { rigId: target, partId: null }
    : { rigId: target.slice(0, dot), partId: target.slice(dot + 1) };
}

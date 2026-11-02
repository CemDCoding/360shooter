// Quicktime focus (M11, AP-173, RS-05.7, PE-214, brief H-41 "Effekt-Rangfolge" and "Fokus-Ablauf"). Pure, no
// Phaser: which effect keeps how much opacity while a parry circle is active, and how the focus switches and
// fades. All values come from the design tokens via PARRY_FOCUS (config/parry.ts).
import { PARRY_FOCUS } from '../config/parry';

/** 0 is drawn most clearly, 5 is the floor. */
export type EffectRank = 0 | 1 | 2 | 3 | 4 | 5;

/** Everything the round shows, by its place in the effect ranking of the brief. */
export type EffectKind =
  | 'parryCircle'
  | 'parryRing'
  | 'parryFeedback'
  | 'parryLabel'
  | 'hintBoard'
  | 'hud'
  | 'marker'
  | 'bossAttack'
  | 'telegraph'
  | 'enemyShot'
  | 'player'
  | 'gearBody'
  | 'enemy'
  | 'boss'
  | 'item'
  | 'pet'
  | 'petAura'
  | 'petShot'
  | 'gearRing'
  | 'fireRing'
  | 'coin'
  | 'laser'
  | 'particle'
  | 'ground'
  | 'arenaDeco';

/** Effect ranking of brief H-41 (table "Effekt-Rangfolge"). */
export const EFFECT_RANK: Readonly<Record<EffectKind, EffectRank>> = {
  parryCircle: 0,
  parryRing: 0,
  parryFeedback: 0,
  parryLabel: 0,
  hintBoard: 0,
  hud: 0,
  marker: 0,
  bossAttack: 1,
  telegraph: 1,
  enemyShot: 1,
  player: 2,
  gearBody: 2,
  enemy: 3,
  boss: 3,
  item: 3,
  pet: 4,
  petAura: 4,
  petShot: 4,
  gearRing: 4,
  fireRing: 4,
  coin: 4,
  laser: 4,
  particle: 4,
  ground: 5,
  arenaDeco: 5,
};

/** The only rank that loses opacity (rank 5 is dimmed by the ink layer instead). */
export const LOW_RANK: EffectRank = 4;
export const GROUND_RANK: EffectRank = 5;

/**
 * Depth of the ink layer: directly above the map floor (MapBackground, depth -100: tiles, decoration, floor
 * motes, vignette) and below every other object (lowest: the pharaoh sandstorm at -50, a boss attack).
 */
export const FOCUS_DIM_DEPTH = -99;

/**
 * Photosensitivity (plan §5, RI-43): the focus switches at most once per second, so the floor changes its
 * brightness at most once per second, even when circles come and go quickly.
 */
export const MIN_SWITCH_MS = 1000;

/** Focus as the round applies it; one object per scene, updated every frame (no garbage). */
export interface FocusView {
  /** 0 = no focus, 1 = full focus; in between during the stepped transition. */
  level: number;
  /** "EFFEKTE REDUZIEREN" is on. */
  reduce: boolean;
  /** Astronaut position. */
  x: number;
  y: number;
}

export function createFocusView(): FocusView {
  return { level: 0, reduce: false, x: 0, y: 0 };
}

function clamp01(v: number): number {
  return Number.isFinite(v) ? Math.min(1, Math.max(0, v)) : 0;
}

/**
 * Opacity of an effect of `rank` at `distancePx` from the astronaut. Ranks 0 to 3 stay at 100 %. Rank 4 drops
 * to focus-low-near within focus-near and to focus-low-far outside, scaled by the focus level; with "EFFEKTE
 * REDUZIEREN" it stays at focus-low-reduced everywhere, with or without focus. Rank 5 keeps its own opacity
 * (the ink layer lies over it, see dimAlpha).
 */
export function rankAlpha(
  rank: EffectRank,
  distancePx: number,
  level: number,
  reduceEffects: boolean,
): number {
  if (rank !== LOW_RANK) return 1;
  if (reduceEffects) return PARRY_FOCUS.lowReduced;
  const near = !(distancePx > PARRY_FOCUS.nearPx);
  const target = near ? PARRY_FOCUS.lowNear : PARRY_FOCUS.lowFar;
  return 1 + (target - 1) * clamp01(level);
}

/** Opacity of a rank 4 effect at (x, y) in the given focus view. */
export function lowAlphaAt(view: FocusView, x: number, y: number): number {
  return rankAlpha(LOW_RANK, Math.hypot(x - view.x, y - view.y), view.level, view.reduce);
}

/** Opacity of the ink layer over the floor: focus-dim at full focus. */
export function dimAlpha(level: number): number {
  return clamp01(level) * PARRY_FOCUS.dim;
}

/** No new particles near the astronaut while the focus is on (brief H-41 2a). */
export function allowsNewParticle(view: FocusView, x: number, y: number): boolean {
  if (!(view.level > 0)) return true;
  return Math.hypot(x - view.x, y - view.y) > PARRY_FOCUS.nearPx;
}

/** Nothing to dim or fade: all effects at their own opacity. */
export function isNeutral(view: FocusView): boolean {
  return !(view.level > 0) && !view.reduce;
}

/**
 * On/off of the focus from "a circle is active" on play time: on from the first announcement, off focus-hold
 * after the feedback of the last circle (a circle that follows within the hold keeps it on), and at most one
 * switch per MIN_SWITCH_MS. reset() turns it off at once (boss death, round end).
 */
export class FocusSwitch {
  private on = false;
  private idleMs = Number.POSITIVE_INFINITY;
  private sinceSwitchMs = Number.POSITIVE_INFINITY;

  get active(): boolean {
    return this.on;
  }

  update(dtMs: number, busy: boolean): boolean {
    const dt = Number.isFinite(dtMs) && dtMs > 0 ? dtMs : 0;
    this.sinceSwitchMs += dt;
    this.idleMs = busy ? 0 : this.idleMs + dt;
    const want = busy || this.idleMs < PARRY_FOCUS.holdMs;
    if (want !== this.on && this.sinceSwitchMs >= MIN_SWITCH_MS) {
      this.on = want;
      this.sinceSwitchMs = 0;
    }
    return this.on;
  }

  reset(): void {
    this.on = false;
    this.idleMs = Number.POSITIVE_INFINITY;
    this.sinceSwitchMs = Number.POSITIVE_INFINITY;
  }
}

const EPS = 1e-9;

/**
 * Stepped transition of the focus level (motion.pixel, 3 steps in focus-in / focus-out); with "Bewegung
 * reduzieren" the level jumps at once. No overshoot, no flash: the level only moves towards its target.
 */
export class FocusFade {
  private progress = 0;
  private shown = 0;

  get level(): number {
    return this.shown;
  }

  step(on: boolean, dtMs: number, reducedMotion: boolean): number {
    const dt = Number.isFinite(dtMs) && dtMs > 0 ? dtMs : 0;
    const duration = on ? PARRY_FOCUS.inMs : PARRY_FOCUS.outMs;
    if (reducedMotion || !(duration > 0)) this.progress = on ? 1 : 0;
    else this.progress = clamp01(this.progress + ((on ? 1 : -1) * dt) / duration);
    const n = PARRY_FOCUS.steps;
    // Monotone towards the target: a switch in the middle of a transition never jumps back.
    this.shown = on
      ? Math.max(this.shown, clamp01(Math.floor(this.progress * n + EPS) / n))
      : Math.min(this.shown, clamp01(Math.ceil(this.progress * n - EPS) / n));
    return this.shown;
  }

  reset(): void {
    this.progress = 0;
    this.shown = 0;
  }
}

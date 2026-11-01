// Pets in the round (AP-144, brief H-35 "Pet in der Welt"): pure state and geometry without Phaser.
// Combat values come from logic/pets.ts (petStats); this file only moves, times and picks.
import { THEME } from '../../config/theme';
import type { PetId } from '../../contracts';
import type { Located } from '../../logic/pets';

/** Side distance to the astronaut, opposite the aim (size.pet-offset-x). */
export const PET_OFFSET_X = THEME.sizePx['size.pet-offset-x'];
/** Height below the astronaut centre (size.pet-offset-y); the bee floats above instead. */
export const PET_OFFSET_Y = THEME.sizePx['size.pet-offset-y'];
/** Bee floats 10 px above the astronaut centre (brief H-35: "Biene -10"). */
export const BEE_OFFSET_Y = -10;
/** Second bee (power-up): a little further out so the two never sit on top of each other. */
export const SECOND_BEE_DX = 10;
/** Pets sit below the astronaut (depth 10) and her weapon behind (9), above enemies (0) and items (5). */
export const PET_DEPTH_BELOW_PLAYER = 1.5;
/** Pet armour lies directly on the pet frames. */
export const PET_GEAR_DEPTH_STEP = 0.05;
/** Speed at which the pet follows its place beside the astronaut (px/s, display only). */
export const FOLLOW_SPEED = 240;

/** Egg wobbles from 80 % of the bar (frames 1/2 alternating at 4 fps). */
export const EGG_WOBBLE_FROM = 0.8;
const EGG_WOBBLE_FRAME_MS = 250;
/** Egg frames: 0 rest, 1/2 wobble, 3 cracks. */
export const EGG_FRAME_CRACKS = 3;
/** The cracked egg stays for motion.base before the shell bursts (motion.hatch). */
export const CRACK_MS = THEME.motionMs['motion.base'];
export const HATCH_MS = THEME.motionMs['motion.hatch'];

/** Bee: within this distance of its target it stings (px). */
export const STING_REACH = 10;
/** Bee shows its wind-up frame (4) inside this distance. */
export const STING_WINDUP_REACH = 28;
/** Snowball flight speed (px/s, start value for the hand test). */
export const SNOWBALL_SPEED = 260;
/** Snowball hit radius at 1x (sprite 8x8, the ball itself is about 6 px). */
export const SNOWBALL_RADIUS = 4;
/** Snowballs fly at most this long, then vanish (ms). */
export const SNOWBALL_MAX_MS = 2000;
/** Capybara slow is renewed every frame for enemies in the aura; it ends this long after leaving it. */
export const AURA_SLOW_MS = 250;
/** Steam puffs of the aura (3-5 per brief) and how long one takes to rise (ms). */
export const STEAM_COUNT = 4;
export const STEAM_RISE_MS = 1600;
export const STEAM_RISE_PX = 12;
/** Attack frames (4 wind-up, 5 strike/throw/heart) stay this long (ms). */
export const ATTACK_FRAME_MS = THEME.motionMs['motion.hit'];

/** Side of the pet: opposite the aim. `facingLeft` is the astronaut's mirroring (flipX). */
export function petAnchor(player: Located, facingLeft: boolean, petId: PetId, index = 0): Located {
  const side = facingLeft ? 1 : -1;
  const dx = PET_OFFSET_X + Math.max(0, index) * SECOND_BEE_DX;
  const dy = petId === 'bee' ? BEE_OFFSET_Y - Math.max(0, index) * 4 : PET_OFFSET_Y;
  return { x: player.x + side * dx, y: player.y + dy };
}

/** Moves `from` towards `to` at `speedPxPerSec`; arrives exactly, never overshoots. */
export function stepTowards(
  from: Located,
  to: Located,
  speedPxPerSec: number,
  dtMs: number,
): Located {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const dist = Math.hypot(dx, dy);
  const step = Math.max(0, speedPxPerSec) * (Math.max(0, dtMs) / 1000);
  if (!(dist > step) || !Number.isFinite(dist)) return { x: to.x, y: to.y };
  return { x: from.x + (dx / dist) * step, y: from.y + (dy / dist) * step };
}

/** Egg frame for the bar fraction; no wobble with reduced motion (the cracks stay). */
export function eggFrame(fraction: number, elapsedMs: number, reducedMotion: boolean): number {
  const f = Number.isFinite(fraction) ? fraction : 0;
  if (f >= 1) return EGG_FRAME_CRACKS;
  if (f < EGG_WOBBLE_FROM || reducedMotion) return 0;
  const t = Number.isFinite(elapsedMs) && elapsedMs > 0 ? elapsedMs : 0;
  return 1 + (Math.floor(t / EGG_WOBBLE_FRAME_MS) % 2);
}

export type HatchStage = 'egg' | 'crack' | 'burst' | 'pet';

/**
 * Hatching on play time: egg -> cracks (CRACK_MS) -> shell bursts (pet-hatch, motion.hatch) -> pet.
 * With reduced motion the pet appears at once (the HUD bar still shows the hatch).
 */
export class HatchSequence {
  private stageNow: HatchStage = 'egg';
  private msLeft = 0;

  get stage(): HatchStage {
    return this.stageNow;
  }

  /** The bar was full for the first time. Does nothing once started. */
  start(reducedMotion: boolean): void {
    if (this.stageNow !== 'egg') return;
    if (reducedMotion) {
      this.stageNow = 'pet';
      return;
    }
    this.stageNow = 'crack';
    this.msLeft = CRACK_MS;
  }

  /** Advances; returns the stage after the step. */
  tick(dtMs: number): HatchStage {
    if (this.stageNow !== 'crack' && this.stageNow !== 'burst') return this.stageNow;
    this.msLeft -= Number.isFinite(dtMs) && dtMs > 0 ? dtMs : 0;
    while (this.msLeft <= 0 && (this.stageNow === 'crack' || this.stageNow === 'burst')) {
      if (this.stageNow === 'crack') {
        this.stageNow = 'burst';
        this.msLeft += HATCH_MS;
      } else {
        this.stageNow = 'pet';
      }
    }
    return this.stageNow;
  }
}

/** Repeating action timer (stings, snowballs): fires once per cooldown while there is a target. */
export class ActionTimer {
  private waitMs = 0;

  /** True if the action happens now; without a target the timer waits ready. */
  tick(dtMs: number, cooldownMs: number, hasTarget: boolean): boolean {
    const dt = Number.isFinite(dtMs) && dtMs > 0 ? dtMs : 0;
    this.waitMs = Math.max(0, this.waitMs - dt);
    if (!hasTarget || this.waitMs > 0 || !(cooldownMs > 0)) return false;
    this.waitMs = cooldownMs;
    return true;
  }

  get ready(): boolean {
    return this.waitMs <= 0;
  }

  /** Starts the cooldown without acting (used by the bee after its sting). */
  restart(cooldownMs: number): void {
    this.waitMs = Math.max(0, Number.isFinite(cooldownMs) ? cooldownMs : 0);
  }
}

export interface BeeStep<T> {
  x: number;
  y: number;
  /** Enemy the bee flies at (null: back home). */
  target: T | null;
  /** Enemy stung in this step. */
  stung: T | null;
}

/**
 * One bee: flies to the nearest enemy, stings when close and the cooldown is over, then picks the next one.
 * Without enemies it flies back to its place beside the astronaut. `avoid` keeps two bees apart when there
 * is more than one enemy.
 */
export class BeeMind<T extends Located> {
  x: number;
  y: number;
  private target: T | null = null;
  private readonly timer = new ActionTimer();

  constructor(start: Located) {
    this.x = start.x;
    this.y = start.y;
  }

  get currentTarget(): T | null {
    return this.target;
  }

  step(
    dtMs: number,
    home: Located,
    enemies: readonly T[],
    speedPxPerSec: number,
    cooldownMs: number,
    avoid: T | null = null,
  ): BeeStep<T> {
    if (this.target && !enemies.includes(this.target)) this.target = null;
    if (!this.target) this.target = this.pick(enemies, avoid);
    const goal = this.target ?? home;
    const next = stepTowards(this, goal, speedPxPerSec, dtMs);
    this.x = next.x;
    this.y = next.y;
    let stung: T | null = null;
    const near =
      this.target !== null && Math.hypot(goal.x - this.x, goal.y - this.y) <= STING_REACH;
    if (this.timer.tick(dtMs, cooldownMs, near)) {
      stung = this.target;
      // After a sting the bee looks for the nearest enemy again (spreads its stings).
      this.target = null;
    }
    return { x: this.x, y: this.y, target: this.target ?? stung, stung };
  }

  private pick(enemies: readonly T[], avoid: T | null): T | null {
    let best: T | null = null;
    let bestD = Infinity;
    for (const e of enemies) {
      if (e === avoid && enemies.length > 1) continue;
      const d = (e.x - this.x) ** 2 + (e.y - this.y) ** 2;
      if (d < bestD) {
        bestD = d;
        best = e;
      }
    }
    return best;
  }
}

export interface SnowballState {
  x: number;
  y: number;
  /** Last known target point (the ball keeps flying there if the target dies). */
  tx: number;
  ty: number;
  ageMs: number;
}

/**
 * Snowball step: homes on the target while it lives, else flies to the last point. Returns the enemy hit
 * (first one within the hit radius plus its body radius), 'gone' when it ran out, or null while flying.
 */
export function stepSnowball<T extends Located>(
  ball: SnowballState,
  target: T | null,
  enemies: readonly T[],
  dtMs: number,
  hitRadius: number,
  radiusOf: (e: T) => number,
): T | 'gone' | null {
  if (target) {
    ball.tx = target.x;
    ball.ty = target.y;
  }
  const next = stepTowards(ball, { x: ball.tx, y: ball.ty }, SNOWBALL_SPEED, dtMs);
  ball.x = next.x;
  ball.y = next.y;
  ball.ageMs += Math.max(0, Number.isFinite(dtMs) ? dtMs : 0);
  for (const e of enemies) {
    const r = hitRadius + Math.max(0, radiusOf(e) || 0);
    if ((e.x - ball.x) ** 2 + (e.y - ball.y) ** 2 <= r * r) return e;
  }
  if (ball.ageMs >= SNOWBALL_MAX_MS) return 'gone';
  if (ball.x === ball.tx && ball.y === ball.ty && !target) return 'gone';
  return null;
}

/**
 * Steam puffs of the capybara aura: evenly spread on the ring, each rising STEAM_RISE_PX over STEAM_RISE_MS
 * and starting over. Alpha fades in the last third. With reduced motion they stand still.
 */
export function steamPuffs(
  count: number,
  radius: number,
  elapsedMs: number,
  reducedMotion: boolean,
): { dx: number; dy: number; alphaFactor: number }[] {
  const n = Math.max(0, Math.floor(Number.isFinite(count) ? count : 0));
  const t = Number.isFinite(elapsedMs) && elapsedMs > 0 ? elapsedMs : 0;
  return Array.from({ length: n }, (_, i) => {
    // Upper half of the ring, so the puffs rise in front of the aura.
    const angle = Math.PI + ((i + 0.5) / n) * Math.PI;
    const phase = reducedMotion
      ? 0
      : ((t + (i * STEAM_RISE_MS) / n) % STEAM_RISE_MS) / STEAM_RISE_MS;
    const fade = phase < 2 / 3 ? 1 : 1 - (phase - 2 / 3) * 3;
    return {
      dx: Math.round(Math.cos(angle) * radius),
      dy: Math.round(Math.sin(angle) * radius * 0.6 - phase * STEAM_RISE_PX),
      alphaFactor: Math.max(0, fade),
    };
  });
}

/** Dotted ring of the aura: 1 px dots, 2 on and 2 off along the circumference. Integer offsets. */
export function dottedRing(radius: number): { dx: number; dy: number }[] {
  if (!(radius > 0) || !Number.isFinite(radius)) return [];
  const steps = Math.max(8, Math.round(2 * Math.PI * radius));
  const out: { dx: number; dy: number }[] = [];
  for (let i = 0; i < steps; i++) {
    if (i % 4 >= 2) continue;
    const a = (i / steps) * Math.PI * 2;
    out.push({ dx: Math.round(Math.cos(a) * radius), dy: Math.round(Math.sin(a) * radius) });
  }
  return out;
}

/** Event payload of pet-changed from the round state (drops the internal `expected`). */
export function petChangedPayload(
  petId: PetId,
  s: { phase: 'egg' | 'hatched'; xp: number; xpToNext: number; powerUps: number },
): { petId: PetId; phase: 'egg' | 'hatched'; xp: number; xpToNext: number; powerUps: number } {
  return { petId, phase: s.phase, xp: s.xp, xpToNext: s.xpToNext, powerUps: s.powerUps };
}

/** Pet armour texture of the save for this pet, or null if it does not belong to the pet. */
export function petGearKeyFor(petId: PetId, gearId: string | null | undefined): string | null {
  if (typeof gearId !== 'string') return null;
  return gearId.startsWith(`petgear-${petId}-`) ? gearId : null;
}

import type Phaser from 'phaser';
import { BOSS_TUNING, MIN_REACTION_MS } from '../../config/bosses';
import type { BossAttackDef } from '../../contracts';
import { prefersReducedMotion } from '../../platform/motion';
import { BossBase, type BossContext } from './BossBase';
import {
  bandAlphas,
  edgePoint,
  ellipseAngle,
  ellipsePoint,
  fadeLevel,
  reappearAngle,
  spiralAngles,
  spiralBaseAngle,
  volleySpeed,
  type Point,
} from './bossGeometry';
import type { BossHazard } from './hazards';
import { PharaohOrb } from './PharaohOrb';
import { HIDDEN_ALPHA, stormStyle } from './pharaohStyle';
import { rimRadii } from './rim';
import { Telegraph } from './Telegraph';

const T = BOSS_TUNING.pharaoh;
const CURSE = T.goldCurse;
const SARCO = T.sarcophagus;
const STORM = T.sandstorm;
const FULL_TURN = Math.PI * 2;
/** Storm darkening sits right above the map (depth -100) and below enemies, warnings, orbs and the player. */
const STORM_DEPTH = -50;
/** Orbs further than this outside the arena are removed (they can no longer reach the player). */
const OUT_MARGIN = 32;

interface Curse {
  elapsedMs: number;
  emitted: number;
  base: number;
  spin: number;
  speed: number;
  damage: number;
}

interface Hidden {
  angle: number;
  /** Safety time left until the pharaoh reappears on its own (the attack normally ends it earlier). */
  leftMs: number;
}

interface StormShot {
  angle: number;
  start: Point;
  leftMs: number;
}

interface Storm {
  /** announce: the edge darkens. on: shots come in. fade: the edge clears up again. */
  phase: 'announce' | 'on' | 'fade';
  elapsedMs: number;
  fadeMs: number;
  started: number;
  damage: number;
  pending: StormShot[];
}

/**
 * Boss "Pharao" (oasis 31-40, AP-104, PE-128): floats slowly on a path around the player. Attacks (all
 * announced at least MIN_TELEGRAPH_MS, every orb needs at least MIN_REACTION_MS to the player, PE-75):
 * - goldCurse: warning lines along the arms, then a slowly turning spiral of golden scarab orbs
 *   (`boss-pharaoh-orb`) with gaps between the arms. Orbs are shootable.
 * - sarcophagus: the pharaoh fades to OPACITY.ghost and is invulnerable (boss bar IMMUN), a ring announces
 *   where it reappears; there it is visible and vulnerable again.
 * - sandstorm (extra attack): the edge darkens with the ground token of the map in the strength of the map
 *   vignette (no flicker; with prefers-reduced-motion without fading). Single orbs come in from the edge,
 *   each announced by its own warning line.
 * Orbs reach the scene through getHazards() (PE-134).
 */
export class Pharaoh extends BossBase {
  private orbs: PharaohOrb[] | undefined;
  private telegraphs: Telegraph[] | undefined;
  private stormFx: Phaser.GameObjects.Graphics | undefined;
  private radii: { rx: number; ry: number } = { rx: 0, ry: 0 };
  private orbitAngle = 0;
  private holding = false;
  /** Spiral chosen during the announcement (warning lines), fired by onAttack. */
  private pendingCurse: { base: number; spin: number } | null = null;
  private curse: Curse | null = null;
  private hidden: Hidden | null = null;
  private storm: Storm | null = null;
  private readonly random: () => number;
  private readonly reduced: boolean;

  constructor(scene: Phaser.Scene, levelId: number, ctx: BossContext = {}) {
    super(scene, 'pharaoh', levelId, ctx);
    const rng = ctx.rng;
    this.random = rng ? () => rng.next() : Math.random;
    this.reduced = prefersReducedMotion();
    this.radii = rimRadii(T.orbit, this.arena);
    this.orbs = [];
    this.telegraphs = [];
    this.stormFx = this.buildStormFx(levelId);
  }

  /** true while the pharaoh is gone in the sarcophagus (test and HUD helper). */
  get isHidden(): boolean {
    return this.hidden !== null;
  }

  /** Strength 0..1 of the storm edge darkening (test helper). */
  get stormLevel(): number {
    return this.storm ? this.levelOf(this.storm) : 0;
  }

  override despawn(): void {
    super.despawn();
    // Also called by the base constructor before our fields exist, hence the guards.
    for (const t of this.telegraphs ?? []) t.cancel();
    if (this.telegraphs) this.telegraphs.length = 0;
    for (const o of this.orbs ?? []) o.kill();
    this.stormFx?.setVisible(false);
    this.resetState();
  }

  /** Gold orbs for the generic hit path of the scene (PE-134). */
  override getHazards(): readonly BossHazard[] {
    const out: BossHazard[] = [];
    for (const o of this.orbs ?? []) if (o.active) out.push(o.hazard());
    return out;
  }

  protected override onSpawn(): void {
    this.resetState();
    this.setVelocity(0, 0);
    this.setImmovable(true);
    this.setDisplaySize(T.size, T.size);
    this.orbitAngle = ellipseAngle(this.center, this.radii, this);
  }

  protected override behave(delta: number): void {
    if (!this.orbs) return;
    if (!this.holding && !this.hidden && !this.curse) {
      this.orbitAngle += (T.orbitSpeedRadPerSec * delta) / 1000;
      this.moveToAngle(this.orbitAngle);
    }
    this.updateCurse(delta);
    this.updateHidden(delta);
    this.updateStorm(delta);
    this.updateOrbs(delta);
  }

  protected override onTelegraph(attack: BossAttackDef): void {
    const ms = attack.telegraphMs;
    if (attack.id === 'goldCurse') {
      this.holding = true;
      const spin = (this.random() < 0.5 ? -1 : 1) * CURSE.spinRadPerSec;
      const base = spiralBaseAngle(this.angleToPlayer(), spin, CURSE.burstMs);
      this.curse = null;
      this.pendingCurse = { base, spin };
      for (const a of spiralAngles(CURSE.arms, base, spin, 0)) {
        const from = this.offsetPoint(a, CURSE.spawnOffset);
        const to = this.offsetPoint(a, CURSE.spawnOffset + CURSE.warnLength);
        this.track(Telegraph.line(this.scene, from.x, from.y, to.x, to.y, CURSE.warnLineWidth, ms));
      }
    } else if (attack.id === 'sarcophagus') {
      const angle = reappearAngle(this.orbitAngle, this.random());
      this.hidden = { angle, leftMs: ms + SARCO.maxHiddenExtraMs };
      this.invulnerable = true;
      this.setAlpha(HIDDEN_ALPHA);
      const p = ellipsePoint(this.center, this.radii, angle);
      this.track(Telegraph.ring(this.scene, p.x, p.y, SARCO.warnRadius, SARCO.warnThickness, ms));
    } else if (attack.id === 'sandstorm') {
      this.storm = {
        phase: 'announce',
        elapsedMs: 0,
        fadeMs: ms,
        started: 0,
        damage: 0,
        pending: [],
      };
    }
  }

  protected override onAttack(attackId: string, damage: number): void {
    if (attackId === 'goldCurse') {
      const pending = this.pendingCurse;
      this.pendingCurse = null;
      if (!pending) return;
      const dist = Math.hypot(this.center.x - this.x, this.center.y - this.y);
      this.curse = {
        elapsedMs: 0,
        emitted: 0,
        base: pending.base,
        spin: pending.spin,
        speed: volleySpeed(
          dist - CURSE.spawnOffset,
          CURSE.speedPxPerSec,
          CURSE.minSpeedPxPerSec,
          this.reach(),
          MIN_REACTION_MS,
        ),
        damage,
      };
      this.holding = false;
      this.emitCurse();
    } else if (attackId === 'sarcophagus') {
      this.reappear();
    } else if (attackId === 'sandstorm') {
      const storm = this.storm;
      if (!storm) return;
      storm.phase = 'on';
      storm.elapsedMs = 0;
      storm.damage = damage;
      this.startStormShots(storm);
    }
  }

  // --- goldCurse ---

  private updateCurse(dt: number): void {
    const curse = this.curse;
    if (!curse) return;
    curse.elapsedMs += dt;
    this.emitCurse();
    if (curse.elapsedMs >= CURSE.burstMs) this.curse = null;
  }

  /** Emits every wave of the spiral that is due (one orb per arm). */
  private emitCurse(): void {
    const curse = this.curse;
    if (!curse) return;
    const waves = Math.ceil(CURSE.burstMs / CURSE.emitEveryMs);
    while (curse.emitted < waves && curse.emitted * CURSE.emitEveryMs <= curse.elapsedMs) {
      const t = curse.emitted * CURSE.emitEveryMs;
      for (const a of spiralAngles(CURSE.arms, curse.base, curse.spin, t)) {
        const p = this.offsetPoint(a, CURSE.spawnOffset);
        this.fireOrb(p, a, curse.speed, curse.damage);
      }
      curse.emitted += 1;
    }
  }

  // --- sarcophagus ---

  private updateHidden(dt: number): void {
    const hidden = this.hidden;
    if (!hidden) return;
    hidden.leftMs -= dt;
    if (hidden.leftMs <= 0) this.reappear();
  }

  private reappear(): void {
    const hidden = this.hidden;
    if (!hidden) return;
    this.hidden = null;
    this.orbitAngle = hidden.angle;
    this.moveToAngle(hidden.angle);
    this.setAlpha(1);
    this.invulnerable = false;
  }

  // --- sandstorm ---

  private startStormShots(storm: Storm): void {
    while (storm.started < STORM.shots && storm.started * STORM.shotEveryMs <= storm.elapsedMs) {
      const angle = this.random() * FULL_TURN;
      const start = edgePoint(this.center, angle, this.arena);
      const end = this.towardCenter(start, this.reach());
      this.track(
        Telegraph.line(
          this.scene,
          start.x,
          start.y,
          end.x,
          end.y,
          STORM.warnLineWidth,
          STORM.shotWarnMs,
        ),
      );
      storm.pending.push({ angle, start, leftMs: STORM.shotWarnMs });
      storm.started += 1;
    }
  }

  private updateStorm(dt: number): void {
    const storm = this.storm;
    if (!storm) return;
    storm.elapsedMs += dt;
    if (storm.phase === 'on') {
      this.startStormShots(storm);
      for (let i = storm.pending.length - 1; i >= 0; i--) {
        const shot = storm.pending[i];
        shot.leftMs -= dt;
        if (shot.leftMs > 0) continue;
        storm.pending.splice(i, 1);
        const dist = Math.hypot(this.center.x - shot.start.x, this.center.y - shot.start.y);
        const speed = volleySpeed(
          dist,
          STORM.speedPxPerSec,
          STORM.minSpeedPxPerSec,
          this.reach(),
          MIN_REACTION_MS,
        );
        const dir = Math.atan2(this.center.y - shot.start.y, this.center.x - shot.start.x);
        this.fireOrb(shot.start, dir, speed, storm.damage);
      }
      const done = storm.started >= STORM.shots && storm.pending.length === 0;
      if (done && storm.elapsedMs >= STORM.durationMs) {
        storm.phase = 'fade';
        storm.elapsedMs = 0;
        storm.fadeMs = STORM.fadeOutMs;
      }
    } else if (storm.phase === 'fade' && this.levelOf(storm) <= 0) {
      this.storm = null;
    }
    this.drawStorm();
  }

  private levelOf(storm: Storm): number {
    if (storm.phase === 'on') return 1;
    const f = fadeLevel(storm.elapsedMs, storm.fadeMs, this.reduced);
    return storm.phase === 'announce' ? f : 1 - f;
  }

  /** Bands of the ground token from the arena edge inwards, drawn once; the storm only sets the alpha. */
  private buildStormFx(levelId: number): Phaser.GameObjects.Graphics {
    const g = this.scene.add.graphics().setDepth(STORM_DEPTH).setVisible(false);
    const { color, strength } = stormStyle(levelId);
    const { width, height } = this.arena;
    bandAlphas(STORM.bands, strength).forEach((alpha, i) => {
      const inset = i * STORM.bandWidth;
      const w = STORM.bandWidth;
      g.fillStyle(color, alpha);
      g.fillRect(inset, inset, width - 2 * inset, w);
      g.fillRect(inset, height - inset - w, width - 2 * inset, w);
      g.fillRect(inset, inset + w, w, height - 2 * inset - 2 * w);
      g.fillRect(width - inset - w, inset + w, w, height - 2 * inset - 2 * w);
    });
    return g;
  }

  private drawStorm(): void {
    const g = this.stormFx;
    if (!g) return;
    const level = this.stormLevel;
    g.setVisible(level > 0).setAlpha(level);
  }

  // --- orbs ---

  private fireOrb(from: Point, angle: number, speed: number, damage: number): void {
    const orbs = this.orbs;
    if (!orbs) return;
    let orb = orbs.find((o) => !o.active);
    if (!orb) {
      if (orbs.length >= T.maxOrbs) return;
      orb = new PharaohOrb(this.scene, T.orbRadius, this.reduced);
      orbs.push(orb);
    }
    orb.fire(from.x, from.y, angle, speed, damage, T.orbLifeMs);
  }

  private updateOrbs(dt: number): void {
    const { width, height } = this.arena;
    for (const o of this.orbs ?? []) {
      if (!o.tick(dt)) continue;
      const out =
        o.x < -OUT_MARGIN ||
        o.y < -OUT_MARGIN ||
        o.x > width + OUT_MARGIN ||
        o.y > height + OUT_MARGIN;
      if (out) o.kill();
    }
  }

  // --- helpers ---

  /** Reach of an orb to the player: player hit radius plus orb radius (fairness, PE-75). */
  private reach(): number {
    return BOSS_TUNING.playerHitRadius + T.orbRadius;
  }

  private angleToPlayer(): number {
    return Math.atan2(this.center.y - this.y, this.center.x - this.x);
  }

  private offsetPoint(angle: number, dist: number): Point {
    return { x: this.x + Math.cos(angle) * dist, y: this.y + Math.sin(angle) * dist };
  }

  /** Point on the way from `p` to the centre that stops `stop` before it. */
  private towardCenter(p: Point, stop: number): Point {
    const dx = this.center.x - p.x;
    const dy = this.center.y - p.y;
    const d = Math.hypot(dx, dy);
    const k = d > stop ? (d - stop) / d : 0;
    return { x: p.x + dx * k, y: p.y + dy * k };
  }

  private moveToAngle(angle: number): void {
    const p = ellipsePoint(this.center, this.radii, angle);
    this.setPosition(p.x, p.y);
  }

  private resetState(): void {
    this.holding = false;
    this.curse = null;
    this.pendingCurse = null;
    this.hidden = null;
    this.storm = null;
    this.invulnerable = false;
    this.setAlpha(1);
  }

  /** Keeps a telegraph so despawn() can cancel it; finished ones are dropped. */
  private track(t: Telegraph): void {
    const list = this.telegraphs;
    if (!list) return;
    for (let i = list.length - 1; i >= 0; i--) if (!list[i].scene) list.splice(i, 1);
    list.push(t);
  }
}

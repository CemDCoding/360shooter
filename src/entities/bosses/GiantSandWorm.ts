import Phaser from 'phaser';
import { BOSS_TUNING, MIN_REACTION_MS } from '../../config/bosses';
import type { BossAttackDef } from '../../contracts';
import { NO_TINT } from '../../logic/boss';
import { prefersReducedMotion } from '../../platform/motion';
import { BossBase, type BossContext } from './BossBase';
import {
  coilAngles,
  coilRadius,
  ellipseAngle,
  ellipsePoint,
  emergePoint,
  followChain,
  sproutDamage,
  stepToward,
  straightChain,
  volleySpeed,
  weakenedShare,
  type Point,
} from './bossGeometry';
import type { BossHazard } from './hazards';
import { rimRadii } from './rim';
import { Telegraph } from './Telegraph';
import { WormSpike } from './WormSpike';
import { OUTLINE_COLOR, SAND_COLOR, SPARK_COLOR } from './wormStyle';

const T = BOSS_TUNING.giantSandWorm;
const BODY_KEY = 'boss-sand-worm-body';
/** Brief: frames 0 and 1 are links with wiggling spikes, frame 2 is the tail tip (last link). */
const TAIL_FRAME = 2;
const FAN_SPREAD = Phaser.Math.DegToRad(T.volley.spreadDeg);
const FULL_TURN = Math.PI * 2;
const TRAIL_DEPTH = 1.5;
const SPARK_DEPTH = 3;
const MAX_SPARKS = 8;
/** Length of the spike warning lines relative to the distance to the player. */
const WARN_LINE_FACTOR = 1.2;

interface Dive {
  from: Point;
  to: Point;
  totalMs: number;
  elapsedMs: number;
  /** Laser hits left on the sand mound; every hit weakens the break-out. */
  hitsLeft: number;
}

interface Eruption {
  x: number;
  y: number;
  leftMs: number;
  damage: number;
  used: boolean;
}

interface Coil {
  gapStart: number;
  phase: 'form' | 'squeeze' | 'hold';
  elapsedMs: number;
  holdLeftMs: number;
  /** Head hits during the coil; every hit weakens it, breakHits break it up. */
  headHits: number;
  damage: number;
  /** Each link hurts the player at most once per coil. */
  hit: boolean[];
}

/**
 * Boss "Riesen-Sand-Wurm" (desert 21-25, AP-100, PE-128). A head (`boss-sand-worm`) with a chain of body links
 * (`boss-sand-worm-body`, about 22 px apart, the last one shows the tail tip) roams on a path around the player.
 * Attacks (all announced at least MIN_TELEGRAPH_MS, all with counterplay, PE-75):
 * - burrow: dives (invulnerable, head hidden, boss bar IMMUN), a sand trail of horizontal strokes wanders to a
 *   point beside the player that is announced with a warning circle. Lasers on the sand mound weaken the
 *   break-out; it hurts once and only inside the announced circle.
 * - spikeVolley: warning lines, then a fan of skin spikes (shootable, at least MIN_REACTION_MS of flight).
 * - coil (extra attack): the links form a ring with a visible gap around the player and squeeze. Only the head
 *   is vulnerable; head hits weaken the coil and break it up. Lasers bounce off links with a spark (no flash).
 * The scene reaches spikes, mound, break-out and links through getHazards() (PE-134).
 */
export class GiantSandWorm extends BossBase {
  private links: Phaser.GameObjects.Sprite[] | undefined;
  private linkPos: Point[] = [];
  private spikes: WormSpike[] | undefined;
  private telegraphs: Telegraph[] | undefined;
  private sparks: { g: Phaser.GameObjects.Graphics; leftMs: number }[] | undefined;
  private trail: Phaser.GameObjects.Graphics | undefined;
  private radii: { rx: number; ry: number } = { rx: 0, ry: 0 };
  private orbitAngle = 0;
  private holding = false;
  private returning = false;
  private surfacedLeftMs = 0;
  private dive: Dive | null = null;
  private eruption: Eruption | null = null;
  private coil: Coil | null = null;
  private wiggleMs = 0;
  private wiggleFrame = 0;
  private hasTailFrame = false;
  private readonly random: () => number;
  private readonly reduced: boolean;

  constructor(scene: Phaser.Scene, levelId: number, ctx: BossContext = {}) {
    super(scene, 'giantSandWorm', levelId, ctx);
    const rng = ctx.rng;
    this.random = rng ? () => rng.next() : Math.random;
    this.reduced = prefersReducedMotion();
    this.radii = rimRadii(T.orbit, this.arena);
    this.hasTailFrame = scene.textures.get(BODY_KEY).has(String(TAIL_FRAME));
    this.spikes = [];
    this.telegraphs = [];
    this.sparks = [];
    this.trail = scene.add.graphics().setDepth(TRAIL_DEPTH);
    this.links = [];
    for (let i = 0; i < T.segmentCount; i++) {
      const link = scene.add
        .sprite(-200, -200, BODY_KEY, this.linkFrame(i, 0))
        .setDisplaySize(T.segmentSize, T.segmentSize)
        .setDepth(this.depth - 0.1)
        .setVisible(false);
      if (this.variant.tint !== NO_TINT) link.setTint(this.variant.tint);
      this.links.push(link);
    }
  }

  /** true while the coil squeezes (test and HUD helper). */
  get isCoiling(): boolean {
    return this.coil !== null;
  }

  override despawn(): void {
    super.despawn();
    // Also called by the base constructor before our fields exist, hence the guards.
    for (const t of this.telegraphs ?? []) t.cancel();
    if (this.telegraphs) this.telegraphs.length = 0;
    for (const s of this.spikes ?? []) s.kill();
    for (const s of this.sparks ?? []) s.g.destroy();
    if (this.sparks) this.sparks.length = 0;
    this.trail?.clear();
    for (const l of this.links ?? []) l.setVisible(false);
    this.resetState();
  }

  /** Spikes, sand mound, break-out and body links for the generic hit path of the scene (PE-134). */
  override getHazards(): readonly BossHazard[] {
    const out: BossHazard[] = [];
    for (const s of this.spikes ?? []) if (s.active) out.push(s.hazard());
    const mound = this.moundHazard();
    if (mound) out.push(mound);
    const erupt = this.eruptionHazard();
    if (erupt) out.push(erupt);
    if (this.linksVisible()) this.linkPos.forEach((p, i) => out.push(this.linkHazard(p, i)));
    return out;
  }

  /** Head hits during the coil weaken it; enough hits break it up (counterplay, PE-75). */
  override takeDamage(amount: number): boolean {
    const counts = this.active && !this.invulnerable && amount > 0 && this.coil !== null;
    const killed = super.takeDamage(amount);
    const coil = this.coil;
    if (!killed && counts && coil) {
      coil.headHits += 1;
      if (coil.headHits >= T.coil.breakHits) this.endCoil();
    }
    return killed;
  }

  protected override onSpawn(): void {
    this.resetState();
    this.setVelocity(0, 0);
    this.setImmovable(true);
    const head = { x: this.x, y: this.y };
    this.orbitAngle = ellipseAngle(this.center, this.radii, head);
    const outward = Math.atan2(head.y - this.center.y, head.x - this.center.x);
    this.linkPos = straightChain(head, outward, T.segmentCount, T.segmentSpacing);
    this.placeLinks();
  }

  protected override behave(delta: number): void {
    if (!this.links) return;
    this.moveHead(delta);
    this.updateEruption(delta);
    this.updateCoil(delta);
    this.updateLinks(delta);
    for (const s of this.spikes ?? []) s.tick(delta);
    this.tickSparks(delta);
  }

  protected override onTelegraph(attack: BossAttackDef): void {
    const ms = attack.telegraphMs;
    if (attack.id === 'burrow') {
      this.startDive(ms);
    } else if (attack.id === 'spikeVolley') {
      this.holding = true;
      const base = this.angleToCenter();
      const len = this.distanceToCenter() * WARN_LINE_FACTOR;
      for (let i = 0; i < T.volley.count; i++) {
        const a = base + this.fanOffset(i);
        this.track(
          Telegraph.line(
            this.scene,
            this.x,
            this.y,
            this.x + Math.cos(a) * len,
            this.y + Math.sin(a) * len,
            T.volley.warnLineWidth,
            ms,
          ),
        );
      }
    } else if (attack.id === 'coil') {
      const gapStart = this.random() * FULL_TURN;
      this.coil = {
        gapStart,
        phase: 'form',
        elapsedMs: 0,
        holdLeftMs: 0,
        headHits: 0,
        damage: this.attackDamage('coil'),
        hit: new Array<boolean>(T.segmentCount).fill(false),
      };
      this.surfacedLeftMs = 0;
      this.returning = false;
      this.track(
        Telegraph.ring(
          this.scene,
          this.center.x,
          this.center.y,
          T.coil.radius,
          T.coil.thickness,
          ms,
          undefined,
          { start: gapStart, size: T.coil.gapRad },
        ),
      );
    }
  }

  protected override onAttack(attackId: string, damage: number): void {
    if (attackId === 'burrow') {
      this.breakOut(damage);
    } else if (attackId === 'spikeVolley') {
      const base = this.angleToCenter();
      const speed = volleySpeed(
        this.distanceToCenter(),
        T.volley.speedPxPerSec,
        T.volley.minSpeedPxPerSec,
        BOSS_TUNING.playerHitRadius + T.volley.spikeRadius,
        MIN_REACTION_MS,
      );
      for (let i = 0; i < T.volley.count; i++) {
        this.takeSpike().fire(
          this.x,
          this.y,
          base + this.fanOffset(i),
          speed,
          damage,
          T.volley.lifeMs,
        );
      }
      this.holding = false;
    } else if (attackId === 'coil') {
      const coil = this.coil;
      if (!coil) return; // broken up during the announcement
      coil.damage = damage;
      coil.phase = 'squeeze';
      coil.elapsedMs = 0;
      const slots = this.coilSlots(T.coil.radius);
      this.linkPos = slots.links;
      if (!this.dive) this.setPosition(slots.head.x, slots.head.y);
    }
  }

  // --- movement ---

  private moveHead(dt: number): void {
    const dive = this.dive;
    if (dive) {
      dive.elapsedMs += dt;
      this.drawTrail(dive);
      return;
    }
    if (this.holding) return;
    if (this.coil) {
      const target = this.coilSlots(T.coil.radius).head;
      if (this.coil.phase === 'form') {
        const p = stepToward(this, target, T.coil.formSpeedPxPerSec, dt);
        this.setPosition(p.x, p.y);
      } else {
        this.setPosition(target.x, target.y);
      }
      return;
    }
    if (this.surfacedLeftMs > 0) {
      this.surfacedLeftMs -= dt;
      if (this.surfacedLeftMs <= 0) this.startReturn();
      return;
    }
    if (this.returning) {
      const target = ellipsePoint(this.center, this.radii, this.orbitAngle);
      const p = stepToward(this, target, T.returnSpeed, dt);
      this.setPosition(p.x, p.y);
      if (p.arrived) this.returning = false;
      return;
    }
    this.orbitAngle += (T.orbitSpeedRadPerSec * dt) / 1000;
    const p = ellipsePoint(this.center, this.radii, this.orbitAngle);
    this.setPosition(p.x, p.y);
  }

  private startReturn(): void {
    this.surfacedLeftMs = 0;
    this.returning = true;
    this.orbitAngle = ellipseAngle(this.center, this.radii, this);
  }

  private updateLinks(dt: number): void {
    const coil = this.coil;
    if (coil) {
      const r =
        coil.phase === 'form'
          ? T.coil.radius
          : coilRadius(T.coil.radius, T.coil.speedPxPerSec, coil.elapsedMs, T.segmentRadius);
      const slots = this.coilSlots(r).links;
      this.linkPos =
        coil.phase === 'form'
          ? this.linkPos.map((p, i) => {
              const s = stepToward(p, slots[i], T.coil.formSpeedPxPerSec, dt);
              return { x: s.x, y: s.y };
            })
          : slots;
    } else if (!this.dive) {
      this.linkPos = followChain(this.linkPos, this, T.segmentSpacing);
    }
    if (!this.reduced) {
      this.wiggleMs += dt;
      if (this.wiggleMs >= T.segmentFrameMs) {
        this.wiggleMs = 0;
        this.wiggleFrame = 1 - this.wiggleFrame;
      }
    }
    this.placeLinks();
  }

  private placeLinks(): void {
    const links = this.links;
    if (!links) return;
    const visible = this.active && this.linksVisible();
    links.forEach((link, i) => {
      const p = this.linkPos[i];
      if (!p) return;
      link.setPosition(p.x, p.y).setVisible(visible);
      link.setFrame(this.linkFrame(i, this.wiggleFrame));
    });
  }

  private linkFrame(i: number, wiggle: number): number {
    if (i === T.segmentCount - 1 && this.hasTailFrame) return TAIL_FRAME;
    return (i + wiggle) % 2;
  }

  /** Links show unless the worm is under the sand; a running coil stays visible. */
  private linksVisible(): boolean {
    return this.coil !== null || this.dive === null;
  }

  // --- burrow ---

  private startDive(telegraphMs: number): void {
    this.holding = false;
    this.returning = false;
    this.surfacedLeftMs = 0;
    const from = { x: this.x, y: this.y };
    const to = emergePoint(this.center, from, T.burrow.emergeDistance);
    this.dive = { from, to, totalMs: telegraphMs, elapsedMs: 0, hitsLeft: T.burrow.moundHits };
    // Under the sand: invulnerable (boss bar IMMUN), head hidden, no body for lasers or contact.
    this.invulnerable = true;
    this.disableBody(false, false);
    this.setVisible(false);
    this.track(Telegraph.circle(this.scene, to.x, to.y, T.burrow.eruptRadius, telegraphMs));
    this.drawTrail(this.dive);
  }

  private breakOut(damage: number): void {
    const dive = this.dive;
    if (!dive) return;
    this.dive = null;
    this.trail?.clear();
    const { to } = dive;
    this.invulnerable = false;
    this.enableBody(true, to.x, to.y, true, true);
    this.eruption = {
      x: to.x,
      y: to.y,
      leftMs: T.burrow.eruptMs,
      damage: sproutDamage(damage, T.burrow.moundHits, dive.hitsLeft),
      used: false,
    };
    const outward = Math.atan2(to.y - this.center.y, to.x - this.center.x);
    if (!this.coil) this.linkPos = straightChain(to, outward, T.segmentCount, T.segmentSpacing);
    this.surfacedLeftMs = T.burrow.surfaceMs;
    this.drawBurst(to);
  }

  private moundPoint(dive: Dive): Point {
    const p = Math.min(1, dive.elapsedMs / Math.max(1, dive.totalMs));
    return {
      x: dive.from.x + (dive.to.x - dive.from.x) * p,
      y: dive.from.y + (dive.to.y - dive.from.y) * p,
    };
  }

  private moundHazard(): BossHazard | null {
    const dive = this.dive;
    if (!dive || dive.hitsLeft <= 0) return null;
    const m = this.moundPoint(dive);
    const isActive = (): boolean => this.dive === dive && dive.hitsLeft > 0;
    return {
      get active() {
        return isActive();
      },
      shape: { kind: 'circle', x: m.x, y: m.y, radius: T.burrow.moundRadius },
      shootable: true,
      laserHit: () => {
        if (!isActive()) return false;
        dive.hitsLeft -= 1;
        this.spark(m.x, m.y);
        return true;
      },
      playerHit: () => 0,
    };
  }

  private updateEruption(dt: number): void {
    const e = this.eruption;
    if (!e) return;
    e.leftMs -= dt;
    if (e.leftMs <= 0) {
      this.eruption = null;
      this.trail?.clear();
    }
  }

  private eruptionHazard(): BossHazard | null {
    const e = this.eruption;
    if (!e || e.used || !(e.damage > 0)) return null;
    const isActive = (): boolean => this.eruption === e && !e.used;
    return {
      get active() {
        return isActive();
      },
      shape: { kind: 'circle', x: e.x, y: e.y, radius: T.burrow.eruptRadius },
      shootable: false,
      laserHit: () => false,
      playerHit: () => {
        if (!isActive()) return 0;
        e.used = true;
        return e.damage;
      },
    };
  }

  // --- coil ---

  private coilSlots(radius: number): { head: Point; links: Point[] } {
    const coil = this.coil;
    const angles = coilAngles(T.segmentCount, coil?.gapStart ?? 0, T.coil.gapRad);
    const at = (a: number, r: number): Point => ({
      x: this.center.x + Math.cos(a) * r,
      y: this.center.y + Math.sin(a) * r,
    });
    return {
      head: at(angles.head, T.coil.radius),
      links: angles.links.map((a) => at(a, radius)),
    };
  }

  private updateCoil(dt: number): void {
    const coil = this.coil;
    if (!coil) return;
    if (coil.phase === 'squeeze') {
      coil.elapsedMs += dt;
      const r = coilRadius(T.coil.radius, T.coil.speedPxPerSec, coil.elapsedMs, T.segmentRadius);
      if (r <= T.segmentRadius) {
        coil.phase = 'hold';
        coil.holdLeftMs = T.coil.holdMs;
      }
    } else if (coil.phase === 'hold') {
      coil.holdLeftMs -= dt;
      if (coil.holdLeftMs <= 0) this.endCoil();
    }
  }

  private endCoil(): void {
    if (!this.coil) return;
    this.coil = null;
    if (!this.dive && this.surfacedLeftMs <= 0) this.startReturn();
  }

  private linkHazard(p: Point, i: number): BossHazard {
    const coil = this.coil;
    return {
      get active() {
        return true;
      },
      shape: { kind: 'circle', x: p.x, y: p.y, radius: T.segmentRadius },
      shootable: true,
      // Links are armour: the laser bounces off with a spark, the boss takes no damage (no flash).
      laserHit: () => {
        this.spark(p.x, p.y);
        return true;
      },
      playerHit: () => {
        if (!coil || this.coil !== coil || coil.phase === 'form' || coil.hit[i]) return 0;
        coil.hit[i] = true;
        return coil.damage * T.coil.damageShare * weakenedShare(coil.headHits, T.coil.breakHits);
      },
    };
  }

  // --- spikes ---

  private takeSpike(): WormSpike {
    const list = this.spikes ?? [];
    const free = list.find((s) => !s.active);
    if (free) return free;
    const spike = new WormSpike(this.scene, T.volley.spikeRadius);
    list.push(spike);
    return spike;
  }

  private fanOffset(i: number): number {
    return (i / (T.volley.count - 1) - 0.5) * FAN_SPREAD;
  }

  private angleToCenter(): number {
    return Math.atan2(this.center.y - this.y, this.center.x - this.x);
  }

  private distanceToCenter(): number {
    return Math.hypot(this.center.x - this.x, this.center.y - this.y);
  }

  // --- drawing (only tokens, shapes not only colour) ---

  /** Sand trail: horizontal strokes from the dive point to the mound, the mound as a hump of strokes. */
  private drawTrail(dive: Dive): void {
    const g = this.trail;
    if (!g) return;
    g.clear();
    const m = this.moundPoint(dive);
    const dx = m.x - dive.from.x;
    const dy = m.y - dive.from.y;
    const len = Math.hypot(dx, dy);
    const steps = Math.floor(len / T.burrow.trailStep);
    for (let k = 0; k <= steps && len > 0; k++) {
      const t = (k * T.burrow.trailStep) / len;
      this.stroke(g, dive.from.x + dx * t, dive.from.y + dy * t + (k % 2 === 0 ? -2 : 2), 5);
    }
    if (dive.hitsLeft > 0) {
      this.stroke(g, m.x, m.y - 4, 6);
      this.stroke(g, m.x, m.y, 10);
      this.stroke(g, m.x, m.y + 4, 14);
    }
  }

  /** Short burst of strokes where the worm breaks out. */
  private drawBurst(p: Point): void {
    const g = this.trail;
    if (!g) return;
    g.clear();
    const r = T.burrow.eruptRadius * 0.5;
    for (let k = 0; k < 8; k++) {
      const a = (k / 8) * FULL_TURN;
      this.stroke(g, p.x + Math.cos(a) * r, p.y + Math.sin(a) * r, 6);
    }
  }

  private stroke(g: Phaser.GameObjects.Graphics, x: number, y: number, w: number): void {
    const left = Math.round(x - w / 2);
    const top = Math.round(y);
    g.fillStyle(OUTLINE_COLOR, 1);
    g.fillRect(left, top + 1, w, 1);
    g.fillStyle(SAND_COLOR, 1);
    g.fillRect(left, top, w, 1);
  }

  /** Visible spark of a bounced laser (cross with outline), no flash of the boss. */
  private spark(x: number, y: number): void {
    const sparks = this.sparks;
    if (!sparks) return;
    if (sparks.length >= MAX_SPARKS) sparks.shift()?.g.destroy();
    const g = this.scene.add.graphics().setDepth(SPARK_DEPTH).setPosition(x, y);
    for (const [w, color] of [
      [3, OUTLINE_COLOR],
      [1, SPARK_COLOR],
    ] as const) {
      g.lineStyle(w, color, 1);
      g.lineBetween(-4, -4, 4, 4);
      g.lineBetween(-4, 4, 4, -4);
    }
    sparks.push({ g, leftMs: T.sparkMs });
  }

  private tickSparks(dt: number): void {
    const sparks = this.sparks;
    if (!sparks) return;
    for (let i = sparks.length - 1; i >= 0; i--) {
      sparks[i].leftMs -= dt;
      if (sparks[i].leftMs <= 0) {
        sparks[i].g.destroy();
        sparks.splice(i, 1);
      }
    }
  }

  private resetState(): void {
    this.holding = false;
    this.returning = false;
    this.surfacedLeftMs = 0;
    this.dive = null;
    this.eruption = null;
    this.coil = null;
    this.invulnerable = false;
    this.wiggleMs = 0;
  }

  /** Keeps a telegraph so despawn() can cancel it; finished ones are dropped. */
  private track(t: Telegraph): void {
    const list = this.telegraphs;
    if (!list) return;
    for (let i = list.length - 1; i >= 0; i--) if (!list[i].scene) list.splice(i, 1);
    list.push(t);
  }
}

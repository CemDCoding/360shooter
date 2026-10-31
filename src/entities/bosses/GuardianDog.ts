import Phaser from 'phaser';
import { spawnRadiusFor } from '../../config/arena';
import { BOSS_TUNING, MIN_REACTION_MS } from '../../config/bosses';
import type { BossAttackDef, EnemyId } from '../../contracts';
import { BossBase, type BossContext } from './BossBase';
import {
  edgePoint,
  ellipseAngle,
  ellipsePoint,
  ringPositions,
  volleySpeed,
  waveArcs,
  type Point,
} from './bossGeometry';
import {
  ANNOUNCE_ALPHA,
  BARK_COLOR,
  OUTLINE_COLOR,
  SPARK_COLOR,
  WARD_ALPHA,
  WARD_COLOR,
} from './dogStyle';
import type { BossHazard, LaserProbe } from './hazards';
import { rimRadii } from './rim';
import { Telegraph } from './Telegraph';

const T = BOSS_TUNING.guardianDog;
const SHIELD = T.runeShield;
const BARK = T.guardBark;
const SUMMON = T.summonMummies;
const SUMMON_ENEMY: EnemyId = 'mummy';
const FULL_TURN = Math.PI * 2;
const FX_DEPTH = 2.5;
const SPARK_DEPTH = 3;
const MAX_SPARKS = 8;
/** Half size of a drawn rune (rhombus), height and width in px. */
const RUNE_HALF_H = 7;
const RUNE_HALF_W = 5;
/** A damaged rune shrinks, but never below this share (still easy to see and hit). */
const RUNE_MIN_SCALE = 0.6;

interface Shield {
  /** announce: runes fade in, not shootable yet. up: dog invulnerable until the runes break or time runs out. */
  phase: 'announce' | 'up';
  leftMs: number;
  spin: number;
  /** Laser hits left per rune (0 = broken). */
  runes: number[];
}

interface WaveArc {
  start: number;
  size: number;
  hitsLeft: number;
}

interface Wave {
  x: number;
  y: number;
  radius: number;
  speed: number;
  /** The wave fades once its inner edge passed this radius (behind the player). */
  endRadius: number;
  arcs: WaveArc[];
  damage: number;
  /** The wave hurts the player at most once. */
  used: boolean;
}

/**
 * Boss "Antiker Wächter-Hund" (pyramids 26-30, AP-103, PE-128): a tank with magic that walks slowly on a path
 * around the player. Attacks (all announced at least MIN_TELEGRAPH_MS, all with counterplay, PE-75):
 * - runeShield: 3 runes (drawn rhombi in `game.ward`) fade in and then float around the dog. While one lives
 *   the dog is invulnerable (shield circle `game.ward` with OPACITY.aura plus a dotted ring, boss bar IMMUN);
 *   lasers bounce off the shield with a spark. Runes are shootable. Never endless: the shield ends after
 *   `maxMs` at the latest and comes back only after the attack cooldown.
 * - guardBark: a solid shock wave ring in `hud.danger` with a visible gap spreads from the dog. It is slow
 *   enough to keep MIN_REACTION_MS; a laser hit breaks an arc, so the player can open her own gap.
 * - summonMummies (extra attack): warning circles at the screen edge, then 3 mummies come in from the spawn ring
 *   outside the screen (BossContext.onSummon).
 * Runes, shield and wave reach the scene through getHazards() (PE-134).
 */
export class GuardianDog extends BossBase {
  private fx: Phaser.GameObjects.Graphics | undefined;
  private telegraphs: Telegraph[] | undefined;
  private sparks: { g: Phaser.GameObjects.Graphics; leftMs: number }[] | undefined;
  private radii: { rx: number; ry: number } = { rx: 0, ry: 0 };
  private orbitAngle = 0;
  private holding = false;
  private shield: Shield | null = null;
  private wave: Wave | null = null;
  private barkGapStart = 0;
  private pendingSummon: Point[] = [];
  private readonly dogCtx: BossContext;
  private readonly random: () => number;

  constructor(scene: Phaser.Scene, levelId: number, ctx: BossContext = {}) {
    super(scene, 'guardianDog', levelId, ctx);
    this.dogCtx = ctx;
    const rng = ctx.rng;
    this.random = rng ? () => rng.next() : Math.random;
    this.radii = rimRadii(T.orbit, this.arena);
    this.telegraphs = [];
    this.sparks = [];
    this.fx = scene.add.graphics().setDepth(FX_DEPTH);
  }

  /** true while the rune shield protects the dog (test and HUD helper). */
  get isShielded(): boolean {
    return this.shield?.phase === 'up';
  }

  /** Runes that are still alive (0 without shield). */
  get runesLeft(): number {
    return this.shield?.runes.filter((h) => h > 0).length ?? 0;
  }

  override despawn(): void {
    super.despawn();
    // Also called by the base constructor before our fields exist, hence the guards.
    for (const t of this.telegraphs ?? []) t.cancel();
    if (this.telegraphs) this.telegraphs.length = 0;
    for (const s of this.sparks ?? []) s.g.destroy();
    if (this.sparks) this.sparks.length = 0;
    this.fx?.clear();
    this.resetState();
  }

  /** Runes, shield and shock wave for the generic hit path of the scene (PE-134). Runes come first. */
  override getHazards(): readonly BossHazard[] {
    const out: BossHazard[] = [];
    const shield = this.shield;
    if (shield?.phase === 'up') {
      this.runePositions(shield).forEach((p, i) => {
        if (shield.runes[i] > 0) out.push(this.runeHazard(shield, i, p));
      });
      out.push(this.shieldHazard(shield));
    }
    const wave = this.wave;
    if (wave && !wave.used) {
      for (const arc of wave.arcs) if (arc.hitsLeft > 0) out.push(this.arcHazard(wave, arc));
    }
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
    if (!this.fx) return;
    if (!this.holding) {
      this.orbitAngle += (T.orbitSpeedRadPerSec * delta) / 1000;
      const p = ellipsePoint(this.center, this.radii, this.orbitAngle);
      this.setPosition(p.x, p.y);
    }
    this.updateShield(delta);
    this.updateWave(delta);
    this.tickSparks(delta);
    this.draw();
  }

  protected override onTelegraph(attack: BossAttackDef): void {
    const ms = attack.telegraphMs;
    if (attack.id === 'runeShield') {
      this.shield = {
        phase: 'announce',
        leftMs: SHIELD.maxMs,
        spin: this.shield?.spin ?? 0,
        runes: new Array<number>(SHIELD.runeCount).fill(SHIELD.runeHits),
      };
      this.invulnerable = false;
    } else if (attack.id === 'guardBark') {
      this.holding = true;
      this.barkGapStart = this.random() * FULL_TURN;
      this.track(
        Telegraph.ring(
          this.scene,
          this.x,
          this.y,
          BARK.startRadius,
          BARK.thickness,
          ms,
          undefined,
          {
            start: this.barkGapStart,
            size: BARK.gapRad,
          },
        ),
      );
    } else if (attack.id === 'summonMummies') {
      const base = this.random() * FULL_TURN;
      this.pendingSummon = ringPositions(
        this.center,
        SUMMON.count,
        base,
        spawnRadiusFor(this.arena),
      );
      for (let i = 0; i < SUMMON.count; i++) {
        const m = edgePoint(this.center, base + (i / SUMMON.count) * FULL_TURN, this.arena);
        this.track(Telegraph.circle(this.scene, m.x, m.y, SUMMON.markerRadius, ms));
      }
    }
  }

  protected override onAttack(attackId: string, damage: number): void {
    if (attackId === 'runeShield') {
      const shield = this.shield;
      if (!shield) return;
      shield.phase = 'up';
      shield.leftMs = SHIELD.maxMs;
      this.invulnerable = true;
    } else if (attackId === 'guardBark') {
      this.holding = false;
      const dist = Math.hypot(this.center.x - this.x, this.center.y - this.y);
      const reach = BOSS_TUNING.playerHitRadius;
      this.wave = {
        x: this.x,
        y: this.y,
        radius: BARK.startRadius,
        speed: volleySpeed(
          dist - BARK.startRadius - BARK.thickness / 2,
          BARK.speedPxPerSec,
          BARK.minSpeedPxPerSec,
          reach,
          MIN_REACTION_MS,
        ),
        endRadius: dist + reach + BARK.thickness,
        arcs: waveArcs(BARK.arcCount, this.barkGapStart, BARK.gapRad).map((a) => ({
          ...a,
          hitsLeft: BARK.arcHits,
        })),
        damage,
        used: false,
      };
    } else if (attackId === 'summonMummies') {
      const positions = this.pendingSummon;
      this.pendingSummon = [];
      if (positions.length > 0) this.dogCtx.onSummon?.(SUMMON_ENEMY, positions);
    }
  }

  // --- runeShield ---

  private runePositions(shield: Shield): Point[] {
    return ringPositions(this, SHIELD.runeCount, shield.spin, SHIELD.runeOrbit);
  }

  private updateShield(dt: number): void {
    const shield = this.shield;
    if (!shield) return;
    shield.spin = (shield.spin + (SHIELD.runeSpeedRadPerSec * dt) / 1000) % FULL_TURN;
    if (shield.phase !== 'up') return;
    shield.leftMs -= dt;
    if (shield.leftMs <= 0) this.endShield();
  }

  private endShield(): void {
    this.shield = null;
    this.invulnerable = false;
  }

  private runeHazard(shield: Shield, i: number, p: Point): BossHazard {
    const isActive = (): boolean => this.shield === shield && shield.runes[i] > 0;
    return {
      get active() {
        return isActive();
      },
      shape: { kind: 'circle', x: p.x, y: p.y, radius: SHIELD.runeRadius },
      shootable: true,
      laserHit: () => {
        if (!isActive()) return false;
        shield.runes[i] -= 1;
        this.spark(p.x, p.y);
        if (shield.runes.every((h) => h <= 0)) this.endShield();
        return true;
      },
      playerHit: () => 0,
    };
  }

  /** The shield circle: lasers bounce off with a spark (the dog takes no damage, no flash). */
  private shieldHazard(shield: Shield): BossHazard {
    const isActive = (): boolean => this.shield === shield && shield.phase === 'up';
    const cx = this.x;
    const cy = this.y;
    return {
      get active() {
        return isActive();
      },
      shape: { kind: 'circle', x: cx, y: cy, radius: SHIELD.radius },
      shootable: true,
      laserHit: (laser: LaserProbe) => {
        if (!isActive()) return false;
        const a = Math.atan2(laser.circle.y - cy, laser.circle.x - cx);
        this.spark(cx + Math.cos(a) * SHIELD.radius, cy + Math.sin(a) * SHIELD.radius);
        return true;
      },
      playerHit: () => 0,
    };
  }

  // --- guardBark ---

  private updateWave(dt: number): void {
    const wave = this.wave;
    if (!wave) return;
    wave.radius += (wave.speed * dt) / 1000;
    if (wave.radius - BARK.thickness / 2 > wave.endRadius) this.wave = null;
  }

  private arcHazard(wave: Wave, arc: WaveArc): BossHazard {
    const isActive = (): boolean => this.wave === wave && !wave.used && arc.hitsLeft > 0;
    const half = BARK.thickness / 2;
    return {
      get active() {
        return isActive();
      },
      // One arc of the ring: a ring band whose "gap" is everything outside the arc.
      shape: {
        kind: 'ring',
        x: wave.x,
        y: wave.y,
        inner: Math.max(0, wave.radius - half),
        outer: wave.radius + half,
        gapStart: arc.start + arc.size,
        gapSize: FULL_TURN - arc.size,
      },
      shootable: true,
      laserHit: (laser: LaserProbe) => {
        if (!isActive()) return false;
        arc.hitsLeft -= 1;
        this.spark(laser.circle.x, laser.circle.y);
        return true;
      },
      playerHit: () => {
        if (!isActive()) return 0;
        wave.used = true;
        return wave.damage;
      },
    };
  }

  // --- drawing (only tokens, shapes not only colour) ---

  private draw(): void {
    const g = this.fx;
    if (!g) return;
    g.clear();
    const shield = this.shield;
    if (shield) this.drawShield(g, shield);
    const wave = this.wave;
    if (wave && !wave.used) this.drawWave(g, wave);
  }

  /**
   * Shield: area in `game.ward` with OPACITY.aura plus a dotted ring (the ring makes it readable by shape).
   * While announced only the dotted ring and dim runes show.
   */
  private drawShield(g: Phaser.GameObjects.Graphics, shield: Shield): void {
    const up = shield.phase === 'up';
    if (up) {
      g.fillStyle(WARD_COLOR, WARD_ALPHA);
      g.fillCircle(this.x, this.y, SHIELD.radius);
    }
    g.fillStyle(WARD_COLOR, up ? 1 : ANNOUNCE_ALPHA);
    for (let k = 0; k < SHIELD.dotCount; k++) {
      const a = (k / SHIELD.dotCount) * FULL_TURN;
      g.fillRect(
        Math.round(this.x + Math.cos(a) * SHIELD.radius),
        Math.round(this.y + Math.sin(a) * SHIELD.radius),
        1,
        1,
      );
    }
    this.runePositions(shield).forEach((p, i) => {
      const hits = shield.runes[i];
      if (hits <= 0) return;
      const s = Math.max(RUNE_MIN_SCALE, hits / SHIELD.runeHits);
      const pts = [
        new Phaser.Math.Vector2(p.x, p.y - RUNE_HALF_H * s),
        new Phaser.Math.Vector2(p.x + RUNE_HALF_W * s, p.y),
        new Phaser.Math.Vector2(p.x, p.y + RUNE_HALF_H * s),
        new Phaser.Math.Vector2(p.x - RUNE_HALF_W * s, p.y),
      ];
      const alpha = up ? 1 : ANNOUNCE_ALPHA;
      g.fillStyle(WARD_COLOR, alpha);
      g.fillPoints(pts, true);
      g.lineStyle(1, OUTLINE_COLOR, alpha);
      g.strokePoints(pts, true);
    });
  }

  /** Shock wave: solid arcs in `hud.danger` with an outline; the gap and broken arcs stay open. */
  private drawWave(g: Phaser.GameObjects.Graphics, wave: Wave): void {
    for (const arc of wave.arcs) {
      if (arc.hitsLeft <= 0) continue;
      for (const [w, color] of [
        [BARK.thickness + 2, OUTLINE_COLOR],
        [BARK.thickness, BARK_COLOR],
      ] as const) {
        g.lineStyle(w, color, 1);
        g.beginPath();
        g.arc(wave.x, wave.y, wave.radius, arc.start, arc.start + arc.size, false);
        g.strokePath();
      }
    }
  }

  /** Visible spark of a bounced or used laser (cross with outline), no flash of the boss. */
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
    this.shield = null;
    this.wave = null;
    this.pendingSummon = [];
    this.invulnerable = false;
  }

  /** Keeps a telegraph so despawn() can cancel it; finished ones are dropped. */
  private track(t: Telegraph): void {
    const list = this.telegraphs;
    if (!list) return;
    for (let i = list.length - 1; i >= 0; i--) if (!list[i].scene) list.splice(i, 1);
    list.push(t);
  }
}

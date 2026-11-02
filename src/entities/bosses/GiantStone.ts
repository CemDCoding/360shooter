import Phaser from 'phaser';
import { BOSS_TUNING } from '../../config/bosses';
import { PARRY_RULES } from '../../config/parry';
import { THEME } from '../../config/theme';
import type { BossAttackDef } from '../../contracts';
import type { ParryCircleState } from '../../logic/parry';
import { HINT_TIMER_GAP, HUD_MAX_K, hudTimerBottom } from '../parry/hintBoard';
import { STICK_CATCH_DIAMETER } from '../../scenes/hud/hudMath';
import { NO_SAFE_INSETS, readSafeInsets, stickCenter } from '../../scenes/safeInsets';
import { BossBase, type BossContext, type ParryAnchor } from './BossBase';
import { rimRadii } from './rim';
import {
  angleDegOf,
  clampToArena,
  clashDistance,
  deltaDeg,
  fragmentPositions,
  normDeg,
  polarPoint,
  quarrelAnchors,
  safeZone,
  spacingDeg,
  stepToward,
  type DragAnchor,
  type SafeZone,
} from './bossGeometry';
import { Telegraph } from './Telegraph';

const T = BOSS_TUNING.giantStone;
const GLOW_COLOR = THEME.colors['game.fire-ring'].num;
const CRACK_COLOR = THEME.colors['game.hit-flash'].num;
const P = PARRY_RULES;

/** Morgenlicht parried: the stone freezes this long before it bounces off (start value, manual test H-38). */
const FREEZE_MS = 300;
/** Riesenzank: each pebble circle sits this far beside the lane of its stone, away from the other lane. */
const QUARREL_SIDE_DEG = 30;
/** Riesenzank parried: the stones stop at least this far from the player's hit circle. */
const CLASH_CLEAR_PX = 4;
/** Mirror of the stick edge margin (VirtualStick EDGE_MARGIN): drag targets stay off the stick. */
const STICK_EDGE = 24;
const STICK_CATCH_R = Math.max(STICK_CATCH_DIAMETER, THEME.sizePx['size.stick']) / 2;
const NO_OPT_INS: readonly string[] = [];
const QUARREL_OPT_IN: readonly string[] = ['quarrel'];

/**
 * Set only while the split builds the first fragment (the quarrel leader). optInAttacks() runs inside the base
 * constructor before any field exists, so this flag is how that one fragment unlocks `quarrel` (PE-190): the whole
 * stone never schedules it, and only one of the two fragments announces it for both.
 */
let buildingQuarrelLeader = false;

export interface GiantStoneOptions {
  /** Size factor, 1 = whole stone, 0.5 = fragment. Internal use for the split. */
  scale?: number;
  /** Current player position (default: arena centre). */
  getPlayerPos?: () => { x: number; y: number };
  /** The rolling stone hit the player: apply `damage` (already scaled by the variant). */
  onPlayerHit?: (damage: number) => void;
}

/**
 * idle: waits at the rim (may announce) · rolling · retreating · frozen: Morgenlicht parried, stands still before
 * it bounces · quarrel: Riesenzank announced, waits for the impact together with the other fragment.
 */
type Phase = 'idle' | 'rolling' | 'retreating' | 'frozen' | 'quarrel';

/**
 * Boss giant stone (AP-19, PE-34). Waits at the rim, announces a roll with a warning line to the middle,
 * rolls, bounces back at the impact. Armour: half damage, full damage for 2 s after the impact (glow and cracks).
 * With the extra attack (variant) it breaks at 50 % HP into 2 half-size stones. The boss is defeated only when
 * both fragments are defeated; the HP bar reports the sum.
 *
 * Fairy-tale quicktimes (AP-154, PE-190):
 * - Morgenlicht (`roll`): the sun hold circle sits where the lane of the stone reaches the player's circle ring
 *   (all circles turn together, so their spacing stays). All circles hit: the stone freezes and bounces off.
 * - Riesenzank (`quarrel`, only after the split): the first fragment announces it for both; both roll at once,
 *   one pebble drag circle per stone with its target on that stone's lane. All hit: the stones clash with each
 *   other before they reach the player. No damage to the boss (PE-158).
 *
 * Scene contract: use `parts` (the living hit targets) for lasers/contact instead of the stone itself, because
 * after the split the original object is hidden. The fragments update themselves via the scene update event.
 */
export class GiantStone extends BossBase {
  private readonly levelId: number;
  private readonly userCtx: BossContext;
  private readonly opts: GiantStoneOptions;
  private readonly sizeScale: number;
  private phase: Phase = 'idle';
  private vulnerableLeftMs = 0;
  private target: { x: number; y: number } = { x: 0, y: 0 };
  private hitDone = false;
  private warning?: Telegraph;
  private fx?: Phaser.GameObjects.Graphics;
  private split = false;
  private splitting = false;
  private fragments: GiantStone[] = [];
  private fragmentsLeft = 0;
  private readonly isFragment: boolean;
  private readonly rand: () => number;
  private time = 0;
  private retreatMs = 0;
  private freezeLeftMs = 0;
  /** The other fragment after the split (both point at each other). */
  private partner?: GiantStone;
  /** Morgenlicht: turn of all circles so that the sun circle sits on the lane (set by the sun circle). */
  private rollTurnDeg = 0;
  private rollLaneDeg = 0;
  /** Riesenzank: anchors by circle index (0 = this stone, 1 = the partner), set at the announcement. */
  private quarrelPlan: [DragAnchor, DragAnchor] | null = null;

  constructor(
    scene: Phaser.Scene,
    levelId: number,
    ctx: BossContext = {},
    opts: GiantStoneOptions = {},
  ) {
    super(scene, 'giantStone', levelId, ctx);
    this.levelId = levelId;
    this.userCtx = ctx;
    this.opts = opts;
    this.sizeScale = opts.scale ?? 1;
    this.isFragment = this.sizeScale < 1;
    this.rand = ctx.rng ? () => ctx.rng!.next() : Math.random;
    this.damageFactor = T.armorFactor;
    this.fx = scene.add.graphics();
    this.fx.setDepth(this.depth + 1).setVisible(false);
    this.setScale(this.sizeScale);
  }

  /** Living hit targets: the stone itself, or the remaining fragments after the split. */
  get parts(): BossBase[] {
    if (!this.split) return this.active ? [this] : [];
    return this.fragments.filter((f) => f.active);
  }

  private get radius(): number {
    return T.baseRadius * this.sizeScale;
  }

  private get middle(): { x: number; y: number } {
    return this.center;
  }

  protected override onSpawn(): void {
    this.clearFragments();
    this.split = false;
    this.phase = 'idle';
    this.retreatMs = 0;
    this.freezeLeftMs = 0;
    this.quarrelPlan = null;
    this.vulnerableLeftMs = 0;
    this.damageFactor = T.armorFactor;
    this.setScale(this.sizeScale);
    this.setVelocity(0, 0);
    this.fx?.setVisible(true);
  }

  override despawn(): void {
    this.warning?.cancel();
    this.warning = undefined;
    this.fx?.clear().setVisible(false);
    if (!this.splitting) this.clearFragments();
    // A quarrel leader that dies during the announcement frees its partner (it would wait forever).
    if (this.quarrelPlan) this.partner?.leaveQuarrel();
    this.quarrelPlan = null;
    if (this.phase === 'quarrel' || this.phase === 'frozen') this.phase = 'idle';
    super.despawn();
  }

  /** Only the first fragment of the split announces the quarrel (see buildingQuarrelLeader). */
  protected override optInAttacks(): readonly string[] {
    return buildingQuarrelLeader ? QUARREL_OPT_IN : NO_OPT_INS;
  }

  /** Quicktime circles only when the roll or the quarrel is really announced (AP-133). */
  protected override canParry(attack: BossAttackDef): boolean {
    if (attack.id === 'quarrel') return this.planQuarrel() !== null;
    return attack.id === 'roll' && this.phase === 'idle';
  }

  protected override onTelegraph(attack: BossAttackDef): void {
    if (attack.id === 'quarrel') {
      this.startQuarrel(attack);
      return;
    }
    if (attack.id !== 'roll' || this.phase !== 'idle') return;
    const m = this.middle;
    this.target = { x: m.x, y: m.y };
    this.rollLaneDeg = angleDegOf(m, this);
    this.rollTurnDeg = 0;
    this.announceLane(attack.telegraphMs);
  }

  /**
   * Morgenlicht: the sun circle (hold, or its plain tap with easy parry) goes onto the lane of the stone; the other
   * circles turn by the same angle. The sun circle is the first step of the pattern, so it comes first.
   * Riesenzank: the planned anchors by circle index.
   */
  protected override parryAnchor(attack: BossAttackDef, circle: ParryCircleState): ParryAnchor {
    if (attack.id === 'quarrel') {
      const plan = this.quarrelPlan?.[circle.index];
      if (plan) return { angleDeg: plan.angleDeg, target: { ...plan.target } };
    } else if (attack.id === 'roll') {
      if (circle.symbol === 'sun') this.rollTurnDeg = deltaDeg(circle.angleDeg, this.rollLaneDeg);
      return { angleDeg: normDeg(circle.angleDeg + this.rollTurnDeg) };
    }
    return super.parryAnchor(attack, circle);
  }

  protected override onAttack(attackId: string, damage: number, parryFactor = 1): void {
    if (attackId === 'quarrel') {
      this.quarrelHits(damage, parryFactor);
      return;
    }
    if (attackId !== 'roll' || this.phase !== 'idle') return;
    this.warning = undefined;
    // Morgenlicht parried (all circles hit, PE-158): the stone freezes and bounces off where it stands.
    if (parryFactor <= 0) {
      this.phase = 'frozen';
      this.freezeLeftMs = FREEZE_MS;
      return;
    }
    this.startRoll(this.middle, damage);
  }

  private pendingDamage = 0;

  private startRoll(target: { x: number; y: number }, damage: number): void {
    this.warning = undefined;
    this.target = { x: target.x, y: target.y };
    this.phase = 'rolling';
    this.hitDone = false;
    this.pendingDamage = damage;
  }

  /** Warning line from the stone along its lane to the middle (the lane shows the roll, Lücke Q-70). */
  private announceLane(ms: number): void {
    const m = this.middle;
    this.warning?.cancel();
    this.warning = Telegraph.line(this.scene, this.x, this.y, m.x, m.y, this.radius * 2, ms);
  }

  // --- Riesenzank (quarrel) ---

  /** Anchors of the quarrel, or null if it cannot run now (no idle partner, partner announced, no room). */
  private planQuarrel(): [DragAnchor, DragAnchor] | null {
    const other = this.partner;
    if (!this.active || this.phase !== 'idle' || !other?.active) return null;
    if (other.phase !== 'idle' || other.warning !== undefined) return null;
    const m = this.middle;
    return quarrelAnchors(
      m,
      [angleDegOf(m, this), angleDegOf(m, other)],
      P.distanceFromPlayerPx + P.dragTargetDistancePx,
      P.distanceFromPlayerPx + P.dragTargetRadiusPx,
      {
        circleDist: P.distanceFromPlayerPx,
        sideDeg: QUARREL_SIDE_DEG,
        circleReach: P.circleRadiusPx + P.touchSlackPx,
        minSpacingDeg: spacingDeg(P.circleRadiusPx + P.touchSlackPx, P.distanceFromPlayerPx),
        half: P.dragTargetRadiusPx,
        zone: this.targetZone(),
      },
    );
  }

  private startQuarrel(attack: BossAttackDef): void {
    const plan = this.planQuarrel();
    const other = this.partner;
    if (!plan || !other) return;
    this.quarrelPlan = plan;
    for (const s of [this, other]) {
      s.phase = 'quarrel';
      s.announceLane(attack.telegraphMs);
    }
  }

  /** The partner gives up a quarrel that will not come (leader gone). */
  private leaveQuarrel(): void {
    if (this.phase !== 'quarrel') return;
    this.warning?.cancel();
    this.warning = undefined;
    this.phase = 'idle';
  }

  /**
   * Impact of the quarrel: both stones roll at once, each with half the (parried) damage. All circles hit: they
   * roll only to the point where they clash with each other and bounce off there, clear of the player.
   */
  private quarrelHits(damage: number, parryFactor: number): void {
    if (this.phase !== 'quarrel') return;
    this.quarrelPlan = null;
    const other = this.partner?.active && this.partner.phase === 'quarrel' ? this.partner : null;
    const stones = other ? [this, other] : [this];
    const m = this.middle;
    if (parryFactor <= 0) {
      if (!other) {
        this.phase = 'frozen';
        this.freezeLeftMs = FREEZE_MS;
        return;
      }
      const gap = deltaDeg(angleDegOf(m, this), angleDegOf(m, other));
      const clash = clashDistance(
        gap,
        this.radius,
        this.radius + BOSS_TUNING.playerHitRadius + CLASH_CLEAR_PX,
      );
      for (const s of stones) {
        const lane = angleDegOf(m, s);
        const dist = Math.min(clash, Math.hypot(s.x - m.x, s.y - m.y));
        s.startRoll(polarPoint(m, lane, dist), 0);
      }
      return;
    }
    for (const s of stones) s.startRoll(m, damage / 2);
  }

  /** Where drag targets may lie: arena minus margin, below the HUD timer, off the stick (brief H-37). */
  private targetZone(): SafeZone {
    const registry = (this.scene as Partial<Phaser.Scene> | undefined)?.registry;
    const ins = registry?.get ? readSafeInsets(registry) : NO_SAFE_INSETS;
    const stick = stickCenter(this.arena.width, this.arena.height, STICK_CATCH_R, STICK_EDGE, ins);
    return safeZone(this.arena, hudTimerBottom(HUD_MAX_K, ins.top) + HINT_TIMER_GAP, [
      { ...stick, r: STICK_CATCH_R },
    ]);
  }

  protected override behave(delta: number): void {
    this.time += delta;
    if (this.phase === 'frozen') {
      this.freezeLeftMs -= delta;
      if (this.freezeLeftMs <= 0) {
        this.freezeLeftMs = 0;
        this.impact();
      }
    } else if (this.phase === 'rolling') {
      const player = this.opts.getPlayerPos?.() ?? this.middle;
      const hitPlayer =
        !this.hitDone &&
        Phaser.Math.Distance.Between(this.x, this.y, player.x, player.y) <=
          this.radius + BOSS_TUNING.playerHitRadius;
      if (hitPlayer) {
        this.hitDone = true;
        this.opts.onPlayerHit?.(this.pendingDamage);
      }
      const arrived = this.advance(delta, T.rollSpeed);
      if (hitPlayer || arrived) this.impact();
    } else if (this.phase === 'retreating') {
      this.retreatMs += delta;
      // Safety: a retreat that takes too long ends where the stone is (no soft lock).
      if (this.advance(delta, T.returnSpeed) || this.retreatMs > T.retreatMaxMs)
        this.finishRetreat();
    }
    if (this.vulnerableLeftMs > 0) {
      this.vulnerableLeftMs -= delta;
      if (this.vulnerableLeftMs <= 0) {
        this.vulnerableLeftMs = 0;
        this.damageFactor = T.armorFactor;
        this.setScale(this.sizeScale);
      }
    }
    this.drawFx();
  }

  /** Bounce: the armour opens for a short time, the stone goes back to a new rim position. */
  private impact(): void {
    this.vulnerableLeftMs = T.vulnerableMs;
    this.damageFactor = 1;
    const m = this.middle;
    const angle = this.rand() * Math.PI * 2;
    const rim = rimRadii(T.rim, this.arena);
    this.target = { x: m.x + Math.cos(angle) * rim.rx, y: m.y + Math.sin(angle) * rim.ry };
    this.target = clampToArena(this.target, this.arena);
    this.phase = 'retreating';
    this.retreatMs = 0;
  }

  private finishRetreat(): void {
    this.setVelocity(0, 0);
    this.phase = 'idle';
    this.retreatMs = 0;
  }

  /**
   * Moves toward the target without overshooting and keeps the stone inside the arena.
   * Position is set directly (no velocity), so a long frame cannot skip the target. Returns true on arrival.
   */
  private advance(delta: number, speed: number): boolean {
    const next = stepToward({ x: this.x, y: this.y }, this.target, speed, delta);
    const p = clampToArena(next, this.arena);
    this.setPosition(p.x, p.y);
    this.body?.updateFromGameObject();
    const left = Phaser.Math.Distance.Between(p.x, p.y, this.target.x, this.target.y);
    if (next.arrived || left <= T.arriveDist) {
      this.setPosition(this.target.x, this.target.y);
      this.body?.updateFromGameObject();
      return true;
    }
    return false;
  }

  /** Glow ring and cracks while the armour is open, so the window is easy to see. */
  private drawFx(): void {
    const g = this.fx;
    if (!g) return;
    g.clear();
    if (this.vulnerableLeftMs <= 0) return;
    const pulse = 0.5 + 0.5 * Math.sin(this.time / 70);
    const r = this.radius;
    g.setPosition(this.x, this.y);
    g.lineStyle(4, GLOW_COLOR, 0.5 + 0.5 * pulse);
    g.strokeCircle(0, 0, r + 4 + 3 * pulse);
    g.lineStyle(2, CRACK_COLOR, 0.9);
    g.beginPath();
    g.moveTo(-r * 0.1, -r * 0.8);
    g.lineTo(r * 0.15, -r * 0.2);
    g.lineTo(-r * 0.2, r * 0.15);
    g.lineTo(r * 0.1, r * 0.8);
    g.moveTo(r * 0.15, -r * 0.2);
    g.lineTo(r * 0.7, -r * 0.05);
    g.moveTo(-r * 0.2, r * 0.15);
    g.lineTo(-r * 0.7, r * 0.3);
    g.strokePath();
    this.setScale(this.sizeScale * (1 + 0.05 * pulse));
  }

  override takeDamage(amount: number): boolean {
    const killed = super.takeDamage(amount);
    if (
      !killed &&
      this.active &&
      !this.isFragment &&
      !this.split &&
      this.variant.extraAttack &&
      this.hp <= this.maxHp * T.splitAt
    ) {
      this.breakApart();
    }
    return killed;
  }

  /** Breaks into 2 half-size stones with the remaining HP shared. */
  private breakApart(): void {
    const { x, y, hp } = this;
    this.split = true;
    this.splitting = true;
    this.despawn();
    this.splitting = false;
    this.fragmentsLeft = 2;
    const share = hp / 2;
    const spots = fragmentPositions(
      { x, y },
      this.middle,
      T.fragmentOffset,
      T.fragmentMinCenterDist,
      this.arena,
    );
    for (let i = 0; i < 2; i++) {
      // The first fragment leads the quarrel (only its scheduler has `quarrel`).
      buildingQuarrelLeader = i === 0;
      let frag: GiantStone;
      try {
        frag = new GiantStone(
          this.scene,
          this.levelId,
          {
            arena: this.userCtx.arena,
            center: this.userCtx.center,
            rng: this.userCtx.rng,
            onHpChanged: () => this.reportSum(),
            onDefeated: (fx, fy) => this.fragmentDefeated(fx, fy),
            // Fragments roll too: their quicktime results reach the scene the same way (AP-133).
            onParryResolved: this.userCtx.onParryResolved,
          },
          { ...this.opts, scale: 0.5 },
        );
      } finally {
        buildingQuarrelLeader = false;
      }
      frag.spawnFragment(spots[i].x, spots[i].y, share);
      this.fragments.push(frag);
    }
    const [a, b] = this.fragments;
    a.partner = b;
    b.partner = a;
    this.reportSum();
  }

  /** Spawn without resetting to full HP (internal, used by the split). */
  private spawnFragment(x: number, y: number, hp: number): void {
    this.spawn(x, y);
    this.hp = hp;
    const step = (_t: number, delta: number): void => this.update(0, delta);
    this.scene.events.on(Phaser.Scenes.Events.UPDATE, step);
    this.once(Phaser.GameObjects.Events.DESTROY, () =>
      this.scene.events.off(Phaser.Scenes.Events.UPDATE, step),
    );
    this.updater = step;
  }

  private updater?: (t: number, d: number) => void;

  private reportSum(): void {
    if (this.fragments.length < 2) return;
    const sum = this.fragments.reduce((s, f) => s + (f.active ? Math.max(0, f.hp) : 0), 0);
    this.userCtx.onHpChanged?.(sum, this.maxHp);
  }

  private fragmentDefeated(x: number, y: number): void {
    this.reportSum();
    this.fragmentsLeft -= 1;
    if (this.fragmentsLeft <= 0) this.userCtx.onDefeated?.(x, y);
  }

  private clearFragments(): void {
    for (const f of this.fragments ?? []) {
      if (f.updater) this.scene.events.off(Phaser.Scenes.Events.UPDATE, f.updater);
      f.fx?.destroy();
      f.destroy();
    }
    this.fragments = [];
    this.fragmentsLeft = 0;
  }
}

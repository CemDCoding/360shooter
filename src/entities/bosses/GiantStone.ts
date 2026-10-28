import Phaser from 'phaser';
import { BOSS_TUNING } from '../../config/bosses';
import { THEME } from '../../config/theme';
import type { BossAttackDef } from '../../contracts';
import { BossBase, type BossContext } from './BossBase';
import { rimRadii } from './rim';
import { clampToArena, fragmentPositions, stepToward } from './bossGeometry';
import { Telegraph } from './Telegraph';

const T = BOSS_TUNING.giantStone;
const GLOW_COLOR = THEME.colors['game.fire-ring'].num;
const CRACK_COLOR = THEME.colors['game.hit-flash'].num;

export interface GiantStoneOptions {
  /** Size factor, 1 = whole stone, 0.5 = fragment. Internal use for the split. */
  scale?: number;
  /** Current player position (default: arena centre). */
  getPlayerPos?: () => { x: number; y: number };
  /** The rolling stone hit the player: apply `damage` (already scaled by the variant). */
  onPlayerHit?: (damage: number) => void;
}

type Phase = 'idle' | 'rolling' | 'retreating';

/**
 * Boss giant stone (AP-19, PE-34). Waits at the rim, announces a roll with a warning line to the middle,
 * rolls, bounces back at the impact. Armour: half damage, full damage for 2 s after the impact (glow and cracks).
 * With the extra attack (variant) it breaks at 50 % HP into 2 half-size stones. The boss is defeated only when
 * both fragments are defeated; the HP bar reports the sum.
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
    super.despawn();
  }

  protected override onTelegraph(attack: BossAttackDef): void {
    if (attack.id !== 'roll' || this.phase !== 'idle') return;
    const m = this.middle;
    this.target = { x: m.x, y: m.y };
    this.warning?.cancel();
    this.warning = Telegraph.line(
      this.scene,
      this.x,
      this.y,
      m.x,
      m.y,
      this.radius * 2,
      attack.telegraphMs,
    );
  }

  protected override onAttack(attackId: string, damage: number): void {
    if (attackId !== 'roll' || this.phase !== 'idle') return;
    this.warning = undefined;
    this.phase = 'rolling';
    this.hitDone = false;
    this.pendingDamage = damage;
  }

  private pendingDamage = 0;

  protected override behave(delta: number): void {
    this.time += delta;
    if (this.phase === 'rolling') {
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
      const frag: GiantStone = new GiantStone(
        this.scene,
        this.levelId,
        {
          arena: this.userCtx.arena,
          center: this.userCtx.center,
          rng: this.userCtx.rng,
          onHpChanged: () => this.reportSum(),
          onDefeated: (fx, fy) => this.fragmentDefeated(fx, fy),
        },
        { ...this.opts, scale: 0.5 },
      );
      frag.spawnFragment(spots[i].x, spots[i].y, share);
      this.fragments.push(frag);
    }
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

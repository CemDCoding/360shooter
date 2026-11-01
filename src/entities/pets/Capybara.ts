import type Phaser from 'phaser';
import { OPACITY, THEME } from '../../config/theme';
import type { CapybaraDef } from '../../contracts';
import { HealTimer, inAura, type Located } from '../../logic/pets';
import { Pet, PetSprite, petDepth, type PetPlayer, type PetWorld } from './Pet';
import {
  AURA_SLOW_MS,
  dottedRing,
  FOLLOW_SPEED,
  petAnchor,
  STEAM_COUNT,
  steamPuffs,
  stepTowards,
} from './petLogic';

const AURA_COLOR = THEME.colors['game.pet-aura'].num;
const STEAM_KEY = 'pet-steam';
const STEAM_ALPHA = 0.8;
const HEAL_KEY = 'pet-heal';
const HEAL_FRAMES = 4;
/** Heart frames rise above the astronaut, each this long (ms). */
const HEAL_FRAME_MS = 150;
/** The heart starts this far above the astronaut centre and rises one pixel per frame step (px). */
const HEAL_START_DY = -20;
const FRAME_HEART = 5;
/** Heart above the astronaut and her weapon in front (player depth + 1). */
const HEART_ABOVE_PLAYER = 1.5;
/** Aura and steam lie on the ground: above the floor (-100), below enemies (0). */
const AURA_DEPTH = -1;
const STEAM_DEPTH = -0.9;

/**
 * Capybara (PE-170): aura "warme Quelle" around itself that slows and lightly damages enemies, and heals the
 * astronaut every 10 s. Bigger aura with a power-up: only the radius grows (brief H-35).
 */
export class Capybara<E extends Located> extends Pet<E> {
  private readonly body: PetSprite;
  private readonly aura: Phaser.GameObjects.Graphics;
  private readonly steam: Phaser.GameObjects.Sprite[] = [];
  private heart: Phaser.GameObjects.Sprite | null = null;
  private heartMs = 0;
  private readonly healTimer: HealTimer;
  private auraRadius = -1;
  private elapsedMs = 0;
  private pos: Located;

  constructor(scene: Phaser.Scene, def: CapybaraDef, gearKey: string | null, start: Located) {
    super(scene, def, gearKey);
    this.pos = { ...start };
    this.healTimer = new HealTimer(def);
    this.aura = scene.add.graphics().setDepth(AURA_DEPTH);
    this.body = new PetSprite(scene, 'capybara', gearKey, start.x, start.y);
    if (scene.textures.exists(STEAM_KEY)) {
      for (let i = 0; i < STEAM_COUNT; i++) {
        this.steam.push(
          scene.add
            .sprite(start.x, start.y, STEAM_KEY, i % 4)
            .setDepth(STEAM_DEPTH)
            .setAlpha(STEAM_ALPHA),
        );
      }
    }
    if (scene.textures.exists(HEAL_KEY))
      this.heart = scene.add.sprite(0, 0, HEAL_KEY, 0).setVisible(false);
  }

  /** Current aura radius in px (for tests). */
  get radius(): number {
    return this.auraRadius;
  }

  update(dtMs: number, world: PetWorld<E>): void {
    const { player, stats, enemies } = world;
    const dt = Math.max(0, dtMs);
    this.elapsedMs += dt;
    this.pos = stepTowards(this.pos, petAnchor(player, player.flipX, 'capybara'), FOLLOW_SPEED, dt);
    this.drawAura(stats.radius);

    // Damage per second over the frame time, no flash per tick (like the burn); slow renewed while inside.
    const dmg = stats.damage * (dt / 1000);
    for (const e of inAura(this.pos, stats.radius, enemies)) {
      world.slow(e, { slow: stats.slow, durationMs: AURA_SLOW_MS });
      if (dmg > 0) world.damage(e, dmg, 'none');
    }

    const heal = this.healTimer.tick(dt);
    if (heal > 0) {
      world.heal(heal);
      this.body.showAttack(FRAME_HEART);
      this.heartMs = HEAL_FRAMES * HEAL_FRAME_MS;
    }
    this.updateHeart(dt, player);

    const depth = petDepth(player.depth);
    this.body.place(this.pos.x, this.pos.y, player.flipX, depth, dt);
    const puffs = steamPuffs(
      this.steam.length,
      this.auraRadius,
      this.elapsedMs,
      this.reducedMotion,
    );
    this.steam.forEach((s, i) => {
      const p = puffs[i];
      s.setPosition(Math.round(this.pos.x + p.dx), Math.round(this.pos.y + p.dy));
      s.setAlpha(STEAM_ALPHA * p.alphaFactor);
    });
  }

  /** Circle in game.pet-aura at opacity.aura and a 1 px dotted ring at full opacity; redrawn on size change. */
  private drawAura(radius: number): void {
    this.aura.setPosition(Math.round(this.pos.x), Math.round(this.pos.y));
    const r = Math.round(radius);
    if (r === this.auraRadius) return;
    this.auraRadius = r;
    const g = this.aura.clear();
    if (r <= 0) return;
    g.fillStyle(AURA_COLOR, OPACITY.aura);
    g.fillCircle(0, 0, r);
    g.fillStyle(AURA_COLOR, 1);
    for (const d of dottedRing(r)) g.fillRect(d.dx, d.dy, 1, 1);
  }

  /** pet-heal above the astronaut: one pass through its four frames; a still heart with reduced motion. */
  private updateHeart(dt: number, player: PetPlayer): void {
    const heart = this.heart;
    if (!heart) return;
    if (this.heartMs <= 0) {
      heart.setVisible(false);
      return;
    }
    const total = HEAL_FRAMES * HEAL_FRAME_MS;
    const step = Math.min(HEAL_FRAMES - 1, Math.floor((total - this.heartMs) / HEAL_FRAME_MS));
    const frame = this.reducedMotion ? 0 : step;
    heart
      .setPosition(
        Math.round(player.x),
        Math.round(player.y + HEAL_START_DY - (this.reducedMotion ? 0 : step)),
      )
      .setFrame(frame)
      .setDepth(player.depth + HEART_ABOVE_PLAYER)
      .setVisible(true);
    this.heartMs -= dt;
  }

  destroy(): void {
    this.body.destroy();
    this.aura.destroy();
    for (const s of this.steam) s.destroy();
    this.steam.length = 0;
    this.heart?.destroy();
    this.heart = null;
  }
}

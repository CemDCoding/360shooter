import Phaser from 'phaser';
import { BOSS_TUNING } from '../../config/bosses';
import { THEME } from '../../config/theme';
import type { BossAttackDef } from '../../contracts';
import { BossBase, type BossContext } from './BossBase';
import { GhostOrb } from './GhostOrb';
import { Telegraph } from './Telegraph';

const T = BOSS_TUNING.forestGhost;
const FAN_SPREAD = Phaser.Math.DegToRad(T.fanSpreadDeg); // total opening angle
const SHIELD_COLOR = THEME.colors['mint.200'].num;

/**
 * Boss "Waldgeist" (AP-18, PE-34). Floats on a circle around the middle.
 * - fade: half transparent and invulnerable for a short time (announced by blinking, shield ring while it lasts).
 * - orbFan: warning lines, then 5 GhostOrbs in a fan towards the middle.
 * - decoys (extra attack): 2 decoys for a few seconds. They do not shoot and have no body; only the real one takes damage.
 * The scene reads `orbs` for the overlap with the player (orb.damage, orb.kill()) and destroys orbs with
 * lasers like the witch projectile (PE-37, one laser hits one orb, orb.kill()). Orbs need at least MIN_REACTION_MS
 * (PE-75) from the orbit to the player.
 * While invulnerable takeDamage does nothing, so lasers pass through; the scene still recycles them.
 */
export class ForestGhost extends BossBase {
  readonly orbs: GhostOrb[] = [];
  private orbitAngle = 0;
  private holdMovement = false;
  private fadeLeftMs = 0;
  private decoyLeftMs = 0;
  private decoys: Phaser.GameObjects.Sprite[] = [];
  private telegraphs: Telegraph[] = [];
  private shield?: Phaser.GameObjects.Graphics;

  constructor(scene: Phaser.Scene, levelId: number, ctx: BossContext = {}) {
    super(scene, 'forestGhost', levelId, ctx);
  }

  protected onSpawn(): void {
    this.orbitAngle = -Math.PI / 2;
    this.holdMovement = false;
    this.endFade();
    this.clearDecoys();
    this.placeOnOrbit();
  }

  despawn(): void {
    super.despawn();
    // Called once from the base constructor before the fields exist.
    if (!this.orbs) return;
    for (const t of this.telegraphs) t.cancel();
    this.telegraphs = [];
    for (const o of this.orbs) o.kill();
    this.endFade();
    this.clearDecoys();
  }

  protected behave(delta: number): void {
    if (!this.holdMovement) this.orbitAngle += (T.orbitSpeedRadPerSec * delta) / 1000;
    this.placeOnOrbit();

    if (this.fadeLeftMs > 0) {
      this.fadeLeftMs -= delta;
      if (this.fadeLeftMs <= 0) this.endFade();
      else this.drawShield();
    }
    if (this.decoyLeftMs > 0) {
      this.decoyLeftMs -= delta;
      if (this.decoyLeftMs <= 0) this.clearDecoys();
      else this.placeDecoys();
    }
    for (const o of this.orbs) o.tick(delta);
  }

  protected onTelegraph(attack: BossAttackDef): void {
    if (attack.id === 'orbFan') {
      // Hold still so the warning lines match the shot.
      this.holdMovement = true;
      const base = this.angleToCenter();
      const len = T.orbitRadius * 2.2;
      for (let i = 0; i < T.fanCount; i++) {
        const a = base + this.fanOffset(i);
        this.track(
          Telegraph.line(
            this.scene,
            this.x,
            this.y,
            this.x + Math.cos(a) * len,
            this.y + Math.sin(a) * len,
            T.warnLineWidth,
            attack.telegraphMs,
          ),
        );
      }
    } else if (attack.id === 'fade') {
      // Blink during the warning, then the shield starts.
      this.scene.tweens.add({
        targets: this,
        alpha: T.fadeAlpha,
        duration: attack.telegraphMs / 4,
        yoyo: true,
        repeat: 1,
      });
    } else if (attack.id === 'decoys') {
      this.track(Telegraph.circle(this.scene, this.x, this.y, 40, attack.telegraphMs));
    }
  }

  protected onAttack(attackId: string, damage: number): void {
    if (attackId === 'orbFan') {
      const base = this.angleToCenter();
      for (let i = 0; i < T.fanCount; i++) {
        this.takeOrb().fire(this.x, this.y, base + this.fanOffset(i), T.orbSpeedPxPerSec, damage, T.orbLifeMs);
      }
      this.holdMovement = false;
    } else if (attackId === 'fade') {
      this.scene.tweens.killTweensOf(this);
      this.fadeLeftMs = T.fadeDurationMs;
      this.invulnerable = true;
      this.setAlpha(T.fadeAlpha);
    } else if (attackId === 'decoys') {
      this.decoyLeftMs = T.decoyDurationMs;
      for (let i = 0; i < T.decoyCount; i++) {
        const d = this.scene.add
          .sprite(this.x, this.y, this.def.spriteKey)
          .setAlpha(T.decoyAlpha)
          .setDepth(this.depth - 0.1);
        this.decoys.push(d);
      }
      this.placeDecoys();
    }
  }

  private fanOffset(i: number): number {
    return (i / (T.fanCount - 1) - 0.5) * FAN_SPREAD;
  }

  private angleToCenter(): number {
    return Math.atan2(this.center.y - this.y, this.center.x - this.x);
  }

  private placeOnOrbit(): void {
    this.setPosition(
      this.center.x + Math.cos(this.orbitAngle) * T.orbitRadius,
      this.center.y + Math.sin(this.orbitAngle) * T.orbitRadius,
    );
  }

  private placeDecoys(): void {
    this.decoys.forEach((d, i) => {
      const a = this.orbitAngle + ((i + 1) * Math.PI * 2) / (T.decoyCount + 1);
      d.setPosition(this.center.x + Math.cos(a) * T.orbitRadius, this.center.y + Math.sin(a) * T.orbitRadius);
    });
  }

  private clearDecoys(): void {
    this.decoyLeftMs = 0;
    for (const d of this.decoys) d.destroy();
    this.decoys = [];
  }

  private drawShield(): void {
    if (!this.shield) this.shield = this.scene.add.graphics().setDepth(this.depth + 0.1);
    const g = this.shield;
    const pulse = 0.6 + 0.4 * Math.sin(this.scene.time.now / 90);
    g.clear();
    g.lineStyle(2, SHIELD_COLOR, pulse);
    g.strokeCircle(0, 0, 30);
    g.setPosition(this.x, this.y);
  }

  private endFade(): void {
    this.fadeLeftMs = 0;
    this.invulnerable = false;
    this.scene?.tweens?.killTweensOf(this);
    this.setAlpha(1);
    this.shield?.destroy();
    this.shield = undefined;
  }

  private takeOrb(): GhostOrb {
    const free = this.orbs.find((o) => !o.active);
    if (free) return free;
    const orb = new GhostOrb(this.scene, -200, -200);
    this.orbs.push(orb);
    return orb;
  }

  private track(t: Telegraph): void {
    this.telegraphs = this.telegraphs.filter((x) => x.active);
    this.telegraphs.push(t);
  }
}

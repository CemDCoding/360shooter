import type Phaser from 'phaser';
import type { BeeDef } from '../../contracts';
import type { Located } from '../../logic/pets';
import { Pet, PetSprite, petDepth, type PetWorld } from './Pet';
import { BeeMind, petAnchor, STING_WINDUP_REACH } from './petLogic';

const STING_KEY = 'pet-sting';
const STING_FRAMES = 2;
/** The sting spark shows each of its two frames this long (ms). */
const STING_FRAME_MS = 60;
const FRAME_WINDUP = 4;
const FRAME_STING = 5;

/** Sting sparks at the target (pet-sting 8x8 x 2), pooled. */
class StingSparks {
  private readonly items: { sprite: Phaser.GameObjects.Sprite; ms: number }[] = [];

  constructor(private readonly scene: Phaser.Scene) {}

  play(x: number, y: number, depth: number): void {
    if (!this.scene.textures.exists(STING_KEY)) return;
    let item = this.items.find((i) => i.ms <= 0);
    if (!item) {
      item = { sprite: this.scene.add.sprite(x, y, STING_KEY, 0), ms: 0 };
      this.items.push(item);
    }
    item.ms = STING_FRAMES * STING_FRAME_MS;
    item.sprite
      .setPosition(Math.round(x), Math.round(y))
      .setDepth(depth)
      .setFrame(0)
      .setVisible(true);
  }

  update(dtMs: number): void {
    for (const i of this.items) {
      if (i.ms <= 0) continue;
      i.ms -= Math.max(0, dtMs);
      if (i.ms <= 0) i.sprite.setVisible(false);
      else
        i.sprite.setFrame(
          Math.min(
            STING_FRAMES - 1,
            Math.floor((STING_FRAMES * STING_FRAME_MS - i.ms) / STING_FRAME_MS),
          ),
        );
    }
  }

  destroy(): void {
    for (const i of this.items) i.sprite.destroy();
    this.items.length = 0;
  }
}

/** Bee (PE-170): flies to the nearest enemy and stings; from power-up 1 a second bee. */
export class Bee<E extends Located> extends Pet<E> {
  private readonly bees: { body: PetSprite; mind: BeeMind<E> }[] = [];
  private readonly sparks: StingSparks;

  constructor(scene: Phaser.Scene, def: BeeDef, gearKey: string | null, start: Located) {
    super(scene, def, gearKey);
    this.sparks = new StingSparks(scene);
    this.addBee(start);
  }

  get beeCount(): number {
    return this.bees.length;
  }

  private addBee(at: Located): void {
    this.bees.push({
      body: new PetSprite(this.scene, 'bee', this.gearKey, at.x, at.y),
      mind: new BeeMind<E>(at),
    });
  }

  update(dtMs: number, world: PetWorld<E>): void {
    const { player, stats, enemies } = world;
    while (this.bees.length < stats.count) {
      this.addBee(petAnchor(player, player.flipX, 'bee', this.bees.length));
    }
    const depth = petDepth(player.depth);
    let firstTarget: E | null = null;
    this.bees.forEach(({ body, mind }, i) => {
      const home = petAnchor(player, player.flipX, 'bee', i);
      const step = mind.step(
        dtMs,
        home,
        enemies,
        stats.speedPxPerSec,
        stats.cooldownMs,
        i > 0 ? firstTarget : null,
      );
      if (i === 0) firstTarget = mind.currentTarget;
      const target = step.target;
      if (step.stung) {
        world.damage(step.stung, stats.damage, 'hit');
        this.sparks.play(step.stung.x, step.stung.y, depth + 0.1);
        body.showAttack(FRAME_STING);
      } else if (target) {
        body.holdWindup(
          Math.hypot(target.x - step.x, target.y - step.y) <= STING_WINDUP_REACH,
          FRAME_WINDUP,
        );
      }
      // Pets look right; on the way to a target the bee faces it, at home it follows the mirroring.
      const flip = target ? target.x < step.x : player.flipX;
      body.place(step.x, step.y, flip, depth, dtMs);
    });
    this.sparks.update(dtMs);
  }

  destroy(): void {
    for (const b of this.bees) b.body.destroy();
    this.bees.length = 0;
    this.sparks.destroy();
  }
}

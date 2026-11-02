import type Phaser from 'phaser';
import type { PetDef, PetRoundState } from '../../contracts';
import { lowAlphaAt, type FocusView } from '../../logic/effectRank';
import { petBarFraction, type Located } from '../../logic/pets';
import { Bee } from './Bee';
import { Capybara } from './Capybara';
import type { Pet, PetPlayer, PetWorld } from './Pet';
import { PetEgg } from './PetEgg';
import { Penguin } from './Penguin';
import { petAnchor } from './petLogic';

/** Creates the hatched pet for its role (sting, snowball, aura). */
export function createPet<E extends Located>(
  scene: Phaser.Scene,
  def: PetDef,
  gearKey: string | null,
  start: Located,
): Pet<E> {
  switch (def.role) {
    case 'sting':
      return new Bee<E>(scene, def, gearKey, start);
    case 'snowball':
      return new Penguin<E>(scene, def, gearKey, start);
    case 'aura':
      return new Capybara<E>(scene, def, gearKey, start);
  }
}

/** A display object of the pet whose opacity the quicktime focus sets (AP-173). */
export interface FadedObject {
  alpha: number;
  readonly x: number;
  readonly y: number;
  readonly type?: string;
  readonly scene?: unknown;
  setAlpha(alpha: number): unknown;
}

function isFaded(o: unknown): o is FadedObject {
  return (
    typeof o === 'object' &&
    o !== null &&
    typeof (o as { setAlpha?: unknown }).setAlpha === 'function'
  );
}

/**
 * The scene as egg and pet see it (AP-173): the same scene, but every display object they create through
 * `scene.add` is recorded in `sink`, so the focus can fade egg, pet, aura, steam, hearts, stings and snowballs
 * (all rank 4) without hooks in every pet class. One wrapper per factory method, created on first use.
 */
export function recordingScene(
  scene: Phaser.Scene,
  sink: Map<FadedObject, FadeState>,
): Phaser.Scene {
  const factory = scene.add;
  const wrapped = new Map<PropertyKey, unknown>();
  const add = new Proxy(factory, {
    get(target, prop) {
      const value: unknown = Reflect.get(target, prop);
      if (typeof value !== 'function') return value;
      let fn = wrapped.get(prop);
      if (!fn) {
        fn = (...args: unknown[]): unknown => {
          const made: unknown = (value as (...a: unknown[]) => unknown).apply(target, args);
          if (isFaded(made) && !sink.has(made)) sink.set(made, { base: 1, shown: Number.NaN });
          return made;
        };
        wrapped.set(prop, fn);
      }
      return fn;
    },
  });
  return new Proxy(scene, {
    get: (target, prop) => (prop === 'add' ? add : Reflect.get(target, prop)),
  });
}

/** Own opacity of a pet object (set by the pet code) and the value the focus showed last. */
export interface FadeState {
  base: number;
  shown: number;
}

/**
 * The active pet of one round (AP-144): starts as an egg, hatches when the bar is full the first time and
 * then fights. The round state (bar, power-ups) lives in the GameScene and comes in via setRound.
 */
export class PetCompanion<E extends Located> {
  private egg: PetEgg | null;
  private pet: Pet<E> | null = null;
  private round: PetRoundState | null = null;
  /** Display objects of egg and pet (AP-173), for the focus opacity. */
  private readonly faded = new Map<FadedObject, FadeState>();
  private readonly view: Phaser.Scene;

  constructor(
    scene: Phaser.Scene,
    readonly def: PetDef,
    private readonly gearKey: string | null,
    player: PetPlayer,
  ) {
    this.view = recordingScene(scene, this.faded);
    this.egg = new PetEgg(this.view, def.id, petAnchor(player, player.flipX, 'penguin'));
  }

  /** True once the pet is out of the egg and fights. */
  get hatched(): boolean {
    return this.pet !== null;
  }

  setRound(state: PetRoundState): void {
    this.round = state;
    if (state.phase === 'hatched') this.egg?.startHatch();
  }

  /** One step on play time; the pet fights only after the hatch picture is over. */
  update(dtMs: number, world: PetWorld<E>): void {
    if (this.egg) {
      const fraction = this.round ? petBarFraction(this.round) : 0;
      const stage = this.egg.update(dtMs, world.player, fraction);
      if (stage !== 'pet') return;
      const at = this.egg.position;
      this.egg.destroy();
      this.egg = null;
      this.pet = createPet<E>(this.view, this.def, this.gearKey, at);
    }
    this.pet?.update(dtMs, world);
  }

  /**
   * Quicktime focus (AP-173): egg, pet, aura and pet projectiles are rank 4. Multiplies the pet's own opacity
   * of every object with the rank 4 opacity at its place (graphics without an own position, like the aura, count
   * as near the astronaut). Call after update(); a value the pet code set since then is taken as its own.
   */
  setEffectAlpha(view: FocusView): void {
    for (const [o, s] of this.faded) {
      if (!o.scene) {
        this.faded.delete(o);
        continue;
      }
      if (o.alpha !== s.shown) s.base = o.alpha;
      const a =
        o.type === 'Graphics' ? lowAlphaAt(view, view.x, view.y) : lowAlphaAt(view, o.x, o.y);
      s.shown = s.base * a;
      o.setAlpha(s.shown);
      // Phaser clamps alpha to 0..1; remember what it really shows so the next frame compares like with like.
      s.shown = o.alpha;
    }
  }

  destroy(): void {
    this.egg?.destroy();
    this.egg = null;
    this.pet?.destroy();
    this.pet = null;
    this.round = null;
    this.faded.clear();
  }
}

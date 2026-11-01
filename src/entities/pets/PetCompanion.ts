import type Phaser from 'phaser';
import type { PetDef, PetRoundState } from '../../contracts';
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

/**
 * The active pet of one round (AP-144): starts as an egg, hatches when the bar is full the first time and
 * then fights. The round state (bar, power-ups) lives in the GameScene and comes in via setRound.
 */
export class PetCompanion<E extends Located> {
  private egg: PetEgg | null;
  private pet: Pet<E> | null = null;
  private round: PetRoundState | null = null;

  constructor(
    private readonly scene: Phaser.Scene,
    readonly def: PetDef,
    private readonly gearKey: string | null,
    player: PetPlayer,
  ) {
    this.egg = new PetEgg(scene, def.id, petAnchor(player, player.flipX, 'penguin'));
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
      this.pet = createPet<E>(this.scene, this.def, this.gearKey, at);
    }
    this.pet?.update(dtMs, world);
  }

  destroy(): void {
    this.egg?.destroy();
    this.egg = null;
    this.pet?.destroy();
    this.pet = null;
    this.round = null;
  }
}

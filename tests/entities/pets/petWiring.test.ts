import { describe, expect, it } from 'vitest';
import game from '../../../src/scenes/GameScene.ts?raw';
import hud from '../../../src/scenes/HudScene.ts?raw';

// GameScene and HudScene cannot be imported in vitest: the pet wiring (AP-144) is checked on the source text.

function body(src: string, name: string): string {
  const start = src.indexOf(`private ${name}(`);
  expect(start).toBeGreaterThan(-1);
  const next = src.indexOf('\n  private ', start + 1);
  return src.slice(start, next === -1 ? undefined : next);
}

describe('pet wiring in the GameScene', () => {
  it('creates the pet only with an active pet and starts the bar per round', () => {
    const create = body(game, 'createPet');
    expect(create).toContain('if (!petId) return;');
    expect(create).toContain('createPetRound(this.level)');
  });

  it('feeds every kill and the boss into the bar, weighted by killWeight', () => {
    expect(body(game, 'onEnemyKilled')).toContain('this.addPetKills(false)');
    expect(body(game, 'onBossDefeated')).toContain('this.addPetKills(true)');
    const add = body(game, 'addPetKills');
    expect(add).toContain('addPetXp(round, killWeight(isBoss))');
    expect(add).toContain('this.ended');
    expect(body(game, 'emitPet')).toContain('GameEvents.PetChanged');
  });

  it('routes pet damage through damageEnemy and healing through Player.heal', () => {
    const upd = body(game, 'updatePet');
    expect(upd).toContain('this.damageEnemy(e, amount, flash)');
    expect(upd).toContain('this.player.heal(hp)');
    expect(upd).toContain('e.applySlow(effect)');
  });

  it('sends the pet state to a new HUD and cleans up on shutdown', () => {
    const start = game.indexOf('private readonly sendHudStartState');
    expect(game.slice(start, start + 400)).toContain('this.emitPet()');
    const cleanup = body(game, 'cleanup');
    expect(cleanup).toContain('this.pet?.destroy()');
    expect(cleanup).toContain('this.petRound = null');
  });

  it('leaves aiming and quicktime alone', () => {
    expect(body(game, 'tryParryTap')).not.toContain('pet');
    expect(body(game, 'updateParry')).not.toContain('pet');
  });
});

describe('pet bar wiring in the HudScene', () => {
  it('listens to pet-changed and removes the listener and the bar on shutdown', () => {
    expect(hud).toContain('this.gameEvents.on(GameEvents.PetChanged, this.onPet, this)');
    const cleanup = body(hud, 'cleanup');
    expect(cleanup).toContain('this.gameEvents.off(GameEvents.PetChanged, this.onPet, this)');
    expect(cleanup).toContain('this.petBar?.destroy()');
  });

  it('creates the bar only with the first pet state', () => {
    const onPet = body(hud, 'onPet');
    expect(onPet).toContain('if (!this.petBar)');
    expect(onPet).toContain('this.petBarPlace()');
    expect(body(hud, 'petBarPlace')).toContain('petBarRect(');
  });

  it('moves the bar with every chip relayout', () => {
    expect(body(hud, 'relayoutChips')).toContain('this.petBar?.moveTo(this.petBarPlace())');
  });
});

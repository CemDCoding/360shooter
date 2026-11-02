import { describe, expect, it } from 'vitest';
import game from '../../src/scenes/GameScene.ts?raw';
import { collectPetTargets, inAura, nearestTarget, type PetBossPart } from '../../src/logic/pets';

// AP-164 (PE-205): cause of "the pet does not attack the boss" = in a boss round the enemy pool is empty and
// bosses were never added to the pet target list. GameScene cannot be imported: wiring is checked on the text.

interface Foe {
  x: number;
  y: number;
  active: boolean;
}
const foe = (x: number, active = true): Foe => ({ x, y: 0, active });
const part = (x: number, over: Partial<PetBossPart> = {}): PetBossPart => ({
  x,
  y: 0,
  active: true,
  isInvulnerable: false,
  ...over,
});

describe('collectPetTargets', () => {
  it('in the boss round (empty pool) the living boss is a target (regression)', () => {
    const out: (Foe | PetBossPart)[] = [];
    const boss = part(300);
    collectPetTargets<Foe, PetBossPart>(out, [], [boss]);
    expect(out).toEqual([boss]);
    expect(nearestTarget({ x: 0, y: 0 }, out)).toBe(boss);
    expect(inAura({ x: 290, y: 0 }, 70, out)).toEqual([boss]);
  });

  it('both stone fragments are targets', () => {
    const out: (Foe | PetBossPart)[] = [];
    const a = part(100);
    const b = part(200);
    collectPetTargets<Foe, PetBossPart>(out, [], [a, b]);
    expect(out).toEqual([a, b]);
  });

  it('invulnerable (ghost phase) and dead bosses are no targets', () => {
    const out: (Foe | PetBossPart)[] = [];
    collectPetTargets<Foe, PetBossPart>(
      out,
      [],
      [part(1, { isInvulnerable: true }), part(2, { active: false })],
    );
    expect(out).toEqual([]);
  });

  it('keeps active pool enemies, skips inactive ones, and reuses the array', () => {
    const out: (Foe | PetBossPart)[] = [foe(9)];
    const ref = out;
    const a = foe(1);
    collectPetTargets<Foe, PetBossPart>(out, [a, foe(2, false)], [part(5)]);
    expect(out).toBe(ref);
    expect(out).toHaveLength(2);
    expect(out[0]).toBe(a);
  });
});

describe('pet wiring for bosses in the GameScene', () => {
  const start = game.indexOf('private updatePet(');
  const upd = game.slice(start, game.indexOf('\n  private ', start + 1));

  it('adds boss parts to the targets and damages bosses through takeDamage', () => {
    expect(upd).toContain('collectPetTargets(');
    expect(upd).toContain('this.enemyPool.enemies');
    expect(upd).toContain('this.bossParts()');
    expect(upd).toContain('e instanceof BossBase');
    expect(upd).toContain('e.takeDamage(amount)');
  });

  it('never slows a boss and no longer claims bosses are not in the pool', () => {
    expect(upd).toContain('if (!(e instanceof BossBase)) e.applySlow(effect)');
    expect(game).not.toContain('Only pool enemies are targets');
  });
});

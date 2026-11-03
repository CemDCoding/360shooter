import { describe, expect, it } from 'vitest';
import src from '../../src/scenes/GameScene.ts?raw';

// GameScene cannot be imported in vitest, so the wiring is checked on the source text (AP-178).

function body(name: string): string {
  const start = src.indexOf(`private ${name}(`);
  expect(start).toBeGreaterThan(-1);
  const next = src.indexOf('\n  private ', start + 1);
  return src.slice(start, next === -1 ? undefined : next);
}

describe('elite wiring in GameScene (AP-178)', () => {
  it('a kill reads the elite flag of the enemy and the rule guaranteedDrop', () => {
    expect(body('onEnemyKilled')).toContain('elite: enemy.isElite && ELITE_RULES.guaranteedDrop');
  });

  it('the item roll of a pending drop is guaranteed for an elite', () => {
    const b = body('spawnDrops');
    expect(b).toContain('coinValue, coinChance, elite');
    expect(b).toContain('rollDrop(this.rng, itemRules, ITEMS, elite)');
  });

  it('the director spawn marks the enemy as elite and the scale carries hp and damage', () => {
    expect(body('spawnEnemies')).toContain('req.elite === true');
    const b = body('spawnScaled');
    expect(b).toContain('eliteScale(scale, ELITE_RULES)');
    expect(b).toContain('e.markElite(ELITE_RULES.scaleMul)');
  });
});

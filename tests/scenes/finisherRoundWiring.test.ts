import { describe, expect, it } from 'vitest';
import game from '../../src/scenes/GameScene.ts?raw';

// GameScene cannot be imported in vitest: the finisher wiring (AP-161) is checked on the source text.

function body(src: string, name: string): string {
  const start = src.indexOf(`private ${name}(`);
  expect(start).toBeGreaterThan(-1);
  const next = src.indexOf('\n  private ', start + 1);
  return src.slice(start, next === -1 ? undefined : next);
}

describe('finisher wiring in the GameScene', () => {
  const end = body(game, 'endRound');
  const fin = body(game, 'startFinisher');

  it('starts the finisher only in the won branch with a defeated boss', () => {
    expect(game.split('FINISHER_SCENE_KEY').length - 1).toBe(2); // import + one launch
    expect(end).toContain("result === 'won' && this.bossDefeatedFlag");
    expect(end).toContain('this.startFinisher(');
    expect(fin).toContain('this.scene.launch(FINISHER_SCENE_KEY, data)');
    expect(fin).toContain('this.scene.pause()');
  });
  it('keeps the result scene for all other branches', () => {
    const finisherAt = end.indexOf('this.startFinisher(');
    expect(end).toContain("this.scene.start('ResultScene', data)");
    expect(finisherAt).toBeLessThan(end.indexOf("this.scene.start('ResultScene'"));
    expect(body(game, 'abortRound')).not.toContain('Finisher');
  });
  it('saves before the sequence starts', () => {
    expect(end.indexOf('writeSave(')).toBeGreaterThan(-1);
    expect(end.indexOf('writeSave(')).toBeLessThan(end.indexOf('this.startFinisher('));
  });
  it('builds the plan from the save and marks it seen', () => {
    expect(fin).toContain('buildFinisher(');
    expect(fin).toContain('save.reduceEffects === true || prefersReducedMotion()');
    expect(fin).toContain('markFinisherSeen(plan.variantId)');
  });
  it('the end of the round runs only once', () => {
    expect(end).toContain('if (this.ended) return;');
  });
});

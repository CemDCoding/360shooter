import { describe, expect, it } from 'vitest';
import boss from '../../src/entities/bosses/BossBase.ts?raw';
import assistLogic from '../../src/logic/assist.ts?raw';
import game from '../../src/scenes/GameScene.ts?raw';
import hud from '../../src/scenes/HudScene.ts?raw';

const norm = (s: string): string => s.replace(/\r\n/g, '\n');

describe('hidden assist wiring (AP-172)', () => {
  it('GameScene applies the factors at the start from the save', () => {
    const g = norm(game);
    expect(g).toContain('assistFactors(this.level.id, this.assistStage)');
    expect(g).toContain('save.assistLosses');
    expect(g).toContain('this.assist.enemyHp');
    expect(g).toContain('this.assist.spawnInterval');
    expect(g).toContain('hpFactor: this.assist.bossHp');
    expect(g).toContain('damageFactor: this.assist.bossDamage');
  });
  it('reports the result only in endRound, never in abortRound', () => {
    const g = norm(game);
    const end = g.slice(
      g.indexOf('private endRound('),
      g.indexOf('private readonly onAbortRequested'),
    );
    const abort = g.slice(g.indexOf('private abortRound('), g.indexOf('Auto pause when the page'));
    expect(end).toContain('recordResult(');
    expect(abort.length).toBeGreaterThan(50);
    expect(abort).not.toContain('recordResult');
    expect(abort).not.toContain('writeSave');
    expect(g.match(/recordResult\(/g)).toHaveLength(1);
  });
  it('a debug round does not use the assist', () => {
    expect(norm(game)).toMatch(/this\.debugRound\s*\?\s*0\s*:/);
  });
  it('the stage is only drawn into the fps debug line', () => {
    const h = norm(hud);
    expect(h).toMatch(/if \(this\.fpsText\) \{[\s\S]*this\.assistStage[\s\S]*\}/);
    expect(h.match(/setFunk\([^)]*assist/gi)).toBeNull();
  });
  it('the boss takes optional factors with default 1', () => {
    const b = norm(boss);
    expect(b).toContain('hpFactor?: number');
    expect(b).toContain('damageFactor?: number');
    expect(b).toContain('factorOrOne');
  });
  it('factors come from config only (no literals in the logic)', () => {
    const l = norm(assistLogic);
    expect(l).toContain("from '../config/assist'");
    expect(l).not.toMatch(/0\.92|1\.06|0\.9\b/);
  });
});

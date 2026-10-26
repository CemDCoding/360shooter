import { describe, expect, it } from 'vitest';
import { getLevel } from '../../src/config';
import type { LevelDef } from '../../src/contracts';
import { RoundState } from '../../src/logic/round';

function make(id: number): RoundState {
  const level = getLevel(id);
  if (!level) throw new Error('level missing');
  return new RoundState(level);
}

/** Round without boss (the old rules of M1). */
function makeWithoutBoss(id: number): RoundState {
  return new RoundState({ ...(getLevel(id) as LevelDef), bossId: undefined });
}

describe('RoundState', () => {
  it('starts running with the full duration (180 s and 300 s)', () => {
    expect(make(0).remainingMs).toBe(180_000);
    expect(make(3).remainingMs).toBe(300_000);
    expect(make(0).status).toBe('running');
  });

  it('is won when the timer runs out, the player lives and the boss is defeated', () => {
    const r = make(0);
    r.tick(179_999);
    expect(r.status).toBe('running');
    r.bossDefeated();
    expect(r.status).toBe('won');
    expect(r.remainingMs).toBe(1);
  });

  it('a level without boss is won at the timer end', () => {
    const r = makeWithoutBoss(0);
    expect(r.requiresBossDefeat).toBe(false);
    r.tick(179_999);
    expect(r.status).toBe('running');
    r.tick(1);
    expect(r.status).toBe('won');
    expect(r.bossPhase).toBe('none');
    expect(r.bossFight).toBe(false);
  });

  it('loses when the player dies', () => {
    const r = make(0);
    r.tick(1000);
    r.playerDied();
    expect(r.status).toBe('lost');
  });

  it('loss takes precedence over a simultaneous timer end', () => {
    const r = makeWithoutBoss(0);
    r.tick(179_000);
    r.playerDied();
    r.tick(5000);
    expect(r.status).toBe('lost');
  });

  it('ignores ticks and deaths after the end', () => {
    const r = makeWithoutBoss(0);
    r.tick(180_000);
    r.playerDied();
    expect(r.status).toBe('won');
    r.tick(-5);
    r.tick(Number.NaN);
    expect(r.remainingMs).toBe(0);
  });

  it('reports the final minute', () => {
    const r = makeWithoutBoss(3);
    expect(r.isFinalMinute).toBe(false);
    r.tick(239_000);
    expect(r.isFinalMinute).toBe(false);
    r.tick(1000);
    expect(r.isFinalMinute).toBe(true);
    r.tick(60_000);
    expect(r.isFinalMinute).toBe(false);
  });

  it('every level requires the boss defeat (PE-18)', () => {
    for (let id = 0; id <= 20; id++) expect(make(id).requiresBossDefeat).toBe(true);
  });

  it('warns at 33 s and shows the boss at 30 s remaining', () => {
    const r = make(0);
    expect(r.bossPhase).toBe('none');
    r.tick(146_999);
    expect(r.bossPhase).toBe('none');
    r.tick(1);
    expect(r.remainingMs).toBe(33_000);
    expect(r.bossPhase).toBe('warning');
    r.tick(2999);
    expect(r.bossPhase).toBe('warning');
    r.tick(1);
    expect(r.remainingMs).toBe(30_000);
    expect(r.bossPhase).toBe('active');
  });

  it('keeps running after the timer end while the boss lives', () => {
    const r = make(3);
    r.tick(300_000);
    expect(r.remainingMs).toBe(0);
    expect(r.status).toBe('running');
    expect(r.bossFight).toBe(true);
    r.tick(60_000);
    expect(r.status).toBe('running');
    r.bossDefeated();
    expect(r.status).toBe('won');
    expect(r.bossFight).toBe(false);
    expect(r.bossPhase).toBe('defeated');
  });

  it('is won at once by a boss defeat while time remains (PE-76)', () => {
    const r = make(0);
    r.tick(150_000);
    expect(r.bossPhase).toBe('active');
    r.bossDefeated();
    expect(r.status).toBe('won');
    expect(r.bossFight).toBe(false);
    expect(r.remainingMs).toBeGreaterThan(0);
  });

  it('ignores a boss defeat before the boss appeared', () => {
    const r = make(0);
    r.tick(100_000);
    r.bossDefeated();
    r.tick(80_000);
    expect(r.status).toBe('running');
    expect(r.bossFight).toBe(true);
  });

  it('loses in the boss fight, the boss defeat comes too late', () => {
    const r = make(0);
    r.tick(180_000);
    expect(r.bossFight).toBe(true);
    r.playerDied();
    expect(r.status).toBe('lost');
    expect(r.bossFight).toBe(false);
    r.bossDefeated();
    expect(r.status).toBe('lost');
  });

  it('loss has priority over the boss defeat in the same moment', () => {
    const r = make(0);
    r.tick(180_000);
    r.playerDied();
    r.bossDefeated();
    expect(r.status).toBe('lost');
  });
});

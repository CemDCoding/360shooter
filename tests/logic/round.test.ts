import { describe, expect, it } from 'vitest';
import { getLevel } from '../../src/config';
import { RoundState } from '../../src/logic/round';

function make(id: number): RoundState {
  const level = getLevel(id);
  if (!level) throw new Error('level missing');
  return new RoundState(level);
}

describe('RoundState', () => {
  it('starts running with the full duration (180 s and 300 s)', () => {
    expect(make(0).remainingMs).toBe(180_000);
    expect(make(3).remainingMs).toBe(300_000);
    expect(make(0).status).toBe('running');
  });

  it('is won when the timer runs out and the player lives', () => {
    const r = make(0);
    r.tick(179_999);
    expect(r.status).toBe('running');
    r.tick(1);
    expect(r.status).toBe('won');
    expect(r.remainingMs).toBe(0);
  });

  it('loses when the player dies', () => {
    const r = make(0);
    r.tick(1000);
    r.playerDied();
    expect(r.status).toBe('lost');
  });

  it('loss takes precedence over a simultaneous timer end', () => {
    const r = make(0);
    r.tick(179_000);
    r.playerDied();
    r.tick(5000);
    expect(r.status).toBe('lost');
  });

  it('ignores ticks and deaths after the end', () => {
    const r = make(0);
    r.tick(180_000);
    r.playerDied();
    expect(r.status).toBe('won');
    r.tick(-5);
    r.tick(Number.NaN);
    expect(r.remainingMs).toBe(0);
  });

  it('reports the final minute', () => {
    const r = make(3);
    expect(r.isFinalMinute).toBe(false);
    r.tick(239_000);
    expect(r.isFinalMinute).toBe(false);
    r.tick(1000);
    expect(r.isFinalMinute).toBe(true);
    r.tick(60_000);
    expect(r.isFinalMinute).toBe(false);
  });

  it('boss extension point is off in M1', () => {
    const r = make(0);
    expect(r.requiresBossDefeat).toBe(false);
    r.bossDefeated();
    expect(r.status).toBe('running');
  });
});

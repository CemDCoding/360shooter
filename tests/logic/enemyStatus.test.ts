import { describe, expect, it } from 'vitest';
import { getGearPiece } from '../../src/config/gear';
import {
  applyBurn,
  applySlow,
  createEnemyStatus,
  enemySpeedFactor,
  tickEnemyStatus,
} from '../../src/logic/enemyStatus';
import { burnOnHit, gearModifiers } from '../../src/logic/gear';

describe('enemy burn', () => {
  it('hell body burn deals 5/s for 3 s, 15 in total', () => {
    const piece = getGearPiece('gear-hell-body');
    expect(piece).toBeDefined();
    const burn = burnOnHit(gearModifiers({ head: null, body: 'gear-hell-body', legs: null }));
    if (!burn) throw new Error('burn missing');
    let s = applyBurn(createEnemyStatus(), burn);
    let total = 0;
    for (let i = 0; i < 30; i++) {
      const r = tickEnemyStatus(s, 100);
      total += r.damage;
      s = r.state;
    }
    expect(total).toBeCloseTo(15);
    expect(s).toEqual(createEnemyStatus());
    expect(tickEnemyStatus(s, 1000).damage).toBe(0);
  });
  it('a huge dt only deals the remaining time', () => {
    const s = applyBurn(createEnemyStatus(), { durationMs: 1000, dps: 4 });
    expect(tickEnemyStatus(s, 60000).damage).toBeCloseTo(4);
  });
  it('a new burn refreshes the time and does not stack', () => {
    let s = applyBurn(createEnemyStatus(), { durationMs: 3000, dps: 5 });
    s = tickEnemyStatus(s, 2000).state;
    s = applyBurn(s, { durationMs: 3000, dps: 5 });
    expect(s.burnMsLeft).toBe(3000);
    expect(s.burnDps).toBe(5);
    expect(tickEnemyStatus(s, 1000).damage).toBeCloseTo(5);
  });
  it('the stronger burn wins', () => {
    let s = applyBurn(createEnemyStatus(), { durationMs: 3000, dps: 8 });
    s = applyBurn(s, { durationMs: 1000, dps: 5 });
    expect(s).toMatchObject({ burnMsLeft: 3000, burnDps: 8 });
  });
  it('ignores invalid input and does not mutate the input', () => {
    const base = createEnemyStatus();
    expect(applyBurn(base, { durationMs: Number.NaN, dps: 5 })).toEqual(base);
    expect(applyBurn(base, { durationMs: 1000, dps: -1 })).toEqual(base);
    applyBurn(base, { durationMs: 1000, dps: 5 });
    expect(base).toEqual(createEnemyStatus());
    expect(tickEnemyStatus(applyBurn(base, { durationMs: 1000, dps: 5 }), -100).damage).toBe(0);
  });
});

describe('enemy slow', () => {
  it('gives the speed factor while active', () => {
    let s = applySlow(createEnemyStatus(), { slow: 0.4, durationMs: 1500 });
    expect(enemySpeedFactor(s)).toBeCloseTo(0.6);
    let r = tickEnemyStatus(s, 1000);
    expect(r.speedFactor).toBeCloseTo(0.6);
    s = r.state;
    r = tickEnemyStatus(s, 500);
    expect(r.speedFactor).toBe(1);
    expect(r.state).toEqual(createEnemyStatus());
  });
  it('the stronger slow wins, nothing multiplies', () => {
    let s = applySlow(createEnemyStatus(), { slow: 0.3, durationMs: 500 });
    s = applySlow(s, { slow: 0.4, durationMs: 1500 });
    s = applySlow(s, { slow: 0.3, durationMs: 500 });
    expect(s).toMatchObject({ slow: 0.4, slowMsLeft: 1500 });
    expect(enemySpeedFactor(s)).toBeCloseTo(0.6);
  });
  it('the same slow refreshes its time', () => {
    let s = applySlow(createEnemyStatus(), { slow: 0.4, durationMs: 1500 });
    s = tickEnemyStatus(s, 1000).state;
    s = applySlow(s, { slow: 0.4, durationMs: 1500 });
    expect(s.slowMsLeft).toBe(1500);
  });
  it('clamps the slow to 0..1 and ignores invalid values', () => {
    const s = applySlow(createEnemyStatus(), { slow: 5, durationMs: 100 });
    expect(enemySpeedFactor(s)).toBe(0);
    expect(applySlow(createEnemyStatus(), { slow: Number.NaN, durationMs: 100 })).toEqual(
      createEnemyStatus(),
    );
  });
  it('burn and slow run independently', () => {
    let s = applyBurn(createEnemyStatus(), { durationMs: 1000, dps: 10 });
    s = applySlow(s, { slow: 0.5, durationMs: 2000 });
    const r = tickEnemyStatus(s, 1500);
    expect(r.damage).toBeCloseTo(10);
    expect(r.speedFactor).toBeCloseTo(0.5);
    expect(r.state.burnMsLeft).toBe(0);
  });
  it('without effects the enemy is unchanged', () => {
    const r = tickEnemyStatus(createEnemyStatus(), 16);
    expect(r).toEqual({ state: createEnemyStatus(), damage: 0, speedFactor: 1 });
  });
});

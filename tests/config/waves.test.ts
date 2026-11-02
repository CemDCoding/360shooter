import { describe, expect, it } from 'vitest';
import { ENEMIES } from '../../src/config/enemies';
import { LEVELS } from '../../src/config/levels';
import {
  BOSS_WARNING_SEC,
  ELITE_RULES,
  ROLE_CAPS,
  WAVE_PLANS,
  EVENT_FROM_LEVEL,
} from '../../src/config/waves';

const ROLES = ['melee', 'fast', 'shooter', 'tank', 'aura'];

describe('waves config (AP-174)', () => {
  it('every enemy has threatCost and role', () => {
    for (const e of Object.values(ENEMIES)) {
      expect(e.threatCost, e.id).toBeGreaterThan(0);
      expect(ROLES, e.id).toContain(e.role);
    }
  });

  it('has a plan for every level 0 to 40', () => {
    expect(WAVE_PLANS).toHaveLength(41);
    expect(LEVELS).toHaveLength(41);
  });

  it('last pacing cycle ends before the boss warning, 3 or 5 cycles', () => {
    for (const level of LEVELS) {
      const { pacing } = { pacing: WAVE_PLANS[level.id].pacing };
      const cycles = level.durationSec === 180 ? 3 : 5;
      expect(cycles * pacing.cycleSec).toBeLessThanOrEqual(level.durationSec - BOSS_WARNING_SEC);
      expect((cycles + 1) * pacing.cycleSec).toBeGreaterThan(level.durationSec - BOSS_WARNING_SEC);
      expect(pacing.peakSec).toBeGreaterThanOrEqual(5);
      expect(pacing.peakSec).toBeLessThanOrEqual(8);
      expect(pacing.relaxSec).toBeGreaterThanOrEqual(8);
      expect(pacing.relaxSec).toBeLessThanOrEqual(12);
      expect(pacing.relaxRate).toBe(0.25);
      expect(pacing.cycleSec).toBeGreaterThan(pacing.peakSec + pacing.relaxSec);
    }
  });

  it('events lie in peaks and before the boss warning', () => {
    for (const level of LEVELS) {
      const plan = WAVE_PLANS[level.id];
      const { cycleSec, peakSec, relaxSec } = plan.pacing;
      const buildSec = cycleSec - peakSec - relaxSec;
      for (const ev of plan.events) {
        const inCycle = ev.atSec % cycleSec;
        expect(inCycle).toBeGreaterThanOrEqual(buildSec);
        expect(inCycle).toBeLessThan(buildSec + peakSec);
        expect(ev.atSec).toBeLessThan(level.durationSec - BOSS_WARNING_SEC);
        expect(level.id).toBeGreaterThanOrEqual(EVENT_FROM_LEVEL[ev.kind]);
        expect(ev.count).toBeLessThan(level.maxEnemies);
      }
    }
  });

  it('opens event kinds by level', () => {
    expect(new Set(WAVE_PLANS[0].events.map((e) => e.kind))).toEqual(new Set(['ring']));
    expect(WAVE_PLANS[5].events.some((e) => e.kind === 'swarm')).toBe(true);
    expect(WAVE_PLANS[10].events.some((e) => e.kind === 'pincer')).toBe(true);
  });

  it('minAlive stays below maxEnemies', () => {
    for (const level of LEVELS) {
      expect(WAVE_PLANS[level.id].minAlive).toBeGreaterThan(0);
      expect(WAVE_PLANS[level.id].minAlive).toBeLessThan(level.maxEnemies);
    }
  });

  it('role caps and elites', () => {
    expect(ROLE_CAPS.shooter).toBe(3);
    expect(ROLE_CAPS.aura).toBe(4);
    expect(ELITE_RULES.enabled).toBe(false);
    expect(ELITE_RULES.fromLevel).toBe(3);
    expect(ELITE_RULES.costMul).toBe(6);
  });

  it('level definitions stay without the optional M12 fields', () => {
    for (const level of LEVELS) {
      expect(level.minAlive).toBeUndefined();
      expect(level.pacing).toBeUndefined();
      expect(level.events).toBeUndefined();
    }
  });
});

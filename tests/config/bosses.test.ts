import { describe, expect, it } from 'vitest';
import { BOSS_TUNING, BOSSES, MIN_REACTION_MS, MIN_TELEGRAPH_MS } from '../../src/config/bosses';
import { WEAPON_MOUNT } from '../../src/config/weaponMount';
import { flightTimeMs } from '../../src/entities/bosses/bossGeometry';

function numbers(o: unknown, path = ''): [string, number][] {
  if (typeof o === 'number') return [[path, o]];
  if (o && typeof o === 'object') {
    return Object.entries(o).flatMap(([k, v]) => numbers(v, path ? `${path}.${k}` : k));
  }
  return [];
}

describe('boss config (PE-75)', () => {
  it('announces every attack at least MIN_TELEGRAPH_MS and keeps the cooldown above it', () => {
    for (const def of Object.values(BOSSES)) {
      for (const a of def.attacks) {
        expect(a.telegraphMs, `${def.id}.${a.id}`).toBeGreaterThanOrEqual(MIN_TELEGRAPH_MS);
        expect(a.cooldownMs, `${def.id}.${a.id}`).toBeGreaterThan(a.telegraphMs);
      }
    }
  });

  it('announces fade for 1 s', () => {
    const fade = BOSSES.forestGhost.attacks.find((a) => a.id === 'fade');
    expect(fade?.telegraphMs).toBe(1000);
  });

  it('lets lasers hit the bud from every aim direction', () => {
    const m = WEAPON_MOUNT;
    const hand = Math.hypot(m.hand.x, m.hand.y);
    const muzzle = Math.hypot(m.muzzle.x, m.muzzle.y);
    expect(BOSS_TUNING.rootMonster.sprout.hitRadius).toBeGreaterThanOrEqual(hand + muzzle);
  });

  it('gives the player MIN_REACTION_MS against ghost orbs', () => {
    const g = BOSS_TUNING.forestGhost;
    const ms = flightTimeMs(g.orbitRadius - BOSS_TUNING.playerHitRadius - g.orbRadius, g.orbSpeedPxPerSec);
    expect(ms).toBeGreaterThanOrEqual(MIN_REACTION_MS);
  });

  it('gives the player MIN_REACTION_MS against ring roots', () => {
    const r = BOSS_TUNING.rootMonster.ring;
    const ms = flightTimeMs(r.radius - BOSS_TUNING.playerHitRadius - r.spikeRadius, r.speedPxPerSec);
    expect(ms).toBeGreaterThanOrEqual(MIN_REACTION_MS);
  });

  it('caps the ring damage without counterplay at 3 times the attack damage', () => {
    const r = BOSS_TUNING.rootMonster.ring;
    expect(r.damageShare * r.spikeCount).toBeLessThanOrEqual(3);
  });

  it('has only finite numbers above 0', () => {
    for (const [path, v] of numbers(BOSS_TUNING)) {
      expect(Number.isFinite(v), path).toBe(true);
      expect(v, path).toBeGreaterThan(0);
    }
    expect(Number.isFinite(MIN_REACTION_MS) && MIN_REACTION_MS > 0).toBe(true);
  });
});

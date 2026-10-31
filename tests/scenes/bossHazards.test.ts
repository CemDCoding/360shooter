import { describe, expect, it } from 'vitest';
import type { ActivePowers, StatusOnHit } from '../../src/contracts';
import {
  bodyShape,
  circleHitsShape,
  laserHitsShape,
  resolveHazardHits,
  type BossHazard,
  type HazardLaser,
  type HazardShape,
  type LaserProbe,
} from '../../src/entities/bosses/hazards';
import { absorbDamage, emptyPowers } from '../../src/logic/powers';

// Generic hit path for boss projectiles (AP-100, PE-134). GameScene.updateBossHazards hands the hazards of
// any boss to resolveHazardHits; these tests use a plain test boss (no BossBase, no instanceof).

/** Player stand-in with the same damage rule as Player.takeDamage: shield first, then HP. */
function makePlayer(shieldLeft: number, hp = 100) {
  const p = {
    powers: { ...emptyPowers(), shieldLeft } as ActivePowers,
    hp,
    statuses: [] as (StatusOnHit | undefined)[],
    takeDamage(amount: number) {
      const absorbed = absorbDamage(p.powers, amount);
      p.powers = absorbed.state;
      p.hp -= absorbed.remainingDamage;
    },
  };
  return p;
}

const PLAYER = { x: 320, y: 180, radius: 10 };

function projectile(
  x: number,
  y: number,
  damage: number,
  opts: { shootable?: boolean; onHit?: StatusOnHit } = {},
): BossHazard & { alive: boolean } {
  const h = {
    alive: true,
    get active() {
      return h.alive;
    },
    shape: { kind: 'circle', x, y, radius: 4 } as HazardShape,
    shootable: opts.shootable ?? true,
    onHit: opts.onHit,
    laserHit: () => {
      h.alive = false;
      return true;
    },
    playerHit: () => {
      if (!h.alive) return 0;
      h.alive = false;
      return damage;
    },
  };
  return h;
}

/** A test boss: only an object with getHazards(), like every BossBase subclass offers. */
function testBoss(hazards: BossHazard[]) {
  return { getHazards: (): readonly BossHazard[] => hazards };
}

function laserAt(x: number, y: number): HazardLaser & { released: boolean } {
  const l = {
    released: false,
    get active() {
      return !l.released;
    },
    probe: {
      rect: { left: x - 8, top: y - 2, right: x + 8, bottom: y + 2 },
      circle: { x, y, radius: 8 },
    } as LaserProbe,
  };
  return l;
}

function run(
  boss: ReturnType<typeof testBoss>,
  player: ReturnType<typeof makePlayer>,
  lasers: ReturnType<typeof laserAt>[] = [],
) {
  resolveHazardHits(boss.getHazards(), lasers, PLAYER, {
    releaseLaser: (l) => {
      l.released = true;
    },
    hitPlayer: (damage, onHit) => {
      player.takeDamage(damage);
      player.statuses.push(onHit);
    },
  });
}

describe('generic boss projectile hits (PE-134)', () => {
  it('hurts the player with a projectile of a test boss, without instanceof', () => {
    const player = makePlayer(0);
    run(testBoss([projectile(325, 180, 12)]), player);
    expect(player.hp).toBe(88);
  });

  it('takes the shield first', () => {
    const player = makePlayer(5);
    run(testBoss([projectile(320, 185, 12)]), player);
    expect(player.powers.shieldLeft).toBe(0);
    expect(player.hp).toBe(93);
  });

  it('passes onHit on to the player hit', () => {
    const poison: StatusOnHit = { poison: { dps: 3, durationMs: 3000 } };
    const player = makePlayer(0);
    run(testBoss([projectile(320, 180, 5, { onHit: poison })]), player);
    expect(player.statuses).toEqual([poison]);
  });

  it('ignores projectiles that do not touch the player and inactive ones', () => {
    const far = projectile(400, 180, 12);
    const gone = projectile(320, 180, 12);
    gone.alive = false;
    const player = makePlayer(0);
    run(testBoss([far, gone]), player);
    expect(player.hp).toBe(100);
  });

  it('lets one laser destroy exactly one shootable projectile, before it reaches the player', () => {
    const a = projectile(321, 180, 10);
    const b = projectile(322, 180, 10);
    const laser = laserAt(321, 180);
    const player = makePlayer(0);
    run(testBoss([a, b]), player, [laser]);
    expect(laser.released).toBe(true);
    expect(a.alive).toBe(false);
    // b was not shot: it still hits.
    expect(player.hp).toBe(90);
  });

  it('lets lasers pass through hazards that are not shootable', () => {
    const zone = projectile(320, 180, 10, { shootable: false });
    const laser = laserAt(320, 180);
    const player = makePlayer(0);
    run(testBoss([zone]), player, [laser]);
    expect(laser.released).toBe(false);
    expect(player.hp).toBe(90);
  });

  it('keeps the laser when the hazard refuses the hit', () => {
    const h = projectile(320, 180, 0);
    h.laserHit = () => false;
    const laser = laserAt(320, 180);
    run(testBoss([h]), makePlayer(0), [laser]);
    expect(laser.released).toBe(false);
  });
});

describe('hazard shapes follow the Arcade overlap rules', () => {
  const c = { x: 0, y: 0, radius: 10 };
  it('circle vs circle: touching counts', () => {
    expect(circleHitsShape(c, { kind: 'circle', x: 14, y: 0, radius: 4 })).toBe(true);
    expect(circleHitsShape(c, { kind: 'circle', x: 14.1, y: 0, radius: 4 })).toBe(false);
  });
  it('circle vs rectangle uses the nearest point', () => {
    const rect = { kind: 'rect', left: 8, top: 8, right: 20, bottom: 20 } as const;
    expect(circleHitsShape(c, rect)).toBe(false); // corner at distance 11.3
    expect(circleHitsShape({ ...c, radius: 12 }, rect)).toBe(true);
  });
  it('circle vs line (capsule)', () => {
    const line = { kind: 'line', x1: -50, y1: 14, x2: 50, y2: 14, width: 8 } as const;
    expect(circleHitsShape(c, line)).toBe(true);
    expect(circleHitsShape(c, { ...line, y1: 15, y2: 15 })).toBe(false);
  });
  it('ring band with a gap', () => {
    const ring = {
      kind: 'ring',
      x: 0,
      y: 0,
      inner: 40,
      outer: 60,
      gapStart: -0.5,
      gapSize: 1,
    } as const;
    expect(circleHitsShape({ x: 0, y: 50, radius: 4 }, ring)).toBe(true);
    expect(circleHitsShape({ x: 50, y: 0, radius: 4 }, ring)).toBe(false); // in the gap
    expect(circleHitsShape({ x: 0, y: 20, radius: 4 }, ring)).toBe(false); // inside the band
  });
  it('laser rectangle vs rectangle and circle', () => {
    const laser = laserAt(0, 0).probe;
    expect(laserHitsShape(laser, { kind: 'rect', left: 7, top: -1, right: 12, bottom: 1 })).toBe(
      true,
    );
    expect(laserHitsShape(laser, { kind: 'rect', left: 8, top: -1, right: 12, bottom: 1 })).toBe(
      false,
    );
    expect(laserHitsShape(laser, { kind: 'circle', x: 0, y: 6, radius: 4 })).toBe(true);
    expect(laserHitsShape(laser, { kind: 'circle', x: 0, y: 7, radius: 4 })).toBe(false);
  });
  it('takes circle or rectangle from a physics body', () => {
    const base = { center: { x: 5, y: 6 }, halfWidth: 4, left: 1, top: 2, right: 9, bottom: 10 };
    expect(bodyShape({ ...base, isCircle: true })).toEqual({
      kind: 'circle',
      x: 5,
      y: 6,
      radius: 4,
    });
    expect(bodyShape({ ...base, isCircle: false })).toEqual({
      kind: 'rect',
      left: 1,
      top: 2,
      right: 9,
      bottom: 10,
    });
  });
});

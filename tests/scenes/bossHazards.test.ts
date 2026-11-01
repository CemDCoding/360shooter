import { describe, expect, it } from 'vitest';
import type { ActivePowers, StatusOnHit } from '../../src/contracts';
import {
  bodyShape,
  circleAppearsAtMs,
  circleHitsShape,
  isCircleTappable,
  laserHitsShape,
  parriedDamage,
  ParryTracker,
  resolveHazardHits,
  type BossHazard,
  type HazardLaser,
  type HazardShape,
  type LaserProbe,
} from '../../src/entities/bosses/hazards';
import { PARRY_RULES } from '../../src/config/parry';
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

// Quicktime (AP-133): BossBase opens a group per announced attack, resolves it at the impact and makes the
// projectiles and zones of exactly this attack with parriedDamage(damage, damageFactor).
describe('quicktime share per attack', () => {
  const TELEGRAPH = 1200;
  const center = { x: 320, y: 180 };
  const rng = () => {
    let i = 0;
    const seq = [0.1, 0.5, 0.9, 0.3, 0.7];
    return { next: () => seq[i++ % seq.length] };
  };
  const posOf = (angleDeg: number) => ({
    x: center.x + Math.cos((angleDeg * Math.PI) / 180) * PARRY_RULES.distanceFromPlayerPx,
    y: center.y + Math.sin((angleDeg * Math.PI) / 180) * PARRY_RULES.distanceFromPlayerPx,
  });
  /** Runs the tracker to `ms` after the start of the announcement. */
  const runTo = (t: ParryTracker, ms: number) => {
    const g = t.groups[0];
    t.tick(ms - g.elapsedMs);
  };

  it('parriedDamage scales by the share and treats bad factors as "not parried"', () => {
    expect(parriedDamage(20, 0)).toBe(0);
    expect(parriedDamage(20, 0.5)).toBe(10);
    expect(parriedDamage(20, 1)).toBe(20);
    expect(parriedDamage(20, Number.NaN)).toBe(20);
    expect(parriedDamage(20, 2)).toBe(20);
    expect(parriedDamage(20, -1)).toBe(0);
  });

  it('all circles hit: blocked, the projectile of this attack does no damage', () => {
    const t = new ParryTracker();
    const g = t.open('orbFan', 2, TELEGRAPH, rng());
    expect(g?.circles).toHaveLength(2);
    for (const c of [...t.groups[0].circles]) {
      runTo(t, c.hitAtMs);
      expect(t.tap(posOf(c.angleDeg), center)?.grade).toBe('perfect');
    }
    runTo(t, TELEGRAPH);
    const out = t.resolve('orbFan');
    expect(out?.blocked).toBe(true);
    expect(out?.damageFactor).toBe(0);
    expect(t.groups).toHaveLength(0);
    const player = makePlayer(0);
    run(testBoss([projectile(320, 180, parriedDamage(10, out?.damageFactor ?? 1))]), player);
    expect(player.hp).toBe(100);
  });

  it('one of two circles missed: half the damage for this attack only, the next attack is full', () => {
    const t = new ParryTracker();
    t.open('rootRing', 2, TELEGRAPH, rng());
    const first = t.groups[0].circles[0];
    runTo(t, first.hitAtMs);
    t.tap(posOf(first.angleDeg), center);
    runTo(t, TELEGRAPH);
    const out = t.resolve('rootRing');
    expect(out?.blocked).toBe(false);
    expect(out?.damageFactor).toBe(0.5);
    // Open circles count as missed in the result.
    expect(out?.group.circles.map((c) => c.result)).toEqual(['perfect', 'miss']);
    const player = makePlayer(0);
    run(
      testBoss([
        projectile(320, 180, parriedDamage(15, out?.damageFactor ?? 1)),
        // A later attack without circles: no group, factor 1.
        projectile(321, 180, parriedDamage(15, t.resolve('rootRing')?.damageFactor ?? 1)),
      ]),
      player,
    );
    expect(player.hp).toBe(100 - 7.5 - 15);
  });

  it('a circle takes no tap before it appears; outside every circle the tap is not used', () => {
    const t = new ParryTracker();
    t.open('roll', 1, TELEGRAPH, rng());
    const c = t.groups[0].circles[0];
    const appears = circleAppearsAtMs(c);
    expect(appears).toBe(Math.max(0, c.hitAtMs - PARRY_RULES.approachMs));
    runTo(t, appears - 1);
    expect(isCircleTappable(t.groups[0].circles[0], t.groups[0].elapsedMs)).toBe(appears === 0);
    if (appears > 0) expect(t.tap(posOf(c.angleDeg), center)).toBeNull();
    runTo(t, appears);
    expect(t.tap({ x: 0, y: 0 }, center)).toBeNull();
    expect(t.groups[0].circles[0].result).toBeNull();
    // Too early but visible: the tap counts as missed (osu rule), the tap is used.
    expect(t.tap(posOf(c.angleDeg), center)?.grade).toBe('miss');
  });

  it('the last circle is still gradable right before the impact (fairness)', () => {
    const t = new ParryTracker();
    t.open('burrow', 3, TELEGRAPH, rng());
    const circles = t.groups[0].circles;
    const last = circles[circles.length - 1];
    expect(last.hitAtMs + PARRY_RULES.goodWindowMs).toBeLessThanOrEqual(TELEGRAPH);
    runTo(t, last.hitAtMs + PARRY_RULES.goodWindowMs);
    expect(t.tap(posOf(last.angleDeg), center)?.grade).toBe('good');
  });

  it('open circles expire as missed after hitAtMs + goodWindowMs', () => {
    const t = new ParryTracker();
    t.open('coil', 2, TELEGRAPH, rng());
    const first = t.groups[0].circles[0];
    runTo(t, first.hitAtMs + PARRY_RULES.goodWindowMs + 1);
    expect(t.groups[0].circles[0].result).toBe('miss');
    expect(t.tap(posOf(first.angleDeg), center)).toBeNull();
  });

  it('two overlapping announcements keep separate groups; resolve takes the oldest', () => {
    const t = new ParryTracker();
    const a = t.open('roll', 1, TELEGRAPH, rng());
    t.tick(300);
    const b = t.open('roll', 1, TELEGRAPH, rng());
    expect(a?.id).not.toBe(b?.id);
    expect(t.groups).toHaveLength(2);
    expect(t.resolve('roll')?.group.id).toBe(a?.id);
    expect(t.groups.map((g) => g.id)).toEqual([b?.id]);
    expect(t.resolve('other')).toBeNull();
  });

  it('clear removes all groups (boss death, round end, abort)', () => {
    const t = new ParryTracker();
    t.open('roll', 3, TELEGRAPH, rng());
    t.clear();
    expect(t.groups).toHaveLength(0);
    expect(t.resolve('roll')).toBeNull();
    expect(t.open('roll', 0, TELEGRAPH, rng())).toBeNull();
  });
});

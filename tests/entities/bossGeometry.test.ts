import { describe, expect, it } from 'vitest';
import { BOSS_TUNING, MIN_REACTION_MS } from '../../src/config/bosses';
import {
  bandAlphas,
  clampToArena,
  coilAngles,
  coilRadius,
  edgePoint,
  ellipseAngle,
  ellipsePoint,
  emergePoint,
  fadeLevel,
  flightTimeMs,
  followChain,
  fragmentPositions,
  ringPositions,
  reappearAngle,
  ringSpikeAngles,
  spiralAngles,
  spiralBaseAngle,
  sproutDamage,
  sproutHitsLeft,
  stepToward,
  straightChain,
  treePositions,
  volleySpeed,
  waveArcs,
  weakenedShare,
} from '../../src/entities/bosses/bossGeometry';
import { angleInGap } from '../../src/entities/bosses/hazards';

import { ARENA } from '../../src/config/arena';
import { rimRadii } from '../../src/entities/bosses/rim';

// Every arena test runs for the base width and the widest arena (PE-101).
const WIDTHS = [ARENA.baseWidth, ARENA.maxWidth];
const arenaOf = (width: number) => ({
  width,
  height: ARENA.height,
  margin: BOSS_TUNING.arena.margin,
});
const inArenaOf =
  (a: { width: number; height: number; margin: number }) =>
  (p: { x: number; y: number }): boolean =>
    p.x >= a.margin && p.x <= a.width - a.margin && p.y >= a.margin && p.y <= a.height - a.margin;
const TURN = Math.PI * 2;

describe('stepToward', () => {
  it('moves by speed x dt', () => {
    const r = stepToward({ x: 0, y: 0 }, { x: 100, y: 0 }, 100, 500);
    expect(r.x).toBeCloseTo(50);
    expect(r.arrived).toBe(false);
  });
  it('never overshoots, even with a huge dt', () => {
    for (const dt of [16, 1000, 60_000, 1e9]) {
      const r = stepToward({ x: 10, y: 10 }, { x: 40, y: 50 }, 300, dt);
      expect(Math.hypot(r.x - 10, r.y - 10)).toBeLessThanOrEqual(50 + 1e-9);
      if (dt >= 1000) expect(r).toEqual({ x: 40, y: 50, arrived: true });
    }
  });
  it('arrives when already on the target', () => {
    expect(stepToward({ x: 5, y: 5 }, { x: 5, y: 5 }, 10, 16).arrived).toBe(true);
  });
});

describe.each(WIDTHS)('clampToArena at width %i', (w) => {
  it('keeps every point inside the margin', () => {
    const a = arenaOf(w);
    const pts = [
      { x: -50, y: -50 },
      { x: 9999, y: 9999 },
      { x: w / 2, y: 180 },
      { x: 0, y: 400 },
    ];
    for (const p of pts) expect(inArenaOf(a)(clampToArena(p, a))).toBe(true);
  });
});

describe('rimRadii', () => {
  const rim = BOSS_TUNING.giantStone.rim;
  it('is unchanged for the base arena', () => {
    expect(rimRadii(rim, arenaOf(ARENA.baseWidth))).toEqual(rim);
  });
  it.each(WIDTHS)('keeps the rim as far from the edge as before at width %i', (w) => {
    const r = rimRadii(rim, arenaOf(w));
    expect(w / 2 - r.rx).toBeCloseTo(ARENA.baseWidth / 2 - rim.rx);
    expect(ARENA.height / 2 - r.ry).toBeCloseTo(ARENA.height / 2 - rim.ry);
  });
});

describe('ringSpikeAngles', () => {
  const count = 12;
  const gap = 1.2;
  const all = Array.from({ length: count }, (_, i) => (i * TURN) / count);
  const rel = (a: number, start: number): number => (((a - start) % TURN) + TURN) % TURN;

  it('omits exactly the angles inside the gap', () => {
    for (const start of [0, 1, 3, 6]) {
      const angles = ringSpikeAngles(count, start, gap);
      const inside = all.filter((a) => rel(a, start) < gap);
      expect(angles.length).toBe(count - inside.length);
      for (const a of angles) expect(rel(a, start)).toBeGreaterThanOrEqual(gap);
    }
  });
  it('handles a gap that wraps over 0', () => {
    const angles = ringSpikeAngles(count, 6, gap); // gap from 6 rad over 2 pi to about 0.92 rad
    expect(angles).not.toContain(0);
    expect(angles.length).toBeLessThan(count);
  });
});

describe.each(WIDTHS)('treePositions at width %i', (w) => {
  it('stays inside the arena even next to the edge', () => {
    const a = arenaOf(w);
    for (const origin of [
      { x: w / 2, y: 180 },
      { x: 0, y: 0 },
      { x: w, y: 360 },
      { x: w - 40, y: 20 },
    ]) {
      for (const base of [0, 1, 2.5, 5]) {
        const out = treePositions(origin, 5, base, 56, a);
        expect(out).toHaveLength(5);
        out.forEach((p) => expect(inArenaOf(a)(p)).toBe(true));
      }
    }
  });
});

describe.each(WIDTHS)('fragmentPositions at width %i', (w) => {
  const { fragmentOffset: off, fragmentMinCenterDist: min } = BOSS_TUNING.giantStone;
  const a = arenaOf(w);
  const c = { x: w / 2, y: 180 };
  it('keeps the distance to the centre and the arena, also on the centre', () => {
    const origins = [
      c,
      { x: c.x + 10, y: 190 },
      { x: c.x - 150, y: 180 },
      { x: c.x, y: 65 },
      { x: w - 40, y: 340 },
    ];
    for (const o of origins) {
      for (const p of fragmentPositions(o, c, off, min, a)) {
        expect(Math.hypot(p.x - c.x, p.y - c.y)).toBeGreaterThanOrEqual(min - 1e-6);
        expect(inArenaOf(a)(p)).toBe(true);
      }
    }
  });
  it('spreads the two fragments apart', () => {
    const [p, q] = fragmentPositions({ x: c.x - 150, y: 180 }, c, off, min, a);
    expect(Math.hypot(p.x - q.x, p.y - q.y)).toBeGreaterThan(10);
  });
});

describe('flightTimeMs', () => {
  it('is distance / speed in ms', () => {
    expect(flightTimeMs(90, 90)).toBeCloseTo(1000);
    expect(flightTimeMs(10, 0)).toBe(Infinity);
  });
});

describe('root bud damage', () => {
  const { hits } = BOSS_TUNING.rootMonster.sprout;
  it('is harmless after all hits', () => {
    expect(sproutDamage(15, hits, sproutHitsLeft(hits, hits))).toBe(0);
    expect(sproutDamage(15, hits, sproutHitsLeft(hits, hits + 5))).toBe(0);
  });
  it('is damage x (hits - k) / hits', () => {
    for (let k = 0; k <= hits; k++) {
      expect(sproutDamage(15, hits, sproutHitsLeft(hits, k))).toBeCloseTo((15 * (hits - k)) / hits);
    }
  });
  it('is full without hits', () => {
    expect(sproutDamage(15, hits, hits)).toBe(15);
  });
});

// --- Riesen-Sand-Wurm (AP-100) ---

describe('giant sand worm geometry and fairness (AP-100, PE-75, PE-128)', () => {
  const W = BOSS_TUNING.giantSandWorm;
  const PR = BOSS_TUNING.playerHitRadius;
  /** Real body radius of the player (Player.ts BODY_RADIUS). */
  const PLAYER_BODY = 10;
  const c = { x: 320, y: 180 };

  it('keeps the body links at most one spacing apart while they follow the head', () => {
    let chain = straightChain(c, 0, W.segmentCount, W.segmentSpacing);
    const head = { ...c };
    for (let step = 0; step < 50; step++) {
      head.x += 7;
      head.y += step % 3;
      chain = followChain(chain, head, W.segmentSpacing);
      let prev = head;
      for (const p of chain) {
        expect(Math.hypot(p.x - prev.x, p.y - prev.y)).toBeLessThanOrEqual(W.segmentSpacing + 1e-9);
        prev = p;
      }
    }
  });

  it('stretches a pulled chain to exactly the spacing', () => {
    const chain = followChain([{ x: 100, y: 0 }], { x: 0, y: 0 }, 22);
    expect(chain[0].x).toBeCloseTo(22);
  });

  it('lays out the coil with the head at one gap edge and no link in the gap', () => {
    for (const start of [0, 1, 3, 6]) {
      const { head, links } = coilAngles(W.segmentCount, start, W.coil.gapRad);
      expect(links).toHaveLength(W.segmentCount);
      expect(angleInGap(head, start, W.coil.gapRad)).toBe(false);
      for (const a of links.slice(0, -1)) expect(angleInGap(a, start, W.coil.gapRad)).toBe(false);
      // The tail sits on the other gap edge.
      expect(Math.cos(links[links.length - 1] - start)).toBeCloseTo(1);
    }
  });

  it('opens the coil gap at least as wide as the root ring gap', () => {
    expect(W.coil.gapRad).toBeGreaterThanOrEqual(BOSS_TUNING.rootMonster.ring.gapRad);
  });

  it('gives the player MIN_REACTION_MS before the coil reaches her', () => {
    expect(
      flightTimeMs(W.coil.radius - PR - W.segmentRadius, W.coil.speedPxPerSec),
    ).toBeGreaterThanOrEqual(MIN_REACTION_MS);
  });

  it('squeezes the coil down onto the player and never below the stop radius', () => {
    const stop = W.segmentRadius;
    expect(coilRadius(W.coil.radius, W.coil.speedPxPerSec, 0, stop)).toBe(W.coil.radius);
    expect(coilRadius(W.coil.radius, W.coil.speedPxPerSec, 1e9, stop)).toBe(stop);
    // At the stop radius every link touches the player's body.
    expect(stop).toBeLessThanOrEqual(PLAYER_BODY + W.segmentRadius);
  });

  it('caps the coil damage without counterplay at 3 times the attack damage', () => {
    expect(W.coil.damageShare * W.segmentCount).toBeLessThanOrEqual(3);
  });

  it('weakens the coil with every head hit and breaks it after breakHits', () => {
    expect(weakenedShare(0, W.coil.breakHits)).toBe(1);
    expect(weakenedShare(W.coil.breakHits / 2, W.coil.breakHits)).toBeCloseTo(0.5);
    expect(weakenedShare(W.coil.breakHits, W.coil.breakHits)).toBe(0);
  });

  it.each(WIDTHS)('breaks out beside the player on the dive side at width %i', (w) => {
    const center = { x: w / 2, y: 180 };
    const rim = rimRadii(W.orbit, arenaOf(w));
    for (const a of [0, 1, 2.5, 4, 5.5]) {
      const from = ellipsePoint(center, rim, a);
      const e = emergePoint(center, from, W.burrow.emergeDistance);
      expect(Math.hypot(e.x - center.x, e.y - center.y)).toBeCloseTo(W.burrow.emergeDistance);
      // Same side as the dive point: the trail never crosses the player.
      const dot = (e.x - center.x) * (from.x - center.x) + (e.y - center.y) * (from.y - center.y);
      expect(dot).toBeGreaterThan(0);
      expect(inArenaOf(arenaOf(w))(from)).toBe(true);
    }
  });

  it('hurts only inside the announced circle, which reaches the player; the head stays clear', () => {
    expect(W.burrow.emergeDistance - W.burrow.eruptRadius).toBeLessThan(PLAYER_BODY);
    // The surfaced head (64 x 64) keeps clear of the player: no contact damage beside her.
    expect(W.burrow.emergeDistance - W.headSize / 2).toBeGreaterThan(PR);
  });

  it('lets lasers weaken the break-out like the root bud', () => {
    const h = W.burrow.moundHits;
    expect(sproutDamage(18, h, sproutHitsLeft(h, h))).toBe(0);
    expect(sproutDamage(18, h, h)).toBe(18);
  });

  it('slows the skin spikes near the player so they keep MIN_REACTION_MS', () => {
    const v = W.volley;
    const reach = PR + v.spikeRadius;
    for (const d of [W.burrow.emergeDistance, 80, W.coil.radius, W.orbit.ry, W.orbit.rx, 400]) {
      const speed = volleySpeed(d, v.speedPxPerSec, v.minSpeedPxPerSec, reach, MIN_REACTION_MS);
      expect(speed).toBeLessThanOrEqual(v.speedPxPerSec);
      expect(flightTimeMs(d - reach, speed)).toBeGreaterThanOrEqual(MIN_REACTION_MS - 1e-6);
    }
  });

  it('maps ellipse angles back and forth', () => {
    const rim = { rx: 150, ry: 115 };
    for (const a of [0, 1, 2, -2]) {
      expect(ellipseAngle(c, rim, ellipsePoint(c, rim, a))).toBeCloseTo(a);
    }
  });
});

// --- Antiker Wächter-Hund (AP-103) ---

describe('guardian dog geometry and fairness (AP-103, PE-75, PE-128)', () => {
  const D = BOSS_TUNING.guardianDog;
  const S = D.runeShield;
  const B = D.guardBark;
  const PR = BOSS_TUNING.playerHitRadius;

  it('spaces ring positions evenly at the radius', () => {
    const pts = ringPositions({ x: 10, y: 20 }, 3, 0.5, 40);
    expect(pts).toHaveLength(3);
    for (const p of pts) expect(Math.hypot(p.x - 10, p.y - 20)).toBeCloseTo(40);
    expect(Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y)).toBeCloseTo(
      Math.hypot(pts[1].x - pts[2].x, pts[1].y - pts[2].y),
    );
  });

  it.each(WIDTHS)('marks the screen edge in the direction of the summon at width %i', (w) => {
    const a = arenaOf(w);
    const center = { x: w / 2, y: 180 };
    for (const angle of [0, 0.7, 1.6, 3, 4.2, 5.5]) {
      const p = edgePoint(center, angle, a);
      expect(inArenaOf(a)(p)).toBe(true);
      // On the edge (minus the margin) and in the same direction.
      const onEdge =
        Math.abs(p.x - a.margin) < 1e-6 ||
        Math.abs(p.x - (w - a.margin)) < 1e-6 ||
        Math.abs(p.y - a.margin) < 1e-6 ||
        Math.abs(p.y - (a.height - a.margin)) < 1e-6;
      expect(onEdge).toBe(true);
      expect(Math.cos(Math.atan2(p.y - center.y, p.x - center.x) - angle)).toBeCloseTo(1);
    }
  });

  it('splits the bark wave into arcs that leave exactly the gap open', () => {
    for (const start of [0, 1, 3, 6]) {
      const arcs = waveArcs(B.arcCount, start, B.gapRad);
      expect(arcs).toHaveLength(B.arcCount);
      const total = arcs.reduce((s, x) => s + x.size, 0);
      expect(total + B.gapRad).toBeCloseTo(TURN);
      for (const arc of arcs) {
        expect(angleInGap(arc.start + arc.size / 2, start, B.gapRad)).toBe(false);
      }
    }
  });

  it('opens the bark gap at least as wide as the root ring gap', () => {
    expect(B.gapRad).toBeGreaterThanOrEqual(BOSS_TUNING.rootMonster.ring.gapRad);
  });

  it.each(WIDTHS)(
    'gives the player MIN_REACTION_MS before the bark reaches her at width %i',
    (w) => {
      const center = { x: w / 2, y: 180 };
      const rim = rimRadii(D.orbit, arenaOf(w));
      for (const a of [0, 1, Math.PI / 2, 2.5, 4, 5.5]) {
        const dog = ellipsePoint(center, rim, a);
        const dist = Math.hypot(dog.x - center.x, dog.y - center.y);
        const path = dist - B.startRadius - B.thickness / 2;
        const speed = volleySpeed(path, B.speedPxPerSec, B.minSpeedPxPerSec, PR, MIN_REACTION_MS);
        expect(speed).toBeLessThanOrEqual(B.speedPxPerSec);
        expect(flightTimeMs(path - PR, speed)).toBeGreaterThanOrEqual(MIN_REACTION_MS - 1e-6);
      }
    },
  );

  it('keeps the runes outside the shield and the shield and runes away from the player', () => {
    expect(S.runeOrbit - S.runeRadius).toBeGreaterThan(S.radius);
    expect(S.runeOrbit + S.runeRadius + PR).toBeLessThan(D.orbit.ry);
    // The dog body (64 x 64) never touches the player on its path.
    expect(D.size / 2 + PR).toBeLessThan(D.orbit.ry);
  });
});

describe('pharaoh geometry and fairness (AP-104, PE-75, PE-128)', () => {
  const P = BOSS_TUNING.pharaoh;
  const C = P.goldCurse;
  const ST = P.sandstorm;
  const PR = BOSS_TUNING.playerHitRadius;
  /** Orb reach: player hit radius plus orb radius. */
  const REACH = PR + P.orbRadius;

  it('spreads the spiral arms evenly and turns them with the spin', () => {
    const a0 = spiralAngles(4, 0, 1, 0);
    expect(a0).toEqual([0, Math.PI / 2, Math.PI, (3 * Math.PI) / 2]);
    const a1 = spiralAngles(4, 0, 1, 500);
    a1.forEach((a, i) => expect(a - a0[i]).toBeCloseTo(0.5));
    expect(spiralAngles(0, 0, 1, 0)).toEqual([]);
    expect(spiralAngles(2, 0, 1, -100)).toEqual([0, Math.PI]);
  });

  it('points arm 0 at the target in the middle of the burst', () => {
    for (const spin of [C.spinRadPerSec, -C.spinRadPerSec]) {
      const base = spiralBaseAngle(1.3, spin, C.burstMs);
      expect(spiralAngles(C.arms, base, spin, C.burstMs / 2)[0]).toBeCloseTo(1.3);
    }
  });

  it('leaves gaps: arms spaced wider than the player seen from the rim', () => {
    const gap = (Math.PI * 2) / C.arms;
    expect(gap).toBeGreaterThan(4 * Math.atan(REACH / P.orbit.ry));
  });

  it('reappears a quarter to three quarters of a turn away', () => {
    for (const r of [0, 0.3, 0.99, 1, -1, 2]) {
      const d = reappearAngle(1, r) - 1;
      expect(d).toBeGreaterThanOrEqual(Math.PI / 2);
      expect(d).toBeLessThanOrEqual((3 * Math.PI) / 2);
    }
  });

  it('fades linearly, or switches at once with reduced motion', () => {
    expect(fadeLevel(0, 1000, false)).toBe(0);
    expect(fadeLevel(500, 1000, false)).toBeCloseTo(0.5);
    expect(fadeLevel(2000, 1000, false)).toBe(1);
    expect(fadeLevel(1, 1000, true)).toBe(1);
    expect(fadeLevel(0, 0, false)).toBe(1);
  });

  it('darkens the edge with the map vignette strength at most, outer band strongest', () => {
    const a = bandAlphas(ST.bands, 0.45);
    expect(a).toHaveLength(ST.bands);
    expect(a[0]).toBeCloseTo(0.45);
    for (let i = 1; i < a.length; i++) expect(a[i]).toBeLessThan(a[i - 1]);
    expect(a[a.length - 1]).toBeGreaterThan(0);
    expect(bandAlphas(2, 3)[0]).toBe(1);
    // The darkened band stays well away from the player in the middle.
    expect(ST.bands * ST.bandWidth).toBeLessThan(ARENA.height / 2 - 64);
  });

  it.each(WIDTHS)('gives the player MIN_REACTION_MS before an orb reaches her at width %i', (w) => {
    const center = { x: w / 2, y: 180 };
    const rim = rimRadii(P.orbit, arenaOf(w));
    for (const a of [0, 1, Math.PI / 2, 2.5, 4, 5.5]) {
      const boss = ellipsePoint(center, rim, a);
      const path = Math.hypot(boss.x - center.x, boss.y - center.y) - C.spawnOffset;
      const speed = volleySpeed(path, C.speedPxPerSec, C.minSpeedPxPerSec, REACH, MIN_REACTION_MS);
      expect(flightTimeMs(path - REACH, speed)).toBeGreaterThanOrEqual(MIN_REACTION_MS - 1e-6);
      // Storm shots from the edge in the same direction.
      const edge = edgePoint(center, a, arenaOf(w));
      const d = Math.hypot(edge.x - center.x, edge.y - center.y);
      const s = volleySpeed(d, ST.speedPxPerSec, ST.minSpeedPxPerSec, REACH, MIN_REACTION_MS);
      expect(flightTimeMs(d - REACH, s)).toBeGreaterThanOrEqual(MIN_REACTION_MS - 1e-6);
    }
  });

  it('keeps the pharaoh body and its orb start away from the player on its path', () => {
    expect(P.size / 2 + PR).toBeLessThan(P.orbit.ry);
    expect(C.spawnOffset + P.orbRadius + PR).toBeLessThan(P.orbit.ry);
  });
});
